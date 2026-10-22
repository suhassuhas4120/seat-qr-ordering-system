import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('⚡ Connected to Realtime WebSocket Hub:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.warn('⚠️ WebSocket disconnected:', reason);
    });
  }

  return socket;
}
