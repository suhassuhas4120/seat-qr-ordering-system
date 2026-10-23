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
  const [viewMode, setViewMode] = useState<'KANBAN' | 'BATCH'>('KANBAN');

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

  // Bump individual dish stage
  const handleBumpItem = async (itemId: string, currentStage: string) => {
    let nextStage: string = 'COOKING';
    if (currentStage === 'QUEUED') nextStage = 'COOKING';
    else if (currentStage === 'COOKING') nextStage = 'READY';
    else if (currentStage === 'READY') nextStage = 'SERVED';

    try {
      await fetchApi(`/api/orders/items/${itemId}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ newStage: nextStage, staffId: 3 }), // Gordon Ramsay
      });
      loadTickets();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update item stage.');
    }
  };

  // Bump entire order
  const handleBumpAll = async (order: any) => {
    const unservedItems = order.items.filter((i: any) => i.itemStage !== 'SERVED');
    for (const item of unservedItems) {
      let next = 'COOKING';
      if (item.itemStage === 'QUEUED') next = 'COOKING';
      else if (item.itemStage === 'COOKING') next = 'READY';
      else if (item.itemStage === 'READY') next = 'SERVED';

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

  // Separate orders into 3 columns
  const incomingOrders = orders.filter((o) => o.overallStage === 'PLACED');
  const cookingOrders = orders.filter((o) => o.overallStage === 'PREPARING');
  const readyOrders = orders.filter((o) => o.overallStage === 'READY');

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
                viewMode === 'KANBAN' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400'
              }`}
            >
              Ticket Kanban
            </button>
            <button
              onClick={() => setViewMode('BATCH')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'BATCH' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400'
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
          {/* COLUMN 1: INCOMING (PLACED) */}
          <div className="bg-slate-950/60 rounded-2xl border border-blue-500/30 p-3 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-blue-500/20">
              <span className="text-xs font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>1. Incoming / Placed ({incomingOrders.length})</span>
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
                    actionText="Start Cooking"
                    actionColor="bg-blue-600 hover:bg-blue-500 text-white"
                    onBumpItem={handleBumpItem}
                    onBumpAll={() => handleBumpAll(order)}
                  />
                ))
              )}
            </div>
          </div>

          {/* COLUMN 2: COOKING (IN PREP) */}
          <div className="bg-slate-950/60 rounded-2xl border border-amber-500/30 p-3 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <ChefHat className="w-4 h-4" />
                <span>2. Cooking in Kitchen ({cookingOrders.length})</span>
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
                    onBumpAll={() => handleBumpAll(order)}
                  />
                ))
              )}
            </div>
          </div>

          {/* COLUMN 3: READY FOR PICKUP */}
          <div className="bg-slate-950/60 rounded-2xl border border-emerald-500/30 p-3 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>3. Ready for Pickup ({readyOrders.length})</span>
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
                    actionText="Deliver / Served"
                    actionColor="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                    onBumpItem={handleBumpItem}
                    onBumpAll={() => handleBumpAll(order)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: BATCH PREP SUMMARY */}
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

// Reusable KDS Ticket Card with granular dish click-to-bump
function TicketCard({
  order,
  borderColor,
  headerBg,
  actionText,
  actionColor,
  onBumpItem,
  onBumpAll,
}: {
  order: any;
  borderColor: string;
  headerBg: string;
  actionText: string;
  actionColor: string;
  onBumpItem: (itemId: string, stage: string) => void;
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

      {/* Individual Dish Items (Clickable to advance dish stage!) */}
      <div className="space-y-2 mb-3">
        {order.items.map((item: any) => (
          <div
            key={item.id}
            onClick={() => onBumpItem(item.id, item.itemStage)}
            className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between transition-colors group"
          >
            <div>
              <span className="text-sm font-bold text-white group-hover:text-amber-300">
                {item.quantity}x {item.nameSnapshot}
              </span>
              {item.notes && (
                <p className="text-[11px] text-amber-400 italic">★ {item.notes}</p>
              )}
            </div>

            {/* Stage Badge on the Dish */}
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                item.itemStage === 'QUEUED'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : item.itemStage === 'COOKING'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : item.itemStage === 'READY'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-purple-500/20 text-purple-300'
              }`}
            >
              {item.itemStage}
            </span>
          </div>
        ))}
      </div>

      {/* Master Bump Button */}
      <button
        onClick={onBumpAll}
        className={`w-full py-2 rounded-lg text-xs tracking-wider uppercase transition-all ${actionColor}`}
      >
        {actionText} (All Dishes) →
      </button>
    </div>
  );
}
