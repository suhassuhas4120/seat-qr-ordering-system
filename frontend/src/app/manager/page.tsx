'use client';

import React, { useState, useEffect } from 'react';
import { ManagerScreenId } from '@/components/manager/types';
import { ScreenM1Login } from '@/components/manager/ScreenM1Login';
import { ScreenM2Floor100 } from '@/components/manager/ScreenM2Floor100';
import { ScreenM4BillingPOS } from '@/components/manager/ScreenM4BillingPOS';
import { ScreenM5KitchenSpeed } from '@/components/manager/ScreenM5KitchenSpeed';
import { ScreenM9WaiterCash } from '@/components/manager/ScreenM9WaiterCash';
import { ScreenM10Menu86Stock } from '@/components/manager/ScreenM10Menu86Stock';
import { ScreenM11SalesReport } from '@/components/manager/ScreenM11SalesReport';
import { ScreenM13PettyExpenses } from '@/components/manager/ScreenM13PettyExpenses';
import { realtimeBridge, OrderRecord, OrderItemRecord, ServiceAlertRecord } from '@/lib/supabase';

const TAB_ITEMS: { id: ManagerScreenId; name: string }[] = [
  { id: 1, name: '01. Login & Float' },
  { id: 2, name: '02. Live Floor (100 Seats)' },
  { id: 3, name: '03. Billing & POS' },
  { id: 4, name: '04. Kitchen & Notifications' },
  { id: 5, name: '05. Waiter Cash & Tips' },
  { id: 6, name: '06. Menu Stocks & Offers' },
  { id: 7, name: '07. Sales Report' },
  { id: 8, name: '08. Petty Expenses & Cash Counter' },
];

