import fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import crypto from 'crypto';
import { db } from './db/index.js';
import { orderService } from './services/orderService.js';
import { paymentService } from './services/paymentService.js';
import { setupWebSockets } from './sockets/index.js';
import {
  ClaimSeatInputSchema,
  PlaceOrderInputSchema,
  UpdateItemStageInputSchema,
  UpdateItemAvailabilityInputSchema,
  StaffLoginSchema,
} from './shared/index.js';

const app = fastify({ logger: true });

// Register security & utility plugins
await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(helmet, {
  contentSecurityPolicy: false,
});

await app.register(cookie);

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// Health check
app.get('/health', async () => ({ status: 'ok', time: new Date().toISOString() }));

// 1. Menu API
app.get('/api/menu', async () => {
  const categories = db.data.menuCategories.filter((c) => c.isActive);
  const items = db.data.menuItems;

  return {
    categories,
    items,
  };
});

// 2. Seats Floor Matrix (All 100 Seats for Waiter & Manager)
app.get('/api/seats/matrix', async () => {
  return orderService.getAllSeatsFloorMatrix();
});

// 3. Claim Seat via Dynamic QR or Auto-Resume
app.get('/api/seats/:seatId/claim', async (req, reply) => {
  const { seatId } = req.params as { seatId: string };
  const { sig } = req.query as { sig?: string };
  const existingToken = (req.headers['x-seat-session-token'] as string) || req.cookies?.seat_session_token;

  try {
    const result = await orderService.claimSeat(
      Number(seatId),
      sig || '',
      req.ip,
      existingToken
    );

    // Set secure cookie for auto-rehydration on refresh/tab switch
    reply.setCookie('seat_session_token', result.session.sessionToken, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 86400, // 24 hours
    });

    return reply.send(result);
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
});

// 4. Get Consolidated Active Seat Tab
app.get('/api/seats/:seatId/tab', async (req, reply) => {
  const { seatId } = req.params as { seatId: string };
  try {
    const summary = await orderService.getSeatTabSummary(Number(seatId));
    return reply.send(summary);
  } catch (error: any) {
    return reply.status(404).send({ error: error.message });
  }
});

