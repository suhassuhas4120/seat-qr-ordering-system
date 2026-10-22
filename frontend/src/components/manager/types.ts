export type ManagerScreenId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface ManagerProfile {
  id: string;
  name: string;
  role: 'General Manager' | 'Floor Lead' | 'Head Cashier' | 'Staff';
  pin: string;
}

export interface ShiftInfo {
  name: string;
  timeRange: string;
  status: 'ACTIVE' | 'CLOSED';
}

export interface StaffRosterMember {
  id: string;
  name: string;
  role: string;
  assignedSection: string;
  tablesCount: number;
  status: 'ACTIVE' | 'ON BREAK' | 'OFF DUTY';
  phone: string;
  cashCollected: number;
  cashHandedOver: number;
}

export interface PromoRule {
  id: string;
  code: string;
  title: string;
  discountPercent: number;
  minBillAmount: number;
  isActive: boolean;
  description: string;
  timing?: string;
  dateRange?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  durationDays?: number;
}

export interface PettyExpense {
  id: string;
  voucherNumber: string;
  description: string;
  category: 'Kitchen Supplies' | 'Dairy & Fresh' | 'Fuel/Gas' | 'Emergency Maintenance' | 'Miscellaneous';
  amount: number;
  paidTo: string;
  paidBy: string;
  time: string;
}

export interface DishStockItem {
  id: string;
  name: string;
  category: string;
  price: number;
  is86: boolean;
  prepDelayMins: number;
}

export type OrderStage = 'PLACED' | 'RECEIVED' | 'PREP' | 'PLATED' | 'SERVED';

export interface SharedKDSItem {
  id: string;
  name: string;
  quantity: number;
  stage: OrderStage | string;
  prepMode?: string;
  options?: string;
  addOns?: string[];
  notes?: string;
  seatNumber?: number;
  price?: number;
}

export interface SharedKDSTicket {
  id: string;
  tableNumber: string;
  serverName: string;
  timestamp: string;
  elapsedMinutes?: number;
  status: 'NEW' | 'PREP' | 'READY' | 'COMPLETED' | 'SERVED';
  items: SharedKDSItem[];
  source?: 'CUSTOMER' | 'WAITER';
  seatNumber?: number;
}

export interface SharedPing {
  id: string;
  tableNumber: string;
  seatNumber?: number;
  type: string;
  message?: string;
  timestamp: string;
  status: 'PENDING' | 'ACCEPTED' | 'RESOLVED';
  guestName: string;
}

export interface SettledBillSnapshot {
  invoiceNumber: string;
  tableName: string;
  seatLabel?: string;
  seatNumber?: number;
  captainName?: string;
  section?: string;
  guestCount?: number;
  subtotal: number;
  totalTax: number;
  cgst: number;
  sgst: number;
  grandTotal: number;
  method: string;
  cashTendered?: number;
  cashChange?: number;
  formattedDate: string;
  formattedTime: string;
  timestamp: number;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    totalPrice: number;
    options?: string;
    addOns?: string[];
    seatNumber?: number;
  }>;
}
