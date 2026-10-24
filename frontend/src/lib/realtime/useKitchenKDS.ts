'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSocket } from '../socket';
import { SOCKET_EVENTS } from '@seat-order/shared';
import { realtimeBridge, OrderRecord, OrderItemRecord } from '../supabase';

export interface KdsTicket {
  order: OrderRecord;
  items: OrderItemRecord[];
}

export function useKitchenKDS() {
  const [tickets, setTickets] = useState<KdsTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshTickets = useCallback(async () => {
    try {
      const active = await realtimeBridge.getActiveOrders();
      setTickets(active);
    } catch (err) {
      console.error('Failed to fetch active KDS orders', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTickets();

    if (typeof window === 'undefined') return;
    const socket = getSocket();

    const joinKds = () => {
      socket.emit(SOCKET_EVENTS.JOIN_KDS);
    };

    if (socket.connected) {
      joinKds();
    }
    socket.on('connect', () => {
      joinKds();
      refreshTickets();
    });

    const unsubscribe = realtimeBridge.subscribeKDS({
      onNewOrder: (data) => {
        setTickets((prev) => {
          const exists = prev.some((t) => t.order.id === data.order.id || t.order.ticket_number === data.order.ticket_number);
          if (exists) return prev;
          return [data, ...prev];
        });
      },
      onStageChange: (data) => {
        setTickets((prev) =>
          prev.map((t) => {
            const hasMatch = t.items.some((it) => it.id === data.itemId || it.dish_id === data.dishId);
            if (!hasMatch) return t;
            return {
              ...t,
              items: t.items.map((it) => {
                if (it.id === data.itemId || (data.dishId && it.dish_id === data.dishId)) {
                  return { ...it, stage: data.stage };
                }
                return it;
              }),
            };
          })
        );
      },
      onTicketDispatched: (data) => {
        setTickets((prev) => prev.filter((t) => t.order.ticket_number !== data.ticketNumber));
      },
    });

    return () => {
      unsubscribe();
    };
  }, [refreshTickets]);

  const bumpItemStage = useCallback(
    async (params: {
      ticketNumber: string;
      dishId: string;
      stage: 'PLACED' | 'REC' | 'PREP' | 'READY' | 'SERVED';
      dishName: string;
      chairId?: string;
      itemId?: string;
    }) => {
      const key = params.itemId || `${params.ticketNumber}-${params.dishId}`;
      await realtimeBridge.updateStage(key, params.stage, {
        chairId: params.chairId,
        dishId: params.dishId,
        ticketNumber: params.ticketNumber,
        dishName: params.dishName,
        itemId: params.itemId,
      });
    },
    []
  );

  return {
    tickets,
    isLoading,
    refreshTickets,
    bumpItemStage,
  };
}
