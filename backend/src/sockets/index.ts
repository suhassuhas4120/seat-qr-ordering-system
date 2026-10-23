import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { SOCKET_EVENTS } from '../shared/index.js';
import { db } from '../db/index.js';

export let io: SocketIOServer | null = null;

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

    socket.on('disconnect', () => {
      // Clean up connection without leaks
    });
  });

  console.log('⚡ Socket.io real-time engine initialized.');
  return io;
}