// 5. Collaborative Order Placement (Customer, Waiter Mobile, Tablet, Manager)
app.post('/api/orders', async (req, reply) => {
  const sessionTokenHeader = req.headers['x-seat-session-token'] as string;
  const parseResult = PlaceOrderInputSchema.safeParse(req.body);

  if (!parseResult.success) {
    return reply.status(400).send({ error: parseResult.error.format() });
  }

  const { seatId, sessionToken, items, createdByRole, waiterId } = parseResult.data;

  try {
    const result = await orderService.placeOrder({
      seatId,
      sessionToken: sessionToken || sessionTokenHeader,
      items,
      createdByRole,
      waiterId,
    });
    return reply.status(201).send(result);
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
});

// 6. Granular Item-Level Stage Transition
app.patch('/api/orders/items/:itemId/stage', async (req, reply) => {
  const { itemId } = req.params as { itemId: string };
  const parseResult = UpdateItemStageInputSchema.safeParse({
    itemId,
    ...(req.body as any),
  });

  if (!parseResult.success) {
    return reply.status(400).send({ error: parseResult.error.format() });
  }

  try {
    const rawSeatId = parseResult.data.seatId || ((req.body as any)?.seatId ? Number((req.body as any).seatId) : undefined);
    const rawTicketNum = parseResult.data.ticketNumber || (req.body as any)?.ticketNumber;
    const rawDishId = parseResult.data.dishId || (req.body as any)?.dishId;
    const rawDishName = parseResult.data.dishName || (req.body as any)?.dishName;
    const result = await orderService.updateItemStage(
      parseResult.data.itemId,
      parseResult.data.newStage,
      parseResult.data.staffId,
      { seatId: rawSeatId, ticketNumber: rawTicketNum, dishId: rawDishId, dishName: rawDishName }
    );
    return reply.send(result);
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
});

// 7. Active Floor Dining Orders (All active tables with unsettled bills)
app.get('/api/orders/active', async () => {
  return orderService.getActiveFloorOrders();
});

// 8. Kitchen KDS Active Tickets
app.get('/api/kds/tickets', async () => {
  return orderService.getKdsActiveTickets();
});

// 9. KDS 86 Out-of-Stock Toggle
app.post('/api/menu/items/:itemId/availability', async (req, reply) => {
  const { itemId } = req.params as { itemId: string };
  const parseResult = UpdateItemAvailabilityInputSchema.safeParse({
    itemId: Number(itemId),
    ...(req.body as any),
  });

  if (!parseResult.success) {
    return reply.status(400).send({ error: parseResult.error.format() });
  }

  const result = await orderService.setItemAvailability(
    parseResult.data.itemId,
    parseResult.data.isAvailable
  );
  return reply.send(result);
});

// 9. Payment Settlement & Instant Real-Time Auto-Vacate
app.post('/api/payments/process', async (req, reply) => {
  const { seatId, gateway, settledByRole, staffId, gatewayPaymentId } = req.body as any;

  if (seatId === undefined || seatId === null || seatId === '') {
    return reply.status(400).send({ error: 'Missing seatId.' });
  }

  try {
    const effectiveGateway = (gateway || (settledByRole === 'WAITER' || settledByRole === 'MANAGER' ? 'CASH' : 'RAZORPAY')).toUpperCase();
    const result = await paymentService.processPayment({
      seatId: Number(seatId),
      gateway: effectiveGateway as any,
      settledByRole: settledByRole || 'CUSTOMER_SELF',
      staffId: staffId ? Number(staffId) : undefined,
      gatewayPaymentId,
    });

    // Clear cookie on successful checkout
    reply.clearCookie('seat_session_token', { path: '/' });

    return reply.send(result);
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
});

// 10. Webhook endpoint for Razorpay / Stripe
app.post('/api/payments/webhook', async (req, reply) => {
  const { seatId, gateway, paymentId } = req.body as any;

  try {
    const result = await paymentService.processPayment({
      seatId: Number(seatId),
      gateway: gateway || 'RAZORPAY',
      settledByRole: 'CUSTOMER_SELF',
      gatewayPaymentId: paymentId,
    });
    return reply.send({ received: true, ...result });
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
});

// 10B. Dynamic Zero-MDR Merchant UPI Configuration
app.get('/api/payments/upi-config', async () => {
  return {
    upiVpa: process.env.MERCHANT_UPI_VPA || 'thoogudeepa@okicici',
    merchantName: process.env.MERCHANT_NAME || 'Thoogudeepa Donne Biryani Mane',
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  };
});

// 10C. Razorpay Order Creation & Webhook Signature Verification
app.post('/api/payments/razorpay/verify', async (req, reply) => {
  const { seatId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body as any;
  const secret = process.env.RAZORPAY_KEY_SECRET;

  if (secret && razorpayOrderId && razorpayPaymentId && razorpaySignature) {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expected !== razorpaySignature) {
      return reply.status(400).send({ error: 'Invalid Razorpay payment signature' });
    }
  }

  try {
    const result = await paymentService.processPayment({
      seatId: Number(seatId),
      gateway: 'RAZORPAY',
      settledByRole: 'CUSTOMER_SELF',
      gatewayPaymentId: razorpayPaymentId || `PAY_RZP_${Date.now()}`,
    });
    return reply.send(result);
  } catch (error: any) {
    return reply.status(400).send({ error: error.message });
  }
});

// 11. Staff 4-Digit PIN Authentication
app.post('/api/staff/login', async (req, reply) => {
  const parseResult = StaffLoginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return reply.status(400).send({ error: '4-digit PIN is required' });
  }

  const pin = parseResult.data.pin;
  const user = db.data.users.find((u) => {
    // 6 Waiters PIN mapping
    if ((pin === '1001' || pin === '1234') && u.name === 'Alex Johnson') return true;
    if ((pin === '1002' || pin === '5678') && u.name === 'Maya Lin') return true;
    if ((pin === '1003' || pin === '1111') && u.name === 'Ramesh Kumar') return true;
    if ((pin === '1004' || pin === '2222') && u.name === 'Suresh M') return true;
    if ((pin === '1005' || pin === '3333') && u.name === 'Anand Kumar') return true;
    if ((pin === '1006' || pin === '4444') && u.name === 'Deepa Naik') return true;
    // Kitchen KDS Chef PIN
    if (pin === '9999' && u.role === 'CHEF') return true;
    // Floor / General Manager PIN
    if ((pin === '0000' || pin === '1234') && u.role === 'MANAGER') return true;
    return false;
  });

  if (!user) {
    return reply.status(401).send({ error: 'Invalid PIN code. Try 1001-1006 for 6 Waiters, 9999 for Kitchen, 0000 for Manager.' });
  }

  return reply.send({
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      assignedZone: user.assignedZone,
    },
  });
});

// 12. Manager Cash Reconciliation Ledger
app.get('/api/manager/cash-ledger', async () => {
  return paymentService.getStaffCashLedger();
});

// 13. Manager Live Statistics
app.get('/api/manager/stats', async () => {
  const allSeats = await orderService.getAllSeatsFloorMatrix();
  const occupiedCount = allSeats.filter((s) => s.currentStatus !== 'VACANT').length;

  const totalRevenue = db.data.payments
    .filter((p) => p.status === 'SUCCESS')
    .reduce((acc, p) => acc + p.finalAmount, 0);

  const activeOrders = await orderService.getKdsActiveTickets();

  return {
    totalSeats: 100,
    occupiedSeats: occupiedCount,
    occupancyPercentage: Math.round((occupiedCount / 100) * 100),
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    todayTransactionsCount: db.data.payments.length,
    activeKitchenTicketsCount: activeOrders.length,
    recentPayments: db.data.payments.slice(-10).reverse(),
  };
});

// Start Server
const PORT = Number(process.env.PORT) || 4000;
const HOST = '0.0.0.0';

try {
  await app.listen({ port: PORT, host: HOST });
  setupWebSockets(app.server);
  console.log(`🚀 Fastify Realtime Backend running at http://localhost:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
