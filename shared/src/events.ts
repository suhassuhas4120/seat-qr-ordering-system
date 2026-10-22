import { Order, OrderItem, Seat, SeatStatus, ItemStage } from './types.js';

export const SOCKET_EVENTS = {
  // Client -> Server Room Joins
  JOIN_SEAT: 'seat:join',
  LEAVE_SEAT: 'seat:leave',
  JOIN_KDS: 'kds:join',
  JOIN_STAFF: 'staff:join',
  JOIN_MANAGER: 'manager:join',

  // Seat Events
  SEAT_CLAIMED: 'seat:claimed',
  SEAT_STATUS_UPDATED: 'seat:status_updated',
  SEAT_VACATED: 'seat:vacated',

  // Order & Item Events (Item-level live tracking)
  ORDER_PLACED: 'order:placed',
  ITEM_STAGE_UPDATED: 'item:stage_updated',
  ORDER_STAGE_UPDATED: 'order:stage_updated',

  // Menu Events (86 out of stock)
  MENU_ITEM_AVAILABILITY_CHANGED: 'menu:item_availability_changed',

  // Staff Call Events
  WAITER_CALLED: 'waiter:called',

  // Payment Events
  PAYMENT_INITIATED: 'payment:initiated',
  PAYMENT_SUCCESS: 'payment:success',
} as const;

export type SocketEventName = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];

export interface SeatClaimedPayload {
  seatId: number;
  seatNumber: string;
  zone: string;
  status: SeatStatus;
  startedAt: string;
}

export interface SeatStatusUpdatedPayload {
  seatId: number;
  status: SeatStatus;
  activeOrderTotal?: number;
  activeItemCount?: number;
}

export interface SeatVacatedPayload {
  seatId: number;
  seatNumber: string;
  vacatedAt: string;
}

export interface OrderPlacedPayload {
  order: Order;
  seat: Seat;
}

export interface ItemStageUpdatedPayload {
  itemId: string;
  orderId: string;
  seatId: number;
  newStage: ItemStage;
  overallOrderStage: string;
  updatedAt: string;
}

export interface MenuItemAvailabilityPayload {
  itemId: number;
  isAvailable: boolean;
}

export interface WaiterCalledPayload {
  seatId: number;
  seatNumber: string;
  zone: string;
  reason: 'ASSISTANCE' | 'WATER' | 'BILL';
  timestamp: string;
}

export interface PaymentSuccessPayload {
  seatId: number;
  seatNumber: string;
  paymentId: string;
  amount: number;
  settledBy: string;
  completedAt: string;
}
