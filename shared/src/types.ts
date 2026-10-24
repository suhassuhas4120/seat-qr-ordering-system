export type SeatZone = 'COUNTER_A' | 'COUNTER_B' | 'BAR' | 'WINDOW' | 'CENTER';

export type SeatStatus = 'VACANT' | 'OCCUPIED' | 'BILL_REQUESTED';

export interface Seat {
  id: number;
  seatNumber: string; // e.g. "S001" to "S100"
  zone: SeatZone;
  currentStatus: SeatStatus;
  epochHash: string;
  activeSessionId?: string | null;
  activeOrderTotal?: number;
  activeItemCount?: number;
  updatedAt: string;
}

export interface SeatSession {
  id: string;
  seatId: number;
  sessionToken: string;
  clientIp?: string;
  deviceToken?: string;
  status: 'ACTIVE' | 'SETTLING' | 'COMPLETED' | 'CANCELLED';
  startedAt: string;
  endedAt?: string | null;
}

export type DietaryType = 'VEG' | 'NON_VEG' | 'VEGAN' | 'GLUTEN_FREE';

export interface MenuCategory {
  id: number;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

export interface MenuItem {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  dietaryType: DietaryType;
  isAvailable: boolean;
  preparationTimeMinutes: number;
}

export type ItemStage = 'QUEUED' | 'COOKING' | 'READY' | 'SERVED' | 'PAID';

export type OrderStage = 'PLACED' | 'PREPARING' | 'READY' | 'SERVED' | 'PAID';

export type CreatedByRole = 'CUSTOMER' | 'WAITER_MOBILE' | 'WAITER_TABLET' | 'MANAGER';

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: number;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  notes?: string | null;
  itemStage: ItemStage;
  bumpedByChefId?: number | null;
  deliveredByWaiterId?: number | null;
  updatedAt: string;
}

export interface Order {
  id: string;
  sessionId: string;
  seatId: number;
  orderNumber: string;
  overallStage: OrderStage;
  createdByRole: CreatedByRole;
  waiterId?: number | null;
  placedAt: string;
  items: OrderItem[];
}

export type PaymentGateway = 'RAZORPAY' | 'STRIPE' | 'CASH';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface Payment {
  id: string;
  sessionId: string;
  seatId: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  finalAmount: number;
  gateway: PaymentGateway;
  gatewayPaymentId?: string | null;
  gatewayOrderId?: string | null;
  gatewaySignature?: string | null;
  status: PaymentStatus;
  settledByRole: 'CUSTOMER_SELF' | 'WAITER' | 'MANAGER';
  staffId?: number | null;
  completedAt?: string | null;
}

export type StaffRole = 'WAITER' | 'CHEF' | 'MANAGER';

export interface StaffUser {
  id: number;
  name: string;
  role: StaffRole;
  assignedZone?: SeatZone | null;
  isActive: boolean;
}

// Seat bill summary for quick display on customer, waiter, manager
export interface SeatTabSummary {
  seat: Seat;
  session: SeatSession;
  orders: Order[];
  allItems: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
}
