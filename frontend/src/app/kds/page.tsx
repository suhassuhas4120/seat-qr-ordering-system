'use client';

import { useState, useEffect } from 'react';
import { 
  ChefHat, 
  Clock, 
  Volume2, 
  VolumeX, 
  Layers, 
  Sparkles, 
  Check, 
  AlertTriangle,
  RefreshCw,
  Ban,
  ArrowRight,
  Square,
  CheckSquare,
  CheckCircle2
} from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { audioSynth } from '../../lib/audio';
import { realtimeBridge } from '../../lib/supabase';
import { toast } from 'sonner';
import type { Order, OrderItem, MenuItem } from '@seat-order/shared';
import { SOCKET_EVENTS } from '@seat-order/shared';

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [is86ModalOpen, setIs86ModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'KANBAN' | 'ITEMS' | 'BATCH'>('KANBAN');
  const [itemFilter, setItemFilter] = useState<'ALL' | 'QUEUED' | 'COOKING' | 'READY' | 'SERVED'>('ALL');

  // Load active tickets with hybrid backend + realtimeBridge resilience
  const loadTickets = async () => {
    try {
      let tickets: any[] = [];
      try {
        const res = await fetchApi<any[]>('/api/kds/tickets');
        if (Array.isArray(res)) tickets = res;
      } catch (e) {
        console.warn('Backend /api/kds/tickets fetch warning:', e);
      }

      // Merge with realtimeBridge active orders for complete hybrid resilience
      try {
        const bridgeOrders = await realtimeBridge.getActiveOrders();
        if (bridgeOrders && bridgeOrders.length > 0) {
          const existingTickets = new Set(tickets.map((t) => t.orderNumber || t.id));
          const existingIds = new Set(tickets.map((t) => t.id));

          bridgeOrders.forEach((bo) => {
            if (!existingTickets.has(bo.order.ticket_number) && !existingIds.has(bo.order.id)) {
              const rawChair = String(bo.order.chair_id || '01');
              const cleanSeat = Number(rawChair.replace(/[^0-9]/g, '')) || 1;
              tickets.push({
                id: bo.order.id,
                orderNumber: bo.order.ticket_number,
                seatId: cleanSeat,
                overallStage: bo.order.status === 'completed' ? 'SERVED' : 'PLACED',
                totalAmount: bo.order.total_amount || 0,
                placedAt: new Date().toISOString(),
                seat: {
                  id: cleanSeat,
                  seatNumber: `S${String(cleanSeat).padStart(3, '0')}`,
                  zone: 'COUNTER_A',
                  currentStatus: 'OCCUPIED',
                },
                items: (bo.items || []).map((it) => ({
                  id: it.id,
                  orderId: bo.order.id,
                  menuItemId: Number(it.dish_id?.replace(/[^0-9]/g, '')) || 1,
                  nameSnapshot: it.dish_name,
                  priceSnapshot: it.price,
                  quantity: it.quantity,
                  notes: it.notes || null,
                  itemStage: it.stage === 'SERVED' ? 'SERVED' : it.stage === 'READY' ? 'READY' : it.stage === 'PREP' ? 'COOKING' : 'QUEUED',
                })),
              });
            }
          });
        }
      } catch (bridgeErr) {
        console.warn('realtimeBridge ticket merge warning:', bridgeErr);
      }

      setOrders(tickets);
    } catch (err: any) {
      console.warn('Failed to load kitchen tickets:', err);
    }
  };

  useEffect(() => {
    loadTickets();
    fetchApi<{ items: MenuItem[] }>('/api/menu').then((res) => setMenuItems(res.items));

    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.JOIN_KDS);

    const unsubBridge = realtimeBridge.subscribeKDS({
      onNewOrder: () => {
        if (!isMuted) audioSynth.playKitchenChime();
        loadTickets();
      },
      onStageChange: () => {
        loadTickets();
      },
      onTicketDispatched: () => {
        loadTickets();
      },
    });

    // Incoming Order
    const handleOrderPlaced = (payload: any) => {
      if (!isMuted) audioSynth.playKitchenChime();
      toast.info(`🔔 New Ticket! Seat #${payload.seat.seatNumber} (${payload.order.orderNumber})`);
      loadTickets();
    };

    // Item bumped
    const handleItemStageUpdated = () => {
      loadTickets();
    };

    // Seat vacated / paid
    const handleSeatVacated = () => {
      loadTickets();
    };

    socket.on(SOCKET_EVENTS.ORDER_PLACED, handleOrderPlaced);
    socket.on(SOCKET_EVENTS.ITEM_STAGE_UPDATED, handleItemStageUpdated);
    socket.on(SOCKET_EVENTS.SEAT_VACATED, handleSeatVacated);

    return () => {
      unsubBridge();
      socket.off(SOCKET_EVENTS.ORDER_PLACED, handleOrderPlaced);
      socket.off(SOCKET_EVENTS.ITEM_STAGE_UPDATED, handleItemStageUpdated);
      socket.off(SOCKET_EVENTS.SEAT_VACATED, handleSeatVacated);
    };
  }, [isMuted]);

  // Set explicit stage for a single dish item
  const handleSetItemStage = async (itemId: string, newStage: string) => {
    try {
      await fetchApi(`/api/orders/items/${itemId}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ newStage, staffId: 3 }), // Gordon Ramsay
      });

      // Synchronize with realtime bridge so customer tracking, waiter mobile/tablet, and manager update instantly
      const parentOrder = orders.find((o) => (o.items || []).some((it: any) => it.id === itemId));
      const targetItem = parentOrder?.items?.find((it: any) => it.id === itemId);
      const stageMap: Record<string, 'PLACED' | 'REC' | 'PREP' | 'READY' | 'SERVED'> = {
        QUEUED: 'REC',
        COOKING: 'PREP',
        READY: 'READY',
        SERVED: 'SERVED',
      };
      if (parentOrder && targetItem) {
        const chairId = parentOrder.seat?.seatNumber
          ? String(parentOrder.seat.seatNumber).replace(/[^0-9]/g, '')
          : '';
        realtimeBridge.updateStage(itemId, stageMap[newStage] || 'PREP', {
          chairId,
          ticketNumber: parentOrder.orderNumber,
          dishId: targetItem.menuItemId ? `dish-${targetItem.menuItemId}` : undefined,
          dishName: targetItem.nameSnapshot,
          itemId,
        });
      }

      // Optimistically update local state for instantaneous feedback
      setOrders((prev) =>
        prev.map((ord) => ({
          ...ord,
          items: (ord.items || []).map((it: any) =>
            it.id === itemId ? { ...it, itemStage: newStage } : it
          ),
        }))
      );
      toast.success(`Dish stage set to ${newStage === 'COOKING' ? 'PREPARING' : newStage === 'QUEUED' ? 'RECEIVED' : newStage}`);
      loadTickets();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update item stage.');
    }
  };

  // Bump individual dish stage sequentially (Kitchen workflow: RECEIVED -> PREPARING -> READY)
  const handleBumpItem = async (itemId: string, currentStage: string) => {
    let nextStage: string = 'COOKING';
    if (currentStage === 'QUEUED') nextStage = 'COOKING';
    else if (currentStage === 'COOKING') nextStage = 'READY';
    else if (currentStage === 'READY') nextStage = 'READY';

    await handleSetItemStage(itemId, nextStage);
  };

  // Bump entire order for that specific column
  const handleBumpAll = async (order: any, nextStage: 'COOKING' | 'READY') => {
    for (const item of order.items) {
      await handleSetItemStage(item.id, nextStage);
    }
    loadTickets();
  };

  // Toggle 86 availability
  const toggle86 = async (item: MenuItem) => {
    try {
      await fetchApi(`/api/menu/items/${item.id}/availability`, {
        method: 'POST',
        body: JSON.stringify({ isAvailable: !item.isAvailable }),
      });
      setMenuItems((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, isAvailable: !m.isAvailable } : m))
      );
      toast.success(`${item.name} is now ${!item.isAvailable ? 'AVAILABLE' : 'SOLD OUT (86)'}`);
    } catch (err: any) {
      toast.error('Failed to toggle stock.');
    }
  };

  // Separate active tickets into 3 stage columns based on individual item stages
  const isItemActiveInKitchen = (it: any) => it.itemStage !== 'SERVED' && !it.addons?.includes('SERVED');

  const incomingOrders = orders
    .map((o) => ({
      ...o,
      items: (o.items || []).filter((it: any) => it.itemStage === 'QUEUED' && isItemActiveInKitchen(it)),
    }))
    .filter((o) => o.items.length > 0);

  const cookingOrders = orders
    .map((o) => ({
      ...o,
      items: (o.items || []).filter((it: any) => it.itemStage === 'COOKING' && isItemActiveInKitchen(it)),
    }))
    .filter((o) => o.items.length > 0);

  const readyOrders = orders
    .map((o) => ({
      ...o,
      items: (o.items || []).filter((it: any) => it.itemStage === 'READY' && isItemActiveInKitchen(it)),
    }))
    .filter((o) => o.items.length > 0);

  // Aggregated single dish items across all active tickets (excluding served items)
  const allDishes = orders.flatMap((o) =>
    (o.items || []).filter(isItemActiveInKitchen).map((item: any) => ({
      ...item,
      orderId: o.id,
      orderNumber: o.orderNumber,
      placedAt: o.placedAt,
      seatNumber: o.seat?.seatNumber,
      seatZone: o.seat?.zone,
    }))
  );

  const filteredDishes = itemFilter === 'ALL'
    ? allDishes
    : allDishes.filter((it: any) => it.itemStage === itemFilter);

  // Aggregated Batch Cooking Summary
  const batchCounts: Record<string, { name: string; count: number }> = {};
  for (const o of orders) {
    for (const i of o.items) {
      if (i.itemStage === 'QUEUED' || i.itemStage === 'COOKING') {
        if (!batchCounts[i.nameSnapshot]) {
          batchCounts[i.nameSnapshot] = { name: i.nameSnapshot, count: 0 };
        }
        batchCounts[i.nameSnapshot].count += i.quantity;
      }
    }
  }
  const batchList = Object.values(batchCounts);

  return (
    <div className="min-h-screen bg-black text-white p-4 flex flex-col select-none">
      {/* KDS Header */}
      <header className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <ChefHat className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl font-black tracking-wide text-white">KITCHEN DISPLAY SYSTEM</h1>
              <p className="text-xs text-slate-400 font-mono">Head Chef Gordon Ramsay • Station #1</p>
            </div>
          </div>

          {/* Active Tickets Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="font-bold text-amber-300">{orders.length} Active Tickets</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'KANBAN' ? 'bg-amber-500 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              Ticket Kanban
            </button>
            <button
              onClick={() => setViewMode('ITEMS')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'ITEMS' ? 'bg-amber-500 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Single Item Mode</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black ${
                viewMode === 'ITEMS' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300'
              }`}>
                {allDishes.reduce((acc, d: any) => acc + (d.quantity || 1), 0)} Items
              </span>
            </button>
            <button
              onClick={() => setViewMode('BATCH')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'BATCH' ? 'bg-amber-500 text-slate-950 shadow font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              Batch Prep ({batchList.length})
            </button>
          </div>

          {/* 86 Out-of-Stock Button */}
          <button
            onClick={() => setIs86ModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition-colors"
          >
            <Ban className="w-4 h-4" />
            <span>86 List</span>
          </button>

          {/* Audio Chime Mute */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            title={isMuted ? 'Unmute Chime' : 'Mute Chime'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>

          <button
            onClick={loadTickets}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* VIEW 1: 3-COLUMN KANBAN */}
      {viewMode === 'KANBAN' && (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 overflow-x-auto">
          {/* COLUMN 1: RECEIVED */}
          <div className="bg-slate-950/60 rounded-2xl border border-blue-500/30 p-3 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-blue-500/20">
              <span className="text-xs font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>1. Received ({incomingOrders.reduce((acc, o) => acc + o.items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0), 0)} Items)</span>
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 mt-3 pr-1">
              {incomingOrders.length === 0 ? (
                <p className="text-center text-xs text-slate-600 mt-8">No new tickets waiting</p>
              ) : (
                incomingOrders.map((order) => (
                  <TicketCard
                    key={order.id}
                    order={order}
                    borderColor="border-blue-500/40 hover:border-blue-500"
                    headerBg="bg-blue-500/10 text-blue-300"
                    columnStage="RECEIVED"
                    onBumpItem={handleBumpItem}
                    onSetItemStage={handleSetItemStage}
                    onBumpAll={() => handleBumpAll(order, 'COOKING')}
                  />
                ))
              )}
            </div>
          </div>

          {/* COLUMN 2: PREPARING */}
          <div className="bg-slate-950/60 rounded-2xl border border-amber-500/30 p-3 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <ChefHat className="w-4 h-4" />
                <span>2. Preparing ({cookingOrders.reduce((acc, o) => acc + o.items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0), 0)} Items)</span>
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 mt-3 pr-1">
              {cookingOrders.length === 0 ? (
                <p className="text-center text-xs text-slate-600 mt-8">No tickets currently cooking</p>
              ) : (
                cookingOrders.map((order) => (
                  <TicketCard
                    key={order.id}
                    order={order}
                    borderColor="border-amber-500/40 hover:border-amber-500"
                    headerBg="bg-amber-500/10 text-amber-300"
                    columnStage="PREPARING"
                    onBumpItem={handleBumpItem}
                    onSetItemStage={handleSetItemStage}
                    onBumpAll={() => handleBumpAll(order, 'READY')}
                  />
                ))
              )}
            </div>
          </div>

          {/* COLUMN 3: READY */}
          <div className="bg-slate-950/60 rounded-2xl border border-emerald-500/30 p-3 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>3. Ready ({readyOrders.reduce((acc, o) => acc + o.items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0), 0)} Items)</span>
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 mt-3 pr-1">
              {readyOrders.length === 0 ? (
                <p className="text-center text-xs text-slate-600 mt-8">Pickup window is clear</p>
              ) : (
                readyOrders.map((order) => (
                  <TicketCard
                    key={order.id}
                    order={order}
                    borderColor="border-emerald-500/40 hover:border-emerald-500"
                    headerBg="bg-emerald-500/10 text-emerald-300"
                    columnStage="READY"
                    onBumpItem={handleBumpItem}
                    onSetItemStage={handleSetItemStage}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SINGLE ITEM MODE SELECTION */}
      {viewMode === 'ITEMS' && (
        <div className="flex-1 mt-4 flex flex-col min-h-0 bg-slate-950/60 rounded-2xl border border-slate-800 p-4">
          {/* Subheader & Stage Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 shrink-0">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>Single Item Focus Mode</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Directly select and update status for each individual dish item across all tickets.
              </p>
            </div>

            {/* Filter Pills: Received, Preparing, Ready */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { key: 'ALL', label: 'ALL' },
                { key: 'QUEUED', label: 'RECEIVED' },
                { key: 'COOKING', label: 'PREPARING' },
                { key: 'READY', label: 'READY' },
              ].map((filter) => {
                const count = filter.key === 'ALL'
                  ? allDishes.reduce((acc, d: any) => acc + (d.quantity || 1), 0)
                  : allDishes.filter((d: any) => d.itemStage === filter.key).reduce((acc, d: any) => acc + (d.quantity || 1), 0);
                const isSelected = itemFilter === filter.key;
                return (
                  <button
                    key={filter.key}
                    onClick={() => setItemFilter(filter.key as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    {filter.label} ({count} Items)
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dishes Grid */}
          <div className="flex-1 overflow-y-auto mt-4 pr-1">
            {filteredDishes.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-sm">
                No individual dish items matching filter <span className="font-bold text-amber-400">{itemFilter}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {filteredDishes.map((dish) => (
                  <SingleDishCard
                    key={`${dish.orderId}-${dish.id}`}
                    dish={dish}
                    onSetStage={(stage) => handleSetItemStage(dish.id, stage)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: BATCH PREP SUMMARY */}
      {viewMode === 'BATCH' && (
        <div className="flex-1 mt-4 p-6 bg-slate-900/60 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-4">
            Aggregated Dish Counts Across All Active Orders
          </h3>

          {batchList.length === 0 ? (
            <p className="text-slate-500 text-sm">No items currently queued or cooking.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {batchList.map((batch) => (
                <div
                  key={batch.name}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                >
                  <span className="text-sm font-bold text-white">{batch.name}</span>
                  <span className="text-2xl font-black text-amber-400 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    {batch.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 86 List Stock Modal */}
      {is86ModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 rounded-3xl border border-slate-800 p-6 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-400" />
                <span>Kitchen 86 / Out of Stock Manager</span>
              </h3>
              <button onClick={() => setIs86ModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2 mb-4">
              Disabling an item here immediately updates all 100 customer menus in real-time.
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-sm font-bold text-white">{item.name}</h5>
                    <span className="text-xs text-slate-400">₹{item.price}</span>
                  </div>
                  <button
                    onClick={() => toggle86(item)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      item.isAvailable
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/40'
                        : 'bg-rose-500 text-white font-extrabold'
                    }`}
                  >
                    {item.isAvailable ? 'In Stock (Click to 86)' : 'SOLD OUT (Click to Restore)'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable KDS Ticket Card matching user sketch
function TicketCard({
  order,
  borderColor,
  headerBg,
  columnStage,
  onBumpItem,
  onSetItemStage,
  onBumpAll,
}: {
  order: any;
  borderColor: string;
  headerBg: string;
  columnStage: 'RECEIVED' | 'PREPARING' | 'READY';
  onBumpItem: (itemId: string, stage: string) => void;
  onSetItemStage: (itemId: string, stage: string) => void;
  onBumpAll?: () => void;
}) {
  const totalItems = order.items.reduce((acc: number, it: any) => acc + (it.quantity || 1), 0);

  return (
    <div className={`p-4 rounded-xl bg-slate-900 border ${borderColor} transition-all shadow-lg`}>
      {/* Ticket Header */}
      <div className={`p-2.5 rounded-lg ${headerBg} flex items-center justify-between mb-3`}>
        <div>
          <span className="text-sm font-black text-white">Seat #{order.seat?.seatNumber}</span>
          <span className="text-[10px] text-slate-400 ml-2">({order.seat?.zone || 'Dining Floor'})</span>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-bold text-white">{order.orderNumber}</span>
          <span className="text-[10px] block text-slate-400 font-mono">
            {new Date(order.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Individual Dish Items with Checkbox Buttons matching Sketch */}
      <div className="space-y-2 mb-3">
        {order.items.map((item: any) => (
          <div
            key={item.id}
            className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-white block truncate">
                <span className="text-amber-400 font-mono mr-1.5">{item.quantity}x</span>
                {item.nameSnapshot}
              </span>
              {item.notes && (
                <p className="text-[11px] text-amber-400 italic mt-0.5">★ {item.notes}</p>
              )}
            </div>

            {/* Checkbox button: 1-Click advances that single item to next column */}
            <div className="shrink-0">
              {columnStage === 'RECEIVED' && (
                <button
                  type="button"
                  onClick={() => onBumpItem(item.id, 'QUEUED')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border-2 border-blue-500/60 font-black text-xs transition-all active:scale-95 cursor-pointer shadow-sm group"
                  title="Check to start preparing"
                >
                  <Square className="w-4 h-4 stroke-[2.5] group-hover:hidden" />
                  <CheckSquare className="w-4 h-4 stroke-[2.5] hidden group-hover:block" />
                  <span className="text-[11px] uppercase tracking-wider font-extrabold">Prep ✓</span>
                </button>
              )}

              {columnStage === 'PREPARING' && (
                <button
                  type="button"
                  onClick={() => onBumpItem(item.id, 'COOKING')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border-2 border-amber-500/60 font-black text-xs transition-all active:scale-95 cursor-pointer shadow-sm group"
                  title="Check to mark ready"
                >
                  <Square className="w-4 h-4 stroke-[2.5] group-hover:hidden" />
                  <CheckSquare className="w-4 h-4 stroke-[2.5] hidden group-hover:block" />
                  <span className="text-[11px] uppercase tracking-wider font-extrabold">Ready ✓</span>
                </button>
              )}

              {columnStage === 'READY' && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-black uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ready</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Card Footer Master Bump Button (matches sketch: Mark all dishes are cooking) */}
      {columnStage === 'RECEIVED' && onBumpAll && (
        <button
          type="button"
          onClick={onBumpAll}
          className="w-full py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all bg-blue-600 hover:bg-blue-500 text-white shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
        >
          <span>Mark All Preparing ({totalItems} Items)</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}

      {columnStage === 'PREPARING' && onBumpAll && (
        <button
          type="button"
          onClick={onBumpAll}
          className="w-full py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
        >
          <span>Mark All Ready ({totalItems} Items)</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// Single Item Mode Card for Dedicated Dish Status Management
function SingleDishCard({
  dish,
  onSetStage,
}: {
  dish: any;
  onSetStage: (stage: string) => void;
}) {
  const stage = dish.itemStage;

  return (
    <div
      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 shadow-md ${
        stage === 'QUEUED'
          ? 'bg-blue-950/20 border-blue-500/40 hover:border-blue-500/70'
          : stage === 'COOKING'
          ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500/70'
          : stage === 'READY'
          ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-500/70'
          : 'bg-purple-950/20 border-purple-500/30'
      }`}
    >
      {/* Card Header: Seat & Order Info */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-black text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
            Seat #{dish.seatNumber || '—'}
          </span>
          <span className="text-[10px] text-slate-400">({dish.seatZone || 'Floor'})</span>
        </div>
        <div className="text-right font-mono text-[11px] text-slate-400">
          <span className="text-amber-400 font-bold">{dish.orderNumber}</span>
        </div>
      </div>

      {/* Dish Name & Quantity */}
      <div>
        <h4 className="text-base font-black text-white leading-tight">
          <span className="text-amber-400 font-mono mr-1.5">{dish.quantity}x</span>
          {dish.nameSnapshot}
        </h4>
        {dish.notes && (
          <p className="mt-1.5 text-xs text-amber-300 font-semibold bg-amber-500/10 border border-amber-500/30 rounded-md px-2 py-0.5">
            ★ {dish.notes}
          </p>
        )}
      </div>

      {/* Explicit 3-Stage Single Item Selector for Kitchen: RECEIVED, PREPARING, READY */}
      <div className="pt-2 border-t border-slate-800/80">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
          Select Item Status:
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { key: 'QUEUED', label: 'RECEIVED' },
            { key: 'COOKING', label: 'PREPARING' },
            { key: 'READY', label: 'READY' },
          ].map(({ key: s, label }) => {
            const isSelected = stage === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => onSetStage(s)}
                className={`py-1.5 px-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                  isSelected
                    ? s === 'QUEUED'
                      ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                      : s === 'COOKING'
                      ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-sm'
                      : 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-sm'
                    : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