export default function ManagerPortalPage() {
  const [activeTab, setActiveTab] = useState<ManagerScreenId>(1);
  const [openingFloat, setOpeningFloat] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('thoogudeepa_opening_float');
        if (saved) return Number(saved);
      } catch {}
    }
    return 50000;
  });

  const handleUpdateOpeningFloat = (val: number) => {
    setOpeningFloat(val);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('thoogudeepa_opening_float', val.toString());
      } catch {}
    }
  };
  const [selectedSeatForBilling, setSelectedSeatForBilling] = useState<string>('17');
  const [liveOrders, setLiveOrders] = useState<{ order: OrderRecord; items: OrderItemRecord[] }[]>([]);
  const [alerts, setAlerts] = useState<ServiceAlertRecord[]>([]);

  // Synchronize URL query parameter on initial mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = (window.location.search || '') + ' ' + (window.location.hash || '');
        const match = raw.match(/(?:screen|tab)[=-]?([1-8])/i) || raw.match(/[?#&]([1-8])\b/);
        if (match && match[1]) {
          const parsed = parseInt(match[1], 10);
          if (parsed >= 1 && parsed <= 8) {
            setActiveTab(parsed as ManagerScreenId);
          }
        }
      } catch {
        // ignore in SSR
      }
    }
  }, []);

  const refreshLiveState = async () => {
    try {
      const orders = await realtimeBridge.getActiveOrders();
      setLiveOrders(orders);
      const activeAlerts = await realtimeBridge.getServiceAlerts();
      setAlerts(activeAlerts.filter((a) => !a.isResolved));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshLiveState();

    const unsubscribe = realtimeBridge.subscribeKDS({
      onNewOrder: () => refreshLiveState(),
      onStageChange: () => refreshLiveState(),
      onSeatOccupancyChange: () => refreshLiveState(),
      onTicketDispatched: () => refreshLiveState(),
      onBillRequested: () => refreshLiveState(),
      onBillModeActive: () => refreshLiveState(),
      onBillSettled: () => refreshLiveState(),
      onNewAlert: (al) => setAlerts((prev) => [al, ...prev.filter((a) => a.id !== al.id)]),
      onResolveAlert: (id) => setAlerts((prev) => prev.filter((a) => a.id !== id)),
      onClearAll: () => {
        setLiveOrders([]);
        setAlerts([]);
      },
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleTabClick = (id: ManagerScreenId) => {
    setActiveTab(id);
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('screen', id.toString());
        window.history.replaceState(null, '', url.toString());
      } catch {
        // ignore
      }
    }
  };

  const renderActiveScreen = (screenId: ManagerScreenId) => {
    switch (screenId) {
      case 1:
        return (
          <ScreenM1Login
            onUnlock={() => handleTabClick(2)}
            openingFloat={openingFloat}
            setOpeningFloat={handleUpdateOpeningFloat}
          />
        );
      case 2:
        return (
          <ScreenM2Floor100
            liveOrders={liveOrders}
            alerts={alerts}
            onRefresh={refreshLiveState}
            onSelectTableForBilling={(seatId) => {
              setSelectedSeatForBilling(seatId);
              handleTabClick(3);
            }}
          />
        );
      case 3:
        return (
          <ScreenM4BillingPOS
            selectedSeatId={selectedSeatForBilling}
            onSelectSeatId={setSelectedSeatForBilling}
            liveOrders={liveOrders}
            onSettled={refreshLiveState}
          />
        );
      case 4:
        return (
          <ScreenM5KitchenSpeed
            liveOrders={liveOrders}
            alerts={alerts}
            onResolveAlert={(id) => realtimeBridge.resolveServiceAlert(id)}
          />
        );
      case 5:
        return <ScreenM9WaiterCash liveOrders={liveOrders} />;
      case 6:
        return <ScreenM10Menu86Stock />;
      case 7:
        return <ScreenM11SalesReport liveOrders={liveOrders} />;
      case 8:
        return <ScreenM13PettyExpenses openingFloat={openingFloat} />;
      default:
        return (
          <ScreenM1Login
            onUnlock={() => handleTabClick(2)}
            openingFloat={openingFloat}
            setOpeningFloat={handleUpdateOpeningFloat}
          />
        );
    }
  };

  return (
    <div className="manager-portal h-screen w-screen max-h-screen max-w-screen bg-[#EFECE6] text-slate-900 p-2.5 sm:p-3 md:p-4 box-border flex flex-col overflow-hidden font-sans">
      {/* MASTER FRAMED APPLICATION SHELL */}
      <div className="h-full w-full max-h-full bg-white text-slate-900 border-2 border-[#9C3D1E] rounded-2xl shadow-sm flex flex-col overflow-hidden">
        
        {/* SCREEN NAVIGATION TABS */}
        <nav
          role="tablist"
          aria-label="Manager Portal Navigation"
          className="shrink-0 w-full border-b border-[#EAE5DF] bg-[#FAF8F5] px-3 sm:px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar font-mono text-slate-900"
        >
          <div className="flex items-center gap-2 pr-2 border-r border-[#EAE5DF] shrink-0">
            <img
              src="/assets/thoogudeepa-logo.png"
              alt="Thoogudeepa Manager"
              className="h-7 w-7 rounded-full object-cover border border-[#9C3D1E]/40"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="text-[11px] font-black tracking-wider text-slate-900 uppercase hidden sm:inline">
              Manager
            </span>
          </div>

          {TAB_ITEMS.map((sc) => {
            const isActive = activeTab === sc.id;
            return (
              <button
                key={sc.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabClick(sc.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-bold transition shrink-0 cursor-pointer select-none ${
                  isActive
                    ? 'border-[#9C3D1E] bg-[#9C3D1E] text-white shadow-xs'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-[#FAF8F5]'
                }`}
              >
                <span>{sc.name}</span>
              </button>
            );
          })}
        </nav>

        {/* SCREEN CONTAINER (Internal Scrolling only) */}
        <div className="flex-1 min-h-0 w-full bg-[#FAF8F5] p-2 sm:p-4 overflow-y-auto overflow-x-hidden">
          <div className="w-full flex justify-center pb-6">
            <div key={activeTab} className="w-full flex justify-center transition-all duration-150">
              {renderActiveScreen(activeTab)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
