import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabaseClient';
import { getSocket } from './socket';
import { SOCKET_EVENTS, normalizeSeatIdentity } from '@seat-order/shared';

export function getBackendUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      const proto = window.location.protocol || 'http:';
      return `${proto}//${host}:4000`;
    }
  }
  return 'http://localhost:4000';
}

export interface OrderItemRecord {
  id?: string;
  order_id?: string;
  chair_id: string;
  seat_label: string;
  dish_id: string;
  dish_name: string;
  quantity: number;
  price: number;
  stage: 'PLACED' | 'REC' | 'PREP' | 'READY' | 'SERVED';
  notes?: string;
  addons?: string[];
}

export interface OrderRecord {
  id?: string;
  ticket_number: string;
  chair_id: string;
  seat_label: string;
  status: 'pending' | 'in_progress' | 'ready' | 'completed' | 'cancelled';
  total_amount: number;
  created_at?: string;
  items?: OrderItemRecord[];
  device_token?: string;
}

export interface DishAvailabilityRecord {
  dish_id: string;
  dish_name: string;
  is_available: boolean;
  updated_at?: string;
}

export interface SeatOccupancyRecord {
  chairId: string;
  ticketNumber: string;
  orderId: string;
  deviceToken: string;
  status: string;
  placedAt: number;
}

export interface ServiceAlertRecord {
  id: string;
  type: 'customer_call' | 'kitchen_ready';
  seatNumber: string;
  chairId?: string;
  dishId?: string;
  dishName?: string;
  itemId?: string;
  guestName?: string;
  title: string;
  message: string;
  timeAgo: string;
  billAmount?: number;
  kotNumber?: string;
  isUrgent: boolean;
  isResolved: boolean;
  createdAt: number;
}

export interface BillVerificationPayload {
  chairId: string;
  seatNumber: string;
  orderId: string;
  ticketNumber?: string;
  amount: number;
  items: Array<{ id?: string; title?: string; dish_name?: string; quantity: number; price: number }>;
  requestedAt: number;
}

let memoryBillRequests: Record<string, BillVerificationPayload> = {};

function getLocalBillRequests(): Record<string, BillVerificationPayload> {
  return memoryBillRequests;
}

