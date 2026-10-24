'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '../socket';
import { SOCKET_EVENTS, normalizeSeatIdentity } from '@seat-order/shared';
import { realtimeBridge } from '../supabase';

export interface SeatSessionState {
  seatId: number;
  chairId: string;
  paddedChairId: string;
  label: string;
  isTakeaway: boolean;
  waiterCalled: boolean;
  waiterSelectedMode: 'qr' | 'cash' | null;
  billAmount: number;
  isSettled: boolean;
  isOccupied: boolean;
}

export function useSeatSession(rawChairId: string | number) {
  const norm = normalizeSeatIdentity(rawChairId);
  const [state, setState] = useState<SeatSessionState>({
    seatId: norm.seatId,
    chairId: norm.chairId,
    paddedChairId: norm.paddedChairId,
    label: norm.label,
    isTakeaway: norm.isTakeaway,
    waiterCalled: false,
    waiterSelectedMode: null,
    billAmount: 0,
    isSettled: false,
    isOccupied: true,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // Rehydration from server and persistent storage
  const syncWithServer = useCallback(async () => {
    try {
      const modeData = await realtimeBridge.getSeatBillMode(norm.chairId);
      if (modeData && modeData.active) {
        setState((prev) => ({
          ...prev,
          waiterCalled: true,
          waiterSelectedMode: (modeData.mode === 'cash' || modeData.mode === 'qr') ? modeData.mode : prev.waiterSelectedMode,
          billAmount: modeData.amount || prev.billAmount,
        }));
      }
    } catch (err) {
      console.warn('Seat session rehydration fallback to storage', err);
    }
  }, [norm.chairId]);

  useEffect(() => {
    syncWithServer();

    if (typeof window === 'undefined') return;
    const socket = getSocket();

    const joinSeat = () => {
      socket.emit(SOCKET_EVENTS.JOIN_SEAT, { seatId: norm.seatId });
      socket.emit(SOCKET_EVENTS.JOIN_SEAT, { seatId: norm.chairId });
      socket.emit(SOCKET_EVENTS.JOIN_SEAT, { seatId: norm.paddedChairId });
    };

    if (socket.connected) {
      joinSeat();
    }
    socket.on('connect', () => {
      joinSeat();
      syncWithServer();
    });

    const unsubscribeKds = realtimeBridge.subscribeKDS({
      onBillModeActive: (data) => {
        const targetNorm = normalizeSeatIdentity(data.chairId || data.normChairId || data.rawChairId);
        if (targetNorm.seatId === norm.seatId) {
          setState((prev) => ({
            ...prev,
            waiterCalled: true,
            waiterSelectedMode: data.mode === 'cash' ? 'cash' : 'qr',
            billAmount: data.amount || prev.billAmount,
          }));
        }
      },
      onBillSettled: (data) => {
        const targetNorm = normalizeSeatIdentity(data.chairId || data.normChairId || data.rawChairId);
        if (targetNorm.seatId === norm.seatId) {
          setState((prev) => ({
            ...prev,
            isSettled: true,
            waiterCalled: false,
            waiterSelectedMode: null,
            billAmount: 0,
            isOccupied: false,
          }));
        }
      },
      onSeatOccupancyChange: (data) => {
        const targetNorm = normalizeSeatIdentity(data.chairId);
        if (targetNorm.seatId === norm.seatId) {
          setState((prev) => ({
            ...prev,
            isOccupied: data.isOccupied,
          }));
        }
      },
    });

    return () => {
      unsubscribeKds();
    };
  }, [norm.chairId, norm.paddedChairId, norm.seatId, syncWithServer]);

  const callWaiter = useCallback(async (amount: number, reason: 'BILL' | 'ASSISTANCE' = 'BILL') => {
    setState((prev) => ({
      ...prev,
      waiterCalled: true,
      billAmount: amount,
    }));

    await realtimeBridge.requestBill(norm.chairId, amount, {
      chairId: norm.chairId,
      seatNumber: norm.label,
      orderId: `ORDER-${norm.chairId}`,
      amount,
      items: [],
      requestedAt: Date.now(),
    });
  }, [norm.chairId, norm.label]);

  return {
    ...state,
    callWaiter,
    refresh: syncWithServer,
  };
}
