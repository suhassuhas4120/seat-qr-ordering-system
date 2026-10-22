export type ChairStatus = 'vacant' | 'occupied' | 'ordered' | 'bill_requested';

export type OrderStage = 'queued' | 'cooking' | 'ready' | 'served' | 'cancelled';

export type ServiceCallType = 'waiter_call' | 'water_request' | 'bill_request';

export type ServiceCallStatus = 'pending' | 'acknowledged' | 'completed';

export interface Chair {
  id: string; // e.g. "CHAIR-01" to "CHAIR-100"
  chairNumber: number; // 1 to 100
  label: string; // "Chair 12"
  status: ChairStatus;
  activeSessionId?: string | null;
  updatedAt: string;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  price: number;
  isVegetarian: boolean;
  isSpicy?: boolean;
  isSignature?: boolean;
  inStock: boolean;
  prepTimeMinutes: number;
  imageUrl: string;
  options?: string[];
  addOns?: { name: string; price: number }[];
}

export interface MenuCategory {
  id: string;
  title: string;
  iconName: string;
  sortRank: number;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  customNotes?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  itemTitle: string;
  quantity: number;
  unitRate: number;
  subtotalAmount: number;
  stage: OrderStage;
  customNotes?: string;
}

export interface Order {
  id: string;
  sessionId: string;
  chairId: string;
  orderSequence: number; // Round 1, Round 2, etc.
  stage: OrderStage;
  items: OrderItem[];
  totalAmount: number;
  specialNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChairSession {
  id: string;
  chairId: string;
  guestName?: string;
  guestPhone?: string;
  sessionStatus: 'active' | 'completed' | 'cancelled';
  openedAt: string;
  closedAt?: string;
  orders: Order[];
  runningTotal: number;
  paymentStatus: 'unpaid' | 'paid';
  settlementChannel?: 'cash' | 'upi' | 'card';
}

export interface ServiceCall {
  id: string;
  chairId: string;
  sessionId: string;
  requestType: ServiceCallType;
  status: ServiceCallStatus;
  createdAt: string;
}