function setLocalBillRequests(map: Record<string, BillVerificationPayload>): void {
  memoryBillRequests = map;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = getSupabaseClient();

// Local BroadcastChannel for real-time synchronization across browser tabs
const localChannel = typeof window !== 'undefined' ? new BroadcastChannel('thoogudeepa_kds_sync') : null;

const STORAGE_SHIFT_STATS_KEY = 'thoogudeepa_v2_waiter_shift_stats';

// In-memory singletons for active table occupancy, active orders, and service alerts
let memoryAlertsList: ServiceAlertRecord[] = [];
let memoryOccupancyMap: Record<string, SeatOccupancyRecord> = {};
let memoryOrdersList: { order: OrderRecord; items: OrderItemRecord[] }[] = [];

function getLocalAlertsList(): ServiceAlertRecord[] {
  return memoryAlertsList;
}

function setLocalAlertsList(list: ServiceAlertRecord[]): void {
  memoryAlertsList = list;
}

function getLocalOccupancyMap(): Record<string, SeatOccupancyRecord> {
  const now = Date.now();
  let changed = false;
  for (const key of Object.keys(memoryOccupancyMap)) {
    if (memoryOccupancyMap[key]?.placedAt && (now - memoryOccupancyMap[key].placedAt > 4 * 60 * 60 * 1000)) {
      delete memoryOccupancyMap[key];
      changed = true;
    }
  }
  return memoryOccupancyMap;
}

function setLocalOccupancyMap(map: Record<string, SeatOccupancyRecord>): void {
  memoryOccupancyMap = map;
}

function getLocalOrdersList(): { order: OrderRecord; items: OrderItemRecord[] }[] {
  return memoryOrdersList;
}

function setLocalOrdersList(list: { order: OrderRecord; items: OrderItemRecord[] }[]): void {
  memoryOrdersList = list;
}

export type KDSCallbacks = {
  onNewOrder?: (data: { order: OrderRecord; items: OrderItemRecord[] }) => void;
  onStageChange?: (data: { key: string; stage: 'PLACED' | 'REC' | 'PREP' | 'READY' | 'SERVED'; dishId?: string; chairId?: string; rawChairId?: string; normChairId?: string; paddedChairId?: string; ticketNumber?: string; dishName?: string; itemId?: string; itemIndex?: number; originalKey?: string }) => void;
  onTicketDispatched?: (data: { ticketNumber: string; chairId?: string }) => void;
  onAvailabilityChange?: (data: { dishId: string; isAvailable: boolean }) => void;
  onSeatOccupancyChange?: (data: { chairId: string; isOccupied: boolean }) => void;
  onNewAlert?: (alert: ServiceAlertRecord) => void;
  onResolveAlert?: (alertId: string) => void;
  onBillRequested?: (data: { chairId: string; rawChairId?: string; normChairId?: string; amount?: number; verification?: BillVerificationPayload }) => void;
  onBillModeActive?: (data: { chairId: string; rawChairId?: string; normChairId?: string; amount?: number; mode?: 'qr' | 'cash'; ticketNumber?: string }) => void;
  onCustomerPaidUpi?: (data: { chairId: string; rawChairId?: string; normChairId?: string; amount?: number; ticketNumber?: string }) => void;
  onBillSettled?: (data: { chairId: string; rawChairId?: string; normChairId?: string; amount?: number; paymentMethod?: string; ticketNumber?: string }) => void;
  onCashHandover?: (data: { id: string; staffId: string; staffName: string; amount: number; timestamp: string; receivedBy: string }) => void;
  onPromosUpdated?: (rules: any[]) => void;
  onClearAll?: () => void;
};

const activeKdsSubscribers = new Set<KDSCallbacks>();
let sharedSupabaseChannel: ReturnType<SupabaseClient['channel']> | null = null;
let sharedLocalListenerInitialized = false;
let sharedSocketBridgeInitialized = false;
const processedOrderIds = new Set<string>();

function initSocketBridge() {
  if (typeof window === 'undefined' || sharedSocketBridgeInitialized) return;
  sharedSocketBridgeInitialized = true;

  try {
    const socket = getSocket();

    const registerRooms = () => {
      if (typeof window === 'undefined') return;
      const path = window.location.pathname || '';
      if (path.startsWith('/seat/')) {
        const match = path.match(/\/seat\/([^\/]+)/);
        if (match && match[1]) {
          const norm = normalizeSeatIdentity(match[1]);
          socket.emit(SOCKET_EVENTS.JOIN_SEAT, { seatId: norm.seatId });
          socket.emit(SOCKET_EVENTS.JOIN_SEAT, { seatId: norm.chairId });
          socket.emit(SOCKET_EVENTS.JOIN_SEAT, { seatId: norm.paddedChairId });
        }
      } else if (path.startsWith('/kds') || path.startsWith('/kitchen')) {
        socket.emit(SOCKET_EVENTS.JOIN_KDS);
      } else if (path.startsWith('/waiter')) {
        socket.emit(SOCKET_EVENTS.JOIN_STAFF, { type: path.includes('tablet') ? 'tablet' : 'mobile' });
      } else if (path.startsWith('/manager')) {
        socket.emit(SOCKET_EVENTS.JOIN_MANAGER);
      } else {
        socket.emit(SOCKET_EVENTS.JOIN_KDS);
        socket.emit(SOCKET_EVENTS.JOIN_STAFF, { type: 'mobile' });
        socket.emit(SOCKET_EVENTS.JOIN_STAFF, { type: 'tablet' });
        socket.emit(SOCKET_EVENTS.JOIN_MANAGER);
      }
    };

    if (socket.connected) {
      registerRooms();
    }
    socket.on('connect', registerRooms);

    socket.on(SOCKET_EVENTS.ORDER_PLACED, (payload: any) => {
      const order = payload.order;
      if (!order) return;
      if (processedOrderIds.has(order.id) || (order.orderNumber && processedOrderIds.has(order.orderNumber))) return;
      processedOrderIds.add(order.id);
      if (order.orderNumber) processedOrderIds.add(order.orderNumber);

      const chairId = String(order.seatId || payload.seat?.id || '01');
      const orderRec: OrderRecord = {
        id: order.id,
        ticket_number: order.orderNumber,
        chair_id: chairId,
        seat_label: `SEAT ${chairId}`,
        status: 'pending',
        total_amount: payload.seat?.activeOrderTotal || 0,
        items: order.items?.map((it: any) => ({
          id: it.id,
          order_id: order.id,
          chair_id: chairId,
          seat_label: `SEAT ${chairId}`,
          dish_id: `dish-${it.menuItemId}`,
          dish_name: it.nameSnapshot,
          quantity: it.quantity,
          price: it.priceSnapshot,
          stage: it.itemStage === 'COOKING' ? 'PREP' : it.itemStage === 'READY' ? 'READY' : it.itemStage === 'SERVED' ? 'SERVED' : 'PLACED',
          notes: it.notes || '',
        })),
      };

      const currentLocals = getLocalOrdersList();
      const cleanTargetChair = chairId.replace(/[^0-9]/g, '');
      const updatedOrders = [
        { order: orderRec, items: orderRec.items || [] },
        ...currentLocals.filter((x) => {
          if (x.order.id === order.id) return false;
          if (order.orderNumber && x.order.ticket_number === order.orderNumber) return false;
          const xChair = (x.order.chair_id || '').replace(/[^0-9]/g, '');
          if (xChair === cleanTargetChair) {
            return false;
          }
          return true;
        }),
      ];
      setLocalOrdersList(updatedOrders);

      activeKdsSubscribers.forEach((cb) => {
        cb.onNewOrder?.({ order: orderRec, items: orderRec.items || [] });
        cb.onSeatOccupancyChange?.({ chairId, isOccupied: true });
      });
    });

    socket.on(SOCKET_EVENTS.ITEM_STAGE_UPDATED, (payload: any) => {
      const stageMap: Record<string, 'PLACED' | 'REC' | 'PREP' | 'READY' | 'SERVED'> = {
        QUEUED: 'PLACED',
        COOKING: 'PREP',
        READY: 'READY',
        SERVED: 'SERVED',
      };
      const stage = stageMap[payload.newStage] || 'PLACED';
      const chairId = String(payload.seatId);

      // Instantly update in-memory orders list
      try {
        const orders = getLocalOrdersList();
        const cleanChair = chairId.replace(/[^0-9]/g, '');
        const strItemId = String(payload.itemId);
        const strOrigKey = payload.originalKey ? String(payload.originalKey) : '';
        const cleanItemId = strItemId.replace(/-[0-9]+$/, '');
        const cleanOrigKey = strOrigKey.replace(/-[0-9]+$/, '');

        const cleanChairNum = chairId.replace(/[^0-9]/g, '').replace(/^0+/, '');

        orders.forEach((o) => {
          const oNum = (o.order.chair_id || '').replace(/[^0-9]/g, '').replace(/^0+/, '');
          if (!cleanChairNum || oNum === cleanChairNum) {
            o.items.forEach((it) => {
              const matches =
                it.id === strItemId ||
                it.id === cleanItemId ||
                it.id === strOrigKey ||
                it.id === cleanOrigKey ||
                (payload.dishId && (it.dish_id === payload.dishId || (it.dish_id || '').replace(/^dish-/, '') === payload.dishId.replace(/^dish-/, ''))) ||
                (payload.dishName && it.dish_name?.toLowerCase().trim() === payload.dishName.toLowerCase().trim());
              if (matches) {
                it.stage = stage;
                if (stage === 'SERVED') {
                  const addons = Array.isArray(it.addons) ? [...it.addons] : [];
                  if (!addons.includes('SERVED')) addons.push('SERVED');
                  it.addons = addons;
                }
              }
            });
          }
        });
        setLocalOrdersList(orders);
      } catch {}

      activeKdsSubscribers.forEach((cb) => {
        cb.onStageChange?.({
          key: payload.itemId,
          stage,
          chairId,
          itemId: payload.itemId,
          dishId: payload.dishId,
          dishName: payload.dishName,
          originalKey: payload.originalKey,
        });
      });
    });

    const handleRemoteSeatVacated = (seatIdentifier: string | number, amount?: number, paymentId?: string) => {
      const rawStr = String(seatIdentifier || '').trim();
      const numStr = rawStr.replace(/[^0-9]/g, '').replace(/^0+/, '');
      if (!numStr) return;
      const paddedStr = numStr.padStart(2, '0');
      const possibleChairs = [
        rawStr,
        numStr,
        paddedStr,
        `Seat ${numStr}`,
        `Seat ${paddedStr}`,
        `Chair ${numStr}`,
        `Chair ${paddedStr}`,
        `SEAT ${numStr}`,
        `SEAT ${paddedStr}`,
      ];

      // 1. Purge from local occupancy map
      const map = getLocalOccupancyMap();
      for (const k of possibleChairs) {
        delete map[k];
      }
      for (const k of Object.keys(map)) {
        const kNum = k.replace(/[^0-9]/g, '').replace(/^0+/, '');
        if (kNum === numStr) {
          delete map[k];
        }
      }
      setLocalOccupancyMap(map);

      // 2. Purge from local orders list strictly for this seat
      const orders = getLocalOrdersList();
      const updated = orders.filter((o) => {
        const oRaw = (o.order.chair_id || '').trim();
        const oNum = oRaw.replace(/[^0-9]/g, '').replace(/^0+/, '');
        if (oNum === numStr || possibleChairs.includes(oRaw)) {
          return false;
        }
        return true;
      });
      setLocalOrdersList(updated);

      // 3. Clear localStorage / sessionStorage caches
      if (typeof window !== 'undefined') {
        try {
          const keys = [numStr, paddedStr, `Seat ${numStr}`, `Seat ${paddedStr}`];
          for (const k of keys) {
            localStorage.removeItem(`thoogudeepa_item_stages_${k}`);
            localStorage.removeItem(`thoogudeepa_dining_session_${k}`);
            localStorage.removeItem(`thoogudeepa_active_ticket_${k}`);
            sessionStorage.removeItem(`thoogudeepa_cart_items_${k}`);
          }
        } catch {}
      }

      // 4. Clear active bill requests
      for (const k of possibleChairs) {
        realtimeBridge.clearActiveBillRequest(k);
      }

      // 5. Instantly notify all subscribers across components with normalized chair representations
      activeKdsSubscribers.forEach((cb) => {
        cb.onSeatOccupancyChange?.({ chairId: numStr, isOccupied: false });
        cb.onSeatOccupancyChange?.({ chairId: paddedStr, isOccupied: false });
        cb.onBillSettled?.({
          chairId: numStr,
          rawChairId: rawStr,
          normChairId: numStr,
          amount,
          ticketNumber: paymentId,
        });
      });
    };

    socket.on(SOCKET_EVENTS.SEAT_CLAIMED, (payload: any) => {
      activeKdsSubscribers.forEach((cb) => {
        cb.onSeatOccupancyChange?.({ chairId: String(payload.seatId), isOccupied: true });
      });
    });

    socket.on(SOCKET_EVENTS.SEAT_VACATED, (payload: any) => {
      handleRemoteSeatVacated(payload.seatId || payload.chairId);
    });

    socket.on(SOCKET_EVENTS.PAYMENT_SUCCESS, (payload: any) => {
      handleRemoteSeatVacated(payload.seatId || payload.chairId, payload.amount, payload.paymentId);
    });

    socket.on(SOCKET_EVENTS.SEAT_STATUS_UPDATED, (payload: any) => {
      if (payload.status === 'VACANT') {
        handleRemoteSeatVacated(payload.seatId);
      } else if (payload.status === 'OCCUPIED') {
        const chairStr = String(payload.seatId);
        activeKdsSubscribers.forEach((cb) => {
          cb.onSeatOccupancyChange?.({ chairId: chairStr, isOccupied: true });
        });
      }
    });

    socket.on(SOCKET_EVENTS.MENU_ITEM_AVAILABILITY_CHANGED, (payload: any) => {
      activeKdsSubscribers.forEach((cb) => {
        cb.onAvailabilityChange?.({ dishId: `dish-${payload.itemId}`, isAvailable: payload.isAvailable });
      });
    });

    socket.on(SOCKET_EVENTS.WAITER_CALLED, (payload: any) => {
      const isBill = payload.reason === 'BILL' || payload.alert?.type === 'customer_call' || String(payload.alert?.title || '').toLowerCase().includes('bill');
      const amt = payload.amount || payload.alert?.billAmount;
      const numSeat = Number(payload.seatId) || 0;
      const cleanChair = String(numSeat);
      const normChair = cleanChair.replace(/^0+/, '') || '0';

      const alert: ServiceAlertRecord = payload.alert || {
        id: `call-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        type: 'customer_call',
        seatNumber: payload.seatNumber || `Seat ${numSeat}`,
        chairId: normChair,
        dishId: undefined,
        dishName: undefined,
        itemId: undefined,
        guestName: 'Guest',
        title: isBill ? `Bill Requested (${amt ? `₹${amt}` : ''})` : `Seat ${payload.seatNumber || numSeat} Assistance`,
        message: isBill ? `Bill settlement requested for Seat ${numSeat}: ₹${amt || ''}` : `Guest requested ${payload.reason || 'assistance'}`,
        timeAgo: 'Just now',
        billAmount: amt,
        kotNumber: undefined,
        isUrgent: true,
        isResolved: false,
        createdAt: Date.now(),
      };

      // Ensure alert is persistently registered in local list so refreshAlerts doesn't wipe it
      const currentAlerts = getLocalAlertsList();
      const nextAlerts = [alert, ...currentAlerts.filter(a => a.id !== alert.id && (a.chairId !== normChair || a.type !== alert.type))];
      setLocalAlertsList(nextAlerts);

      // If bill was requested, also mark seat status as billing and populate bill request record
      if (isBill) {
        const requests = getLocalBillRequests();
        const billPayload: BillVerificationPayload = {
          chairId: cleanChair,
          seatNumber: payload.seatNumber || `Seat ${cleanChair}`,
          orderId: payload.orderId || '',
          ticketNumber: payload.ticketNumber || '',
          amount: amt || 0,
          items: payload.items || [],
          requestedAt: Date.now(),
        };
        requests[cleanChair] = billPayload;
        requests[normChair] = billPayload;
        setLocalBillRequests(requests);

        const occMap = getLocalOccupancyMap();
        if (occMap[cleanChair]) occMap[cleanChair].status = 'billing';
        if (occMap[normChair]) occMap[normChair].status = 'billing';
        setLocalOccupancyMap(occMap);

        activeKdsSubscribers.forEach((cb) => {
          cb.onBillRequested?.({
            chairId: cleanChair,
            rawChairId: String(payload.seatId),
            normChairId: normChair,
            amount: amt,
            verification: billPayload,
          });
          cb.onSeatOccupancyChange?.({ chairId: cleanChair, isOccupied: true });
        });
      }

      activeKdsSubscribers.forEach((cb) => {
        cb.onNewAlert?.(alert);
      });
    });

    socket.on('bill:requested', (payload: any) => {
      const numSeat = Number(payload.seatId) || 0;
      const cleanChair = String(numSeat);
      const normChair = cleanChair.replace(/^0+/, '') || '0';
      activeKdsSubscribers.forEach((cb) => {
        cb.onBillRequested?.({
          chairId: cleanChair,
          rawChairId: String(payload.seatId),
          normChairId: normChair,
          amount: payload.amount,
          verification: payload.verification || payload,
        });
      });
    });

    socket.on('alert:resolved', ({ alertId }: { alertId: string }) => {
      const currentAlerts = getLocalAlertsList();
      setLocalAlertsList(currentAlerts.filter(a => a.id !== alertId));
      activeKdsSubscribers.forEach((cb) => {
        cb.onResolveAlert?.(alertId);
      });
    });

    socket.on('bill:settled', (payload: any) => {
      handleRemoteSeatVacated(payload.seatId || payload.chairId, payload.amount, payload.paymentId);
      const cleanChair = String(payload.seatId || payload.chairId || '').replace(/[^0-9]/g, '');
      const normChair = cleanChair.replace(/^0+/, '') || cleanChair;
      const paddedChair = cleanChair.padStart(2, '0');
      activeKdsSubscribers.forEach((cb) => {
        cb.onBillSettled?.({
          chairId: cleanChair,
          rawChairId: String(payload.chairId || payload.seatId),
          normChairId: normChair,
          amount: payload.amount,
          paymentMethod: payload.paymentMethod,
          ticketNumber: payload.paymentId,
        });
        cb.onSeatOccupancyChange?.({ chairId: cleanChair, isOccupied: false });
        cb.onSeatOccupancyChange?.({ chairId: normChair, isOccupied: false });
        cb.onSeatOccupancyChange?.({ chairId: paddedChair, isOccupied: false });
      });
    });

    socket.on('bill:mode:active', (payload: any) => {
      const cleanChair = String(payload.chairId || payload.seatId || '').replace(/[^0-9]/g, '');
      const normChair = cleanChair.replace(/^0+/, '') || cleanChair;
      const mode = payload.mode === 'cash' ? 'cash' : 'qr';
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`thoogudeepa_waiter_mode_${cleanChair}`, mode);
          localStorage.setItem(`thoogudeepa_waiter_mode_${normChair}`, mode);
          localStorage.setItem(`thoogudeepa_waiter_called_${cleanChair}`, 'true');
          localStorage.setItem(`thoogudeepa_waiter_called_${normChair}`, 'true');
          sessionStorage.setItem(`thoogudeepa_waiter_mode_${cleanChair}`, mode);
          sessionStorage.setItem(`thoogudeepa_waiter_mode_${normChair}`, mode);
          sessionStorage.setItem(`thoogudeepa_waiter_called_${cleanChair}`, 'true');
          sessionStorage.setItem(`thoogudeepa_waiter_called_${normChair}`, 'true');
        } catch {}
      }
      activeKdsSubscribers.forEach((cb) => {
        cb.onBillModeActive?.({
          chairId: cleanChair,
          rawChairId: String(payload.chairId || payload.seatId),
          normChairId: normChair,
          amount: payload.amount,
          mode,
          ticketNumber: payload.ticketNumber,
        });
      });
    });
  } catch (err) {
    console.warn('Socket bridge initialization:', err);
  }
}

function initSharedRealtimeChannel() {
  if (!supabase || sharedSupabaseChannel) return;
  sharedSupabaseChannel = supabase
    .channel('kitchen_realtime_feed', {
      config: { broadcast: { self: true } }
    })
    .on('broadcast', { event: 'NEW_ORDER' }, (msg) => {
      const ordId = msg.payload?.order?.id;
      if (ordId) {
        if (processedOrderIds.has(ordId)) return;
        processedOrderIds.add(ordId);
      }
      activeKdsSubscribers.forEach((cb) => {
        if (cb.onNewOrder && msg.payload) {
          cb.onNewOrder(msg.payload);
        }
        if (cb.onSeatOccupancyChange && msg.payload?.order?.chair_id) {
          cb.onSeatOccupancyChange({ chairId: msg.payload.order.chair_id, isOccupied: true });
        }
      });
    })
    .on('broadcast', { event: 'STAGE_CHANGE' }, (msg) => {
      activeKdsSubscribers.forEach((cb) => {
        if (cb.onStageChange && msg.payload) {
          cb.onStageChange(msg.payload);
        }
      });
    })
    .on('broadcast', { event: 'TICKET_DISPATCHED' }, (msg) => {
      activeKdsSubscribers.forEach((cb) => {
        if (cb.onTicketDispatched && msg.payload) {
          cb.onTicketDispatched(msg.payload);
        }
      });
    })
    .on('broadcast', { event: 'NEW_ALERT' }, (msg) => {
      activeKdsSubscribers.forEach((cb) => {
        if (cb.onNewAlert && msg.payload) {
          cb.onNewAlert(msg.payload);
        }
      });
    })
    .on('broadcast', { event: 'RESOLVE_ALERT' }, (msg) => {
      activeKdsSubscribers.forEach((cb) => {
        if (cb.onResolveAlert && msg.payload?.alertId) {
          cb.onResolveAlert(msg.payload.alertId);
        }
      });
    })
    .on('broadcast', { event: 'BILL_REQUESTED' }, (msg) => {
      if (msg.payload) {
        const verification: BillVerificationPayload = {
          chairId: msg.payload.chairId,
          seatNumber: msg.payload.seatNumber || `Seat ${msg.payload.chairId}`,
          orderId: msg.payload.orderId || '',
          ticketNumber: msg.payload.ticketNumber,
          amount: msg.payload.amount || 0,
          items: msg.payload.items || [],
          requestedAt: msg.payload.requestedAt || Date.now(),
        };
        activeKdsSubscribers.forEach((cb) => {
          if (cb.onBillRequested) {
            cb.onBillRequested({
              chairId: msg.payload.chairId,
              amount: msg.payload.amount,
              verification,
            });
          }
        });
      }
    })
    .on('broadcast', { event: 'BILL_MODE_ACTIVE' }, (msg) => {
      activeKdsSubscribers.forEach((cb) => {
        if (cb.onBillModeActive && msg.payload) {
          cb.onBillModeActive(msg.payload);
        }
      });
    })
    .on('broadcast', { event: 'CUSTOMER_PAID_UPI' }, (msg) => {
      activeKdsSubscribers.forEach((cb) => {
        if (cb.onCustomerPaidUpi && msg.payload) {
          cb.onCustomerPaidUpi(msg.payload);
        }
      });
    })
    .on('broadcast', { event: 'BILL_SETTLED' }, (msg) => {
      const targetChair = msg.payload?.chairId || msg.payload?.rawChairId || msg.payload?.normChairId;
      if (targetChair) {
        realtimeBridge.releaseSeat(targetChair);
      }
      activeKdsSubscribers.forEach((cb) => {
        if (cb.onBillSettled && msg.payload) {
          cb.onBillSettled(msg.payload);
        }
        if (cb.onSeatOccupancyChange && targetChair) {
          cb.onSeatOccupancyChange({ chairId: targetChair, isOccupied: false });
        }
      });
    })
    .on('broadcast', { event: 'SEAT_RELEASED' }, (msg) => {
      const targetChair = msg.payload?.chairId || msg.payload?.rawChairId || msg.payload?.normChairId;
      if (targetChair) {
        realtimeBridge.releaseSeat(targetChair);
      }
      activeKdsSubscribers.forEach((cb) => {
        if (cb.onSeatOccupancyChange && targetChair) {
          cb.onSeatOccupancyChange({ chairId: targetChair, isOccupied: false });
        }
      });
    })
    .on('broadcast', { event: 'SEAT_OCCUPIED' }, (msg) => {
      const targetChair = msg.payload?.chairId;
      if (targetChair) {
        activeKdsSubscribers.forEach((cb) => {
          if (cb.onSeatOccupancyChange) {
            cb.onSeatOccupancyChange({ chairId: targetChair, isOccupied: true });
          }
        });
      }
    })
    .on('broadcast', { event: 'CASH_HANDOVER' }, (msg) => {
      activeKdsSubscribers.forEach((cb) => {
        if (cb.onCashHandover && msg.payload?.handover) {
          cb.onCashHandover(msg.payload.handover);
        }
      });
    })
    .on('broadcast', { event: 'CLEAR_ALL_ORDERS' }, () => {
      activeKdsSubscribers.forEach((cb) => {
        if (cb.onClearAll) {
          cb.onClearAll();
        }
      });
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
      const newOrder = payload.new as OrderRecord;
      if (!newOrder?.id) return;
      if (processedOrderIds.has(newOrder.id)) return;

      const fetchAndDispatch = async (attempt = 1) => {
        if (!supabase) return;
        const { data: fetchedItems } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', newOrder.id);

        if ((!fetchedItems || fetchedItems.length === 0) && attempt < 3) {
          setTimeout(() => { fetchAndDispatch(attempt + 1); }, 200);
          return;
        }

        if (newOrder.id) {
          processedOrderIds.add(newOrder.id);
        }
        activeKdsSubscribers.forEach((cb) => {
          if (cb.onNewOrder) {
            cb.onNewOrder({ order: newOrder, items: fetchedItems || [] });
          }
          if (cb.onSeatOccupancyChange && newOrder?.chair_id) {
            cb.onSeatOccupancyChange({ chairId: newOrder.chair_id, isOccupied: true });
          }
        });
      };

      fetchAndDispatch();
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
      const updOrder = payload.new as OrderRecord;
      if (updOrder && (updOrder.status === 'completed' || updOrder.status === 'cancelled') && updOrder.chair_id) {
        activeKdsSubscribers.forEach((cb) => {
          if (cb.onSeatOccupancyChange) {
            cb.onSeatOccupancyChange({ chairId: updOrder.chair_id, isOccupied: false });
          }
          if (cb.onBillSettled) {
            cb.onBillSettled({ chairId: updOrder.chair_id, amount: updOrder.total_amount, ticketNumber: updOrder.ticket_number });
          }
        });
      }
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_items' }, (payload) => {
      const row = payload.new as any;
      if (!row || !row.order_id) return;
      activeKdsSubscribers.forEach((cb) => {
        if (cb.onNewOrder) {
          // If we receive an individual inserted item and the order already exists, broadcast update
          cb.onStageChange?.({
            key: row.id || row.dish_id,
            stage: row.stage || 'PLACED',
            dishId: row.dish_id,
            chairId: row.chair_id,
            itemId: row.id,
            dishName: row.dish_name,
          });
        }
      });
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'order_items' }, (payload) => {
      const row = payload.new as any;
      const addons = Array.isArray(row.addons) ? row.addons : [];
      let effStage: 'PLACED' | 'REC' | 'PREP' | 'READY' | 'SERVED' = 'PLACED';
      if (addons.includes('SERVED') || row.stage === 'SERVED') {
        effStage = 'SERVED';
      } else if (row.stage === 'READY') {
        effStage = 'READY';
      } else if (row.stage === 'PREP') {
        effStage = 'PREP';
      } else if (row.stage === 'REC' && !addons.includes('PLACED')) {
        effStage = 'REC';
      } else {
        effStage = 'PLACED';
      }
      activeKdsSubscribers.forEach((cb) => {
        if (cb.onStageChange) {
          cb.onStageChange({
            key: row.id || row.dish_id,
            stage: effStage,
            dishId: row.dish_id,
            chairId: row.chair_id,
            itemId: row.id,
            dishName: row.dish_name,
          });
        }
      });
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'dish_inventory' }, (payload) => {
      const row = payload.new as DishAvailabilityRecord;
      activeKdsSubscribers.forEach((cb) => {
        if (cb.onAvailabilityChange) {
          cb.onAvailabilityChange({ dishId: row.dish_id, isAvailable: row.is_available });
        }
      });
    })
    .subscribe((status) => {
      if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        sharedSupabaseChannel = null;
        setTimeout(() => {
          initSharedRealtimeChannel();
        }, 1200);
      }
    });
}

function broadcastRealtime(event: string, payload: any) {
  // 1. Instantaneous synchronous dispatch to active subscribers in current tab (0ms latency)
  activeKdsSubscribers.forEach((cb) => {
    try {
      if (event === 'STAGE_CHANGE' && cb.onStageChange) {
        cb.onStageChange(payload);
      } else if (event === 'NEW_ORDER' && cb.onNewOrder) {
        cb.onNewOrder(payload);
      } else if (event === 'TICKET_DISPATCHED' && cb.onTicketDispatched) {
        cb.onTicketDispatched(payload);
      } else if (event === 'NEW_ALERT' && cb.onNewAlert) {
        cb.onNewAlert(payload);
      } else if (event === 'RESOLVE_ALERT' && cb.onResolveAlert) {
        cb.onResolveAlert(payload?.alertId || payload);
      } else if (event === 'BILL_REQUESTED' && cb.onBillRequested) {
        cb.onBillRequested(payload);
      } else if (event === 'BILL_MODE_ACTIVE' && cb.onBillModeActive) {
        cb.onBillModeActive(payload);
      } else if (event === 'CUSTOMER_PAID_UPI' && cb.onCustomerPaidUpi) {
        cb.onCustomerPaidUpi(payload);
      } else if (event === 'BILL_SETTLED' && cb.onBillSettled) {
        cb.onBillSettled(payload);
      } else if (event === 'SEAT_RELEASED' && cb.onSeatOccupancyChange) {
        cb.onSeatOccupancyChange({ chairId: payload?.chairId, isOccupied: false });
      } else if (event === 'SEAT_OCCUPIED' && cb.onSeatOccupancyChange) {
        cb.onSeatOccupancyChange({ chairId: payload?.chairId, isOccupied: true });
      } else if (event === 'CASH_HANDOVER' && cb.onCashHandover) {
        cb.onCashHandover(payload);
      } else if (event === 'CLEAR_ALL_ORDERS' && cb.onClearAll) {
        cb.onClearAll();
      }
    } catch {}
  });

  // 2. Same-device cross-tab BroadcastChannel (<5ms latency)
  if (localChannel) {
    try {
      localChannel.postMessage({ type: event, ...payload, payload });
    } catch {}
  }

  // 3. Cross-device Supabase Realtime broadcast (<50ms latency)
  if (supabase) {
    if (!sharedSupabaseChannel) {
      initSharedRealtimeChannel();
    }
    if (sharedSupabaseChannel) {
      sharedSupabaseChannel.send({ type: 'broadcast', event, payload }).catch(() => {});
    }
  }

  // 4. Cross-device WebSocket broadcast engine (<5ms latency)
  try {
    const sock = getSocket();
    if (sock && sock.connected) {
      if (event === 'BILL_SETTLED') {
        sock.emit('bill:settled', payload);
      } else if (event === 'SEAT_RELEASED') {
        sock.emit('seat:released', payload);
      } else if (event === 'BILL_MODE_ACTIVE') {
        sock.emit('bill:mode:active', payload);
      }
    }
  } catch {}
}

export const realtimeBridge = {
  // Post order to Fastify backend (primary source of truth), update Supabase & local resilience store, and broadcast
  async placeOrder(order: OrderRecord, items: OrderItemRecord[]): Promise<{ success: boolean; orderId?: string; ticketNumber?: string }> {
    try {
      const deviceToken = order.device_token || '';
      const generatedId = `ord-${Date.now()}`;
      const cleanChair = order.chair_id.replace(/[^0-9]/g, '');
      const cleanSeatId = Number(cleanChair) || 1;

      // 1. Authoritative Fastify backend sync (PRIMARY SOURCE OF TRUTH)
      let backendOrderId = generatedId;
      let backendTicketNumber = order.ticket_number;
      try {
        const apiItems = items.map((it) => ({
          menuItemId: Number(it.dish_id.replace(/[^0-9]/g, '')) || 1,
          quantity: it.quantity,
          notes: it.notes || undefined,
        }));
        const res = await fetch(`${getBackendUrl()}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-device-token': deviceToken,
          },
          body: JSON.stringify({
            seatId: cleanSeatId,
            deviceToken,
            items: apiItems,
            createdByRole: 'CUSTOMER',
          }),
        });

        if (res.status === 409) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'SEAT_ALREADY_OCCUPIED: Seat is currently occupied by another customer.');
        }

        if (res.ok) {
          const resData = await res.json();
          if (resData?.order) {
            backendOrderId = resData.order.id;
            backendTicketNumber = resData.order.orderNumber;
            processedOrderIds.add(backendOrderId);
            if (backendTicketNumber) processedOrderIds.add(backendTicketNumber);
          }
        }
        processedOrderIds.add(generatedId);
      } catch (e: any) {
        if (e?.message?.includes('SEAT_ALREADY_OCCUPIED') || e?.message?.includes('ACTIVE_SESSION_EXISTS')) {
          throw e;
        }
        console.warn('Backend order placement warning:', e);
      }

      // 2. Authoritative Order Record strictly matching server orderNumber (ORD-XXXX)
      const authoritativeOrder: OrderRecord = {
        ...order,
        id: backendOrderId,
        ticket_number: backendTicketNumber,
      };

      // 3. Record seat occupancy locally & broadcast
      const occupancyMap = getLocalOccupancyMap();
      occupancyMap[order.chair_id] = {
        chairId: order.chair_id,
        ticketNumber: backendTicketNumber,
        orderId: backendOrderId,
        deviceToken,
        status: order.status || 'pending',
        placedAt: Date.now(),
      };
      setLocalOccupancyMap(occupancyMap);

      const confirmedItems = items.map((it, idx) => ({
        ...it,
        order_id: backendOrderId,
        id: `${backendOrderId}-${it.dish_id}-${idx}`,
        stage: 'PLACED' as const,
      }));

      // 4. Remote Supabase insertion if connected (strictly matching authoritative backend data)
      if (supabase) {
        try {
          const { data: orderData, error: orderErr } = await supabase
            .from('orders')
            .insert({
              ticket_number: backendTicketNumber,
              chair_id: order.chair_id,
              seat_label: order.seat_label,
              status: order.status || 'pending',
              total_amount: order.total_amount,
            })
            .select('id')
            .single();

          if (!orderErr && orderData) {
            processedOrderIds.add(orderData.id);
            const itemsToInsert = confirmedItems.map((it) => ({
              order_id: orderData.id,
              chair_id: it.chair_id,
              seat_label: it.seat_label,
              dish_id: it.dish_id,
              dish_name: it.dish_name,
              quantity: it.quantity,
              price: it.price,
              stage: 'REC' as const,
              notes: it.notes || '',
              addons: ['PLACED'],
            }));
            await supabase.from('order_items').insert(itemsToInsert);
          }
        } catch (supabaseErr) {
          console.warn('Supabase sync warning:', supabaseErr);
        }
      }

      // 5. Purge any temporary client-draft orders or phantom tickets for this chair
      const currentLocals = getLocalOrdersList();
      const filteredLocals = currentLocals.filter((x) => {
        const xChair = (x.order.chair_id || '').replace(/[^0-9]/g, '');
        if (xChair === cleanChair) return false;
        return x.order.id !== backendOrderId && x.order.id !== generatedId;
      });

      const updatedOrders = [
        {
          order: authoritativeOrder,
          items: confirmedItems,
        },
        ...filteredLocals,
      ];
      setLocalOrdersList(updatedOrders);

      // Broadcast across tabs and cross-device
      broadcastRealtime('SEAT_OCCUPIED', {
        chairId: order.chair_id,
        occupancy: occupancyMap[order.chair_id],
      });
      broadcastRealtime('NEW_ORDER', {
        order: authoritativeOrder,
        items: confirmedItems,
      });

      return { success: true, orderId: backendOrderId, ticketNumber: backendTicketNumber };
    } catch (err) {
      console.error('Error placing order:', err);
      const generatedId = `local-${Date.now()}`;
      if (localChannel) {
        localChannel.postMessage({
          type: 'NEW_ORDER',
          order: { ...order, id: generatedId },
          items,
        });
      }
      return { success: true, orderId: generatedId };
    }
  },

  // Check seat occupancy state (Anti-Hijack & Anti-Cheat Check)
  async getSeatOccupancy(chairId: string, currentDeviceToken: string): Promise<{
    isOccupied: boolean;
    isOwner: boolean;
    ticketNumber?: string;
    orderStatus?: string;
    placedAt?: number;
    activeSeatIdForDevice?: number | null;
  }> {
    try {
      const cleanChair = chairId.replace(/[^0-9]/g, '');
      const cleanSeatId = cleanChair === '' ? (chairId.toLowerCase().includes('takeaway') ? 0 : 1) : Number(cleanChair);

      // 1. Authoritative Backend Check (PRIMARY SOURCE OF TRUTH)
      try {
        const res = await fetch(`${getBackendUrl()}/api/seats/${cleanSeatId}/occupancy?deviceToken=${encodeURIComponent(currentDeviceToken)}`, {
          headers: { 'x-device-token': currentDeviceToken },
        });
        if (res.ok) {
          const occ = await res.json();
          return {
            isOccupied: Boolean(occ.isOccupied),
            isOwner: Boolean(occ.isOwner),
            ticketNumber: occ.ticketNumber,
            orderStatus: occ.orderStatus,
            activeSeatIdForDevice: occ.activeSeatIdForDevice,
          };
        }
      } catch {
        // Backend temporarily unreachable, fall back to Supabase/local
      }

      const paddedChair = cleanChair ? cleanChair.padStart(2, '0') : '00';
      const unpaddedChair = cleanChair ? cleanChair.replace(/^0+/, '') : '0';

      // 2. Check remote database if online
      if (supabase) {
        const { data: activeOrder, error } = await supabase
          .from('orders')
          .select('*')
          .in('chair_id', [chairId, paddedChair, unpaddedChair, cleanChair])
          .in('status', ['pending', 'in_progress', 'ready'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && activeOrder) {
          const orderDeviceToken = (activeOrder as any).device_token;
          const isOwner = Boolean(
            currentDeviceToken &&
            orderDeviceToken &&
            orderDeviceToken === currentDeviceToken
          );
          return {
            isOccupied: true,
            isOwner,
            ticketNumber: activeOrder.ticket_number,
            orderStatus: activeOrder.status,
          };
        }
      }

      // 3. Check in-memory occupancy registry
      const map = getLocalOccupancyMap();
      const localRecord = map[chairId] || map[paddedChair] || map[unpaddedChair] || map[cleanChair];

      if (localRecord && localRecord.status !== 'completed' && localRecord.status !== 'cancelled') {
        const isOwner = Boolean(
          !localRecord.deviceToken ||
          (currentDeviceToken && localRecord.deviceToken === currentDeviceToken)
        );
        return {
          isOccupied: true,
          isOwner,
          ticketNumber: localRecord.ticketNumber,
          orderStatus: localRecord.status,
          placedAt: localRecord.placedAt,
        };
      }

      return { isOccupied: false, isOwner: false };
    } catch (err) {
      console.error('Error checking seat occupancy:', err);
      return { isOccupied: false, isOwner: false };
    }
  },

  // Release a seat (e.g. upon payment or checkout)
  async releaseSeat(chairId: string): Promise<boolean> {
    try {
      const rawStr = String(chairId || '').trim();
      const numStr = rawStr.replace(/[^0-9]/g, '').replace(/^0+/, '');
      if (!rawStr && !numStr) return true;
      const paddedStr = numStr ? numStr.padStart(2, '0') : '00';
      const possibleChairs = [
        rawStr,
        numStr,
        paddedStr,
        `Seat ${numStr}`,
        `Seat ${paddedStr}`,
        `Chair ${numStr}`,
        `Chair ${paddedStr}`,
        `SEAT ${numStr}`,
        `SEAT ${paddedStr}`,
        'TK-01',
        'Takeaway',
      ];

      // Remove from local occupancy registry
      const map = getLocalOccupancyMap();
      for (const k of possibleChairs) {
        delete map[k];
      }
      for (const k of Object.keys(map)) {
        const kNum = k.replace(/[^0-9]/g, '').replace(/^0+/, '');
        if (kNum === numStr) {
          delete map[k];
        }
      }
      setLocalOccupancyMap(map);

      // Remove from local orders list strictly for this seat
      const orders = getLocalOrdersList();
      const updated = orders.filter((o) => {
        const oRaw = (o.order.chair_id || '').trim();
        const oNum = oRaw.replace(/[^0-9]/g, '').replace(/^0+/, '');
        if (oNum === numStr || possibleChairs.includes(oRaw)) {
          return false;
        }
        return true;
      });
      setLocalOrdersList(updated);

      // Clear seat-specific cached item stages and dining session
      if (typeof window !== 'undefined') {
        try {
          const keys = [numStr, paddedStr, `Seat ${numStr}`, `Seat ${paddedStr}`, rawStr, 'TK-01'];
          for (const k of keys) {
            if (k) {
              localStorage.removeItem(`thoogudeepa_item_stages_${k}`);
              localStorage.removeItem(`thoogudeepa_dining_session_${k}`);
              localStorage.removeItem(`thoogudeepa_active_ticket_${k}`);
              sessionStorage.removeItem(`thoogudeepa_cart_items_${k}`);
            }
          }
          // Also purge any active dining session if it was for this seat
          const curSessRaw = localStorage.getItem('thoogudeepa_v2_active_dining_session');
          if (curSessRaw) {
            const parsed = JSON.parse(curSessRaw);
            const sessSeatNum = (parsed.seatId || '').replace(/[^0-9]/g, '').replace(/^0+/, '');
            if (sessSeatNum === numStr || parsed.seatId === rawStr || parsed.seatId === paddedStr) {
              localStorage.removeItem('thoogudeepa_v2_active_dining_session');
            }
          }
        } catch {}
      }

      // Resolve any pending alerts for this seat
      const alerts = getLocalAlertsList();
      const nextAlerts = alerts.map((a) => {
        const aSeatClean = a.seatNumber.replace(/[^0-9]/g, '').replace(/^0+/, '');
        if (aSeatClean === numStr || possibleChairs.includes(a.seatNumber)) {
          return { ...a, isResolved: true };
        }
        return a;
      });
      setLocalAlertsList(nextAlerts);

      // Mark orders completed in Supabase database so seat returns as vacant on all devices
      if (supabase) {
        try {
          await supabase
            .from('orders')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .in('chair_id', possibleChairs)
            .in('status', ['pending', 'in_progress', 'ready']);
        } catch (dbErr) {
          console.warn('Database release seat update notice:', dbErr);
        }
      }

      broadcastRealtime('SEAT_RELEASED', {
        chairId: numStr,
        rawChairId: chairId,
        normChairId: numStr,
      });

      return true;
    } catch {
      return false;
    }
  },

  // Update item stage with seat and dish metadata
  async updateStage(
    itemIdOrKey: string,
    stage: 'PLACED' | 'REC' | 'PREP' | 'READY' | 'SERVED',
    meta?: { chairId?: string; dishId?: string; ticketNumber?: string; dishName?: string; itemId?: string; itemIndex?: number }
  ): Promise<boolean> {
    try {
      // 1. Update in local orders list strictly for matching item
      const orders = getLocalOrdersList();
      const cleanChair = meta?.chairId ? meta.chairId.replace(/[^0-9]/g, '') : '';
      const tNum = meta?.ticketNumber || '';
      const targetItemId = meta?.itemId || itemIdOrKey;

      const cleanTargetId = targetItemId ? targetItemId.replace(/-[0-9]+$/, '') : '';
      const cleanKey = itemIdOrKey ? itemIdOrKey.replace(/-[0-9]+$/, '') : '';

      let hasUpdatedLocally = false;
      orders.forEach((o) => {
        const oChair = o.order.chair_id ? o.order.chair_id.replace(/[^0-9]/g, '') : '';
        const isTargetChair = !cleanChair || oChair === cleanChair || o.order.chair_id === meta?.chairId;
        const isTargetTicket =
          !tNum ||
          o.order.ticket_number === tNum ||
          tNum.includes(o.order.ticket_number || '') ||
          (o.order.ticket_number && tNum.split(/[•,\s]+/).some((part) => part.trim() === o.order.ticket_number));
        if (isTargetChair && isTargetTicket) {
          o.items.forEach((it) => {
            if (hasUpdatedLocally) return;

            const isExactMatch = Boolean(
              (targetItemId && it.id && it.id === targetItemId) ||
              (itemIdOrKey && it.id && it.id === itemIdOrKey) ||
              (cleanTargetId && it.id && it.id === cleanTargetId) ||
              (cleanKey && it.id && it.id === cleanKey)
            );

            const isFallbackMatch = !isExactMatch && Boolean(
              (meta?.dishId && ((it.dish_id === meta.dishId) || (meta.dishId.replace(/^dish-/, '') === (it.dish_id || '').replace(/^dish-/, '')))) ||
              (meta?.dishName && it.dish_name?.toLowerCase().trim() === meta.dishName.toLowerCase().trim())
            ) && it.stage !== stage;

            if (isExactMatch || isFallbackMatch) {
              it.stage = stage;
              if (stage === 'SERVED') {
                const addons = Array.isArray(it.addons) ? [...it.addons] : [];
                if (!addons.includes('SERVED')) addons.push('SERVED');
                it.addons = addons;
              }
              hasUpdatedLocally = true;
            }
          });
        }
      });
      setLocalOrdersList(orders);

      // 2. Remote update if Supabase is connected
      if (supabase) {
        // Map database stage to satisfy DB check constraint ('REC', 'PREP', 'READY')
        const dbStage: 'REC' | 'PREP' | 'READY' =
          stage === 'SERVED' ? 'READY' : stage === 'PLACED' ? 'REC' : stage;

        const updateItemInDb = async (itemId: string, existingAddons?: any) => {
          const list = Array.isArray(existingAddons) ? [...existingAddons] : [];
          const nextAddons = list.filter((a) => a !== 'PLACED' && a !== 'SERVED');
          if (stage === 'SERVED') {
            nextAddons.push('SERVED');
          } else if (stage === 'PLACED') {
            nextAddons.push('PLACED');
          }
          const { error: updErr } = await supabase
            .from('order_items')
            .update({
              stage: dbStage,
              addons: nextAddons,
              updated_at: new Date().toISOString(),
            })
            .eq('id', itemId);
          return !updErr;
        };

        const effectiveTargetId = cleanTargetId || targetItemId;
        const isUuid = effectiveTargetId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(effectiveTargetId);
        let updatedInDb = false;

        if (isUuid) {
          const { data: cur } = await supabase.from('order_items').select('id, addons').eq('id', effectiveTargetId).maybeSingle();
          if (cur) {
            updatedInDb = await updateItemInDb(effectiveTargetId, cur.addons);
          } else {
            updatedInDb = await updateItemInDb(effectiveTargetId);
          }
        }

        if (!updatedInDb && meta?.chairId) {
          const cleanChair = meta.chairId.replace(/[^0-9]/g, '');
          const possibleChairs = [
            meta.chairId,
            cleanChair,
            cleanChair.padStart(2, '0'),
            cleanChair.replace(/^0+/, ''),
            `Seat ${cleanChair}`,
            `Seat ${cleanChair.padStart(2, '0')}`,
            `Seat ${cleanChair.replace(/^0+/, '')}`,
          ];

          // Query matching active orders by chair_id
          const { data: activeOrdersList } = await supabase
            .from('orders')
            .select('id, ticket_number, chair_id')
            .in('chair_id', possibleChairs)
            .in('status', ['pending', 'in_progress', 'ready']);

          if (activeOrdersList && activeOrdersList.length > 0) {
            const filteredOrders = meta.ticketNumber
              ? activeOrdersList.filter((o) => o.ticket_number === meta.ticketNumber || meta.ticketNumber.includes(o.ticket_number))
              : activeOrdersList;
            const targetIds = (filteredOrders.length > 0 ? filteredOrders : activeOrdersList).map((o) => o.id);
            if (targetIds.length > 0) {
              const { data: byOrderItems } = await supabase
                .from('order_items')
                .select('id, dish_id, dish_name, stage, addons')
                .in('order_id', targetIds);

              if (byOrderItems && byOrderItems.length > 0) {
                const targetCleanDish = meta?.dishId ? meta.dishId.replace(/^dish-/, '') : '';
                const targetItem =
                  byOrderItems.find((oi) => oi.id === targetItemId || oi.id === itemIdOrKey) ||
                  byOrderItems.find((oi) => {
                    const oiClean = (oi.dish_id || '').replace(/^dish-/, '');
                    return (oi.dish_id === meta?.dishId || (targetCleanDish && oiClean === targetCleanDish));
                  }) ||
                  byOrderItems.find((oi) => meta?.dishName && oi.dish_name?.toLowerCase().trim() === meta.dishName.toLowerCase().trim());
                if (targetItem) {
                  await updateItemInDb(targetItem.id, targetItem.addons);
                }
              }
            }
          }
        }

        // Advance order status from pending to in_progress when kitchen accepts
        if (meta?.chairId && stage !== 'PLACED') {
          const cleanC = meta.chairId.replace(/[^0-9]/g, '');
          const targetChairVariants = [
            meta.chairId,
            cleanC,
            cleanC.padStart(2, '0'),
            cleanC.replace(/^0+/, ''),
            `Seat ${cleanC}`,
            `Seat ${cleanC.padStart(2, '0')}`,
          ];
          await supabase
            .from('orders')
            .update({ status: 'in_progress', updated_at: new Date().toISOString() })
            .in('chair_id', targetChairVariants)
            .eq('status', 'pending');
        }

        const chairVal = (meta?.chairId || '').replace(/[^0-9]/g, '');
        const normC = chairVal.replace(/^0+/, '') || '1';
        const padC = normC.padStart(2, '0');
        const broadcastPayload = {
          key: itemIdOrKey,
          stage,
          ...meta,
          chairId: chairVal || meta?.chairId,
          rawChairId: meta?.chairId,
          normChairId: normC,
          paddedChairId: padC,
          itemId: targetItemId,
        };

        broadcastRealtime('STAGE_CHANGE', broadcastPayload);
      } else {
        const chairVal = (meta?.chairId || '').replace(/[^0-9]/g, '');
        const normC = chairVal.replace(/^0+/, '') || '1';
        const padC = normC.padStart(2, '0');
        const broadcastPayload = {
          key: itemIdOrKey,
          stage,
          ...meta,
          chairId: chairVal || meta?.chairId,
          rawChairId: meta?.chairId,
          normChairId: normC,
          paddedChairId: padC,
          itemId: targetItemId,
        };

        broadcastRealtime('STAGE_CHANGE', broadcastPayload);
      }

      // Notify Fastify backend of stage transition
      try {
        const stageToBackend: Record<string, string> = {
          PLACED: 'QUEUED',
          REC: 'QUEUED',
          PREP: 'COOKING',
          READY: 'READY',
          SERVED: 'SERVED',
        };
        const chairNum = meta?.chairId ? parseInt(meta.chairId.replace(/[^0-9]/g, ''), 10) : undefined;
        fetch(`${getBackendUrl()}/api/orders/items/${targetItemId || itemIdOrKey}/stage`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newStage: stageToBackend[stage] || 'COOKING',
            staffId: 3,
            seatId: chairNum && !isNaN(chairNum) ? chairNum : undefined,
            ticketNumber: meta?.ticketNumber || undefined,
            dishId: meta?.dishId || undefined,
            dishName: meta?.dishName || undefined,
          }),
        }).catch(() => {});
      } catch {}

      // 5. If marked READY, alert waitstaff for immediate pass pickup
      if (stage === 'READY') {
        const chairClean = (meta?.chairId || '01').replace(/[^0-9]/g, '');
        const normChair = chairClean.replace(/^0+/, '') || '1';
        const paddedChair = normChair.padStart(2, '0');
        const dishLabel = meta?.dishName || meta?.dishId || 'Dish';

        this.sendServiceAlert({
          id: `pass-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          seatNumber: `Seat ${paddedChair}`,
          chairId: normChair,
          dishId: meta?.dishId,
          dishName: meta?.dishName || dishLabel,
          itemId: meta?.itemId || itemIdOrKey,
          guestName: `Seat ${paddedChair} Guest`,
          type: 'kitchen_ready',
          title: dishLabel,
          message: `Kitchen Pass: ${dishLabel} ready for Seat ${normChair}`,
          timeAgo: 'Just now',
          kotNumber: meta?.ticketNumber || 'KOT',
          isUrgent: true,
          isResolved: false
        }).catch(() => {});
      }

      // 6. If marked SERVED, automatically resolve and vanish all matching ready alerts for this dish/seat
      if (stage === 'SERVED') {
        const chairClean = (meta?.chairId || '').replace(/[^0-9]/g, '');
        const normChair = chairClean.replace(/^0+/, '');
        const targetDishName = meta?.dishName?.toLowerCase().trim();
        const targetDishId = meta?.dishId ? String(meta.dishId).replace(/^dish-/, '') : '';

        const alerts = getLocalAlertsList();
        const hasExactAlert = Boolean(
          targetItemId && alerts.some((a) =>
            !a.isResolved &&
            ((a.type as string) === 'kitchen_ready' || (a.type as string) === 'kitchen') &&
            (!normChair || (a.chairId || a.seatNumber || '').replace(/[^0-9]/g, '').replace(/^0+/, '') === normChair) &&
            (a.itemId === targetItemId || a.id === targetItemId || (a.itemId && targetItemId.startsWith(`${a.itemId}-`)))
          )
        );

        let resolvedFallback = false;
        const alertsToResolve = alerts.filter((a) => {
          if (a.isResolved) return false;
          if ((a.type as string) !== 'kitchen_ready' && (a.type as string) !== 'kitchen') return false;
          const aNormChair = (a.chairId || a.seatNumber || '').replace(/[^0-9]/g, '').replace(/^0+/, '');
          if (normChair && aNormChair && normChair !== aNormChair) return false;

          if (hasExactAlert) {
            return targetItemId && (a.itemId === targetItemId || a.id === targetItemId || (a.itemId && targetItemId.startsWith(`${a.itemId}-`)));
          }

          if (resolvedFallback) return false;

          const isMatch = Boolean(
            (targetDishId && a.dishId && (String(a.dishId).replace(/^dish-/, '') === targetDishId || a.dishId === targetDishId)) ||
            (targetDishName && (
              (a.dishName && (
                a.dishName.toLowerCase().trim() === targetDishName ||
                a.dishName.toLowerCase().includes(targetDishName) ||
                targetDishName.includes(a.dishName.toLowerCase())
              )) ||
              (a.title && (
                a.title.toLowerCase().trim() === targetDishName ||
                a.title.toLowerCase().includes(targetDishName) ||
                targetDishName.includes(a.title.toLowerCase())
              ))
            ))
          );

          if (isMatch) {
            resolvedFallback = true;
            return true;
          }

          return false;
        });

        alertsToResolve.forEach((al) => {
          this.resolveServiceAlert(al.id);
        });
      }

      return true;
    } catch (err) {
      console.error('Error updating stage:', err);
      return false;
    }
  },

  // Dispatch / Complete order from pass
  async dispatchTicket(ticketNumber: string, chairId?: string): Promise<boolean> {
    try {
      // 1. Update in-memory orders list
      const orders = getLocalOrdersList();
      const updated = orders.filter((o) => o.order.ticket_number !== ticketNumber);
      setLocalOrdersList(updated);

      // 2. Update Supabase & broadcast cross-device
      if (supabase) {
        await supabase.from('orders').update({ status: 'ready', updated_at: new Date().toISOString() }).eq('ticket_number', ticketNumber);
        const { data: ord } = await supabase.from('orders').select('id').eq('ticket_number', ticketNumber).maybeSingle();
        if (ord?.id) {
          await supabase.from('order_items').update({ stage: 'READY', addons: ['SERVED'], updated_at: new Date().toISOString() }).eq('order_id', ord.id);
        }
      }

      broadcastRealtime('TICKET_DISPATCHED', { ticketNumber, chairId });

      // 5. Send kitchen pass pickup alert to waiters
      const chair = chairId || '01';
      this.sendServiceAlert({
        id: `pass-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        seatNumber: `Seat ${chair.padStart(2, '0')}`,
        guestName: 'Chef Pass Counter',
        type: 'kitchen_ready',
        title: `Ticket #${ticketNumber} Plated & Ready`,
        message: `All items prepared on pass counter for Seat ${chair}`,
        timeAgo: 'Just now',
        kotNumber: ticketNumber,
        isUrgent: true,
        isResolved: false
      }).catch(() => {});

      return true;
    } catch (err) {
      console.error('Error dispatching ticket:', err);
      return false;
    }
  },

  // Update dish availability
  async setAvailability(dishId: string, isAvailable: boolean): Promise<boolean> {
    try {
      const cleanId = dishId.replace(/^dish-/, '');
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('thoogudeepa_v2_dish_stock');
          const map = raw ? JSON.parse(raw) : {};
          map[dishId] = isAvailable;
          map[cleanId] = isAvailable;
          map[`dish-${cleanId}`] = isAvailable;
          localStorage.setItem('thoogudeepa_v2_dish_stock', JSON.stringify(map));
        } catch {}
      }
      if (supabase) {
        await supabase
          .from('dish_inventory')
          .upsert({ dish_id: cleanId, is_available: isAvailable, updated_at: new Date().toISOString() });
      }
      if (localChannel) {
        localChannel.postMessage({
          type: 'AVAILABILITY_CHANGE',
          dishId: cleanId,
          isAvailable,
        });
      }
      // Fastify backend sync for 86 out-of-stock
      try {
        const numId = Number(cleanId) || 1;
        fetch(`${getBackendUrl()}/api/menu/items/${numId}/availability`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isAvailable }),
        }).catch(() => {});
      } catch {}
      return true;
    } catch (err) {
      console.error('Error updating availability:', err);
      return false;
    }
  },

  // Hydrate order items with authoritative database stages and addons
  hydrateOrderItemStages(order: OrderRecord, items: OrderItemRecord[]): OrderItemRecord[] {
    try {
      return items.map((it) => {
        const addons = Array.isArray(it.addons) ? it.addons : [];
        if (addons.includes('SERVED') || it.stage === 'SERVED') {
          return { ...it, stage: 'SERVED' };
        }
        if (it.stage === 'READY') {
          return { ...it, stage: 'READY' };
        }
        if (it.stage === 'PREP') {
          return { ...it, stage: 'PREP' };
        }
        if (it.stage === 'REC' && !addons.includes('PLACED')) {
          return { ...it, stage: 'REC' };
        }
        return { ...it, stage: 'PLACED' };
      });
    } catch {
      return items;
    }
  },

  // Fetch active orders (pending, in_progress, ready) with fallback and local hydration
  async getActiveOrders(): Promise<{ order: OrderRecord; items: OrderItemRecord[] }[]> {
    const localOrders = getLocalOrdersList();
    try {
      if (supabase) {
        const { data: orders, error: oErr } = await supabase
          .from('orders')
          .select('*')
          .in('status', ['pending', 'in_progress', 'ready'])
          .order('created_at', { ascending: false });

        if (!oErr && orders && orders.length > 0) {
          const orderIds = orders.map((o) => o.id);
          const { data: items } = await supabase
            .from('order_items')
            .select('*')
            .in('order_id', orderIds);

          const remoteOrders = orders.map((o) => {
            const rawItems = (items || []).filter((it) => it.order_id === o.id).map((it) => {
              const localOrder = localOrders.find((lo) => lo.order.id === o.id || lo.order.ticket_number === o.ticket_number);
              const localItem = localOrder?.items?.find((li) => li.id === it.id || li.dish_id === it.dish_id || li.dish_name?.toLowerCase().trim() === it.dish_name?.toLowerCase().trim());
              const isLocallyServed = localItem?.stage === 'SERVED' || localItem?.addons?.includes('SERVED');

              const addons = Array.isArray(it.addons) ? [...it.addons] : [];
              if (isLocallyServed && !addons.includes('SERVED')) addons.push('SERVED');

              let effStage: 'PLACED' | 'REC' | 'PREP' | 'READY' | 'SERVED' = 'PLACED';
              if (addons.includes('SERVED') || it.stage === 'SERVED' || isLocallyServed) {
                effStage = 'SERVED';
              } else if (it.stage === 'READY') {
                effStage = 'READY';
              } else if (it.stage === 'PREP') {
                effStage = 'PREP';
              } else if (it.stage === 'REC' && !addons.includes('PLACED')) {
                effStage = 'REC';
              } else {
                effStage = 'PLACED';
              }
              return {
                ...it,
                stage: effStage,
                addons,
              };
            });
            const hydrated = this.hydrateOrderItemStages(o, rawItems);
            return {
              order: o,
              items: hydrated,
            };
          });

          const hasAuthRemote = remoteOrders.some((ro) => String(ro.order.ticket_number).startsWith('ORD-'));
          const cleanedRemoteOrders = hasAuthRemote
            ? remoteOrders.filter((ro) => !String(ro.order.ticket_number).startsWith('TK-'))
            : remoteOrders;

          const remoteChairs = new Set(cleanedRemoteOrders.map((ro) => (ro.order.chair_id || '').replace(/[^0-9]/g, '')));
          const remoteTickets = new Set(cleanedRemoteOrders.map((ro) => ro.order.ticket_number));
          const remoteOrderIds = new Set(cleanedRemoteOrders.map((ro) => ro.order.id));
          const validLocalOrders = localOrders.filter((lo) => {
            const loChair = (lo.order.chair_id || '').replace(/[^0-9]/g, '');
            if (remoteChairs.has(loChair)) return false;
            if (!lo.order?.id || !lo.order?.ticket_number) return false;
            if (lo.order.status === 'completed' || lo.order.status === 'cancelled') return false;
            if (hasAuthRemote && String(lo.order.ticket_number).startsWith('TK-')) return false;
            if (remoteTickets.has(lo.order.ticket_number) || remoteOrderIds.has(lo.order.id)) return false;
            return true;
          });
          const merged = [
            ...cleanedRemoteOrders,
            ...validLocalOrders.map((lo) => ({
              order: lo.order,
              items: this.hydrateOrderItemStages(lo.order, lo.items),
            })),
          ];

          setLocalOrdersList(merged);
          return merged;
        }
      }

      // Live Cloud Backend Sync (Fetch authoritative floor orders or KDS tickets from Fastify)
      try {
        let backendSource: any[] = [];
        try {
          const activeRes = await fetch(`${getBackendUrl()}/api/orders/active`);
          if (activeRes.ok) {
            const data = await activeRes.json();
            if (Array.isArray(data)) backendSource = data;
          }
        } catch {}

        if (backendSource.length === 0) {
          try {
            const ticketsRes = await fetch(`${getBackendUrl()}/api/kds/tickets`);
            if (ticketsRes.ok) {
              const data = await ticketsRes.json();
              if (Array.isArray(data)) backendSource = data;
            }
          } catch {}
        }

        if (backendSource.length > 0) {
          const backendOrders = backendSource.map((t: any) => {
            const rawChair = String(t.seatId || (t.seatNumber ? t.seatNumber.replace(/[^0-9]/g, '') : '14'));
            const chairNum = rawChair.replace(/[^0-9]/g, '').replace(/^0+/, '');
            const chairId = chairNum.padStart(2, '0');

            // Find matching local order by id, ticket, or normalized chair
            const localOrder = localOrders.find((lo) => {
              if (lo.order.id === t.id || (t.orderNumber && lo.order.ticket_number === t.orderNumber)) return true;
              const loNum = (lo.order.chair_id || '').replace(/[^0-9]/g, '').replace(/^0+/, '');
              return loNum && chairNum && loNum === chairNum && lo.order.status !== 'completed';
            });

            const calculatedTotal = (t.items || []).reduce(
              (acc: number, cur: any) => acc + (cur.priceSnapshot || 0) * (cur.quantity || 1),
              0
            );
            const totalAmount = (t.totalAmount && t.totalAmount > 0) ? t.totalAmount : (localOrder?.order?.total_amount || calculatedTotal);

            const items: OrderItemRecord[] = (t.items || []).map((it: any, idx: number) => {
              const initialStage = it.itemStage === 'COOKING' ? 'PREP' : it.itemStage === 'READY' ? 'READY' : it.itemStage === 'SERVED' ? 'SERVED' : 'PLACED';

              // Match corresponding local item intelligently
              const localItem = localOrder?.items?.find((li) => {
                if (li.id && it.id && (li.id === it.id || String(li.id).startsWith(String(it.id)) || String(it.id).startsWith(String(li.id)))) return true;
                if (li.dish_id && (`dish-${it.menuItemId}` === li.dish_id || String(it.menuItemId) === li.dish_id.replace(/^dish-/, ''))) return true;
                if (li.dish_name && it.nameSnapshot && li.dish_name.toLowerCase().trim() === it.nameSnapshot.toLowerCase().trim()) return true;
                return false;
              });

              // Preserve rich local stages, addons, and item IDs so tracking and buttons are never disrupted
              const isLocallyServed = localItem?.stage === 'SERVED' || localItem?.addons?.includes('SERVED');
              const effectiveStage = localItem?.stage || (isLocallyServed ? 'SERVED' : initialStage);
              const addonsList = Array.isArray(localItem?.addons) && localItem.addons.length > 0
                ? localItem.addons
                : (effectiveStage === 'SERVED' ? ['SERVED'] : (Array.isArray(it.addons) ? it.addons : []));
              const effectiveItemId = localItem?.id || it.id || `${t.id}-${it.menuItemId}-${idx}`;

              return {
                id: effectiveItemId,
                order_id: t.id,
                chair_id: chairId,
                seat_label: `SEAT ${chairId}`,
                dish_id: `dish-${it.menuItemId}`,
                dish_name: it.nameSnapshot || localItem?.dish_name || 'Dish',
                quantity: it.quantity,
                price: it.priceSnapshot || localItem?.price || 0,
                stage: effectiveStage,
                notes: it.notes || localItem?.notes || '',
                addons: addonsList,
              };
            });

            // If localOrder had any extra client-placed items not yet in backend response, preserve them
            if (localOrder?.items) {
              const matchedIds = new Set(items.map((it) => it.id));
              const extraLocalItems = localOrder.items.filter((li) => !matchedIds.has(li.id));
              if (extraLocalItems.length > 0) {
                items.push(...extraLocalItems);
              }
            }

            return {
              order: {
                id: t.id,
                ticket_number: t.orderNumber || localOrder?.order?.ticket_number,
                chair_id: chairId,
                seat_label: `SEAT ${chairId}`,
                status: t.overallStage === 'PAID' ? 'completed' : (localOrder?.order?.status || 'pending'),
                total_amount: totalAmount,
              } as OrderRecord,
              items,
            };
          });

          // Merge backend orders with any local orders not yet on backend
          const backendIds = new Set(backendOrders.map((bo) => bo.order.id));
          const backendTickets = new Set(backendOrders.map((bo) => bo.order.ticket_number));
          const backendChairNums = new Set(backendOrders.map((bo) => (bo.order.chair_id || '').replace(/[^0-9]/g, '').replace(/^0+/, '')));

          const pendingLocals = localOrders.filter((lo) => {
            const loNum = (lo.order.chair_id || '').replace(/[^0-9]/g, '').replace(/^0+/, '');
            if (backendChairNums.has(loNum)) return false;
            if (backendIds.has(lo.order.id) || backendTickets.has(lo.order.ticket_number)) return false;
            if (lo.order.status === 'completed' || lo.order.status === 'cancelled') return false;
            return true;
          });
          const combined = [...backendOrders, ...pendingLocals];

          setLocalOrdersList(combined);
          return combined;
        }
      } catch {}

      const hydratedLocal = localOrders.map((lo) => ({
        order: lo.order,
        items: this.hydrateOrderItemStages(lo.order, lo.items),
      }));
      setLocalOrdersList(hydratedLocal);
      return hydratedLocal;
    } catch (err) {
      console.error('Error fetching active orders:', err);
      const hydratedLocal = localOrders.map((lo) => ({
        order: lo.order,
        items: this.hydrateOrderItemStages(lo.order, lo.items),
      }));
      setLocalOrdersList(hydratedLocal);
      return hydratedLocal;
    }
  },

  // Clear all orders (for clean fresh slate)
  async clearAllOrders(): Promise<boolean> {
    try {
      setLocalOrdersList([]);
      setLocalOccupancyMap({});
      setLocalAlertsList([]);
      if (typeof window !== 'undefined') {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if (
            key.startsWith('thoogudeepa') ||
            key.includes('session') ||
            key.includes('cart') ||
            key.includes('order') ||
            key.includes('stages') ||
            key.includes('alert') ||
            key.includes('seat')
          ) {
            localStorage.removeItem(key);
          }
        }
        sessionStorage.clear();
        try {
          fetch('/api/orders', { method: 'DELETE' }).catch(() => {});
        } catch {
          // Ignore network errors
        }
      }
      if (supabase) {
        try {
          await supabase
            .from('orders')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .in('status', ['pending', 'in_progress', 'ready']);
          await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          
        } catch (dbErr) {
          console.warn('Database remote delete notice:', dbErr);
        }
      }
      broadcastRealtime('CLEAR_ALL_ORDERS', {});
      return true;
    } catch (err) {
      console.error('Error clearing orders:', err);
      if (localChannel) {
        localChannel.postMessage({ type: 'CLEAR_ALL_ORDERS' });
      }
      return false;
    }
  },

  // Send Service Alert (Call Waiter, Water Refill, Bill Request, Kitchen Ready Pass)
  async sendServiceAlert(alert: Partial<ServiceAlertRecord> & { seatNumber: string; title: string }): Promise<ServiceAlertRecord> {
    const rawSeat = alert.seatNumber || '';
    const cleanChair = alert.chairId || rawSeat.replace(/[^0-9]/g, '');
    const normChair = cleanChair.replace(/^0+/, '') || '1';
    const isBill = alert.type === 'customer_call' || String(alert.title || '').toLowerCase().includes('bill') || Boolean(alert.billAmount);

    const newAlert: ServiceAlertRecord = {
      id: alert.id || `alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: alert.type || 'customer_call',
      seatNumber: alert.seatNumber,
      chairId: normChair,
      dishId: alert.dishId,
      dishName: alert.dishName,
      itemId: alert.itemId,
      guestName: alert.guestName || 'Guest',
      title: alert.title,
      message: alert.message || alert.title,
      timeAgo: alert.timeAgo || 'Just now',
      billAmount: alert.billAmount,
      kotNumber: alert.kotNumber,
      isUrgent: Boolean(alert.isUrgent),
      isResolved: false,
      createdAt: Date.now()
    };

    const alerts = getLocalAlertsList();
    const updated = [newAlert, ...alerts.filter((a) => a.id !== newAlert.id)];
    setLocalAlertsList(updated);

    broadcastRealtime('NEW_ALERT', { alert: newAlert, ...newAlert });

    // 1. Post to Fastify backend REST endpoint
    fetch(`${getBackendUrl()}/api/service-alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newAlert.id,
        seatId: Number(normChair) || 0,
        seatNumber: alert.seatNumber || `Seat ${normChair}`,
        type: newAlert.type,
        title: newAlert.title,
        message: newAlert.message,
        billAmount: newAlert.billAmount,
        isUrgent: newAlert.isUrgent,
      }),
    }).catch(() => {});

    // 2. Realtime Socket.io broadcast to all waiter and manager devices
    try {
      const socket = getSocket();
      const numSeat = Number(normChair) || 1;
      socket.emit(SOCKET_EVENTS.WAITER_CALLED, {
        seatId: numSeat,
        seatNumber: alert.seatNumber || `Seat ${normChair}`,
        zone: 'COUNTER_A',
        reason: isBill ? 'BILL' : (alert.type === 'kitchen_ready' ? 'ASSISTANCE' : 'WATER'),
        amount: newAlert.billAmount,
        alert: newAlert,
        timestamp: new Date().toISOString(),
      });
    } catch {}

    return newAlert;
  },

  // Get active floor alerts
  async getServiceAlerts(): Promise<ServiceAlertRecord[]> {
    try {
      const res = await fetch(`${getBackendUrl()}/api/service-alerts`);
      if (res.ok) {
        const backendAlerts = await res.json();
        if (Array.isArray(backendAlerts) && backendAlerts.length > 0) {
          const local = getLocalAlertsList();
          const mergedMap = new Map<string, ServiceAlertRecord>();
          backendAlerts.forEach((a: any) => { if (!a.isResolved) mergedMap.set(a.id, a); });
          local.forEach((a) => { if (!a.isResolved && !mergedMap.has(a.id)) mergedMap.set(a.id, a); });
          const merged = Array.from(mergedMap.values());
          setLocalAlertsList(merged);
          return merged;
        }
      }
    } catch {}
    return getLocalAlertsList().filter((a) => !a.isResolved);
  },

  // Resolve Service Alert
  async resolveServiceAlert(alertId: string): Promise<boolean> {
    const alerts = getLocalAlertsList();
    const updated = alerts.filter((a) => a.id !== alertId);
    setLocalAlertsList(updated);

    fetch(`${getBackendUrl()}/api/service-alerts/${alertId}/resolve`, {
      method: 'POST',
    }).catch(() => {});

    broadcastRealtime('RESOLVE_ALERT', { alertId });

    return true;
  },

  // Customer or Waiter requests bill settlement with combined verification details
  async requestBill(
    chairId: string,
    amount?: number,
    verification?: Partial<BillVerificationPayload>
  ): Promise<boolean> {
    const cleanChair = chairId.replace(/[^0-9]/g, '');
    const padded = cleanChair.padStart(2, '0');
    const map = getLocalOccupancyMap();
    if (map[chairId]) {
      map[chairId].status = 'billing';
      setLocalOccupancyMap(map);
    } else if (map[cleanChair]) {
      map[cleanChair].status = 'billing';
      setLocalOccupancyMap(map);
    }

    const payload: BillVerificationPayload = {
      chairId: cleanChair || chairId,
      seatNumber: verification?.seatNumber || `Seat ${padded}`,
      orderId: verification?.orderId || map[cleanChair]?.orderId || '',
      ticketNumber: verification?.ticketNumber || map[cleanChair]?.ticketNumber || '',
      amount: amount || verification?.amount || 0,
      items: verification?.items || [],
      requestedAt: Date.now(),
    };

    const requests = getLocalBillRequests();
    const norm = cleanChair.replace(/^0+/, '') || '0';
    requests[cleanChair] = payload;
    requests[chairId] = payload;
    requests[norm] = payload;
    setLocalBillRequests(requests);

    broadcastRealtime('BILL_REQUESTED', { chairId: cleanChair, rawChairId: chairId, normChairId: norm, amount, payload });

    // Send backend REST alert
    fetch(`${getBackendUrl()}/api/service-alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seatId: Number(norm) || 0,
        seatNumber: verification?.seatNumber || `Seat ${padded}`,
        type: 'customer_call',
        title: `Bill Requested (₹${amount || 0})`,
        message: `Bill settlement requested for Seat ${norm}: ₹${amount || 0}`,
        billAmount: amount || 0,
        isUrgent: true,
      }),
    }).catch(() => {});

    // Realtime Socket.io broadcast to all waiter and manager devices
    try {
      const socket = getSocket();
      const numSeat = Number(norm) || 0;
      socket.emit(SOCKET_EVENTS.WAITER_CALLED, {
        seatId: numSeat,
        seatNumber: verification?.seatNumber || `Seat ${padded}`,
        zone: 'COUNTER_A',
        reason: 'BILL',
        amount: amount || verification?.amount || 0,
        orderId: payload.orderId,
        ticketNumber: payload.ticketNumber,
        timestamp: new Date().toISOString(),
      });
    } catch {}

    return true;
  },

  // Check if a specific seat has an active, customer-confirmed bill request
  getActiveBillRequest(chairId: string): BillVerificationPayload | null {
    const cleanChair = chairId.replace(/[^0-9]/g, '');
    const norm = cleanChair.replace(/^0+/, '') || '0';
    const requests = getLocalBillRequests();
    return requests[cleanChair] || requests[norm] || requests[chairId] || null;
  },

  // Clear bill request for a seat
  clearActiveBillRequest(chairId: string): void {
    const cleanChair = chairId.replace(/[^0-9]/g, '');
    const norm = cleanChair.replace(/^0+/, '') || '0';
    const requests = getLocalBillRequests();
    delete requests[cleanChair];
    delete requests[norm];
    delete requests[chairId];
    setLocalBillRequests(requests);
  },

  // Broadcast when waiter enters bill collection / settlement mode for a seat
  async notifyBillModeActive(
    chairId: string,
    amount?: number,
    meta?: { mode?: 'qr' | 'cash'; ticketNumber?: string }
  ): Promise<boolean> {
    const cleanChair = chairId.replace(/[^0-9]/g, '');
    const norm = cleanChair.replace(/^0+/, '') || '0';
    const padded = norm.padStart(2, '0');

    const map = getLocalOccupancyMap();
    if (map[cleanChair]) map[cleanChair].status = 'billing';
    if (map[norm]) map[norm].status = 'billing';
    if (map[padded]) map[padded].status = 'billing';
    if (map[chairId]) map[chairId].status = 'billing';
    setLocalOccupancyMap(map);

    const mode = meta?.mode || 'qr';
    const ticketNumber = meta?.ticketNumber;
    const payload = {
      chairId: cleanChair,
      rawChairId: chairId,
      normChairId: norm,
      amount,
      mode,
      ticketNumber
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`thoogudeepa_waiter_mode_${cleanChair}`, mode);
        localStorage.setItem(`thoogudeepa_waiter_mode_${norm}`, mode);
        localStorage.setItem(`thoogudeepa_waiter_called_${cleanChair}`, 'true');
        localStorage.setItem(`thoogudeepa_waiter_called_${norm}`, 'true');
        sessionStorage.setItem(`thoogudeepa_waiter_mode_${cleanChair}`, mode);
        sessionStorage.setItem(`thoogudeepa_waiter_mode_${norm}`, mode);
        sessionStorage.setItem(`thoogudeepa_waiter_called_${cleanChair}`, 'true');
        sessionStorage.setItem(`thoogudeepa_waiter_called_${norm}`, 'true');
      } catch {}
    }

    // Fastify backend REST sync
    try {
      fetch(`${getBackendUrl()}/api/seats/${cleanChair}/bill-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, amount }),
      }).catch(() => {});
    } catch {}

    broadcastRealtime('BILL_MODE_ACTIVE', payload);
    return true;
  },

  // Check active bill mode (QR vs Cash) selected by waiter or captain
  async getSeatBillMode(chairId: string): Promise<{ active: boolean; mode: 'qr' | 'cash' | null; amount?: number }> {
    const cleanChair = chairId.replace(/[^0-9]/g, '');
    const norm = cleanChair.replace(/^0+/, '') || cleanChair;

    // 1. Check Fastify backend REST
    try {
      const res = await fetch(`${getBackendUrl()}/api/seats/${cleanChair}/bill-mode`);
      if (res.ok) {
        const data = await res.json();
        if (data && (data.active || data.mode)) {
          return { active: true, mode: data.mode, amount: data.amount };
        }
      }
    } catch {}

    // 2. Check local/session storage fallback
    if (typeof window !== 'undefined') {
      try {
        const storedMode = sessionStorage.getItem(`thoogudeepa_waiter_mode_${cleanChair}`) ||
          sessionStorage.getItem(`thoogudeepa_waiter_mode_${norm}`) ||
          localStorage.getItem(`thoogudeepa_waiter_mode_${cleanChair}`) ||
          localStorage.getItem(`thoogudeepa_waiter_mode_${norm}`);
        const called = sessionStorage.getItem(`thoogudeepa_waiter_called_${cleanChair}`) ||
          sessionStorage.getItem(`thoogudeepa_waiter_called_${norm}`) ||
          localStorage.getItem(`thoogudeepa_waiter_called_${cleanChair}`) ||
          localStorage.getItem(`thoogudeepa_waiter_called_${norm}`);
        if (storedMode === 'qr' || storedMode === 'cash') {
          return { active: true, mode: storedMode as any };
        }
        if (called === 'true') {
          return { active: true, mode: null };
        }
      } catch {}
    }

    return { active: false, mode: null };
  },

  // Broadcast when customer confirms completed UPI payment
  async notifyCustomerPaidUpi(data: { chairId: string; rawChairId?: string; amount?: number; ticketNumber?: string }): Promise<boolean> {
    const cleanChair = data.chairId.replace(/[^0-9]/g, '');
    const payload = {
      chairId: cleanChair,
      rawChairId: data.rawChairId || data.chairId,
      amount: data.amount || 0,
      ticketNumber: data.ticketNumber
    };
    broadcastRealtime('CUSTOMER_PAID_UPI', payload);
    return true;
  },

  async settleBill(chairId: string, paymentMethod: string, amount: number, meta?: { ticketNumber?: string }): Promise<boolean> {
    const rawChair = String(chairId || '').trim();
    const cleanNum = rawChair.replace(/[^0-9]/g, '').replace(/^0+/, '') || '0';
    const cleanChair = cleanNum.padStart(2, '0');
    const padded = cleanChair;
    const unpadded = cleanNum;
    const possibleChairs = [rawChair, cleanChair, padded, unpadded, `Seat ${cleanChair}`, `Seat ${padded}`, `Seat ${unpadded}`];

    // 1. Release seat in local registry and clear bill requests
    await this.releaseSeat(chairId);
    this.clearActiveBillRequest(chairId);
    this.clearActiveBillRequest(cleanNum);
    this.clearActiveBillRequest(cleanChair);

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`thoogudeepa_waiter_mode_${cleanNum}`);
        localStorage.removeItem(`thoogudeepa_waiter_mode_${cleanChair}`);
        localStorage.removeItem(`thoogudeepa_waiter_called_${cleanNum}`);
        localStorage.removeItem(`thoogudeepa_waiter_called_${cleanChair}`);
        sessionStorage.removeItem(`thoogudeepa_waiter_mode_${cleanNum}`);
        sessionStorage.removeItem(`thoogudeepa_waiter_mode_${cleanChair}`);
        sessionStorage.removeItem(`thoogudeepa_waiter_called_${cleanNum}`);
        sessionStorage.removeItem(`thoogudeepa_waiter_called_${cleanChair}`);
      } catch {}
    }

    // 2. Mark order completed in Supabase
    if (supabase) {
      try {
        await supabase
          .from('orders')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .in('chair_id', possibleChairs)
          .in('status', ['pending', 'in_progress', 'ready']);
      } catch (err) {
        console.warn('Remote settle bill update notice:', err);
      }
    }

    // 3. Update shift telemetry stats
    if (typeof window !== 'undefined') {
      try {
        const stats = JSON.parse(
          localStorage.getItem(STORAGE_SHIFT_STATS_KEY) ||
            '{"totalSales": 14850, "billsSettled": 18, "tipsEarned": 620, "kotsPunched": 28, "guestsServed": 42}'
        );
        stats.totalSales += amount;
        stats.billsSettled += 1;
        stats.guestsServed += 2;
        localStorage.setItem(STORAGE_SHIFT_STATS_KEY, JSON.stringify(stats));

        // 4. Record into settled bills ledger
        const STORAGE_SETTLED_BILLS = 'thoogudeepa_v2_settled_bills_history';
        const existingRaw = localStorage.getItem(STORAGE_SETTLED_BILLS);
        const list = existingRaw ? JSON.parse(existingRaw) : [];
        const isTk = cleanNum === '0' && (rawChair.toLowerCase().includes('tk') || rawChair.toLowerCase().includes('takeaway'));
        const billNumber = `INV-${Date.now().toString().slice(-6)}`;
        const localOrders = getLocalOrdersList();
        const matchingOrders = localOrders.filter((o) => {
          const oNum = (o.order.chair_id || '').replace(/[^0-9]/g, '').replace(/^0+/, '');
          if (isTk) return o.order.chair_id?.toLowerCase().includes('tk') || o.order.chair_id?.toLowerCase().includes('takeaway');
          return oNum === cleanNum || o.order.chair_id === rawChair;
        });
        const items: any[] = [];
        matchingOrders.forEach((mo) => {
          if (mo.items) {
            mo.items.forEach((it) => {
              items.push({
                name: it.dish_name,
                quantity: it.quantity,
                price: it.price,
                totalPrice: it.price * it.quantity,
              });
            });
          }
        });
        const subtotal = Math.round(amount / 1.05);
        const tax = amount - subtotal;
        list.unshift({
          invoiceNumber: billNumber,
          tableName: isTk ? 'TK-01' : `T-${padded}`,
          seatLabel: isTk ? 'Takeaway Parcel' : `Chair ${cleanNum}`,
          seatNumber: isTk ? 0 : Number(cleanNum) || 1,
          captainName: isTk ? 'Takeaway Desk' : 'Floor Captain',
          subtotal,
          totalTax: tax,
          cgst: Math.round(tax / 2),
          sgst: Math.round(tax / 2),
          grandTotal: amount,
          method: paymentMethod || 'UPI',
          formattedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          items,
        });
        localStorage.setItem(STORAGE_SETTLED_BILLS, JSON.stringify(list.slice(0, 50)));
      } catch {}
    }

    const settledTicket = meta?.ticketNumber;
    broadcastRealtime('BILL_SETTLED', { chairId: cleanNum, rawChairId: rawChair, normChairId: cleanNum, paymentMethod, amount, ticketNumber: settledTicket });
    broadcastRealtime('SEAT_RELEASED', { chairId: cleanNum, rawChairId: rawChair, normChairId: cleanNum });

    // Notify Fastify backend of payment settlement
    try {
      const isTkOrder = rawChair.toLowerCase().includes('tk') || rawChair.toLowerCase().includes('takeaway') || rawChair.toLowerCase().includes('parcel');
      const cleanSeatId = isTkOrder ? 0 : (Number(cleanNum) || 1);
      const gw = (paymentMethod ? String(paymentMethod).toUpperCase() : 'CASH');
      fetch(`${getBackendUrl()}/api/payments/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatId: cleanSeatId,
          gateway: gw,
          settledByRole: 'WAITER',
        }),
      }).catch(() => {});
    } catch {}

    return true;
  },

  // Get current shift metrics
  getShiftStats(): { totalSales: number; billsSettled: number; tipsEarned: number; kotsPunched: number; guestsServed: number } {
    if (typeof window === 'undefined') {
      return { totalSales: 14850, billsSettled: 18, tipsEarned: 620, kotsPunched: 28, guestsServed: 42 };
    }
    try {
      const raw = localStorage.getItem(STORAGE_SHIFT_STATS_KEY);
      return raw
        ? JSON.parse(raw)
        : { totalSales: 14850, billsSettled: 18, tipsEarned: 620, kotsPunched: 28, guestsServed: 42 };
    } catch {
      return { totalSales: 14850, billsSettled: 18, tipsEarned: 620, kotsPunched: 28, guestsServed: 42 };
    }
  },

  // Get settled bills history for shift audit
  getSettledBills(): any[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('thoogudeepa_v2_settled_bills_history');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  // Get cash handover receipts to manager till safe
  getCashHandovers(): Array<{
    id: string;
    staffId: string;
    staffName: string;
    amount: number;
    timestamp: string;
    receivedBy: string;
  }> {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('thoogudeepa_v2_cash_handovers');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  // Record a verified cash handover to manager till safe
  recordCashHandover(staffId: string, staffName: string, amount: number) {
    if (typeof window === 'undefined') return null;
    try {
      const existing = this.getCashHandovers();
      const newRecord = {
        id: `hnd-${Date.now()}`,
        staffId,
        staffName,
        amount,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        receivedBy: 'Manager',
      };
      existing.unshift(newRecord);
      localStorage.setItem('thoogudeepa_v2_cash_handovers', JSON.stringify(existing.slice(0, 50)));
      broadcastRealtime('CASH_HANDOVER', { handover: newRecord });
      return newRecord;
    } catch {
      return null;
    }
  },

  // Get captain tips pool
  getCaptainTips(): Record<string, number> {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem('thoogudeepa_v2_captain_tips');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  // Record tip payout to captain
  recordTipPayout(captainName: string, amount: number) {
    if (typeof window === 'undefined') return;
    try {
      const tips = this.getCaptainTips();
      tips[captainName] = Math.max(0, (tips[captainName] || 0) - amount);
      localStorage.setItem('thoogudeepa_v2_captain_tips', JSON.stringify(tips));

      const payoutLogRaw = localStorage.getItem('thoogudeepa_v2_tip_payouts');
      const payoutLogs = payoutLogRaw ? JSON.parse(payoutLogRaw) : [];
      payoutLogs.unshift({
        id: `tip-out-${Date.now()}`,
        captainName,
        amount,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
      });
      localStorage.setItem('thoogudeepa_v2_tip_payouts', JSON.stringify(payoutLogs.slice(0, 50)));
    } catch {}
  },

  // Get live dish availability map (86 stock)
  getDishAvailability(): Record<string, boolean> {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem('thoogudeepa_v2_dish_stock');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  // Get promotional campaigns (synchronous cache)
  getPromos(): any[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('thoogudeepa_v2_promos');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  // Get promotional campaigns asynchronously with backend REST sync
  async getPromosAsync(): Promise<any[]> {
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch(`${getBackendUrl()}/api/promos`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            localStorage.setItem('thoogudeepa_v2_promos', JSON.stringify(data));
            return data;
          }
        }
      } catch {}
    }
    return this.getPromos();
  },

  // Save promotional campaigns
  savePromos(rules: any[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('thoogudeepa_v2_promos', JSON.stringify(rules));
      if (localChannel) {
        localChannel.postMessage({
          type: 'PROMOS_UPDATED',
          rules,
        });
      }
      fetch(`${getBackendUrl()}/api/promos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rules),
      }).catch(() => {});
    } catch {}
  },

  // Get live status of floor seats (Seats 01-10 Zone 1, dynamically expandable)
  async getFloorSeats(start = 1, count = 10): Promise<
    Array<{
      id: string;
      seatNumber: string;
      numericId: number;
      status: 'vacant' | 'occupied' | 'billing';
      guestName: string;
      guestCount: number;
      diningDuration: string;
      itemCount: number;
      runningTotal: number;
      hasBillRequest: boolean;
      hasPendingAlert: boolean;
      alertMessage?: string;
      zone: string;
      orderId?: string;
      ticketNumber?: string;
    }>
  > {
    const occupancyMap = getLocalOccupancyMap();
    const activeOrders = await this.getActiveOrders();
    const alerts = getLocalAlertsList().filter((a) => !a.isResolved);

    const list = [];
    const end = start + count - 1;
    for (let i = start; i <= end; i++) {
      const chairId = i < 10 ? `0${i}` : `${i}`;
      const seatNumber = `Seat ${chairId}`;
      const padded = chairId;
      const unpadded = String(i);
      const occ = occupancyMap[chairId] || occupancyMap[unpadded] || occupancyMap[`Seat ${chairId}`] || occupancyMap[`Seat ${unpadded}`];
      const seatOrders = activeOrders.filter((o) => {
        const oChair = (o.order.chair_id || '').replace(/[^0-9]/g, '');
        return oChair === chairId || oChair === unpadded || Number(oChair) === i || o.order.chair_id === seatNumber;
      });
      const uncompletedOrders = seatOrders.filter(
        (o) => o.order.status !== 'completed' && o.order.status !== 'cancelled'
      );
      const currentTicketOrders = uncompletedOrders;

      const allSeatItems: OrderItemRecord[] = [];
      const seenFloorItemIds = new Set<string>();
      currentTicketOrders.forEach((so) => {
        if (so.items) {
          so.items.forEach((it) => {
            if (!it.id || !seenFloorItemIds.has(it.id)) {
              if (it.id) seenFloorItemIds.add(it.id);
              allSeatItems.push(it);
            }
          });
        }
      });
      const foundOrder = currentTicketOrders[0];
      const seatAlert = alerts.find((a) => {
        const aSeatClean = a.seatNumber.replace(/[^0-9]/g, '');
        return aSeatClean === chairId || aSeatClean === unpadded || Number(aSeatClean) === i || a.seatNumber === seatNumber;
      });

      const activeBillReq = getLocalBillRequests()[chairId] || getLocalBillRequests()[unpadded];
      // If there are no active orders and no active bill request, clear any stale occupancy records for this seat
      if (currentTicketOrders.length === 0 && !activeBillReq) {
        if (occupancyMap[chairId] || occupancyMap[unpadded] || occupancyMap[`Seat ${chairId}`] || occupancyMap[`Seat ${unpadded}`]) {
          delete occupancyMap[chairId];
          delete occupancyMap[unpadded];
          delete occupancyMap[`Seat ${chairId}`];
          delete occupancyMap[`Seat ${unpadded}`];
          setLocalOccupancyMap(occupancyMap);
        }
      }

      const freshOcc = occupancyMap[chairId] || occupancyMap[unpadded] || occupancyMap[`Seat ${chairId}`] || occupancyMap[`Seat ${unpadded}`];
      const isBilling = Boolean(activeBillReq) || freshOcc?.status === 'billing' || seatAlert?.title?.toLowerCase().includes('bill');
      const isOccupied = Boolean(currentTicketOrders.length > 0 || (freshOcc && activeBillReq));

      let calculatedTotal = 0;
      if (allSeatItems.length > 0) {
        const sub = allSeatItems.reduce((acc, it) => acc + it.price * it.quantity, 0);
        calculatedTotal = sub + Math.round(sub * 0.05);
      } else if (currentTicketOrders.length > 0) {
        calculatedTotal = currentTicketOrders.reduce((acc, so) => acc + (so.order.total_amount || 0), 0);
      } else if (occ) {
        calculatedTotal = 840;
      }

      const totalAmount = activeBillReq?.amount || calculatedTotal;
      const itemCount = allSeatItems.length > 0
        ? allSeatItems.reduce((acc, it) => acc + it.quantity, 0)
        : (isOccupied ? 2 : 0);
      const guestName =
        foundOrder?.order?.device_token?.replace('waiter-', '') ||
        (isOccupied ? `Guest (${seatNumber})` : 'Walk-In Guest');

      let diningDuration = 'Just seated';
      if (occ?.placedAt) {
        const mins = Math.max(1, Math.round((Date.now() - occ.placedAt) / 60000));
        diningDuration = `${mins}m`;
      }

      const zoneName = i <= 10 ? 'Zone 1 (Seats 01-10)' : i <= 20 ? 'Zone 2 (Seats 11-20)' : i <= 30 ? 'Zone 3 (Seats 21-30)' : 'Zone 4 (Seats 31-40)';

      const allSeatTickets = Array.from(
        new Set(currentTicketOrders.map((o) => o.order.ticket_number).filter(Boolean))
      ).join(' • ');

      list.push({
        id: chairId,
        seatNumber,
        numericId: i,
        status: isBilling ? ('billing' as const) : isOccupied ? ('occupied' as const) : ('vacant' as const),
        guestName: isOccupied ? guestName : 'Walk-In Guest',
        guestCount: isOccupied ? 2 : 0,
        diningDuration: isOccupied ? diningDuration : '--',
        itemCount,
        runningTotal: totalAmount,
        hasBillRequest: Boolean(isBilling),
        hasPendingAlert: Boolean(seatAlert),
        alertMessage: seatAlert?.title,
        zone: zoneName,
        orderId: foundOrder?.order?.id,
        ticketNumber: allSeatTickets || foundOrder?.order?.ticket_number
      });
    }
    return list;
  },

  // Get active order details for a specific seat combining all active batches for the current ticket
  async getOrderForSeat(chairId: string): Promise<{ order: OrderRecord | null; items: OrderItemRecord[] }> {
    const cleanId = chairId.replace(/[^0-9]/g, '');
    const padded = cleanId.padStart(2, '0');
    const unpadded = cleanId.replace(/^0+/, '');

    // 1. Authoritative Seat Tab directly from Fastify backend (Single Source of Truth)
    try {
      const tabRes = await fetch(`${getBackendUrl()}/api/seats/${cleanId || '1'}/tab`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      if (
        tabRes &&
        tabRes.session?.status === 'ACTIVE' &&
        Array.isArray(tabRes.orders) &&
        tabRes.orders.length > 0
      ) {
        const stageMap: Record<string, 'PLACED' | 'REC' | 'PREP' | 'READY' | 'SERVED'> = {
          QUEUED: 'PLACED',
          COOKING: 'PREP',
          READY: 'READY',
          SERVED: 'SERVED',
        };

        const allItems: OrderItemRecord[] = (tabRes.allItems || []).map((it: any, idx: number) => {
          const effStage = stageMap[it.itemStage] || 'PLACED';
          return {
            id: it.id || `dish-${it.menuItemId}-${idx}`,
            order_id: it.orderId,
            chair_id: padded,
            seat_label: `SEAT ${padded}`,
            dish_id: `dish-${it.menuItemId}`,
            dish_name: it.nameSnapshot,
            quantity: it.quantity || 1,
            price: it.priceSnapshot || 0,
            stage: effStage,
            notes: it.notes || '',
            addons: effStage === 'SERVED' ? ['SERVED'] : [],
          };
        });

        const allTickets = Array.from(
          new Set(tabRes.orders.map((o: any) => o.orderNumber).filter(Boolean))
        ).join(' • ');

        const latestOrder = tabRes.orders[tabRes.orders.length - 1];

        return {
          order: {
            id: latestOrder?.id || `ord-${cleanId}`,
            ticket_number: allTickets || latestOrder?.orderNumber || `ORD-${cleanId}`,
            chair_id: padded,
            seat_label: `SEAT ${padded}`,
            status: tabRes.orders.every((o: any) => o.overallStage === 'PAID') ? 'completed' : 'pending',
            total_amount: tabRes.total || 0,
          } as OrderRecord,
          items: allItems,
        };
      }
    } catch {}

    // 2. Active Orders & Local Hydration Fallback
    const activeOrders = await this.getActiveOrders();
    const matchingOrders = activeOrders.filter(
      (o) =>
        o.order.chair_id === padded ||
        o.order.chair_id === unpadded ||
        o.order.chair_id === chairId ||
        (o.order.chair_id && o.order.chair_id.replace(/[^0-9]/g, '') === cleanId)
    );
    if (matchingOrders.length > 0) {
      // Keep all active uncompleted batches for this seat session
      const uncompletedOrders = matchingOrders.filter(
        (o) => o.order.status !== 'completed' && o.order.status !== 'cancelled'
      );
      if (uncompletedOrders.length === 0) {
        return { order: null, items: [] };
      }
      const sessionOrders = uncompletedOrders;

      const hasAuthoritative = sessionOrders.some((o) => String(o.order.ticket_number).startsWith('ORD-'));
      const effectiveOrders = hasAuthoritative
        ? sessionOrders.filter((o) => !String(o.order.ticket_number).startsWith('TK-'))
        : sessionOrders;

      const seenItemIds = new Set<string>();
      const allItems: OrderItemRecord[] = [];
      effectiveOrders.forEach((o) => {
        const hydratedItems = this.hydrateOrderItemStages(o.order, o.items);
        hydratedItems.forEach((it, idx) => {
          const itemKey = it.id || `${o.order.id || o.order.ticket_number}-${it.dish_id}-${idx}`;
          if (!seenItemIds.has(itemKey)) {
            seenItemIds.add(itemKey);
            allItems.push({
              ...it,
              id: it.id || itemKey,
              order_id: it.order_id || o.order.id,
            });
          }
        });
      });
      const latestOrder = effectiveOrders[0].order;
      const sub = allItems.reduce((acc, it) => acc + (it.price * (it.quantity || 1)), 0);
      const combinedTotal = sub + Math.round(sub * 0.05);
      const allTickets = Array.from(
        new Set(effectiveOrders.map((o) => o.order.ticket_number).filter(Boolean))
      ).join(' • ');

      return {
        order: {
          ...latestOrder,
          ticket_number: allTickets || latestOrder.ticket_number,
          total_amount: combinedTotal,
        },
        items: allItems,
      };
    }

    return { order: null, items: [] };
  },

  // Subscribe to KDS & Seat Occupancy changes
  subscribeKDS(callbacks: KDSCallbacks) {
    activeKdsSubscribers.add(callbacks);

    // 1. Initialize Socket.io Bridge to Fastify backend
    initSocketBridge();

    // 2. Initialize Supabase Realtime Channel once as singleton
    initSharedRealtimeChannel();

    // 2. Initialize Local Broadcast Channel listener once
    if (localChannel && !sharedLocalListenerInitialized) {
      sharedLocalListenerInitialized = true;
      localChannel.addEventListener('message', (event: MessageEvent) => {
        const data = event.data;
        if (!data) return;

        if (data.type === 'NEW_ORDER') {
          const ordId = data.order?.id;
          if (ordId) {
            if (processedOrderIds.has(ordId)) return;
            processedOrderIds.add(ordId);
          }
          activeKdsSubscribers.forEach((cb) => {
            if (cb.onNewOrder) cb.onNewOrder({ order: data.order, items: data.items });
          });
        } else if (data.type === 'STAGE_CHANGE') {
          activeKdsSubscribers.forEach((cb) => {
            if (cb.onStageChange) {
              cb.onStageChange({
                key: data.key,
                stage: data.stage,
                dishId: data.dishId,
                chairId: data.chairId,
                ticketNumber: data.ticketNumber,
                dishName: data.dishName,
                itemId: data.itemId,
                itemIndex: data.itemIndex,
              });
            }
          });
        } else if (data.type === 'TICKET_DISPATCHED') {
          activeKdsSubscribers.forEach((cb) => {
            if (cb.onTicketDispatched) cb.onTicketDispatched({ ticketNumber: data.ticketNumber, chairId: data.chairId });
          });
        } else if (data.type === 'SEAT_OCCUPIED') {
          activeKdsSubscribers.forEach((cb) => {
            if (cb.onSeatOccupancyChange) cb.onSeatOccupancyChange({ chairId: data.chairId, isOccupied: true });
          });
        } else if (data.type === 'SEAT_RELEASED') {
          const targetChair = data.chairId || data.rawChairId || data.normChairId;
          if (targetChair) {
            this.releaseSeat(targetChair);
          }
          activeKdsSubscribers.forEach((cb) => {
            if (cb.onSeatOccupancyChange && targetChair) cb.onSeatOccupancyChange({ chairId: targetChair, isOccupied: false });
          });
        } else if (data.type === 'NEW_ALERT') {
          activeKdsSubscribers.forEach((cb) => {
            if (cb.onNewAlert) cb.onNewAlert(data.alert);
          });
        } else if (data.type === 'RESOLVE_ALERT') {
          activeKdsSubscribers.forEach((cb) => {
            if (cb.onResolveAlert) cb.onResolveAlert(data.alertId);
          });
        } else if (data.type === 'BILL_REQUESTED') {
          activeKdsSubscribers.forEach((cb) => {
            if (cb.onBillRequested) {
              cb.onBillRequested({
                chairId: data.chairId,
                amount: data.amount,
                verification: data.payload,
              });
            }
          });
        } else if (data.type === 'BILL_MODE_ACTIVE') {
          activeKdsSubscribers.forEach((cb) => {
            if (cb.onBillModeActive) {
              cb.onBillModeActive({
                chairId: data.chairId,
                rawChairId: data.rawChairId,
                normChairId: data.normChairId,
                amount: data.amount,
                mode: data.mode,
                ticketNumber: data.ticketNumber
              });
            }
          });
        } else if (data.type === 'CUSTOMER_PAID_UPI') {
          activeKdsSubscribers.forEach((cb) => {
            if (cb.onCustomerPaidUpi) {
              cb.onCustomerPaidUpi({ chairId: data.chairId, rawChairId: data.rawChairId, amount: data.amount, ticketNumber: data.ticketNumber });
            }
          });
        } else if (data.type === 'BILL_SETTLED') {
          const targetChair = data.chairId || data.rawChairId || data.normChairId;
          if (targetChair) {
            this.releaseSeat(targetChair);
          }
          activeKdsSubscribers.forEach((cb) => {
            if (cb.onBillSettled) {
              cb.onBillSettled({
                chairId: data.chairId,
                rawChairId: data.rawChairId,
                normChairId: data.normChairId,
                amount: data.amount,
                paymentMethod: data.paymentMethod,
                ticketNumber: data.ticketNumber
              });
            }
            if (cb.onSeatOccupancyChange && targetChair) {
              cb.onSeatOccupancyChange({ chairId: targetChair, isOccupied: false });
            }
          });
        } else if (data.type === 'CASH_HANDOVER') {
          activeKdsSubscribers.forEach((cb) => {
            if (cb.onCashHandover && data.handover) cb.onCashHandover(data.handover);
          });
        } else if (data.type === 'AVAILABILITY_CHANGE') {
          activeKdsSubscribers.forEach((cb) => {
            if (cb.onAvailabilityChange) cb.onAvailabilityChange({ dishId: data.dishId, isAvailable: data.isAvailable });
          });
        } else if (data.type === 'PROMOS_UPDATED') {
          activeKdsSubscribers.forEach((cb) => {
            if (cb.onPromosUpdated) cb.onPromosUpdated(data.rules);
          });
        } else if (data.type === 'CLEAR_ALL_ORDERS') {
          activeKdsSubscribers.forEach((cb) => {
            if (cb.onClearAll) cb.onClearAll();
          });
        }
      });
    }

    // Unsubscribe cleanup removes callback from subscriber set
    return () => {
      activeKdsSubscribers.delete(callbacks);
    };
  },

  joinSeatRoom(chairId: string | number) {
    if (typeof window === 'undefined') return;
    try {
      const socket = getSocket();
      const norm = normalizeSeatIdentity(chairId);
      socket.emit(SOCKET_EVENTS.JOIN_SEAT, { seatId: norm.seatId });
      socket.emit(SOCKET_EVENTS.JOIN_SEAT, { seatId: norm.chairId });
      socket.emit(SOCKET_EVENTS.JOIN_SEAT, { seatId: norm.paddedChairId });
    } catch (err) {
      console.warn('Failed to join seat room', err);
    }
  },
};
