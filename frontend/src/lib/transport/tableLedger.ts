import { OrderItem, OrderRecord, safeParseOrderItem } from '../contracts/schema';

// ==============================================================================
// THOOGUDEEPA V2: ATOMIC SHARED TABLE LEDGER
// Unifies Customer self-orders & Waiter-appended dishes into a single table bill
// ==============================================================================

export interface SharedTableLedger {
  chairId: string;
  seatLabel: string;
  ticketNumber: string;
  hostDeviceToken: string;
  status: 'pending' | 'in_progress' | 'ready' | 'completed' | 'cancelled';
  paymentStatus: 'unpaid' | 'paid';
  items: OrderItem[];
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  openedAt: number;
  updatedAt: number;
}

export function createEmptyLedger(chairId: string, hostDeviceToken: string = ''): SharedTableLedger {
  const numericSeat = chairId.replace(/[^0-9]/g, '') || chairId;
  const now = Date.now();
  return {
    chairId,
    seatLabel: `SEAT ${numericSeat.padStart(2, '0')}`,
    ticketNumber: `TK-${numericSeat.padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`,
    hostDeviceToken,
    status: 'pending',
    paymentStatus: 'unpaid',
    items: [],
    subtotal: 0,
    gstAmount: 0,
    totalAmount: 0,
    openedAt: now,
    updatedAt: now,
  };
}

export function appendItemsToLedger(
  current: SharedTableLedger,
  newItems: OrderItem[]
): SharedTableLedger {
  const validItems: OrderItem[] = [];

  for (const item of newItems) {
    const parsed = safeParseOrderItem(item);
    if (parsed) {
      validItems.push(parsed);
    }
  }

  const combinedItems = [...current.items, ...validItems];

  const subtotal = combinedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const gstAmount = Math.round(subtotal * 0.05);
  const totalAmount = subtotal + gstAmount;

  return {
    ...current,
    items: combinedItems,
    subtotal,
    gstAmount,
    totalAmount,
    updatedAt: Date.now(),
  };
}

export function updateLedgerItemStage(
  current: SharedTableLedger,
  itemIdOrKey: string,
  newStage: 'REC' | 'PREP' | 'READY' | 'SERVED'
): SharedTableLedger {
  const updatedItems = current.items.map((item) => {
    const matches =
      item.id === itemIdOrKey ||
      item.dish_id === itemIdOrKey ||
      `${item.dish_id}-${item.chair_id}` === itemIdOrKey;

    if (matches) {
      return { ...item, stage: newStage, updated_at: Date.now() };
    }
    return item;
  });

  return {
    ...current,
    items: updatedItems,
    updatedAt: Date.now(),
  };
}
