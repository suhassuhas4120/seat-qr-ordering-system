import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { SOCKET_EVENTS } from '@seat-order/shared';

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

    // 5. Customer calls waiter for water or assistance
    socket.on(SOCKET_EVENTS.WAITER_CALLED, (payload) => {
      // Broadcast assistance request directly to all waiter and manager devices
      io?.to('staff:mobile').emit(SOCKET_EVENTS.WAITER_CALLED, payload);
      io?.to('staff:tablet').emit(SOCKET_EVENTS.WAITER_CALLED, payload);
      io?.to('manager').emit(SOCKET_EVENTS.WAITER_CALLED, payload);
    });

    socket.on('disconnect', () => {
      // Clean up connection without leaks
    });
  });

  console.log('⚡ Socket.io real-time engine initialized.');
  return io;
}
