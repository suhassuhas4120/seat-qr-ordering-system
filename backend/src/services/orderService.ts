import { db } from '../db/index.js';
import { mutexService } from './mutex.js';
import { generateSessionToken, verifySeatSignature, generateSeatSignature } from './crypto.js';
import { io } from '../sockets/index.js';
import { SOCKET_EVENTS } from '../shared/index.js';
import crypto from 'crypto';
import type { ItemStage, CreatedByRole, OrderStage, SeatTabSummary, Order, OrderItem, Seat } from '../shared/index.js';

export class OrderService {
  /**
   * Claim a seat via dynamic QR code or resume existing active session.
   */
  async claimSeat(seatId: number, sig: string, clientIp?: string, existingToken?: string) {
    const seat = db.data.seats.find((s) => s.id === seatId);
    if (!seat) {
      throw new Error(`Seat #${seatId} does not exist`);
    }

    // 1. Check for Auto-Rehydration if client already has a valid token for this seat
    if (existingToken) {
      const activeSession = db.data.seatSessions.find(
        (s) => s.seatId === seatId && s.sessionToken === existingToken && s.status === 'ACTIVE'
      );

      if (activeSession) {
        return {
          session: activeSession,
          seat,
          resumed: true,
        };
      }
    }

    // 2. Validate cryptographic HMAC signature against current seat epoch
    const isValidSig = verifySeatSignature(seatId, seat.epochHash, sig);
    if (!isValidSig) {
      throw new Error('Invalid or expired QR code signature. Please scan the current physical code at your seat.');
    }

    // 3. Prevent simultaneous scan collision using atomic mutex
    const lockAcquired = await mutexService.acquireLock(`claim:seat:${seatId}`, clientIp || 'client', 5);
    if (!lockAcquired) {
      throw new Error('Seat is currently undergoing connection by another device. Please wait a moment.');
    }

    try {
      const currentSeat = db.data.seats.find((s) => s.id === seatId)!;
      if (currentSeat.currentStatus !== 'VACANT') {
        throw new Error(`Seat ${currentSeat.seatNumber} is currently occupied by another diner.`);
      }

      // Mint new session token
      const sessionId = crypto.randomUUID();
      const sessionToken = generateSessionToken();
      const now = new Date().toISOString();

      const newSession = {
        id: sessionId,
        seatId,
        sessionToken,
        clientIp,
        status: 'ACTIVE' as const,
        startedAt: now,
        endedAt: null,
      };

      db.data.seatSessions.push(newSession);

      currentSeat.currentStatus = 'OCCUPIED';
      currentSeat.activeSessionId = sessionId;
      currentSeat.updatedAt = now;

      db.saveState();
      db.logTransaction('SEAT_CLAIMED', { seatId: currentSeat.id, seatNumber: currentSeat.seatNumber });

      // Broadcast real-time claim to all staff and manager
      io?.emit(SOCKET_EVENTS.SEAT_CLAIMED, {
        seatId: currentSeat.id,
        seatNumber: currentSeat.seatNumber,
        zone: currentSeat.zone,
        status: currentSeat.currentStatus,
        startedAt: now,
      });

      return { session: newSession, seat: currentSeat, resumed: false };
    } finally {
      await mutexService.releaseLock(`claim:seat:${seatId}`, clientIp || 'client');
    }
  }

