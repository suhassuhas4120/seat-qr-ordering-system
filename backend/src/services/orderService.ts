import { db } from '../db/index.js';
import { mutexService } from './mutex.js';
import { generateSessionToken, verifySeatSignature, generateSeatSignature } from './crypto.js';
import { io } from '../sockets/index.js';
import { SOCKET_EVENTS } from '../shared/index.js';
import crypto from 'crypto';
import type { ItemStage, CreatedByRole, OrderStage, SeatTabSummary, Order, OrderItem, Seat } from '../shared/index.js';

export class OrderService {
  /**
   * Authoritative Seat Occupancy and Ownership Verification
   */
  async getSeatOccupancy(seatId: number, deviceToken?: string) {
    const seat = db.data.seats.find((s) => s.id === seatId);
    if (!seat) {
      return { isOccupied: false, isOwner: false };
    }

    // Check if device has an unsettled active session on ANOTHER seat
    let activeSeatIdForDevice: number | null = null;
    if (deviceToken) {
      const otherSession = db.data.seatSessions.find(
        (s) => s.status === 'ACTIVE' && s.seatId !== seatId && s.deviceToken === deviceToken
      );
      if (otherSession) {
        activeSeatIdForDevice = otherSession.seatId;
      }
    }

    const activeSession = db.data.seatSessions.find(
      (s) => s.seatId === seatId && s.status === 'ACTIVE'
    );

    const isOccupied = Boolean(seat.currentStatus !== 'VACANT' && activeSession);

    if (!isOccupied || !activeSession) {
      return {
        isOccupied: false,
        isOwner: false,
        activeSeatIdForDevice,
      };
    }

    const isOwner = Boolean(
      deviceToken &&
      activeSession.deviceToken &&
      activeSession.deviceToken === deviceToken
    );

    const seatOrders = db.data.orders.filter((o) => o.seatId === seatId);
    const latestOrder = seatOrders.length > 0 ? seatOrders[seatOrders.length - 1] : undefined;

    return {
      isOccupied: true,
      isOwner,
      ticketNumber: latestOrder?.orderNumber,
      orderStatus: latestOrder?.overallStage || 'PLACED',
      activeSeatIdForDevice,
    };
  }

