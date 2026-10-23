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
  ArrowRight
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

  // Load active tickets
  const loadTickets = async () => {
    try {
      const tickets = await fetchApi<any[]>('/api/kds/tickets');
      setOrders(tickets);
    } catch (err: any) {
      toast.error('Failed to load kitchen tickets.');
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
      // Optimistically update local state for instantaneous feedback
      setOrders((prev) =>
        prev.map((ord) => ({
          ...ord,
          items: (ord.items || []).map((it: any) =>
            it.id === itemId ? { ...it, itemStage: newStage } : it
          ),
        }))
      );
      toast.success(`Dish stage set to ${newStage}`);
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

  // Bump entire order
  const handleBumpAll = async (order: any) => {
    const unservedItems = order.items.filter((i: any) => i.itemStage !== 'READY' && i.itemStage !== 'SERVED');
    for (const item of unservedItems) {
      let next = 'COOKING';
      if (item.itemStage === 'QUEUED') next = 'COOKING';
      else if (item.itemStage === 'COOKING') next = 'READY';

      await fetchApi(`/api/orders/items/${item.id}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ newStage: next, staffId: 3 }),
      });
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
  const incomingOrders = orders
    .map((o) => ({
      ...o,
      items: (o.items || []).filter((it: any) => it.itemStage === 'QUEUED'),
    }))
    .filter((o) => o.items.length > 0);

  const cookingOrders = orders
    .map((o) => ({
      ...o,
      items: (o.items || []).filter((it: any) => it.itemStage === 'COOKING'),
    }))
    .filter((o) => o.items.length > 0);

  const readyOrders = orders
    .map((o) => ({
      ...o,
      items: (o.items || []).filter((it: any) => it.itemStage === 'READY'),
    }))
    .filter((o) => o.items.length > 0);

  // Aggregated single dish items across all active tickets
  const allDishes = orders.flatMap((o) =>
    (o.items || []).map((item: any) => ({
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
                    actionText="Start Preparing"
                    actionColor="bg-blue-600 hover:bg-blue-500 text-white font-bold"
                    onBumpItem={handleBumpItem}
                    onSetItemStage={handleSetItemStage}
                    onBumpAll={() => handleBumpAll(order)}
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
                    actionText="Mark Ready"
                    actionColor="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                    onBumpItem={handleBumpItem}
                    onSetItemStage={handleSetItemStage}
                    onBumpAll={() => handleBumpAll(order)}
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
                    actionText="Ready for Pickup"
                    actionColor="bg-emerald-500/80 text-slate-950 font-bold cursor-default"
                    onBumpItem={handleBumpItem}
                    onSetItemStage={handleSetItemStage}
                    onBumpAll={() => {}}
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

// Reusable KDS Ticket Card with granular single dish status selection & quick bump
function TicketCard({
  order,
  borderColor,
  headerBg,
  actionText,
  actionColor,
  onBumpItem,
  onSetItemStage,
  onBumpAll,
}: {
  order: any;
  borderColor: string;
  headerBg: string;
  actionText: string;
  actionColor: string;
  onBumpItem: (itemId: string, stage: string) => void;
  onSetItemStage: (itemId: string, stage: string) => void;
  onBumpAll: () => void;
}) {
  return (
    <div className={`p-4 rounded-xl bg-slate-900 border ${borderColor} transition-all shadow-lg`}>
      {/* Ticket Header */}
      <div className={`p-2 rounded-lg ${headerBg} flex items-center justify-between mb-3`}>
        <div>
          <span className="text-sm font-black text-white">Seat #{order.seat?.seatNumber}</span>
          <span className="text-[10px] text-slate-400 ml-2">({order.seat?.zone})</span>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-bold text-white">{order.orderNumber}</span>
          <span className="text-[10px] block text-slate-400">
            {new Date(order.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Individual Dish Items with Direct Status Selector */}
      <div className="space-y-2.5 mb-3">
        {order.items.map((item: any) => (
          <div
            key={item.id}
            className="p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-white group-hover:text-amber-300 block truncate">
                {item.quantity}x {item.nameSnapshot}
              </span>
              {item.notes && (
                <p className="text-[11px] text-amber-400 italic mt-0.5">★ {item.notes}</p>
              )}
            </div>

            {/* Granular Single-Item Status Controls */}
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
              {/* Direct Stage Dropdown */}
              <select
                value={item.itemStage}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  e.stopPropagation();
                  onSetItemStage(item.id, e.target.value);
                }}
                className={`text-[11px] font-black px-2 py-1 rounded border cursor-pointer outline-none uppercase transition-colors ${
                  item.itemStage === 'QUEUED'
                    ? 'bg-blue-950/90 text-blue-300 border-blue-500/60'
                    : item.itemStage === 'COOKING'
                    ? 'bg-amber-950/90 text-amber-300 border-amber-500/60'
                    : item.itemStage === 'READY'
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60'
                    : 'bg-purple-950/90 text-purple-300 border-purple-500/60'
                }`}
                title="Select dish status directly"
              >
                <option value="QUEUED" className="bg-slate-900 text-blue-300">RECEIVED</option>
                <option value="COOKING" className="bg-slate-900 text-amber-300">PREPARING</option>
                <option value="READY" className="bg-slate-900 text-emerald-300">READY</option>
              </select>

              {/* 1-Tap Quick Advance Action */}
              {item.itemStage !== 'READY' && item.itemStage !== 'SERVED' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBumpItem(item.id, item.itemStage);
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-bold border transition-all active:scale-95 ${
                    item.itemStage === 'QUEUED'
                      ? 'bg-blue-600/30 text-blue-200 border-blue-500/50 hover:bg-blue-600/60'
                      : 'bg-amber-500/30 text-amber-200 border-amber-400/50 hover:bg-amber-500/60'
                  }`}
                  title="Advance item stage"
                >
                  {item.itemStage === 'QUEUED' ? '▶ Prepare' : '✓ Mark Ready'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Master Bump Button */}
      <button
        onClick={onBumpAll}
        className={`w-full py-2 rounded-lg text-xs tracking-wider uppercase transition-all ${actionColor}`}
      >
        {actionText} ({order.items.reduce((acc: number, it: any) => acc + (it.quantity || 1), 0)} Items) →
      </button>
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
