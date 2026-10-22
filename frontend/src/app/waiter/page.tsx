'use client';

import { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Sparkles, 
  UtensilsCrossed, 
  Check, 
  Clock, 
  CreditCard, 
  AlertCircle, 
  Search, 
  LogOut, 
  Bell, 
  DollarSign, 
  Layers, 
  Plus, 
  X,
  Lock
} from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { audioSynth } from '../../lib/audio';
import { toast } from 'sonner';
import type { Seat, MenuItem, SeatTabSummary } from '@seat-order/shared';
import { SOCKET_EVENTS } from '@seat-order/shared';

export default function WaiterMobilePage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pinInput, setPinInput] = useState('');
  const [seats, setSeats] = useState<any[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [readyPickups, setReadyPickups] = useState<any[]>([]);

  // Seat Ordering / Tab Drawer
  const [activeSeat, setActiveSeat] = useState<any | null>(null);
  const [seatTab, setSeatTab] = useState<SeatTabSummary | null>(null);
  const [isAddingItems, setIsAddingItems] = useState(false);
  const [orderQty, setOrderQty] = useState<Record<number, number>>({});

  // 1. PIN Login
  const handleLogin = async (pin: string) => {
    try {
      const res = await fetchApi<any>('/api/staff/login', {
        method: 'POST',
        body: JSON.stringify({ pin }),
      });
      setCurrentUser(res.user);
      toast.success(`Welcome, ${res.user.name} (${res.user.role})!`);
    } catch (err: any) {
      toast.error(err.message || 'Invalid PIN. Try 1234.');
    }
  };

  // Load seats and menu
  const refreshFloor = async () => {
    try {
      const seatMatrix = await fetchApi<any[]>('/api/seats/matrix');
      setSeats(seatMatrix);

      const kdsOrders = await fetchApi<any[]>('/api/kds/tickets');
      const readyDishes: any[] = [];
      for (const o of kdsOrders) {
        for (const i of o.items) {
          if (i.itemStage === 'READY') {
            readyDishes.push({
              orderId: o.id,
              itemId: i.id,
              seatId: o.seatId,
              seatNumber: o.seat?.seatNumber,
              dishName: i.nameSnapshot,
              quantity: i.quantity,
              notes: i.notes,
            });
          }
        }
      }
      setReadyPickups(readyDishes);
    } catch (err) {
      // Background retry
    }
  };

  useEffect(() => {
    fetchApi<{ items: MenuItem[] }>('/api/menu').then((r) => setMenuItems(r.items));
    refreshFloor();

    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.JOIN_STAFF, { type: 'mobile' });

    // Item ready for pickup (chime & alert!)
    const handleItemStageUpdated = (payload: any) => {
      if (payload.newStage === 'READY') {
        audioSynth.playWaiterAlert();
        toast.success(`Food ready for pickup at Seat #${payload.seatId}!`);
      }
      refreshFloor();
    };

    // Seat claimed / placed / vacated
    socket.on(SOCKET_EVENTS.SEAT_CLAIMED, refreshFloor);
    socket.on(SOCKET_EVENTS.ORDER_PLACED, refreshFloor);
    socket.on(SOCKET_EVENTS.ITEM_STAGE_UPDATED, handleItemStageUpdated);
    socket.on(SOCKET_EVENTS.SEAT_VACATED, refreshFloor);

    // Customer called for water/assistance
    socket.on(SOCKET_EVENTS.WAITER_CALLED, (payload: any) => {
      audioSynth.playWaiterAlert();
      toast.warning(`🔔 Seat #${payload.seatNumber} requested ${payload.reason}!`);
    });

    return () => {
      socket.off(SOCKET_EVENTS.SEAT_CLAIMED, refreshFloor);
      socket.off(SOCKET_EVENTS.ORDER_PLACED, refreshFloor);
      socket.off(SOCKET_EVENTS.ITEM_STAGE_UPDATED, handleItemStageUpdated);
      socket.off(SOCKET_EVENTS.SEAT_VACATED, refreshFloor);
    };
  }, []);

  // Inspect seat tab
  const handleOpenSeatTab = async (seatItem: any) => {
    setActiveSeat(seatItem);
    try {
      const tab = await fetchApi<SeatTabSummary>(`/api/seats/${seatItem.id}/tab`);
      setSeatTab(tab);
    } catch (err) {
      toast.error('Failed to load seat tab.');
    }
  };

  // Mark dish delivered to seat
  const handleMarkServed = async (itemId: string) => {
    try {
      await fetchApi(`/api/orders/items/${itemId}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ newStage: 'SERVED', staffId: currentUser?.id }),
      });
      toast.success('Marked served!');
      refreshFloor();
      if (activeSeat) handleOpenSeatTab(activeSeat);
    } catch (err: any) {
      toast.error('Error marking dish served.');
    }
  };

  // Collaborative Table-Side Order Placement
  const handleAddItemsToSeat = async () => {
    if (!activeSeat) return;
    const selected = Object.entries(orderQty)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => ({
        menuItemId: Number(id),
        quantity: qty,
      }));

    if (selected.length === 0) {
      toast.error('Please select at least 1 item.');
      return;
    }

    try {
      await fetchApi('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          seatId: activeSeat.id,
          items: selected,
          createdByRole: 'WAITER_MOBILE',
          waiterId: currentUser?.id,
        }),
      });
      toast.success(`Added ${selected.length} items to Seat #${activeSeat.seatNumber}!`);
      setOrderQty({});
      setIsAddingItems(false);
      handleOpenSeatTab(activeSeat);
      refreshFloor();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add items.');
    }
  };

  // Collect Cash at Seat & Instant Auto-Unlock
  const handleCollectCash = async (seatId: number) => {
    if (!confirm('Confirm cash received from diner? This will settle the bill and auto-vacate the seat immediately.')) {
      return;
    }

    try {
      await fetchApi('/api/payments/process', {
        method: 'POST',
        body: JSON.stringify({
          seatId,
          gateway: 'CASH',
          settledByRole: 'WAITER',
          staffId: currentUser?.id,
        }),
      });
      audioSynth.playPaymentSuccess();
      toast.success(`Seat settled with cash and auto-unlocked for next diner!`);
      setActiveSeat(null);
      refreshFloor();
    } catch (err: any) {
      toast.error(err.message || 'Payment settlement failed.');
    }
  };

  // Staff PIN Login Shell
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white">Waiter Mobile Login</h2>
        <p className="text-slate-400 text-xs mt-1">Enter your 4-digit staff PIN to unlock handheld view</p>

        <div className="w-full mt-6 space-y-4">
          <input
            type="password"
            maxLength={4}
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="••••"
            className="w-full text-center text-3xl tracking-widest font-mono py-3 rounded-2xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
          />

          <button
            onClick={() => handleLogin(pinInput)}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-blue-500/20"
          >
            Unlock Handheld
          </button>

          <div className="pt-4 border-t border-slate-900 text-xs text-slate-500">
            Quick demo PIN: <strong className="text-blue-400">1234</strong> (Alex) or <strong className="text-blue-400">5678</strong> (Maya)
          </div>
        </div>
      </div>
    );
  }

  const filteredSeats = seats.filter((s) => selectedZone === 'ALL' || s.zone === selectedZone);

  return (
    <div className="min-h-screen bg-slate-950 text-white max-w-md mx-auto flex flex-col pb-12 shadow-2xl">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <Smartphone className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-sm font-bold text-white">WAITER MOBILE</h1>
            <p className="text-[11px] text-slate-400">
              {currentUser.name} • {currentUser.assignedZone || 'All Zones'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setCurrentUser(null)}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Floating Pickup Ready Banner (If any food is waiting at the kitchen pickup window) */}
      {readyPickups.length > 0 && (
        <div className="m-4 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-500/40 animate-pulse">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>{readyPickups.length} Food Ready for Pickup!</span>
            </span>
          </div>
          <div className="mt-2 space-y-1.5">
            {readyPickups.map((p) => (
              <div key={p.itemId} className="flex items-center justify-between text-xs bg-black/40 p-2 rounded-xl">
                <span>
                  <strong className="text-emerald-300">Seat #{p.seatNumber}:</strong> {p.quantity}x {p.dishName}
                </span>
                <button
                  onClick={() => handleMarkServed(p.itemId)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px]"
                >
                  Mark Delivered ✓
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zone Switcher */}
      <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
        {['ALL', 'COUNTER_A', 'COUNTER_B', 'BAR', 'WINDOW', 'CENTER'].map((z) => (
          <button
            key={z}
            onClick={() => setSelectedZone(z)}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
              selectedZone === z ? 'bg-blue-600 text-white font-bold' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            {z.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Seats Floor List (Pocket View) */}
      <div className="p-4 space-y-3 flex-1 overflow-y-auto">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          Floor Seats ({filteredSeats.length})
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {filteredSeats.map((s) => {
            const isOccupied = s.currentStatus !== 'VACANT';
            return (
              <div
                key={s.id}
                onClick={() => handleOpenSeatTab(s)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  isOccupied
                    ? 'bg-blue-950/20 border-blue-500/40 hover:border-blue-400 shadow-lg'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-black text-white">Seat #{s.seatNumber}</span>
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isOccupied ? 'bg-blue-400 animate-ping' : 'bg-emerald-500'
                    }`}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{s.zone.replace('_', ' ')}</p>

                <div className="mt-3 flex items-center justify-between text-xs font-semibold">
                  <span className={isOccupied ? 'text-blue-400 font-bold' : 'text-slate-500'}>
                    {s.currentStatus}
                  </span>
                  {s.activeOrderTotal ? (
                    <span className="text-emerald-400 font-bold">₹{s.activeOrderTotal}</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Seat Inspection Drawer Modal */}
      {activeSeat && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-md bg-slate-900 rounded-t-3xl border-t border-slate-800 p-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-blue-400 uppercase">Active Seat Tab</span>
                <h3 className="text-lg font-black text-white">Seat #{activeSeat.seatNumber} ({activeSeat.zone})</h3>
              </div>
              <button onClick={() => setActiveSeat(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If Adding Items */}
            {isAddingItems ? (
              <div className="flex-1 overflow-y-auto py-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase">Add Dishes to Seat Tab</h4>
                  <button
                    onClick={() => setIsAddingItems(false)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Back to Tab
                  </button>
                </div>

                <div className="space-y-2">
                  {menuItems.map((item) => {
                    const qty = orderQty[item.id] || 0;
                    return (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <h5 className="text-xs font-bold text-white">{item.name}</h5>
                          <span className="text-[11px] text-emerald-400">₹{item.price}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {qty > 0 && (
                            <button
                              onClick={() => setOrderQty((p) => ({ ...p, [item.id]: p[item.id] - 1 }))}
                              className="w-6 h-6 rounded bg-slate-800 text-slate-300 text-xs flex items-center justify-center"
                            >
                              -
                            </button>
                          )}
                          <span className="text-xs font-bold w-4 text-center">{qty}</span>
                          <button
                            onClick={() => setOrderQty((p) => ({ ...p, [item.id]: (p[item.id] || 0) + 1 }))}
                            className="w-6 h-6 rounded bg-blue-600 text-white text-xs flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleAddItemsToSeat}
                  className="w-full mt-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider"
                >
                  Send to Kitchen Tab
                </button>
              </div>
            ) : (
              /* Normal Tab View */
              <div className="flex-1 overflow-y-auto py-3 space-y-4">
                {/* Active Items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">Ordered Dishes</span>
                    <button
                      onClick={() => setIsAddingItems(true)}
                      className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-bold"
                    >
                      + Add Item
                    </button>
                  </div>

                  {(!seatTab || seatTab.allItems.length === 0) ? (
                    <p className="text-xs text-slate-500 py-4 text-center">No orders active on this seat yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {seatTab.allItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                        >
                          <div>
                            <span className="text-xs font-bold text-white">
                              {item.quantity}x {item.nameSnapshot}
                            </span>
                            <span className="text-[11px] text-slate-400 block">₹{item.priceSnapshot * item.quantity}</span>
                          </div>

                          {/* Stage Action */}
                          {item.itemStage === 'READY' ? (
                            <button
                              onClick={() => handleMarkServed(item.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold"
                            >
                              Deliver ✓
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                              {item.itemStage}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cash Settlement Button */}
                {seatTab && seatTab.total > 0 && (
                  <div className="pt-3 border-t border-slate-800">
                    <div className="flex justify-between text-sm font-bold text-white mb-3">
                      <span>Total Running Tab:</span>
                      <span className="text-emerald-400 text-base">₹{seatTab.total}</span>
                    </div>

                    <button
                      onClick={() => handleCollectCash(activeSeat.id)}
                      className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Collect Cash & Auto-Vacate Seat</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