  /**
   * Claim a seat via dynamic QR code or resume existing active session.
   */
  async claimSeat(seatId: number, sig: string, clientIp?: string, existingToken?: string, deviceToken?: string) {
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
   * Concurrency-guarded with seat-level mutex lock to prevent order collisions and swaps.
   */
  async placeOrder(params: {
    seatId: number;
    sessionToken?: string;
    deviceToken?: string;
    items: Array<{ menuItemId: number; quantity: number; notes?: string }>;
    createdByRole: CreatedByRole;
    waiterId?: number;
    clientIp?: string;
  }) {
    const { seatId, sessionToken, deviceToken, items, createdByRole, waiterId, clientIp } = params;

    // Concurrency Lock: Strictly serialize order creation per seat to prevent race collisions & order swapping
    const lockAcquired = await mutexService.acquireLock(`order:seat:${seatId}`, clientIp || deviceToken || 'actor', 5);
    if (!lockAcquired) {
      throw new Error('Order is currently being processed for this seat. Please retry in a moment.');
    }

    try {
      // 1. Anti-Cheat Check: Customer cannot place orders at Seat Y if they currently owe an unpaid meal at Seat X
      if (createdByRole === 'CUSTOMER' && deviceToken) {
        const otherActiveSession = db.data.seatSessions.find(
          (s) => s.status === 'ACTIVE' && s.seatId !== seatId && s.deviceToken === deviceToken
        );
        if (otherActiveSession) {
          throw new Error(`ACTIVE_SESSION_EXISTS: You currently have an active meal at Seat ${otherActiveSession.seatId}. Please settle your bill before ordering at another table.`);
        }
      }

      // 2. Fetch active session
      let session = db.data.seatSessions.find(
        (s) => s.seatId === seatId && s.status === 'ACTIVE'
      );

      // Anti-Hijack & Anti-Swap Check:
      // If seat already has an active session and request is from a CUSTOMER:
      if (session && createdByRole === 'CUSTOMER') {
        const isSameDevice = Boolean(deviceToken && session.deviceToken && session.deviceToken === deviceToken);
        const isSameToken = Boolean(sessionToken && session.sessionToken && session.sessionToken === sessionToken);

        // If seat already claimed by another device and neither token matches:
        if (session.deviceToken && !isSameDevice && !isSameToken) {
          throw new Error('SEAT_ALREADY_OCCUPIED: Seat is currently occupied by another customer. Please scan a vacant table.');
        }

        // If session didn't have deviceToken bound yet, bind it now to this device
        if (!session.deviceToken && deviceToken) {
          session.deviceToken = deviceToken;
        }
      }

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
          deviceToken: deviceToken || undefined,
          status: 'ACTIVE',
          startedAt: now,
        };

        db.data.seatSessions.push(session);

        seat.currentStatus = 'OCCUPIED';
        seat.activeSessionId = sessionId;
        seat.updatedAt = now;
      }

      // 3. Fetch menu items for snapshot pricing and names
      const itemMap = new Map(db.data.menuItems.map((m) => [m.id, m]));

      // 4. Create Order and OrderItems
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

      const calculatedSubtotal = createdOrderItems.reduce((acc, curr) => acc + curr.priceSnapshot * curr.quantity, 0);

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
        totalAmount: calculatedSubtotal,
        deviceToken: session.deviceToken,
      } as any;

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
        deviceToken: session.deviceToken,
      });

      const payload = {
        order: newOrder,
        seat,
      };

      // 5. Real-time broadcast to all connected portals in < 50ms
      if (io) {
        io.emit(SOCKET_EVENTS.ORDER_PLACED, payload);
        io.to(`seat:${seatId}`).emit(SOCKET_EVENTS.ORDER_PLACED, payload);
        io.to('kds').emit(SOCKET_EVENTS.ORDER_PLACED, payload);
        io.to('staff:mobile').emit(SOCKET_EVENTS.ORDER_PLACED, payload);
        io.to('staff:tablet').emit(SOCKET_EVENTS.ORDER_PLACED, payload);
        io.to('manager').emit(SOCKET_EVENTS.ORDER_PLACED, payload);
      }

      return payload;
    } finally {
      await mutexService.releaseLock(`order:seat:${seatId}`, clientIp || deviceToken || 'actor');
    }
  }

  /**
   * Granular Item-Level Stage Transition.
   * Can bump an individual dish: QUEUED -> COOKING -> READY -> SERVED.
   */
  async updateItemStage(
    itemId: string,
    newStage: ItemStage,
    staffId?: number,
    options?: { seatId?: number; orderId?: string; ticketNumber?: string; dishId?: string; dishName?: string }
  ) {
    let targetOrder: Order | undefined;
    let targetItem: OrderItem | undefined;

    const strId = String(itemId).trim();
    const cleanItemId = strId.replace(/-[0-9]+$/, '');
    const cleanName = (options?.dishName || strId.replace(/^dish-/, '').replace(/[-_]/g, ' ')).toLowerCase().trim();
    const targetDishId = (options?.dishId || '').replace(/^dish-/, '').trim();
    const targetDishNum = parseInt(targetDishId, 10);

    // 1. Direct search by exact item ID
    for (const order of db.data.orders) {
      if (options?.seatId && order.seatId !== options.seatId) continue;
      if (options?.orderId && order.id !== options.orderId) continue;
      const found = order.items.find((i) => i.id === strId || (cleanItemId && i.id === cleanItemId));
      if (found) {
        targetOrder = order;
        targetItem = found;
        break;
      }
    }

    // 2. If not found by exact ID, search matching item in candidate orders
    if (!targetItem) {
      let candidateOrders = db.data.orders;
      if (options?.seatId) {
        candidateOrders = candidateOrders.filter((o) => o.seatId === options.seatId);
      }
      if (options?.orderId) {
        candidateOrders = candidateOrders.filter((o) => o.id === options.orderId);
      }
      if (options?.ticketNumber && candidateOrders.length > 1) {
        const tTokens = options.ticketNumber.split(/[•,\s]+/).map(t => t.trim()).filter(Boolean);
        const filtered = candidateOrders.filter((o) => tTokens.includes(o.orderNumber));
        if (filtered.length > 0) {
          candidateOrders = filtered;
        }
      }

      const matchFn = (i: OrderItem) => {
        if (i.id === strId || i.id === cleanItemId) return true;
        if (targetDishId && (String(i.menuItemId) === targetDishId || `dish-${i.menuItemId}` === options?.dishId)) return true;
        if (!isNaN(targetDishNum) && i.menuItemId === targetDishNum) return true;
        if (strId === `dish-${i.menuItemId}` || strId === String(i.menuItemId)) return true;
        if (options?.dishName && i.nameSnapshot && i.nameSnapshot.toLowerCase().trim() === options.dishName.toLowerCase().trim()) return true;
        if (cleanName && i.nameSnapshot && (
          i.nameSnapshot.toLowerCase().trim() === cleanName ||
          cleanName.includes(i.nameSnapshot.toLowerCase().trim()) ||
          i.nameSnapshot.toLowerCase().trim().includes(cleanName)
        )) return true;
        return false;
      };

      // 1st pass: Look for an item across candidate orders that is NOT yet at newStage (e.g. READY -> SERVED)
      for (let oIdx = candidateOrders.length - 1; oIdx >= 0; oIdx--) {
        const order = candidateOrders[oIdx];
        const pendingItem = order.items.find((i) => matchFn(i) && i.itemStage !== newStage);
        if (pendingItem) {
          targetOrder = order;
          targetItem = pendingItem;
          break;
        }
      }

      // 2nd pass fallback: any matching item if all were already updated
      if (!targetItem) {
        for (let oIdx = candidateOrders.length - 1; oIdx >= 0; oIdx--) {
          const order = candidateOrders[oIdx];
          const anyItem = order.items.find(matchFn);
          if (anyItem) {
            targetOrder = order;
            targetItem = anyItem;
            break;
          }
        }
      }
    }

    if (!targetOrder || !targetItem) {
      throw new Error(`Order item not found for identifier: ${itemId}`);
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
      itemId: targetItem.id,
      originalKey: itemId,
      dishId: `dish-${targetItem.menuItemId}`,
      dishName: targetItem.nameSnapshot,
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
   * Returns all active dining table orders across the restaurant (not yet paid or vacated).
   * Includes orders where items are served, ready, preparing, or queued.
   */
  async getActiveFloorOrders() {
    const activeSessions = new Set(
      db.data.seatSessions.filter((s) => s.status === 'ACTIVE').map((s) => s.id)
    );

    const activeOrders = db.data.orders.filter(
      (o) =>
        (activeSessions.has(o.sessionId) ||
          db.data.seats.some((st) => st.id === o.seatId && st.currentStatus !== 'VACANT')) &&
        o.overallStage !== 'PAID'
    );

    const seatMap = new Map(db.data.seats.map((s) => [s.id, s]));

    return activeOrders.map((o) => {
      const subtotal = (o.items || []).reduce((acc, curr) => acc + (curr.priceSnapshot || 0) * (curr.quantity || 1), 0);
      return {
        ...o,
        totalAmount: (o as any).totalAmount || subtotal,
        seat: seatMap.get(o.seatId),
      };
    });
  }

  /**
   * Returns all active kitchen tickets with item-level tracking for KDS.
   */
  async getKdsActiveTickets() {
    // Reconcile: If all items in an order are served, ensure order overallStage is SERVED
    for (const order of db.data.orders) {
      if (order.items && order.items.length > 0 && order.items.every((i) => i.itemStage === 'SERVED')) {
        if (order.overallStage !== 'SERVED' && order.overallStage !== 'PAID') {
          order.overallStage = 'SERVED';
        }
      }
    }

    const activeOrders = db.data.orders.filter((o) =>
      ['PLACED', 'PREPARING', 'READY'].includes(o.overallStage) &&
      o.items.some((i) => i.itemStage !== 'SERVED')
    );

    const seatMap = new Map(db.data.seats.map((s) => [s.id, s]));

    return activeOrders.map((o) => {
      const subtotal = (o.items || []).reduce((acc, curr) => acc + (curr.priceSnapshot || 0) * (curr.quantity || 1), 0);
      return {
        ...o,
        totalAmount: (o as any).totalAmount || subtotal,
        seat: seatMap.get(o.seatId),
      };
    });
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