  /**
   * Collaborative cross-actor order placement.
   * Customer, Waiter, or Manager can add items to the active seat tab.
   */
  async placeOrder(params: {
    seatId: number;
    sessionToken?: string;
    items: Array<{ menuItemId: number; quantity: number; notes?: string }>;
    createdByRole: CreatedByRole;
    waiterId?: number;
  }) {
    const { seatId, sessionToken, items, createdByRole, waiterId } = params;

    // 1. Fetch active session, or auto-initialize one so orders never get rejected
    let session = db.data.seatSessions.find(
      (s) => s.seatId === seatId && s.status === 'ACTIVE'
    );

    if (!session) {
      const seat = db.data.seats.find((s) => s.id === seatId);
      if (!seat) throw new Error('Seat not found');

      const sessionId = crypto.randomUUID();
      const newToken = generateSessionToken();
      const now = new Date().toISOString();

      session = {
        id: sessionId,
        seatId,
        sessionToken: sessionToken || newToken,
        status: 'ACTIVE',
        startedAt: now,
      };

      db.data.seatSessions.push(session);

      seat.currentStatus = 'OCCUPIED';
      seat.activeSessionId = sessionId;
      seat.updatedAt = now;
    }

    // 2. Fetch menu items for snapshot pricing and names
    const itemMap = new Map(db.data.menuItems.map((m) => [m.id, m]));

    // 3. Create Order and OrderItems
    const orderId = crypto.randomUUID();
    const orderNumber = `ORD-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();

    const createdOrderItems: OrderItem[] = [];
    for (const item of items) {
      const dish = itemMap.get(item.menuItemId);
      if (!dish) continue;

      createdOrderItems.push({
        id: crypto.randomUUID(),
        orderId,
        menuItemId: item.menuItemId,
        nameSnapshot: dish.name,
        priceSnapshot: dish.price,
        quantity: item.quantity,
        notes: item.notes || null,
        itemStage: 'QUEUED',
        updatedAt: now,
      });
    }

    const newOrder: Order = {
      id: orderId,
      sessionId: session.id,
      seatId,
      orderNumber,
      overallStage: 'PLACED',
      createdByRole,
      waiterId: waiterId || null,
      placedAt: now,
      items: createdOrderItems,
    };

    db.data.orders.push(newOrder);

    // Update seat running totals
    const seat = db.data.seats.find((s) => s.id === seatId)!;
    const tabSummary = await this.getSeatTabSummary(seatId);
    seat.activeOrderTotal = tabSummary.total;
    seat.activeItemCount = tabSummary.allItems.length;
    seat.updatedAt = now;

    db.saveState();
    db.logTransaction('ORDER_PLACED', {
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      seatId,
      itemCount: newOrder.items.length,
      total: tabSummary.total,
      createdByRole,
      waiterId,
    });

    const payload = {
      order: newOrder,
      seat,
    };

    // 4. Real-time broadcast to all connected portals in < 50ms
    if (io) {
      io.emit(SOCKET_EVENTS.ORDER_PLACED, payload);
      io.to(`seat:${seatId}`).emit(SOCKET_EVENTS.ORDER_PLACED, payload);
      io.to('kds').emit(SOCKET_EVENTS.ORDER_PLACED, payload);
      io.to('staff:mobile').emit(SOCKET_EVENTS.ORDER_PLACED, payload);
      io.to('staff:tablet').emit(SOCKET_EVENTS.ORDER_PLACED, payload);
      io.to('manager').emit(SOCKET_EVENTS.ORDER_PLACED, payload);
    }

    return payload;
  }

  /**
   * Granular Item-Level Stage Transition.
   * Can bump an individual dish: QUEUED -> COOKING -> READY -> SERVED.
   */
  async updateItemStage(itemId: string, newStage: ItemStage, staffId?: number) {
    let targetOrder: Order | undefined;
    let targetItem: OrderItem | undefined;

    for (const order of db.data.orders) {
      const found = order.items.find((i) => i.id === itemId);
      if (found) {
        targetOrder = order;
        targetItem = found;
        break;
      }
    }

    if (!targetOrder || !targetItem) {
      throw new Error('Order item not found');
    }

    const now = new Date().toISOString();
    targetItem.itemStage = newStage;
    targetItem.updatedAt = now;

    if (newStage === 'COOKING' || newStage === 'READY') {
      targetItem.bumpedByChefId = staffId || null;
    } else if (newStage === 'SERVED') {
      targetItem.deliveredByWaiterId = staffId || null;
    }

    // Recompute overall order status
    let newOrderStage: OrderStage = 'PLACED';
    const allStages = targetOrder.items.map((i) => i.itemStage);

    if (allStages.every((s) => s === 'SERVED')) {
      newOrderStage = 'SERVED';
    } else if (allStages.every((s) => s === 'READY' || s === 'SERVED')) {
      newOrderStage = 'READY';
    } else if (allStages.some((s) => s === 'COOKING' || s === 'READY')) {
      newOrderStage = 'PREPARING';
    }

    targetOrder.overallStage = newOrderStage;
    db.saveState();
    db.logTransaction('ITEM_STAGE_BUMPED', {
      itemId,
      orderId: targetOrder.id,
      seatId: targetOrder.seatId,
      newStage,
      staffId,
    });

    const payload = {
      itemId,
      orderId: targetOrder.id,
      seatId: targetOrder.seatId,
      newStage,
      overallOrderStage: newOrderStage,
      updatedAt: now,
    };

    // Real-time broadcast
    if (io) {
      io.emit(SOCKET_EVENTS.ITEM_STAGE_UPDATED, payload);
      io.to(`seat:${targetOrder.seatId}`).emit(SOCKET_EVENTS.ITEM_STAGE_UPDATED, payload);
      io.to('kds').emit(SOCKET_EVENTS.ITEM_STAGE_UPDATED, payload);
      io.to('staff:mobile').emit(SOCKET_EVENTS.ITEM_STAGE_UPDATED, payload);
      io.to('staff:tablet').emit(SOCKET_EVENTS.ITEM_STAGE_UPDATED, payload);
      io.to('manager').emit(SOCKET_EVENTS.ITEM_STAGE_UPDATED, payload);
    }

    return payload;
  }

  /**
   * Get full consolidated bill and order history for an active seat tab.
   */
  async getSeatTabSummary(seatId: number): Promise<SeatTabSummary> {
    const seat = db.data.seats.find((s) => s.id === seatId);
    if (!seat) throw new Error('Seat not found');

    const session = db.data.seatSessions.find(
      (s) => s.seatId === seatId && s.status === 'ACTIVE'
    );

    if (!session) {
      return {
        seat,
        session: { id: '', seatId, sessionToken: '', status: 'COMPLETED', startedAt: '' },
        orders: [],
        allItems: [],
        subtotal: 0,
        tax: 0,
        total: 0,
      };
    }

    const seatOrders = db.data.orders.filter((o) => o.sessionId === session.id);
    const allItems = seatOrders.flatMap((o) => o.items);

    const subtotal = allItems.reduce((acc, curr) => acc + curr.priceSnapshot * curr.quantity, 0);
    const tax = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST
    const total = Math.round((subtotal + tax) * 100) / 100;

    return {
      seat,
      session,
      orders: seatOrders,
      allItems,
      subtotal,
      tax,
      total,
    };
  }

  /**
   * Returns all 100 seats with live status, active bill totals, and dynamic QR signatures.
   */
  async getAllSeatsFloorMatrix() {
    return db.data.seats.map((s) => {
      const signature = generateSeatSignature(s.id, s.epochHash);
      return {
        ...s,
        qrSignature: signature,
        qrUrl: `/seat/${s.id}?sig=${signature}`,
      };
    });
  }

  /**
   * Returns all active kitchen tickets with item-level tracking for KDS.
   */
  async getKdsActiveTickets() {
    const activeOrders = db.data.orders.filter((o) =>
      ['PLACED', 'PREPARING', 'READY'].includes(o.overallStage)
    );

    const seatMap = new Map(db.data.seats.map((s) => [s.id, s]));

    return activeOrders.map((o) => ({
      ...o,
      seat: seatMap.get(o.seatId),
    }));
  }

  /**
   * Toggle item availability (86 list).
   */
  async setItemAvailability(itemId: number, isAvailable: boolean) {
    const item = db.data.menuItems.find((m) => m.id === itemId);
    if (item) {
      item.isAvailable = isAvailable;
      db.saveState();
      db.logTransaction('ITEM_AVAILABILITY_CHANGED', { itemId, isAvailable });
    }
    if (io) {
      io.emit(SOCKET_EVENTS.MENU_ITEM_AVAILABILITY_CHANGED, { itemId, isAvailable });
    }
    return { itemId, isAvailable };
  }
}

export const orderService = new OrderService();
