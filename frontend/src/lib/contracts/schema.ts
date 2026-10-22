import { z } from 'zod';

// ==============================================================================
// THOOGUDEEPA V2: PURE RUNTIME VALIDATION CONTRACTS (ZOD SCHEMAS)
// ==============================================================================

export const StageEnum = z.enum(['REC', 'PREP', 'READY', 'SERVED']);
export type Stage = z.infer<typeof StageEnum>;

export const OrderStatusEnum = z.enum([
  'pending',
  'in_progress',
  'ready',
  'completed',
  'cancelled',
]);
export type OrderStatus = z.infer<typeof OrderStatusEnum>;

export const PaymentStatusEnum = z.enum(['unpaid', 'paid']);
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;

export const PaymentChannelEnum = z.enum([
  'upi_customer',
  'cash_waiter',
  'counter_pos',
]);
export type PaymentChannel = z.infer<typeof PaymentChannelEnum>;

export const OrderOriginEnum = z.enum([
  'customer_qr',
  'waiter_mobile',
  'waiter_tablet',
  'counter',
]);
export type OrderOrigin = z.infer<typeof OrderOriginEnum>;

// Individual Line Item Schema
export const OrderItemSchema = z.object({
  id: z.string().optional(),
  order_id: z.string().optional(),
  chair_id: z.string().min(1),
  seat_label: z.string().default('SEAT'),
  dish_id: z.string().min(1),
  dish_name: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  price: z.number().nonnegative(),
  stage: StageEnum.default('REC'),
  notes: z.string().optional().default(''),
  addons: z.array(z.string()).optional().default([]),
  origin: OrderOriginEnum.default('customer_qr'),
  origin_id: z.string().optional(),
  created_at: z.union([z.string(), z.number()]).optional(),
  updated_at: z.union([z.string(), z.number()]).optional(),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

// Order Header Schema
export const OrderRecordSchema = z.object({
  id: z.string().optional(),
  ticket_number: z.string().min(1),
  chair_id: z.string().min(1),
  seat_label: z.string().min(1),
  status: OrderStatusEnum.default('pending'),
  payment_status: PaymentStatusEnum.default('unpaid'),
  total_amount: z.number().nonnegative().default(0),
  device_token: z.string().optional(),
  idempotency_key: z.string().optional(),
  created_at: z.union([z.string(), z.number()]).optional(),
  updated_at: z.union([z.string(), z.number()]).optional(),
});
export type OrderRecord = z.infer<typeof OrderRecordSchema>;

// Unified Order Packet (Header + Array of Line Items)
export const OrderPacketSchema = z.object({
  order: OrderRecordSchema,
  items: z.array(OrderItemSchema),
});
export type OrderPacket = z.infer<typeof OrderPacketSchema>;

// Seat Occupancy Registry Schema
export const SeatOccupancySchema = z.object({
  chairId: z.string().min(1),
  ticketNumber: z.string().optional(),
  orderId: z.string().optional(),
  deviceToken: z.string().default(''),
  status: z.enum(['occupied', 'vacant', 'bill_requested']).default('vacant'),
  orderStatus: OrderStatusEnum.optional(),
  placedAt: z.number().optional(),
});
export type SeatOccupancy = z.infer<typeof SeatOccupancySchema>;

// Waiter Table Pager / Service Alert Schema
export const WaiterRequestTypeEnum = z.enum([
  'water',
  'clean_table',
  'cash_bill',
  'call_waiter',
]);
export type WaiterRequestType = z.infer<typeof WaiterRequestTypeEnum>;

export const WaiterRequestSchema = z.object({
  requestId: z.string().min(1),
  chairId: z.string().min(1),
  requestType: WaiterRequestTypeEnum,
  status: z.enum(['pending', 'attending', 'completed']).default('pending'),
  requestedAt: z.number(),
  attendedBy: z.string().optional(),
});
export type WaiterRequest = z.infer<typeof WaiterRequestSchema>;

// Safe Parsers that guarantee zero undefined crashes
export function safeParseOrderPacket(data: unknown): OrderPacket | null {
  const result = OrderPacketSchema.safeParse(data);
  if (!result.success) {
    console.warn('Invalid OrderPacket payload intercepted:', result.error.format());
    return null;
  }
  return result.data;
}

export function safeParseOrderItem(data: unknown): OrderItem | null {
  const result = OrderItemSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function safeParseSeatOccupancy(data: unknown): SeatOccupancy | null {
  const result = SeatOccupancySchema.safeParse(data);
  return result.success ? result.data : null;
}
