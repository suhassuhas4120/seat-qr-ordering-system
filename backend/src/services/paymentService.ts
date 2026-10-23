import { db } from '../db/index.js';
import { mutexService } from './mutex.js';
import { io } from '../sockets/index.js';
import { SOCKET_EVENTS } from '../shared/index.js';
import crypto from 'crypto';
import type { PaymentGateway, Payment } from '../shared/index.js';

export class PaymentService {
  /**
   * Process payment (from Customer, Waiter, or Manager) and trigger instant auto-unlock.
   */
  async processPayment(params: {
    seatId: number;
    gateway: PaymentGateway;
    settledByRole: 'CUSTOMER_SELF' | 'WAITER' | 'MANAGER';
    staffId?: number;
    gatewayPaymentId?: string;
  }) {
    const { seatId, settledByRole, staffId, gatewayPaymentId } = params;
    const rawGw = (params.gateway ? String(params.gateway).toUpperCase() : 'RAZORPAY');
    const gateway: PaymentGateway = (['RAZORPAY', 'STRIPE', 'CASH', 'UPI'].includes(rawGw) ? rawGw : 'RAZORPAY') as PaymentGateway;

    // 1. Concurrency lock to prevent double-charging or simultaneous payments
    const lockAcquired = await mutexService.acquireLock(`payment:seat:${seatId}`, 'payment_engine', 15);
    if (!lockAcquired) {
      throw new Error('Payment settlement is already in progress for this seat.');
    }

    try {
      const seat = db.data.seats.find((s) => s.id === seatId);
      if (!seat) throw new Error('Seat not found');

      let session = db.data.seatSessions.find(
        (s) => s.seatId === seatId && s.status === 'ACTIVE'
      );

      if (!session) {
        session = db.data.seatSessions.filter((s) => s.seatId === seatId).slice(-1)[0];
      }

      const now = new Date().toISOString();

      if (!session) {
        session = {
          id: `sess-${seatId}-${Date.now()}`,
          seatId,
          sessionToken: `token-${Date.now()}`,
          status: 'ACTIVE',
          startedAt: now,
        };
        db.data.seatSessions.push(session);
      }

      // Fetch active orders to calculate exact bill
      const seatOrders = db.data.orders.filter(
        (o) => (o.sessionId === session!.id || o.seatId === seatId) && o.overallStage !== 'PAID'
      );
      const allItems = seatOrders.flatMap((o) => o.items);

      const subtotal = allItems.reduce((acc, curr) => acc + curr.priceSnapshot * curr.quantity, 0);
      const taxAmount = Math.round(subtotal * 0.05 * 100) / 100;
      const finalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

      const paymentId = crypto.randomUUID();
      const txId = gatewayPaymentId || `PAY_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const newEpochHash = crypto.randomBytes(8).toString('hex'); // Rotates dynamic QR code!

      // 2. Atomic settlement & Microsecond Auto-Unlock
      const paymentRecord: Payment = {
        id: paymentId,
        sessionId: session.id,
        seatId,
        subtotal,
        taxAmount,
        discountAmount: 0,
        finalAmount,
        gateway,
        gatewayPaymentId: txId,
        status: 'SUCCESS',
        settledByRole,
        staffId: staffId || null,
        completedAt: now,
      };

      db.data.payments.push(paymentRecord);

      // Mark all orders as PAID
      for (const o of seatOrders) {
        o.overallStage = 'PAID';
        for (const item of o.items) {
          item.itemStage = 'PAID';
        }
      }

      // Mark session as COMPLETED
      session.status = 'COMPLETED';
      session.endedAt = now;

      // Atomically reset Seat to VACANT and rotate cryptographic epoch
      seat.currentStatus = 'VACANT';
      seat.epochHash = newEpochHash;
      seat.activeSessionId = null;
      seat.activeOrderTotal = 0;
      seat.activeItemCount = 0;
      seat.updatedAt = now;

      db.saveState();
      db.logTransaction('PAYMENT_SETTLED', {
        seatId,
        paymentId: txId,
        amount: finalAmount,
        gateway,
        settledByRole,
        staffId,
      });

      const payload = {
        seatId,
        seatNumber: seat.seatNumber,
        paymentId: txId,
        amount: finalAmount,
        settledBy: settledByRole,
        completedAt: now,
      };

      // 3. Multi-device real-time broadcast in < 50ms
      if (io) {
        io.to(`seat:${seatId}`).emit(SOCKET_EVENTS.PAYMENT_SUCCESS, payload);
        io.emit(SOCKET_EVENTS.PAYMENT_SUCCESS, payload);
        io.emit(SOCKET_EVENTS.SEAT_VACATED, {
          seatId,
          seatNumber: seat.seatNumber,
          vacatedAt: now,
        });
        io.emit(SOCKET_EVENTS.SEAT_STATUS_UPDATED, {
          seatId,
          status: 'VACANT',
          activeOrderTotal: 0,
          activeItemCount: 0,
        });
      }

      return {
        success: true,
        receipt: {
          transactionId: txId,
          seatNumber: seat.seatNumber,
          subtotal,
          taxAmount,
          finalAmount,
          settledBy: settledByRole,
          completedAt: now,
        },
      };
    } finally {
      await mutexService.releaseLock(`payment:seat:${seatId}`, 'payment_engine');
    }
  }

  /**
   * Cash Reconciliation Ledger for Manager:
   * Returns total cash collected per waiter.
   */
  async getStaffCashLedger() {
    const waiters = db.data.users.filter((u) => u.role === 'WAITER');
    return waiters.map((w) => {
      const staffPayments = db.data.payments.filter(
        (p) => p.staffId === w.id && p.gateway === 'CASH' && p.status === 'SUCCESS'
      );
      const totalCash = staffPayments.reduce((acc, p) => acc + p.finalAmount, 0);

      return {
        staff_id: w.id,
        staff_name: w.name,
        staff_role: w.role,
        cash_transactions_count: staffPayments.length,
        total_cash_collected: totalCash,
      };
    });
  }
}

export const paymentService = new PaymentService();
