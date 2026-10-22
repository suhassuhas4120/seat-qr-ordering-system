'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { realtimeBridge, OrderRecord, OrderItemRecord } from '@/lib/supabase';
import { playKitchenChime } from '@/lib/hardware/audioSynthesizer';
import { screenWakeLock } from '@/lib/hardware/wakeLockManager';
import { MENU_ITEMS } from '@/lib/data/menuData';
import { 
  ShieldCheck, 
  Tablet, 
  Layers, 
  ChefHat, 
  UserCheck, 
  Store, 
  UtensilsCrossed, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Check, 
  Ban, 
  Lock, 
  Unlock, 
  RotateCcw, 
  QrCode,
  Trash2,
  Sparkles,
  Flame,
  Filter,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';

export default function KitchenDisplaySystemPage() {
  const [pin, setPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [activeScreenTab, setActiveScreenTab] = useState<number>(2);
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');

  // Real incoming active orders from seats 01-100 (clean zero-order start)
  const [activeOrders, setActiveOrders] = useState<{ order: OrderRecord; items: OrderItemRecord[] }[]>([]);
  const [itemStages, setItemStages] = useState<Record<string, 'PLACED' | 'REC' | 'PREP' | 'READY' | 'SERVED'>>({});
  const [selectedWaiter, setSelectedWaiter] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [demoStages, setDemoStages] = useState<Record<string, 'PLACED' | 'REC' | 'PREP' | 'READY'>>({
    'demo-1': 'PLACED',
    'demo-2': 'PLACED',
  });

  const KITCHEN_WAITERS = [
    { id: 'w1', name: 'Ramesh Kumar', zone: [1, 10] },
    { id: 'w2', name: 'Suresh M', zone: [11, 20] },
    { id: 'w3', name: 'Anand Kumar', zone: [21, 30] },
    { id: 'w4', name: 'Deepa Naik', zone: [31, 40] },
  ];

  // Screen 3 Item availability with Lock/Unlock and Reset/Update protection
  const defaultStockStatus: Record<string, boolean> = MENU_ITEMS.reduce(
    (acc, it) => {
      acc[it.id] = true;
      return acc;
    },
    {} as Record<string, boolean>
  );

  const [stockStatus, setStockStatus] = useState<Record<string, boolean>>(defaultStockStatus);
  const [committedStockStatus, setCommittedStockStatus] = useState<Record<string, boolean>>(defaultStockStatus);
  const [isStockLocked, setIsStockLocked] = useState<boolean>(true);
  const [stockNotice, setStockNotice] = useState<string>('');

  // Fetch active orders and subscribe to real-time updates
  useEffect(() => {
    let isCancelled = false;

    // Keep tablet screen awake throughout service hours
    screenWakeLock.activate();

    async function loadOrders() {
      const orders = await realtimeBridge.getActiveOrders();
      if (!isCancelled) {
        setActiveOrders((prev) => {
          const prevIds = new Set(prev.map((o) => o.order.id));
          const hasNew = (orders || []).some((o) => o.order.id && !prevIds.has(o.order.id));
          if (hasNew && prev.length > 0) {
            playKitchenChime();
          }
          return orders || [];
        });
        const stages: Record<string, 'PLACED' | 'REC' | 'PREP' | 'READY' | 'SERVED'> = {};
        (orders || []).forEach((o) => {
          const chair = o.order.chair_id ? o.order.chair_id.replace(/[^0-9]/g, '') : '';
          const tNum = o.order.ticket_number || '';

          o.items.forEach((it, idx) => {
            const itemKey = it.id || `${tNum}-${it.dish_id}-${idx}`;
            const effStage: 'PLACED' | 'REC' | 'PREP' | 'READY' | 'SERVED' = it.stage || 'PLACED';

            it.stage = effStage;
            stages[itemKey] = effStage;
            if (chair) stages[`${chair}-${itemKey}`] = effStage;
            if (it.id) stages[it.id] = effStage;
            if (chair && it.id) stages[`${chair}-${it.id}`] = effStage;
          });
        });
        setItemStages(stages);
      }
    }

    loadOrders();

    // Instant re-sync when kitchen tab becomes visible
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && !isCancelled) {
        loadOrders();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // Light 30-second fallback poll to preserve socket health without network flooding
    const pollInterval = setInterval(() => {
      loadOrders();
    }, 30000);

    const unsubscribe = realtimeBridge.subscribeKDS({
      onNewOrder: (newOrder) => {
        playKitchenChime();
        setActiveOrders((prev) => {
          // 1. Match by exact order ID or previously tracked order IDs
          const matchById = prev.findIndex(
            (o) =>
              (o.order.id && newOrder.order.id && o.order.id === newOrder.order.id) ||
              ((o.order as any).order_ids && newOrder.order.id && (o.order as any).order_ids.includes(newOrder.order.id))
          );

          if (matchById !== -1) {
            // Order is already present and tracked on KDS screen
            return prev;
          }

          // 2. Match by ticket_number and chair_id
          const cleanNewChair = (newOrder.order.chair_id || '').replace(/[^0-9]/g, '');
          const matchByTicket = prev.findIndex(
            (o) =>
              o.order.ticket_number &&
              newOrder.order.ticket_number &&
              o.order.ticket_number === newOrder.order.ticket_number &&
              (!cleanNewChair || (o.order.chair_id || '').replace(/[^0-9]/g, '') === cleanNewChair)
          );

          if (matchByTicket !== -1) {
            const current = prev[matchByTicket];
            const currentOrderIds: string[] = (current.order as any).order_ids || (current.order.id ? [current.order.id] : []);
            const updated = [...prev];

            // A. Check if this exact order was already processed for this ticket
            if (newOrder.order.id && currentOrderIds.includes(newOrder.order.id)) {
              return prev;
            }

            // B. Filter incoming items to truly new items not yet tracked
            const currentItemIds = new Set(current.items.map((it) => String(it.id)));
            const trulyNewItems = newOrder.items.filter((it) => it.id && !currentItemIds.has(String(it.id)));

            if (trulyNewItems.length === 0) {
              // If all item IDs exist, simply register the order ID to avoid reprocessing
              if (newOrder.order.id && !currentOrderIds.includes(newOrder.order.id)) {
                updated[matchByTicket] = {
                  ...current,
                  order: {
                    ...current.order,
                    order_ids: [...currentOrderIds, newOrder.order.id],
                  } as any,
                };
                return updated;
              }
              return prev;
            }

            // C. Additional items placed for the same ticket (Round 2+ add-on round):
            const nextOrderIds = newOrder.order.id && !currentOrderIds.includes(newOrder.order.id)
              ? [...currentOrderIds, newOrder.order.id]
              : currentOrderIds;

            const taggedNewItems = trulyNewItems.map((it, idx) => {
              const isUntouched = it.stage === 'PLACED' || (Array.isArray(it.addons) && it.addons.includes('PLACED'));
              return {
                ...it,
                id: it.id || `${newOrder.order.id || newOrder.order.ticket_number}-${it.dish_id}-${idx}`,
                order_id: it.order_id || newOrder.order.id || current.order.id,
                stage: isUntouched ? ('PLACED' as const) : (it.stage || 'PLACED'),
              };
            });

            updated[matchByTicket] = {
              ...current,
              order: {
                ...current.order,
                id: newOrder.order.id || current.order.id,
                order_ids: nextOrderIds,
                total_amount: (current.order.total_amount || 0) + (newOrder.order.total_amount || 0),
              } as any,
              items: [...current.items, ...taggedNewItems],
            };
            return updated;
          }

          // 3. Brand new ticket
          const initialOrderIds = newOrder.order.id ? [newOrder.order.id] : [];
          const taggedItems = (newOrder.items || []).map((it, idx) => {
            const isUntouched = it.stage === 'PLACED' || (Array.isArray(it.addons) && it.addons.includes('PLACED'));
            return {
              ...it,
              id: it.id || `${newOrder.order.id || newOrder.order.ticket_number}-${it.dish_id}-${idx}`,
              order_id: it.order_id || newOrder.order.id,
              stage: isUntouched ? ('PLACED' as const) : (it.stage || 'PLACED'),
            };
          });

          const ticketWithOrderIds = {
            ...newOrder,
            order: {
              ...newOrder.order,
              order_ids: initialOrderIds,
            } as any,
            items: taggedItems,
          };
          return [ticketWithOrderIds, ...prev];
        });
      },
      onStageChange: (data) => {
        const chair = data.chairId ? data.chairId.replace(/[^0-9]/g, '') : '';
        const normChair = chair.replace(/^0+/, '');
        const paddedChair = normChair.padStart(2, '0');
        const tNum = data.ticketNumber || '';
        const itemKey = data.key || data.dishId || data.itemId || '';
        const targetItemId = data.itemId || '';
        const dishId = data.dishId || '';
        const cleanDish = dishId.replace(/^dish-/, '');
        const dishName = data.dishName || '';
        const dishNameLower = dishName.toLowerCase().trim();

        // Update itemStages strictly under item-scoped keys
        setItemStages((prev) => {
          const next = { ...prev };
          const stage = data.stage;
          const specificItemId = targetItemId || (itemKey && !itemKey.startsWith('dish-') && !/^[0-9]+$/.test(itemKey) ? itemKey : '');
          if (specificItemId) {
            next[specificItemId] = stage;
            const chairVariants = [chair, normChair, paddedChair].filter(Boolean);
            for (const c of chairVariants) {
              next[`${c}-${specificItemId}`] = stage;
              if (tNum) {
                next[`${c}-${tNum}-${specificItemId}`] = stage;
              }
            }
            if (tNum) {
              next[`${tNum}-${specificItemId}`] = stage;
            }
          }
          return next;
        });

        // Update activeOrders items strictly for the matching item
        setActiveOrders((prev) =>
          prev.map((o) => {
            const oChair = o.order.chair_id ? o.order.chair_id.replace(/[^0-9]/g, '') : '';
            const oNormChair = oChair.replace(/^0+/, '');
            const matchChair = !chair || oChair === chair || oNormChair === normChair || o.order.chair_id === data.chairId;
            if (!matchChair) return o;
            if (tNum && o.order.ticket_number && o.order.ticket_number !== tNum) return o;

            const updatedItems = o.items.map((it) => {
              const matches =
                Boolean(targetItemId && it.id && it.id === targetItemId) ||
                Boolean(itemKey && it.id && (it.id === itemKey || it.id === data.key));

              if (matches) {
                const addons = Array.isArray(it.addons) ? [...it.addons] : [];
                if (data.stage === 'SERVED' && !addons.includes('SERVED')) {
                  addons.push('SERVED');
                }
                return { ...it, stage: data.stage, addons };
              }
              return it;
            });

            return { ...o, items: updatedItems };
          })
        );
      },
      onAvailabilityChange: (data) => {
        setStockStatus((prev) => ({ ...prev, [data.dishId]: data.isAvailable }));
      },
      onBillSettled: (data) => {
        const chair = data.chairId ? data.chairId.replace(/[^0-9]/g, '') : '';
        setActiveOrders((prev) =>
          prev.filter((o) => {
            const oChair = o.order.chair_id ? o.order.chair_id.replace(/[^0-9]/g, '') : '';
            return oChair !== chair && o.order.chair_id !== data.chairId;
          })
        );
      },
      onSeatOccupancyChange: (data) => {
        if (!data.isOccupied) {
          const chair = data.chairId ? data.chairId.replace(/[^0-9]/g, '') : '';
          setActiveOrders((prev) =>
            prev.filter((o) => {
              const oChair = o.order.chair_id ? o.order.chair_id.replace(/[^0-9]/g, '') : '';
              return oChair !== chair && o.order.chair_id !== data.chairId;
            })
          );
        }
      },
      onClearAll: () => {
        setActiveOrders([]);
        setItemStages({});
      },
    });

    return () => {
      isCancelled = true;
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      clearInterval(pollInterval);
      screenWakeLock.deactivate();
      unsubscribe();
    };
  }, []);

  const handleKeyPress = (val: string) => {
    setErrorMessage('');
    if (val === 'CLR') {
      setPin('');
      return;
    }
    if (val === 'DEL') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    if (pin.length < 4) {
      setPin((prev) => prev + val);
    }
  };

  const handleLoginSubmit = () => {
    if (pin === '1234') {
      setErrorMessage('');
      setActiveScreenTab(2);
    } else {
      setErrorMessage('Invalid PIN. Use default PIN 1234');
      setPin('');
    }
  };

  const updateItemStage = (
    itemKey: string,
    stage: 'PLACED' | 'REC' | 'PREP' | 'READY' | 'SERVED',
    meta?: { chairId?: string; dishId?: string; ticketNumber?: string; dishName?: string; itemId?: string; itemIndex?: number }
  ) => {
    const chair = meta?.chairId ? meta.chairId.replace(/[^0-9]/g, '') : '';
    const tNum = meta?.ticketNumber || '';
    const targetItemId = meta?.itemId || itemKey;

    // 1. Update React itemStages using strict item-scoped keys
    setItemStages((prev) => {
      const next = { ...prev };
      const specificItemId = targetItemId || (itemKey && !itemKey.startsWith('dish-') && !/^[0-9]+$/.test(itemKey) ? itemKey : '');
      if (specificItemId) {
        next[specificItemId] = stage;
        if (chair) next[`${chair}-${specificItemId}`] = stage;
        if (chair && tNum) next[`${chair}-${tNum}-${specificItemId}`] = stage;
        if (tNum) next[`${tNum}-${specificItemId}`] = stage;
      }
      return next;
    });

    // 2. Update activeOrders items strictly for this item
    setActiveOrders((prev) =>
      prev.map((o) => {
        const oChair = o.order.chair_id ? o.order.chair_id.replace(/[^0-9]/g, '') : '';
        if (chair && oChair !== chair) return o;
        if (tNum && o.order.ticket_number && o.order.ticket_number !== tNum) return o;

        const updatedItems = o.items.map((it) => {
          const matches =
            Boolean(targetItemId && it.id && it.id === targetItemId) ||
            Boolean(itemKey && it.id && it.id === itemKey);

          if (matches) {
            const nextAddons = Array.isArray(it.addons)
              ? it.addons.filter((a) => a !== 'PLACED')
              : [];
            return { ...it, stage, addons: nextAddons };
          }
          return it;
        });

        return { ...o, items: updatedItems };
      })
    );

    // 3. Broadcast to all other devices with full item, seat, and ticket metadata
    realtimeBridge.updateStage(itemKey, stage, {
      ...meta,
      itemId: targetItemId,
    });
  };

  const handleCompleteOrder = (ticketNumber: string, chairId?: string) => {
    setActiveOrders((prev) => prev.filter((o) => o.order.ticket_number !== ticketNumber));
    realtimeBridge.dispatchTicket(ticketNumber, chairId);
  };

  const handleClearAllOrders = async () => {
    // 1. Immediately wipe React state so UI updates to 0 orders instantly
    setActiveOrders([]);
    setItemStages({});
    setStockNotice('All kitchen orders deleted');
    setTimeout(() => setStockNotice(''), 3500);

    // 2. Wipe browser storage synchronously
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('thoogudeepa_v2_active_orders_list');
        localStorage.removeItem('thoogudeepa_v2_seat_occupancy_registry');
        const keys = Object.keys(localStorage);
        for (const k of keys) {
          if (
            k.startsWith('thoogudeepa') ||
            k.includes('order') ||
            k.includes('session') ||
            k.includes('cart') ||
            k.includes('stage') ||
            k.includes('ticket')
          ) {
            localStorage.removeItem(k);
          }
        }
        sessionStorage.clear();
      } catch (err) {
        console.error('Storage clear error:', err);
      }
    }

    // 3. Clear remote database and broadcast
    try {
      await realtimeBridge.clearAllOrders();
    } catch (err) {
      console.error('Realtime clear error:', err);
    }
  };

  const toggleStock = (dishKey: string) => {
    if (isStockLocked) {
      setStockNotice('Unlock with lock symbol to modify');
      setTimeout(() => setStockNotice(''), 2500);
      return;
    }
    setStockStatus((prev) => ({ ...prev, [dishKey]: !prev[dishKey] }));
  };

  const handleStockReset = () => {
    if (isStockLocked) return;
    const allAvailable = Object.keys(stockStatus).reduce<Record<string, boolean>>((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setStockStatus(allAvailable);
    setStockNotice('All items set to In Stock');
    setTimeout(() => setStockNotice(''), 2500);
  };

  const handleStockUpdate = async () => {
    if (isStockLocked) return;
    setCommittedStockStatus(stockStatus);
    setIsStockLocked(true);
    setStockNotice('Updated & broadcast to real menu');
    setTimeout(() => setStockNotice(''), 2500);

    // 1. Broadcast over Supabase realtime channel
    Object.entries(stockStatus).forEach(([dishId, isAvailable]) => {
      realtimeBridge.setAvailability(dishId, isAvailable);
    });

    // 2. Persist to inventory API endpoint
    try {
      for (const [dishId, isAvailable] of Object.entries(stockStatus)) {
        await fetch('/api/inventory', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dish_id: dishId, is_available: isAvailable }),
        });
      }
    } catch {
      // Realtime channel already synchronized
    }
  };

  // Samsung Galaxy Tab A9 Frame Shell (8.7 inch, 1340x800 native resolution, aspect 1340/800)
  const renderGalaxyTabA9 = (content: React.ReactNode, title: string, screenNumber: number) => {
    return (
      <div className="flex flex-col items-center gap-2.5 w-full max-w-[1340px]">
        {/* Device Information Header Banner */}
        <div className="w-full flex items-center justify-between px-3 text-xs font-black tracking-wider text-zinc-500 uppercase">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse inline-block" />
            <span className="text-zinc-900 font-extrabold">{title}</span>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono tracking-tight font-bold">
            SAMSUNG GALAXY TAB A9 • 8.7&quot; (1340 × 800) • STATION #{screenNumber}
          </span>
        </div>

        {/* Outer Tab A9 Tablet Bezel Chassis with exact 1340x800 aspect ratio */}
        <div className="w-full aspect-[1340/800] max-h-[800px] bg-[#1a1b1e] p-3 sm:p-4 rounded-[32px] shadow-2xl border-[5px] border-[#2d3035] relative flex items-center justify-center">
          {/* Front camera lens centered on the top bezel */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#0a0a0b] ring-1 ring-zinc-700 pointer-events-none" />

          {/* Active Screen Viewport Canvas */}
          <div className="w-full h-full bg-[#f8f9fa] rounded-[20px] overflow-hidden flex flex-col p-3.5 sm:p-4 border border-zinc-200">
            {content}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-[#f4f5f7] text-zinc-900 flex flex-col font-sans select-none pb-12">
      {/* Top Suite Bar */}
      <header className="w-full bg-white border-b border-zinc-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Left Branding & Heading */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-amber-600 bg-amber-50 flex items-center justify-center shrink-0 shadow-xs">
            <ChefHat className="w-5 h-5 text-amber-700" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">
                KITCHEN DISPLAY SYSTEM
              </span>
              <span className="text-[10px] text-zinc-400 font-medium uppercase">
                THOOGUDEEPA DONNE BIRYANI MANE
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-black tracking-tight text-zinc-900 flex items-center gap-1.5">
              <span>ORDERS &amp; PASS CONTROL</span>
              <span className="text-zinc-400 font-normal">•</span>
              <span className="text-amber-700">Master Dispatch</span>
            </h1>
          </div>
        </div>

        {/* Right Role Navigation & Actions */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Reset Queue Button */}
          <button
            type="button"
            onClick={handleClearAllOrders}
            className="px-3.5 py-1.5 rounded-full bg-red-50 text-red-700 hover:text-white hover:bg-red-700 border border-red-300 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            title="Delete all kitchen orders"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete All Orders</span>
          </button>

          {/* Role Pills */}
          <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-full border border-zinc-200 text-xs font-bold">
            <Link
              href="/seat/12/menu"
              className="px-3 py-1 rounded-full text-zinc-600 hover:text-black hover:bg-white transition-colors flex items-center gap-1.5"
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>CUSTOMER</span>
            </Link>
            <div className="px-3 py-1 rounded-full bg-zinc-900 text-white flex items-center gap-1.5 shadow-xs">
              <ChefHat className="w-3.5 h-3.5" />
              <span>KITCHEN</span>
            </div>
            <Link
              href="/qrs"
              className="px-3 py-1 rounded-full text-zinc-700 hover:text-black hover:bg-white transition-colors flex items-center gap-1.5 border border-zinc-200/80 bg-white shadow-2xs"
            >
              <QrCode className="w-3.5 h-3.5 text-zinc-900" />
              <span>100 SEAT QRS</span>
            </Link>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg border border-zinc-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('single')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'single'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-white'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>SINGLE TABLET</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>ALL 3 SCREENS</span>
            </button>
          </div>
        </div>
      </header>

      {/* Screen Tabs Bar */}
      <div className="w-full bg-[#fafafa] border-b border-zinc-200 px-6 py-2 flex items-center gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveScreenTab(1)}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeScreenTab === 1
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
          }`}
        >
          <span>1. KDS LOGIN</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveScreenTab(2)}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeScreenTab === 2
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
          }`}
        >
          <span>2. ALL SEATS &amp; FEEDS</span>
          <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-black flex items-center justify-center">
            {activeOrders.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveScreenTab(3)}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeScreenTab === 3
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
          }`}
        >
          <span>3. SEAT DETAIL &amp; 86 INVENTORY</span>
        </button>
      </div>

      {/* Content Rendering Engine */}
      {(() => {
        {/* SCREEN 1: KDS Station Login (Exact Layout from Hand-Drawn Sketch) */}
        const screen1Content = (
          <div className="flex-1 w-full h-full flex flex-col md:flex-row items-center justify-around p-6 sm:p-10 bg-[#fbfbfa] overflow-hidden select-none gap-6 sm:gap-10">
            {/* Left Column: Big Circular Logo Placed Higher Up and Brand Title */}
            <div className="flex flex-col items-center justify-center text-center max-w-sm -translate-y-2 sm:-translate-y-5">
              <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full border-4 border-amber-600/40 overflow-hidden shadow-lg bg-white flex items-center justify-center p-2 transition-transform hover:scale-105">
                <img
                  src="/logo.jpg"
                  alt="Thoogudeepa Donne Biryani Mane"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-zinc-950 mt-4 leading-tight">
                THOOGUDEEPA DONNE BIRYANI MANE
              </h1>
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-amber-700 mt-1.5">
                Kitchen Display System
              </span>
            </div>

            {/* Right Column: High-Visibility Large PIN Display + Keypad + Login Button */}
            <div className="flex flex-col items-center gap-3 w-full max-w-[340px] sm:max-w-[370px]">
              {/* 4-Digit PIN Indicator Pill */}
              <div className="w-full flex items-center justify-center gap-5 py-3.5 px-6 rounded-2xl bg-white border-2 border-zinc-900 shadow-sm">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full border-2 border-zinc-900 transition-all ${
                      pin.length > idx ? 'bg-zinc-950 scale-125' : 'bg-transparent'
                    }`}
                  />
                ))}
              </div>

              {errorMessage && (
                <span className="text-xs font-black text-red-600 leading-none py-0.5">
                  {errorMessage}
                </span>
              )}

              {/* High-Visibility Large 3x4 Number Pad Grid */}
              <div className="grid grid-cols-3 gap-2.5 w-full">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'DEL'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleKeyPress(val)}
                    className={`h-14 sm:h-16 rounded-2xl text-xl sm:text-2xl font-black transition-all flex items-center justify-center cursor-pointer shadow-xs border-2 ${
                      val === 'CLR'
                        ? 'bg-amber-100/70 hover:bg-amber-100 text-amber-950 border-amber-300 active:scale-95'
                        : val === 'DEL'
                        ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300 active:scale-95'
                        : 'bg-white hover:bg-zinc-50 active:bg-zinc-100 text-zinc-950 border-zinc-300 active:scale-95'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>

              {/* Wide Login Button as Drawn in Sketch */}
              <button
                type="button"
                onClick={handleLoginSubmit}
                className="w-full h-13 sm:h-14 rounded-2xl bg-zinc-950 hover:bg-black text-white font-black text-base uppercase tracking-widest flex items-center justify-center gap-2.5 cursor-pointer shadow-md active:scale-95 transition-all mt-0.5"
              >
                <Check className="w-5 h-5 text-emerald-400 stroke-[3]" />
                <span>LOGIN</span>
              </button>
            </div>
          </div>
        );

        {/* SCREEN 2: All Seats & Feeds (Dynamic Orders) */}
        const deduplicatedActiveOrders: typeof activeOrders = [];
        const seenTicketKeys = new Set<string>();

        for (const active of activeOrders) {
          const chairClean = (active.order.chair_id || '').replace(/[^0-9]/g, '');
          const ticketKey = active.order.ticket_number ? `${chairClean}-${active.order.ticket_number}` : active.order.id;
          if (ticketKey && seenTicketKeys.has(ticketKey)) {
            const existing = deduplicatedActiveOrders.find((o) => {
              const oChair = (o.order.chair_id || '').replace(/[^0-9]/g, '');
              const oKey = o.order.ticket_number ? `${oChair}-${o.order.ticket_number}` : o.order.id;
              return oKey === ticketKey;
            });
            if (existing) {
              const existingItemIds = new Set(existing.items.map((it) => it.id));
              const existingOrderIds: string[] = (existing.order as any).order_ids || (existing.order.id ? [existing.order.id] : []);
              if (active.order.id && !existingOrderIds.includes(active.order.id)) {
                existingOrderIds.push(active.order.id);
                (existing.order as any).order_ids = existingOrderIds;
              }
              const extraItems = active.items
                .filter((it) => !it.id || !existingItemIds.has(it.id))
                .map((it) => ({
                  ...it,
                  order_id: it.order_id || active.order.id,
                }));
              if (extraItems.length > 0) {
                existing.items.push(...extraItems);
              }
            }
            continue;
          }
          if (ticketKey) seenTicketKeys.add(ticketKey);
          const orderIds = (active.order as any).order_ids || (active.order.id ? [active.order.id] : []);
          const taggedItems = active.items.map((it) => ({
            ...it,
            order_id: it.order_id || active.order.id,
          }));
          deduplicatedActiveOrders.push({
            ...active,
            order: {
              ...active.order,
              order_ids: orderIds,
            } as any,
            items: taggedItems,
          });
        }

        interface KitchenRoundDish {
          key: string;
          dishId: string;
          dishName: string;
          quantity: number;
          notes: string[];
          addons: string[];
          currentStage: 'PLACED' | 'REC' | 'PREP' | 'READY' | 'SERVED';
          rawItems: OrderItemRecord[];
        }

        interface KitchenRoundGroup {
          roundKey: string;
          roundNumber: number;
          label: string;
          items: KitchenRoundDish[];
        }

        function groupKitchenRounds(
          items: OrderItemRecord[],
          order: OrderRecord,
          stagesMap: Record<string, string>
        ): KitchenRoundGroup[] {
          const cleanChair = (order.chair_id || '').replace(/[^0-9]/g, '');
          const tNum = order.ticket_number || '';
          const orderIds: string[] = (order as any).order_ids || (order.id ? [order.id] : []);

          // Map each order batch to its items
          const batchMap = new Map<string, OrderItemRecord[]>();

          items.forEach((it) => {
            const rKey = it.order_id || orderIds[0] || order.id || 'initial';
            if (!batchMap.has(rKey)) {
              batchMap.set(rKey, []);
            }
            batchMap.get(rKey)!.push(it);
          });

          // Preserve order batches chronologically
          const sortedBatchKeys: string[] = [];
          orderIds.forEach((oid) => {
            if (batchMap.has(oid) && !sortedBatchKeys.includes(oid)) {
              sortedBatchKeys.push(oid);
            }
          });
          batchMap.forEach((_, key) => {
            if (!sortedBatchKeys.includes(key)) {
              sortedBatchKeys.push(key);
            }
          });

          const rounds: KitchenRoundGroup[] = [];

          sortedBatchKeys.forEach((bKey, bIdx) => {
            const rawBatchItems = batchMap.get(bKey) || [];
            if (rawBatchItems.length === 0) return;

            // Within this specific round, aggregate identical dishes if any
            const dishMap = new Map<string, KitchenRoundDish>();

            rawBatchItems.forEach((it, idx) => {
              const dKey = String(it.dish_name || it.dish_id).toLowerCase().trim();
              const itemKey = it.id || `${order.ticket_number}-${bKey}-${it.dish_id}-${idx}`;
              const isUntouched = it.stage === 'PLACED' || (Array.isArray(it.addons) && it.addons.includes('PLACED'));

              const renderKeys = [
                it.id,
                itemKey,
                cleanChair && it.id && `${cleanChair}-${it.id}`,
                cleanChair && tNum && it.id && `${cleanChair}-${tNum}-${it.id}`,
                cleanChair && `${cleanChair}-${itemKey}`,
                cleanChair && tNum && `${cleanChair}-${tNum}-${itemKey}`,
              ].filter(Boolean) as string[];

              const candStages: string[] = [];
              for (const k of renderKeys) {
                if (stagesMap[k]) candStages.push(stagesMap[k]);
              }

              if (it.stage && (!isUntouched || it.stage !== 'REC')) {
                candStages.push(it.stage);
              }

              let itStage: 'PLACED' | 'REC' | 'PREP' | 'READY' | 'SERVED' = 'PLACED';
              if (candStages.includes('SERVED')) itStage = 'SERVED';
              else if (candStages.includes('READY')) itStage = 'READY';
              else if (candStages.includes('PREP')) itStage = 'PREP';
              else if (candStages.includes('REC')) {
                const userTappedRec = renderKeys.some((k) => stagesMap[k] === 'REC');
                if (userTappedRec || !isUntouched) {
                  itStage = 'REC';
                } else {
                  itStage = 'PLACED';
                }
              }

              if (!dishMap.has(dKey)) {
                dishMap.set(dKey, {
                  key: itemKey,
                  dishId: it.dish_id,
                  dishName: it.dish_name,
                  quantity: 0,
                  notes: [],
                  addons: [],
                  currentStage: itStage,
                  rawItems: [],
                });
              }

              const entry = dishMap.get(dKey)!;
              entry.quantity += it.quantity;
              entry.rawItems.push(it);
              if (it.notes && !entry.notes.includes(it.notes)) entry.notes.push(it.notes);
              if (Array.isArray(it.addons)) {
                it.addons.forEach((a) => {
                  if (a !== 'PLACED' && !entry.addons.includes(a)) entry.addons.push(a);
                });
              }
              const stagePriority: Record<string, number> = { 'PLACED': 1, 'REC': 2, 'PREP': 3, 'READY': 4, 'SERVED': 5 };
              if ((stagePriority[itStage] || 1) > (stagePriority[entry.currentStage] || 1)) {
                entry.currentStage = itStage;
              }
            });

            const isFirst = bIdx === 0;
            rounds.push({
              roundKey: bKey,
              roundNumber: bIdx + 1,
              label: isFirst ? 'ROUND 1' : `ROUND ${bIdx + 1} • ADD-ON`,
              items: Array.from(dishMap.values()),
            });
          });

          return rounds;
        }

        const activeTicketsToDisplay = deduplicatedActiveOrders
          .map((active) => {
            const order = active.order;
            const cleanChair = (order.chair_id || '').replace(/[^0-9]/g, '');

            const tNum = order.ticket_number || '';
            const unservedItems = active.items.filter((it, idx) => {
              const itemKey = it.id || it.dish_id || `${order.ticket_number}-${idx}`;
              const dNum = it.dish_id ? it.dish_id.replace(/[^0-9]/g, '') : '';
              const dClean = it.dish_id ? it.dish_id.replace(/^dish-/, '') : '';
              const dName = it.dish_name ? it.dish_name.toLowerCase().replace(/donne\s*/i, '').trim() : '';
              const dNameFull = it.dish_name ? it.dish_name.toLowerCase().trim() : '';
              const normChair = cleanChair.replace(/^0+/, '');
              const paddedChair = normChair.padStart(2, '0');
              const addons = Array.isArray(it.addons) ? it.addons : [];

              const isServed =
                it.stage === 'SERVED' ||
                addons.includes('SERVED') ||
                Boolean(it.id && itemStages[it.id] === 'SERVED') ||
                Boolean(it.id && cleanChair && itemStages[`${cleanChair}-${it.id}`] === 'SERVED') ||
                Boolean(it.id && normChair && itemStages[`${normChair}-${it.id}`] === 'SERVED') ||
                Boolean(it.id && paddedChair && itemStages[`${paddedChair}-${it.id}`] === 'SERVED') ||
                Boolean(it.id && tNum && itemStages[`${tNum}-${it.id}`] === 'SERVED') ||
                Boolean(it.id && cleanChair && tNum && itemStages[`${cleanChair}-${tNum}-${it.id}`] === 'SERVED') ||
                Boolean(it.id && normChair && tNum && itemStages[`${normChair}-${tNum}-${it.id}`] === 'SERVED');

              return !isServed;
            });

            return { ...active, unservedItems };
          })
          .filter((active) => active.items.length === 0 || active.unservedItems.length > 0);

        const filteredTickets = selectedWaiter
          ? activeTicketsToDisplay.filter((active) => {
              const order = active.order;
              const anyOrder = order as unknown as Record<string, unknown>;
              if (typeof anyOrder.waiter_name === 'string' && anyOrder.waiter_name.toLowerCase().includes(selectedWaiter.toLowerCase())) {
                return true;
              }
              const seatNum = parseInt((order.chair_id || '').replace(/[^0-9]/g, ''), 10);
              const wInfo = KITCHEN_WAITERS.find((w) => w.name === selectedWaiter);
              if (wInfo && !isNaN(seatNum)) {
                return seatNum >= wInfo.zone[0] && seatNum <= wInfo.zone[1];
              }
              return false;
            })
          : activeTicketsToDisplay;

        const screen2Content = (
          <div className="flex-1 flex flex-col justify-between w-full h-full overflow-hidden bg-white select-none">
            {/* Top Bar matching hand-drawn sketch: THOOGUDEEPA KDS | Filter & Waiter Chips | ORDERS [ X ] */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 shrink-0 border-b-2 border-zinc-950 bg-white gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-zinc-950 whitespace-nowrap">
                  THOOGUDEEPA KDS
                </h3>
              </div>

              {/* Filter funnel & Waiter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <div className="p-1 text-zinc-700 shrink-0" title="Filter by Waiter">
                  <Filter className="w-3.5 h-3.5" />
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedWaiter(null)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase transition-all cursor-pointer whitespace-nowrap border ${
                    selectedWaiter === null
                      ? 'bg-zinc-950 text-white border-zinc-950'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300'
                  }`}
                >
                  ALL
                </button>
                {KITCHEN_WAITERS.map((waiter) => {
                  const isSelected = selectedWaiter === waiter.name;
                  return (
                    <button
                      key={waiter.id}
                      type="button"
                      onClick={() => setSelectedWaiter(isSelected ? null : waiter.name)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase transition-all cursor-pointer whitespace-nowrap border ${
                        isSelected
                          ? 'bg-zinc-950 text-white border-zinc-950'
                          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                      }`}
                    >
                      {waiter.name}
                    </button>
                  );
                })}
              </div>

              {/* Orders Counter Badge from Sketch: ORDERS [ 11 ] */}
              <div className="flex items-center shrink-0">
                <div className="px-3 py-1 rounded-md border-2 border-zinc-950 bg-zinc-100 font-mono font-black text-xs text-zinc-950 tracking-wider">
                  ORDERS [{filteredTickets.length}]
                </div>
              </div>
            </div>

            {/* Grid of Active Orders (3 Columns layout matching sketch for Galaxy Tab A9) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 w-full flex-1 overflow-y-auto p-3 items-start content-start no-scrollbar bg-[#fcfcfb]">
              {filteredTickets.map((active, orderIdx) => {
                const order = active.order;
                const chairId = order.chair_id || '12';

                return (
                  <div
                    key={order.id || `${order.ticket_number}-${orderIdx}`}
                    className="w-full bg-white rounded-xl border-2 border-zinc-950 shadow-xs p-3.5 flex flex-col gap-3"
                  >
                    {/* Ticket Header: [SEAT 17] KOT: #TK-17-569 (>) */}
                    <div
                      onClick={() => {
                        setSelectedTicketId(order.id || order.ticket_number);
                        setActiveScreenTab(3);
                      }}
                      className="pb-2 border-b-2 border-zinc-200 flex items-center justify-between gap-2 shrink-0 cursor-pointer group"
                      title="Go to next page (Seat Detail & 86 Inventory)"
                    >
                      <span className="font-black text-xs text-zinc-950 uppercase tracking-wider bg-zinc-100 group-hover:bg-zinc-200 px-2.5 py-1 rounded border-2 border-zinc-950 whitespace-nowrap transition-colors">
                        SEAT {chairId}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-zinc-800 font-mono whitespace-nowrap">
                          KOT: #{order.ticket_number}
                        </span>
                        <div
                          className="h-6 w-6 rounded-md border border-zinc-300 group-hover:border-zinc-950 bg-zinc-100 group-hover:bg-zinc-200 flex items-center justify-center text-zinc-800 group-hover:text-zinc-950 transition-all shadow-2xs group-active:scale-95"
                          title="Go to next page"
                        >
                          <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      </div>
                    </div>

                    {/* Items List (Round-Isolated multi-round dishes) */}
                    <div className="flex flex-col gap-3 py-0.5">
                      {groupKitchenRounds(active.unservedItems, order, itemStages).map((round) => (
                        <div
                          key={round.roundKey}
                          className="flex flex-col gap-2.5 border-b border-zinc-200 pb-2.5 last:border-b-0 last:pb-0"
                        >
                          {/* Round Header Banner */}
                          <div className="flex items-center justify-between pb-1 border-b border-dashed border-zinc-200">
                            <span
                              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                                round.roundNumber === 1
                                  ? 'bg-zinc-100 text-zinc-900 border-zinc-300'
                                  : 'bg-amber-100/80 text-amber-950 border-amber-300'
                              }`}
                            >
                              {round.label}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-zinc-500">
                              {round.items.reduce((acc, it) => acc + it.quantity, 0)}{' '}
                              {round.items.reduce((acc, it) => acc + it.quantity, 0) === 1 ? 'dish' : 'dishes'}
                            </span>
                          </div>

                          {/* Dishes in this round */}
                          {round.items.map((dishGroup) => {
                            const currentStage = dishGroup.currentStage;
                            const hasAddon = dishGroup.notes.length > 0 || dishGroup.addons.length > 0;

                            return (
                              <div
                                key={dishGroup.key}
                                className="flex flex-col gap-1.5 pt-0.5"
                              >
                                {/* Dish Title and Addon Badge */}
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-black text-sm text-zinc-950 leading-snug">
                                    {dishGroup.quantity}x {dishGroup.dishName}
                                  </span>
                                  {hasAddon && (
                                    <span className="px-1.5 py-0.5 rounded border border-zinc-900 bg-zinc-100 text-[10px] font-black uppercase text-zinc-900 shrink-0">
                                      Addon
                                    </span>
                                  )}
                                </div>

                                {/* Customizations / Notes if present */}
                                {hasAddon && (
                                  <div className="text-[10px] font-bold text-amber-950 bg-amber-50 border border-amber-300 rounded px-2 py-0.5 leading-snug">
                                    <span>{[...dishGroup.notes, ...dishGroup.addons].join(' • ')}</span>
                                  </div>
                                )}

                                {/* 3 Buttons: [REC] [PREP] [READY] (unselected neutral when PLACED) */}
                                <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                                  {(['REC', 'PREP', 'READY'] as const).map((stage) => {
                                    const trafficGreenBorder = 'bg-white text-[#008f39] border-[#00c853] shadow-xs';
                                    const trafficGreenFilled = 'bg-[#00c853] text-white border-[#00b048] shadow-xs font-black';
                                    let btnStyle = 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300';

                                    if (currentStage === 'REC') {
                                      if (stage === 'REC') {
                                        btnStyle = 'bg-orange-500 text-white border-orange-600 shadow-xs';
                                      }
                                    } else if (currentStage === 'PREP') {
                                      if (stage === 'REC') {
                                        btnStyle = trafficGreenBorder;
                                      } else if (stage === 'PREP') {
                                        btnStyle = 'bg-orange-500 text-white border-orange-600 shadow-xs';
                                      }
                                    } else if (currentStage === 'READY' || currentStage === 'SERVED') {
                                      if (stage === 'READY') {
                                        btnStyle = trafficGreenFilled;
                                      } else {
                                        btnStyle = trafficGreenBorder;
                                      }
                                    }

                                    return (
                                      <button
                                        key={stage}
                                        type="button"
                                        onClick={() => {
                                          dishGroup.rawItems.forEach((it) => {
                                            updateItemStage(it.id || dishGroup.key, stage, {
                                              chairId: order.chair_id,
                                              dishId: it.dish_id,
                                              ticketNumber: order.ticket_number,
                                              dishName: it.dish_name,
                                              itemId: it.id || dishGroup.key,
                                            });
                                          });
                                        }}
                                        className={`h-9 rounded-md text-xs font-black tracking-wider uppercase transition-all border-2 cursor-pointer flex items-center justify-center select-none active:scale-95 ${btnStyle}`}
                                      >
                                        {stage}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Empty Slots matching sketch rack grid structure (up to 6 slots minimum) */}
              {Array.from({ length: Math.max(0, 6 - filteredTickets.length) }).map((_, slotIdx) => (
                <div
                  key={`empty-slot-${slotIdx}`}
                  className="w-full min-h-[200px] rounded-xl border-2 border-dashed border-zinc-300 bg-white/40 flex items-center justify-center select-none"
                >
                  <span className="text-zinc-300 font-black text-xs uppercase tracking-widest">
                    Available Slot
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

        {/* SCREEN 3: Seat Detail (Left Panel) & Items Availability 86 Inventory (Right Panel) */}
        const currentActiveTicket =
          (selectedTicketId
            ? activeTicketsToDisplay.find(
                (a) => a.order.id === selectedTicketId || a.order.ticket_number === selectedTicketId
              )
            : null) ||
          activeTicketsToDisplay[0] ||
          null;

        const detailChairId = currentActiveTicket?.order.chair_id || '17';
        const detailKOT = currentActiveTicket?.order.ticket_number || '17-8969';

        const screen3Content = (
          <div className="flex-1 w-full h-full flex flex-col lg:flex-row divide-y-2 lg:divide-y-0 lg:divide-x-2 divide-zinc-950 bg-white overflow-hidden select-none">
            {/* LEFT PANEL: Seat Order Detail matching sketch */}
            <div className="w-full lg:w-1/2 flex flex-col justify-between p-3.5 sm:p-5 bg-white overflow-hidden">
              {/* Header: [SEAT 17] KOT #17-8969 | THOOGUDEEPA KDS */}
              <div className="pb-3 border-b-2 border-zinc-950 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs sm:text-sm text-zinc-950 uppercase tracking-wider bg-zinc-100 px-2.5 py-1 rounded border-2 border-zinc-950 whitespace-nowrap">
                    SEAT {detailChairId}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-zinc-800 font-mono whitespace-nowrap">
                    KOT #{detailKOT}
                  </span>
                </div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-zinc-950 whitespace-nowrap">
                  THOOGUDEEPA KDS
                </h3>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto no-scrollbar py-3 flex flex-col gap-3">
                {currentActiveTicket && currentActiveTicket.unservedItems.length > 0 ? (
                  currentActiveTicket.unservedItems.map((it, idx) => {
                    const itemKey = it.id || `${currentActiveTicket.order.ticket_number}-${it.dish_id}-${idx}`;
                    const cleanChair = (currentActiveTicket.order.chair_id || '').replace(/[^0-9]/g, '');
                    const tNum = currentActiveTicket.order.ticket_number || '';

                    const isUntouched = it.stage === 'PLACED' || (Array.isArray(it.addons) && it.addons.includes('PLACED'));
                    const renderKeys = [
                      it.id,
                      itemKey,
                      cleanChair && it.id && `${cleanChair}-${it.id}`,
                      cleanChair && tNum && it.id && `${cleanChair}-${tNum}-${it.id}`,
                      cleanChair && `${cleanChair}-${itemKey}`,
                      cleanChair && tNum && `${cleanChair}-${tNum}-${itemKey}`,
                    ].filter(Boolean) as string[];

                    const candStages: string[] = [];
                    for (const k of renderKeys) {
                      if (itemStages[k]) candStages.push(itemStages[k]);
                    }

                    if (it.stage && (!isUntouched || it.stage !== 'REC')) {
                      candStages.push(it.stage);
                    }

                    let currentStage: 'PLACED' | 'REC' | 'PREP' | 'READY' | 'SERVED' = 'PLACED';
                    if (candStages.includes('SERVED')) {
                      currentStage = 'SERVED';
                    } else if (candStages.includes('READY')) {
                      currentStage = 'READY';
                    } else if (candStages.includes('PREP')) {
                      currentStage = 'PREP';
                    } else if (candStages.includes('REC')) {
                      const userTappedRec = renderKeys.some((k) => itemStages[k] === 'REC');
                      if (userTappedRec || !isUntouched) {
                        currentStage = 'REC';
                      } else {
                        currentStage = 'PLACED';
                      }
                    } else {
                      currentStage = 'PLACED';
                    }

                    const hasAddon =
                      (it.notes && it.notes.trim().length > 0) ||
                      (it.addons && it.addons.length > 0 && !it.addons.every((a) => a === 'PLACED'));

                    const trafficGreenBorder = 'bg-white text-[#008f39] border-[#00c853] shadow-xs';
                    const trafficGreenFilled = 'bg-[#00c853] text-white border-[#00b048] shadow-xs font-black';

                    return (
                      <div
                        key={itemKey}
                        className="p-3 rounded-xl border-2 border-zinc-200 bg-[#fdfdfc] flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-black text-sm text-zinc-950">
                            {it.quantity}x {it.dish_name}
                          </span>
                          {hasAddon && (
                            <span className="px-2 py-0.5 rounded border border-zinc-900 bg-zinc-100 text-[10px] font-black uppercase text-zinc-900 shrink-0 flex items-center gap-1">
                              <span>+</span>
                              <span>Add on</span>
                            </span>
                          )}
                        </div>

                        {hasAddon && (it.notes || it.addons) && (
                          <div className="text-[10px] font-bold text-amber-950 bg-amber-50 border border-amber-300 rounded px-2 py-0.5 leading-snug">
                            <span>{(it.notes || it.addons?.filter((a) => a !== 'PLACED').join(', '))}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          {(['REC', 'PREP', 'READY'] as const).map((stage) => {
                            let btnStyle = 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300';

                            if (currentStage === 'REC') {
                              if (stage === 'REC') {
                                btnStyle = 'bg-orange-500 text-white border-orange-600 shadow-xs';
                              }
                            } else if (currentStage === 'PREP') {
                              if (stage === 'REC') {
                                btnStyle = trafficGreenBorder;
                              } else if (stage === 'PREP') {
                                btnStyle = 'bg-orange-500 text-white border-orange-600 shadow-xs';
                              }
                            } else if (currentStage === 'READY' || currentStage === 'SERVED') {
                              if (stage === 'READY') {
                                btnStyle = trafficGreenFilled;
                              } else {
                                btnStyle = trafficGreenBorder;
                              }
                            }

                            return (
                              <button
                                key={stage}
                                type="button"
                                onClick={() =>
                                  updateItemStage(itemKey, stage, {
                                    chairId: currentActiveTicket.order.chair_id,
                                    dishId: it.dish_id,
                                    ticketNumber: currentActiveTicket.order.ticket_number,
                                    dishName: it.dish_name,
                                    itemId: it.id || itemKey,
                                  })
                                }
                                className={`h-9 rounded-md text-xs font-black tracking-wider uppercase transition-all border-2 cursor-pointer flex items-center justify-center select-none active:scale-95 ${btnStyle}`}
                              >
                                {stage}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  /* Demo interactive items exactly from the sketch if no active tickets right now */
                  [
                    { key: 'demo-1', title: '1x Chilli Chicken', addon: true },
                    { key: 'demo-2', title: '2x Chicken Biryani', addon: true },
                  ].map((demo) => {
                    const stage = demoStages[demo.key] || 'PLACED';
                    const trafficGreenBorder = 'bg-white text-[#008f39] border-[#00c853] shadow-xs';
                    const trafficGreenFilled = 'bg-[#00c853] text-white border-[#00b048] shadow-xs font-black';

                    return (
                      <div
                        key={demo.key}
                        className="p-3 rounded-xl border-2 border-zinc-200 bg-[#fdfdfc] flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-black text-sm text-zinc-950">{demo.title}</span>
                          <span className="px-2 py-0.5 rounded border border-zinc-900 bg-zinc-100 text-[10px] font-black uppercase text-zinc-900 shrink-0 flex items-center gap-1">
                            <span>+</span>
                            <span>Add on</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          {(['REC', 'PREP', 'READY'] as const).map((s) => {
                            let btnStyle = 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300';
                            if (stage === 'REC') {
                              if (s === 'REC') btnStyle = 'bg-orange-500 text-white border-orange-600 shadow-xs';
                            } else if (stage === 'PREP') {
                              if (s === 'REC') btnStyle = trafficGreenBorder;
                              else if (s === 'PREP') btnStyle = 'bg-orange-500 text-white border-orange-600 shadow-xs';
                            } else if (stage === 'READY') {
                              if (s === 'READY') btnStyle = trafficGreenFilled;
                              else btnStyle = trafficGreenBorder;
                            }

                            return (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setDemoStages((prev) => ({ ...prev, [demo.key]: s }))}
                                className={`h-9 rounded-md text-xs font-black tracking-wider uppercase transition-all border-2 cursor-pointer flex items-center justify-center select-none active:scale-95 ${btnStyle}`}
                              >
                                {s}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Actions: [ < Back ] [ All items Ready ] */}
              <div className="pt-3 border-t-2 border-zinc-950 flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveScreenTab(2)}
                  className="px-4 py-2 rounded-lg border-2 border-zinc-950 bg-white hover:bg-zinc-100 text-zinc-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (currentActiveTicket) {
                      currentActiveTicket.items.forEach((it, idx) => {
                        const itemKey = it.id || `${currentActiveTicket.order.ticket_number}-${it.dish_id}-${idx}`;
                        updateItemStage(itemKey, 'READY', {
                          chairId: currentActiveTicket.order.chair_id,
                          dishId: it.dish_id,
                          ticketNumber: currentActiveTicket.order.ticket_number,
                          dishName: it.dish_name,
                          itemId: it.id || itemKey,
                        });
                      });
                    } else {
                      setDemoStages({ 'demo-1': 'READY', 'demo-2': 'READY' });
                    }
                  }}
                  className="px-4 py-2 rounded-lg border-2 border-zinc-950 bg-zinc-950 hover:bg-black text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-xs active:scale-95 transition-all"
                >
                  All items Ready
                </button>
              </div>
            </div>

            {/* RIGHT PANEL: Items availability matching sketch */}
            <div className="w-full lg:w-1/2 flex flex-col justify-between p-3.5 sm:p-5 bg-[#fafaf9] overflow-hidden">
              {/* Header: Items availability | Lock Symbol */}
              <div className="pb-3 border-b-2 border-zinc-950 flex items-center justify-between gap-2 shrink-0">
                <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-zinc-950">
                  Items availability
                </h3>
                <button
                  type="button"
                  onClick={() => setIsStockLocked(!isStockLocked)}
                  className="p-1.5 rounded-lg border-2 border-zinc-950 bg-white hover:bg-zinc-100 cursor-pointer shadow-xs transition-all active:scale-95"
                  title={isStockLocked ? 'Controls Locked. Click to unlock.' : 'Controls Unlocked. Click to lock.'}
                >
                  {isStockLocked ? (
                    <Lock className="w-4 h-4 text-amber-600" />
                  ) : (
                    <Unlock className="w-4 h-4 text-emerald-600" />
                  )}
                </button>
              </div>

              {/* Dishes Vertical List */}
              <div className="flex-1 overflow-y-auto no-scrollbar py-3 flex flex-col gap-2.5">
                {MENU_ITEMS.map((dish) => {
                  const isAvailable = stockStatus[dish.id] !== false;
                  return (
                    <div
                      key={dish.id}
                      className="flex items-center justify-between p-2.5 bg-white rounded-lg border-2 border-zinc-300 shadow-2xs gap-2 transition-all hover:border-zinc-400"
                    >
                      <span className="font-black text-xs sm:text-sm text-zinc-950 truncate flex-1">
                        {dish.title}
                      </span>
                      <button
                        type="button"
                        disabled={isStockLocked}
                        onClick={() => {
                          if (isStockLocked) return;
                          setStockStatus((prev) => ({ ...prev, [dish.id]: !isAvailable }));
                        }}
                        className={`px-3 py-1.5 rounded-md font-black text-xs uppercase tracking-wider flex items-center gap-1.5 border-2 transition-all select-none ${
                          isAvailable
                            ? 'border-[#00c853] bg-emerald-50 text-[#008f39]'
                            : 'border-red-500 bg-red-50 text-red-700'
                        } ${isStockLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02] active:scale-95 shadow-xs'}`}
                      >
                        {isAvailable ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[3] text-[#00c853]" />
                            <span>In stock</span>
                          </>
                        ) : (
                          <>
                            <Ban className="w-3.5 h-3.5 stroke-[2.5] text-red-600" />
                            <span>Out of stock</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Actions: [ RESET ] [ UPDATE ] */}
              <div className="pt-3 border-t-2 border-zinc-950 flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  disabled={isStockLocked}
                  onClick={handleStockReset}
                  className="px-4 py-2 rounded-lg border-2 border-zinc-950 bg-white hover:bg-zinc-100 text-zinc-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
                >
                  RESET
                </button>

                {stockNotice && (
                  <span className="text-[11px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md animate-fade-in">
                    {stockNotice}
                  </span>
                )}

                <button
                  type="button"
                  disabled={isStockLocked}
                  onClick={handleStockUpdate}
                  className="px-5 py-2 rounded-lg border-2 border-zinc-950 bg-zinc-950 hover:bg-black text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
                >
                  UPDATE
                </button>
              </div>
            </div>
          </div>
        );

        return (
          <main className="w-full max-w-[1400px] mx-auto px-2 sm:px-4 mt-4 flex-1 flex flex-col items-center">
            {viewMode === 'all' ? (
              <div className="flex flex-col gap-10 w-full items-center pb-12">
                {renderGalaxyTabA9(screen1Content, "1. KDS STATION LOGIN", 1)}
                {renderGalaxyTabA9(screen2Content, "2. ALL SEATS & FEEDS (DISPATCH)", 2)}
                {renderGalaxyTabA9(screen3Content, "3. SEAT DETAIL & 86 INVENTORY", 3)}
              </div>
            ) : (
              <div className="w-full flex flex-col items-center">
                {activeScreenTab === 1 && renderGalaxyTabA9(screen1Content, "1. KDS STATION LOGIN", 1)}
                {activeScreenTab === 2 && renderGalaxyTabA9(screen2Content, "2. ALL SEATS & FEEDS (DISPATCH)", 2)}
                {activeScreenTab === 3 && renderGalaxyTabA9(screen3Content, "3. SEAT DETAIL & 86 INVENTORY", 3)}
              </div>
            )}
          </main>
        );
      })()}
    </div>
  );
}
