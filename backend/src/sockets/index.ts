import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { SOCKET_EVENTS } from '../shared/index.js';
import { db } from '../db/index.js';

export let io: SocketIOServer | null = null;

export const activeSeatBillModes: Record<string, { mode: 'qr' | 'cash'; amount?: number; updatedAt: number }> = {};

export function clearSeatBillMode(seatId: number | string) {
  const num = String(Number(seatId) || seatId).replace(/^0+/, '');
  delete activeSeatBillModes[num];
  delete activeSeatBillModes[String(seatId)];
}

export function setupWebSockets(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    // 1. Customer joins their dedicated seat room
    socket.on(SOCKET_EVENTS.JOIN_SEAT, ({ seatId }) => {
      socket.join(`seat:${seatId}`);
    });

    socket.on(SOCKET_EVENTS.LEAVE_SEAT, ({ seatId }) => {
      socket.leave(`seat:${seatId}`);
    });

    // 2. Kitchen KDS joins kitchen room
    socket.on(SOCKET_EVENTS.JOIN_KDS, () => {
      socket.join('kds');
    });

    // 3. Waiter Staff joins mobile/tablet staff rooms
    socket.on(SOCKET_EVENTS.JOIN_STAFF, ({ type }: { type?: 'mobile' | 'tablet' }) => {
      if (type === 'tablet') {
        socket.join('staff:tablet');
      } else {
        socket.join('staff:mobile');
      }
    });

    // 4. Manager Terminal joins manager room
    socket.on(SOCKET_EVENTS.JOIN_MANAGER, () => {
      socket.join('manager');
    });

    // 5. Customer calls waiter for water, assistance, or bill payment
    socket.on(SOCKET_EVENTS.WAITER_CALLED, (payload: any) => {
      const numSeat = Number(payload.seatId) || 0;
      const seatNumStr = payload.seatNumber || `Seat ${numSeat}`;
      const isBill = payload.reason === 'BILL' || payload.alert?.type === 'customer_call' || String(payload.alert?.title || '').toLowerCase().includes('bill');

      const alertRecord = {
        id: payload.alert?.id || `alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        type: isBill ? 'customer_call' : (payload.alert?.type || 'customer_call'),
        seatNumber: seatNumStr,
        chairId: String(numSeat),
        title: payload.alert?.title || (isBill ? `Bill Requested` : `${seatNumStr} Assistance`),
        message: payload.alert?.message || (isBill ? `Bill settlement requested for ${seatNumStr}` : `Guest requested assistance`),
        timeAgo: 'Just now',
        billAmount: payload.amount || payload.alert?.billAmount || 0,
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
        ...payload,
        alert: alertRecord,
        seatId: numSeat,
        seatNumber: seatNumStr,
        amount: payload.amount || alertRecord.billAmount,
        reason: isBill ? 'BILL' : (payload.reason || 'ASSISTANCE'),
      };

      // Broadcast to ALL connected clients so every waiter and tablet receives it without fail
      io?.emit(SOCKET_EVENTS.WAITER_CALLED, fullPayload);
      io?.to('staff:mobile').emit(SOCKET_EVENTS.WAITER_CALLED, fullPayload);
      io?.to('staff:tablet').emit(SOCKET_EVENTS.WAITER_CALLED, fullPayload);
      io?.to('manager').emit(SOCKET_EVENTS.WAITER_CALLED, fullPayload);

      if (isBill) {
        io?.emit(SOCKET_EVENTS.SEAT_STATUS_UPDATED, {
          seatId: numSeat,
          status: 'BILL_REQUESTED',
        });
        io?.emit('bill:requested', fullPayload);
      }
    });

    // 6. Direct staff / manager bill settlement broadcast across all devices
    socket.on('bill:settled', (payload: any) => {
      const numSeat = Number(payload.chairId || payload.seatId || payload.normChairId) || 0;
      const amt = payload.amount || 0;
      const now = new Date().toISOString();

      if (numSeat > 0) {
        const seat = db.data.seats.find((s) => s.id === numSeat);
        if (seat) {
          seat.currentStatus = 'VACANT';
          seat.activeSessionId = null;
          seat.activeOrderTotal = 0;
          seat.activeItemCount = 0;
          seat.updatedAt = now;
        }

        // Auto-resolve any pending alerts for this seat
        if (db.data.serviceAlerts) {
          for (const a of db.data.serviceAlerts) {
            if (a.chairId === String(numSeat)) {
              a.isResolved = true;
            }
          }
        }
        db.saveState();
      }

      const broadcastData = {
        seatId: numSeat,
        chairId: String(numSeat),
        normChairId: String(numSeat),
        amount: amt,
        paymentMethod: payload.paymentMethod || 'UPI',
        paymentId: payload.ticketNumber || `SETTLE_${Date.now()}`,
        completedAt: now,
      };

      clearSeatBillMode(numSeat);

      io?.emit(SOCKET_EVENTS.PAYMENT_SUCCESS, broadcastData);
      io?.emit(SOCKET_EVENTS.SEAT_VACATED, {
        seatId: numSeat,
        chairId: String(numSeat),
        vacatedAt: now,
      });
      io?.emit(SOCKET_EVENTS.SEAT_STATUS_UPDATED, {
        seatId: numSeat,
        status: 'VACANT',
        activeOrderTotal: 0,
        activeItemCount: 0,
      });
      io?.emit('bill:settled', broadcastData);
    });

    // 7. Waiter changes bill collection mode (QR vs Cash)
    socket.on('bill:mode:active', (payload: any) => {
      const numSeat = Number(payload.chairId || payload.seatId || payload.normChairId) || 0;
      const numStr = String(numSeat);
      const mode = payload.mode === 'cash' ? 'cash' : 'qr';
      const amount = Number(payload.amount) || 0;

      if (numSeat > 0) {
        activeSeatBillModes[numStr] = {
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
      }

      const fullPayload = {
        ...payload,
        seatId: numSeat,
        chairId: numStr,
        normChairId: numStr,
        mode,
        amount,
        timestamp: new Date().toISOString(),
      };

      io?.emit('bill:mode:active', fullPayload);
      io?.to(`seat:${numSeat}`).emit('bill:mode:active', fullPayload);
      io?.to('staff:mobile').emit('bill:mode:active', fullPayload);
      io?.to('staff:tablet').emit('bill:mode:active', fullPayload);
      io?.to('manager').emit('bill:mode:active', fullPayload);
    });

    socket.on('disconnect', () => {
      // Clean up connection without leaks
    });
  });

  console.log('⚡ Socket.io real-time engine initialized.');
  return io;
}
