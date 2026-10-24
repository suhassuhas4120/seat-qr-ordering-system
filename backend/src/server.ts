import 'dotenv/config';
import fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import crypto from 'crypto';
import { db } from './db/index.js';
import { orderService } from './services/orderService.js';
import { paymentService } from './services/paymentService.js';
import { setupWebSockets, io, activeSeatBillModes, clearSeatBillMode } from './sockets/index.js';
import {
  ClaimSeatInputSchema,
  PlaceOrderInputSchema,
  UpdateItemStageInputSchema,
  UpdateItemAvailabilityInputSchema,
  StaffLoginSchema,
  SOCKET_EVENTS,
  normalizeSeatIdentity,
  REALTIME_TOPICS,
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

// 3B. Real-Time Authoritative Seat Occupancy & Ownership Verification (Anti-Hijack & Anti-Cheat)
app.get('/api/seats/:seatId/occupancy', async (req, reply) => {
  const { seatId } = req.params as { seatId: string };
  const { deviceToken } = req.query as { deviceToken?: string };
  const tokenHeader = (req.headers['x-device-token'] as string) || deviceToken;

  const norm = normalizeSeatIdentity(seatId);
  const result = await orderService.getSeatOccupancy(norm.seatId, tokenHeader);
  return reply.send(result);
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
  const deviceTokenHeader = req.headers['x-device-token'] as string;
  const parseResult = PlaceOrderInputSchema.safeParse(req.body);

  if (!parseResult.success) {
    return reply.status(400).send({ error: parseResult.error.format() });
  }

  const { seatId, sessionToken, deviceToken, items, createdByRole, waiterId } = parseResult.data;

  try {
    const result = await orderService.placeOrder({
      seatId,
      sessionToken: sessionToken || sessionTokenHeader,
      deviceToken: deviceToken || deviceTokenHeader,
      items,
      createdByRole,
      waiterId,
      clientIp: req.ip,
    });
    return reply.status(201).send(result);
  } catch (error: any) {
    const isConflict = error.message?.includes('SEAT_ALREADY_OCCUPIED') || error.message?.includes('ACTIVE_SESSION_EXISTS');
    return reply.status(isConflict ? 409 : 400).send({ error: error.message });
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

// 8B. Floor Service Alerts & Customer Calls
app.get('/api/service-alerts', async () => {
  return (db.data.serviceAlerts || []).filter((a: any) => !a.isResolved);
});

app.post('/api/service-alerts', async (req, reply) => {
  const body = req.body as any;
  const numSeat = Number(body.seatId) || 0;
  const seatNumStr = body.seatNumber || `Seat ${numSeat}`;
  const isBill = body.type === 'customer_call' || String(body.title || '').toLowerCase().includes('bill');

  const alertRecord = {
    id: body.id || `alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type: body.type || 'customer_call',
    seatNumber: seatNumStr,
    chairId: String(numSeat),
    title: body.title || (isBill ? `Bill Requested` : `${seatNumStr} Assistance`),
    message: body.message || (isBill ? `Bill requested for ${seatNumStr}` : `Guest requested assistance`),
    timeAgo: 'Just now',
    billAmount: body.billAmount || 0,
    isUrgent: true,
    isResolved: false,
    createdAt: Date.now(),
  };

  if (!db.data.serviceAlerts) db.data.serviceAlerts = [];
  const existingIdx = db.data.serviceAlerts.findIndex(
    (a: any) => !a.isResolved && a.chairId === String(numSeat) && a.type === alertRecord.type
  );
  if (existingIdx >= 0) {
    db.data.serviceAlerts[existingIdx] = alertRecord;
  } else {
    db.data.serviceAlerts.unshift(alertRecord);
  }

  if (isBill) {
    const seat = db.data.seats.find((s) => s.id === numSeat);
    if (seat) {
      seat.currentStatus = 'BILL_REQUESTED';
      seat.updatedAt = new Date().toISOString();
    }
  }

  const fullPayload = {
    seatId: numSeat,
    seatNumber: seatNumStr,
    reason: isBill ? 'BILL' : 'ASSISTANCE',
    amount: alertRecord.billAmount,
    alert: alertRecord,
    timestamp: new Date().toISOString(),
  };

  if (io) {
    io.emit(SOCKET_EVENTS.WAITER_CALLED, fullPayload);
    io.to('staff:mobile').emit(SOCKET_EVENTS.WAITER_CALLED, fullPayload);
    io.to('staff:tablet').emit(SOCKET_EVENTS.WAITER_CALLED, fullPayload);
    io.to('manager').emit(SOCKET_EVENTS.WAITER_CALLED, fullPayload);

    if (isBill) {
      io.emit(SOCKET_EVENTS.SEAT_STATUS_UPDATED, {
        seatId: numSeat,
        status: 'BILL_REQUESTED',
      });
      io.emit('bill:requested', fullPayload);
    }
  }

  return reply.send({ success: true, alert: alertRecord });
});

app.post('/api/service-alerts/:alertId/resolve', async (req, reply) => {
  const { alertId } = req.params as { alertId: string };
  if (db.data.serviceAlerts) {
    const target = db.data.serviceAlerts.find((a: any) => a.id === alertId);
    if (target) {
      target.isResolved = true;
    }
  }
  if (io) {
    io.emit('alert:resolved', { alertId });
  }
  return reply.send({ success: true, alertId });
});

// 8C. Seat Active Bill Mode (QR vs Cash selected by Waiter)
app.get('/api/seats/:seatId/bill-mode', async (req, reply) => {
  const { seatId } = req.params as { seatId: string };
  const norm = normalizeSeatIdentity(seatId);
  const numSeat = norm.seatId;
  const numStr = norm.chairId;
  const activeMode = activeSeatBillModes[numStr] || activeSeatBillModes[norm.paddedChairId] || activeSeatBillModes[seatId];

  // Also check if seat has an active bill request alert
  const hasBillAlert = (db.data.serviceAlerts || []).some(
    (a: any) => !a.isResolved && (a.chairId === numStr || a.chairId === norm.paddedChairId) && (a.type === 'customer_call' || String(a.title || '').toLowerCase().includes('bill'))
  );
  const seat = db.data.seats.find((s) => s.id === numSeat);
  const isBillStatus = seat?.currentStatus === 'BILL_REQUESTED';

  return reply.send({
    seatId: numSeat,
    chairId: numStr,
    paddedChairId: norm.paddedChairId,
    active: Boolean(activeMode || hasBillAlert || isBillStatus),
    mode: activeMode?.mode || null,
    amount: activeMode?.amount || 0,
  });
});

app.post('/api/seats/:seatId/bill-mode', async (req, reply) => {
  const { seatId } = req.params as { seatId: string };
  const body = req.body as any;
  const norm = normalizeSeatIdentity(seatId);
  const numSeat = norm.seatId;
  const numStr = norm.chairId;
  const mode: 'qr' | 'cash' = body.mode === 'cash' ? 'cash' : 'qr';
  const amount = Number(body.amount) || 0;

  activeSeatBillModes[numStr] = {
    mode,
    amount,
    updatedAt: Date.now(),
  };
  activeSeatBillModes[norm.paddedChairId] = {
    mode,
    amount,
    updatedAt: Date.now(),
  };

  const seat = db.data.seats.find((s) => s.id === numSeat);
  if (seat && seat.currentStatus !== 'VACANT') {
    seat.currentStatus = 'BILL_REQUESTED';
    seat.updatedAt = new Date().toISOString();
    db.saveState();
  }

  const payload = {
    seatId: numSeat,
    chairId: numStr,
    normChairId: numStr,
    paddedChairId: norm.paddedChairId,
    mode,
    amount,
    timestamp: new Date().toISOString(),
  };

  if (io) {
    io.emit('bill:mode:active', payload);
    io.to(REALTIME_TOPICS.SEAT_ROOM(numSeat)).emit('bill:mode:active', payload);
    io.to(`seat:${numSeat}`).emit('bill:mode:active', payload);
    io.to(`seat:${numStr}`).emit('bill:mode:active', payload);
    io.to('staff:mobile').emit('bill:mode:active', payload);
    io.to('staff:tablet').emit('bill:mode:active', payload);
    io.to('manager').emit('bill:mode:active', payload);
  }

  return reply.send({ success: true, ...payload });
});

// 9. Payment Settlement & Instant Real-Time Auto-Vacate
app.post('/api/payments/process', async (req, reply) => {
  const { seatId, gateway, settledByRole, staffId, gatewayPaymentId } = req.body as any;

  if (seatId === undefined || seatId === null || seatId === '') {
    return reply.status(400).send({ error: 'Missing seatId.' });
  }

  clearSeatBillMode(seatId);

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

// 9B. Realtime Settled Payments Audit History for Manager Sales Report
app.get('/api/payments/settled', async () => {
  const payments = (db.data.payments || []).filter((p) => p.status === 'SUCCESS');
  return payments.map((p) => {
    const seatOrders = db.data.orders.filter((o) => o.sessionId === p.sessionId || o.seatId === p.seatId);
    const items: any[] = [];
    seatOrders.forEach((o) => {
      o.items.forEach((it) => {
        items.push({
          name: it.nameSnapshot,
          quantity: it.quantity,
          price: it.priceSnapshot,
          totalPrice: it.priceSnapshot * it.quantity,
        });
      });
    });

    const isTk = p.seatId === 0;
    const tableNum = Math.ceil((p.seatId || 1) / 4);
    const completedDate = p.completedAt ? new Date(p.completedAt) : new Date();

    return {
      invoiceNumber: p.gatewayPaymentId || `INV-${p.id.slice(0, 8).toUpperCase()}`,
      tableName: isTk ? 'TK-01' : `T-${String(tableNum).padStart(2, '0')}`,
      seatLabel: isTk ? 'Seat 0 (Parcel)' : `Chair ${p.seatId}`,
      seatNumber: p.seatId,
      subtotal: p.subtotal,
      totalTax: p.taxAmount,
      grandTotal: p.finalAmount,
      method: p.gateway,
      timestamp: p.completedAt || new Date().toISOString(),
      formattedDate: completedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      formattedTime: completedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      items,
    };
  });
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

// 14. Manager Promotional Campaigns & Offers
app.get('/api/promos', async () => {
  return (db.data as any).promos || [];
});

app.post('/api/promos', async (req, reply) => {
  const body = req.body as any;
  if (Array.isArray(body)) {
    (db.data as any).promos = body;
    db.saveState();
  }
  return reply.send({ success: true, count: ((db.data as any).promos || []).length });
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
