import { z } from 'zod';

export const SeatZoneSchema = z.enum(['COUNTER_A', 'COUNTER_B', 'BAR', 'WINDOW', 'CENTER']);

export const ClaimSeatInputSchema = z.object({
  seatId: z.number().int().positive(),
  sig: z.string().min(8),
});

export const OrderItemInputSchema = z.object({
  menuItemId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(20),
  notes: z.string().max(200).optional(),
});

export const PlaceOrderInputSchema = z.object({
  seatId: z.number().int().nonnegative(),
  sessionToken: z.string().min(16).optional(),
  deviceToken: z.string().optional(),
  items: z.array(OrderItemInputSchema).min(1),
  createdByRole: z.enum(['CUSTOMER', 'WAITER_MOBILE', 'WAITER_TABLET', 'MANAGER']).default('CUSTOMER'),
  waiterId: z.number().int().positive().optional(),
});

export const UpdateItemStageInputSchema = z.object({
  itemId: z.string().min(1),
  newStage: z.enum(['QUEUED', 'COOKING', 'READY', 'SERVED', 'PAID']),
  staffId: z.number().int().positive().optional(),
  seatId: z.number().int().nonnegative().optional(),
  ticketNumber: z.string().optional(),
  dishId: z.string().optional(),
  dishName: z.string().optional(),
});

export const UpdateItemAvailabilityInputSchema = z.object({
  itemId: z.number().int().positive(),
  isAvailable: z.boolean(),
});

export const CreatePaymentIntentInputSchema = z.object({
  seatId: z.number().int().nonnegative(),
  sessionToken: z.string().min(16),
  gateway: z.enum(['RAZORPAY', 'STRIPE', 'CASH']).default('RAZORPAY'),
  settledByRole: z.enum(['CUSTOMER_SELF', 'WAITER', 'MANAGER']).default('CUSTOMER_SELF'),
  staffId: z.number().int().positive().optional(),
});

export const ConfirmPaymentWebhookSchema = z.object({
  paymentId: z.string(),
  orderId: z.string().optional(),
  seatId: z.number().int().nonnegative(),
  amount: z.number().positive(),
  gateway: z.enum(['RAZORPAY', 'STRIPE', 'CASH']),
  signature: z.string().optional(),
});

export const StaffLoginSchema = z.object({
  pin: z.string().length(4),
});
