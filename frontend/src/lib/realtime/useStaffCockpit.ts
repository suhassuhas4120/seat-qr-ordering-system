'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSocket } from '../socket';
import { SOCKET_EVENTS, normalizeSeatIdentity } from '@seat-order/shared';
import { realtimeBridge, ServiceAlertRecord } from '../supabase';

export function useStaffCockpit(staffType: 'mobile' | 'tablet' = 'mobile') {
  const [alerts, setAlerts] = useState<ServiceAlertRecord[]>([]);

  const refreshAlerts = useCallback(async () => {
    try {
      const activeAlerts = await realtimeBridge.getServiceAlerts();
      setAlerts(activeAlerts);
    } catch (err) {
      console.error('Failed to fetch active staff alerts', err);
    }
  }, []);

  useEffect(() => {
    refreshAlerts();

    if (typeof window === 'undefined') return;
    const socket = getSocket();

    const joinStaff = () => {
      socket.emit(SOCKET_EVENTS.JOIN_STAFF, { type: staffType });
    };

    if (socket.connected) {
      joinStaff();
    }
    socket.on('connect', () => {
      joinStaff();
      refreshAlerts();
    });

    const unsubscribe = realtimeBridge.subscribeKDS({
      onNewAlert: (alert) => {
        setAlerts((prev) => {
          const exists = prev.some((a) => a.id === alert.id);
          if (exists) return prev;
          return [alert, ...prev];
        });
      },
      onResolveAlert: (alertId) => {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      },
      onBillSettled: (data) => {
        const norm = normalizeSeatIdentity(data.chairId || data.normChairId);
        setAlerts((prev) => prev.filter((a) => {
          const alertNorm = normalizeSeatIdentity(a.chairId || a.seatNumber);
          return alertNorm.seatId !== norm.seatId;
        }));
      },
    });

    return () => {
      unsubscribe();
    };
  }, [refreshAlerts, staffType]);

  const selectBillMode = useCallback(async (chairId: string, mode: 'qr' | 'cash', amount: number) => {
    await realtimeBridge.notifyBillModeActive(chairId, amount, { mode });
  }, []);

  const resolveAlert = useCallback(async (alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    await realtimeBridge.resolveServiceAlert(alertId);
  }, []);

  return {
    alerts,
    refreshAlerts,
    selectBillMode,
    resolveAlert,
  };
}
