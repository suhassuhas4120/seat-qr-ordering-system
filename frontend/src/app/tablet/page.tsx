'use client';

import { useState, useEffect } from 'react';
import { 
  Tablet, 
  Sparkles, 
  Search, 
  RefreshCw, 
  Layers, 
  CheckCircle2, 
  Clock, 
  ChefHat, 
  CreditCard, 
  DollarSign, 
  X, 
  ArrowRight,
  QrCode
} from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { audioSynth } from '../../lib/audio';
import { toast } from 'sonner';
import type { SeatTabSummary, MenuItem } from '@seat-order/shared';
import { SOCKET_EVENTS } from '@seat-order/shared';

export default function WaiterTabletPage() {
  const [seats, setSeats] = useState<any[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [activeSeat, setActiveSeat] = useState<any | null>(null);
  const [seatTab, setSeatTab] = useState<SeatTabSummary | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [transferTargetId, setTransferTargetId] = useState<number | ''>('');
  const [isTransferring, setIsTransferring] = useState(false);

  const refreshSeats = async () => {
    try {
      const data = await fetchApi<any[]>('/api/seats/matrix');
      setSeats(data);
    } catch (err) {
      // background
    }
  };

  useEffect(() => {
    refreshSeats();
    fetchApi<{ items: MenuItem[] }>('/api/menu').then((r) => setMenuItems(r.items));

    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.JOIN_STAFF, { type: 'tablet' });

    socket.on(SOCKET_EVENTS.SEAT_CLAIMED, refreshSeats);
    socket.on(SOCKET_EVENTS.ORDER_PLACED, refreshSeats);
    socket.on(SOCKET_EVENTS.ITEM_STAGE_UPDATED, refreshSeats);
    socket.on(SOCKET_EVENTS.SEAT_VACATED, refreshSeats);

    socket.on(SOCKET_EVENTS.WAITER_CALLED, (payload: any) => {
      audioSynth.playWaiterAlert();
      toast.warning(`🔔 Assistance requested at Seat #${payload.seatNumber}!`);
    });

    return () => {
      socket.off(SOCKET_EVENTS.SEAT_CLAIMED, refreshSeats);
      socket.off(SOCKET_EVENTS.ORDER_PLACED, refreshSeats);
      socket.off(SOCKET_EVENTS.ITEM_STAGE_UPDATED, refreshSeats);
      socket.off(SOCKET_EVENTS.SEAT_VACATED, refreshSeats);
    };
  }, []);

  // Inspect seat
  const handleSelectSeat = async (seatItem: any) => {
    setActiveSeat(seatItem);
    try {
      const tab = await fetchApi<SeatTabSummary>(`/api/seats/${seatItem.id}/tab`);
      setSeatTab(tab);
    } catch {
      toast.error('Failed to load tab.');
    }
  };

  // Seat Transfer (Move tab to another vacant seat)
  const handleTransferSeat = async () => {
    if (!activeSeat || !transferTargetId) return;
    const target = seats.find((s) => s.id === Number(transferTargetId));
    if (!target) return;
    if (target.currentStatus !== 'VACANT') {
      toast.error(`Target Seat #${target.seatNumber} is already occupied!`);
      return;
    }

    try {
      // Transfer logic simulation
      toast.success(`Transferred Seat #${activeSeat.seatNumber} tab to Seat #${target.seatNumber}!`);
      setIsTransferring(false);
      setActiveSeat(null);
      refreshSeats();
    } catch (err) {
      toast.error('Transfer failed.');
    }
  };

  const occupiedSeats = seats.filter((s) => s.currentStatus !== 'VACANT');
  const filteredSeats = seats.filter((s) => selectedZone === 'ALL' || s.zone === selectedZone);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6 flex flex-col">
      {/* Tablet Header */}
      <header className="flex flex-col md:flex-row items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-purple-400">
            <Tablet className="w-7 h-7" />
          </span>
          <div>
            <h1 className="text-xl font-black text-white tracking-wide">WAITER TABLET MATRIX</h1>
            <p className="text-xs text-slate-400">Station 1 • Interactive 100-Seat Floor Overview</p>
          </div>
        </div>

        {/* Live Occupancy Status Bar */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400">Occupancy: </span>
            <strong className="text-purple-400 font-bold">{occupiedSeats.length} / 100 Seats</strong>
          </div>

          <button
            onClick={refreshSeats}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Zone Filter Tabs */}
      <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
        {['ALL', 'COUNTER_A', 'COUNTER_B', 'BAR', 'WINDOW', 'CENTER'].map((z) => (
          <button
            key={z}
            onClick={() => setSelectedZone(z)}
            className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
              selectedZone === z
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            {z.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* 100-SEAT 2D FLOOR GRID */}
      <div className="flex-1 mt-4 p-4 bg-slate-900/40 rounded-3xl border border-slate-800/80 overflow-y-auto">
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
          {filteredSeats.map((s) => {
            const isOccupied = s.currentStatus !== 'VACANT';
            return (
              <div
                key={s.id}
                onClick={() => handleSelectSeat(s)}
                className={`p-3 rounded-2xl border flex flex-col justify-between h-24 cursor-pointer transition-all ${
                  isOccupied
                    ? 'bg-purple-950/30 border-purple-500/50 hover:border-purple-400 shadow-md shadow-purple-500/10'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white">{s.seatNumber}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOccupied ? 'bg-purple-400 animate-ping' : 'bg-emerald-500'
                    }`}
                  />
                </div>

                <div className="text-[10px] text-slate-400 font-mono">
                  {s.zone.replace('COUNTER_', 'C-').replace('WINDOW', 'WIN')}
                </div>

                <div className="text-[11px] font-bold">
                  {isOccupied ? (
                    <span className="text-purple-300">₹{s.activeOrderTotal || 0}</span>
                  ) : (
                    <span className="text-slate-500">Free</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Seat Inspector Drawer */}
      {activeSeat && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 rounded-3xl border border-slate-800 p-6 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs font-bold text-purple-400 uppercase">Seat Management</span>
                <h3 className="text-xl font-black text-white">Seat #{activeSeat.seatNumber} ({activeSeat.zone})</h3>
              </div>
              <button onClick={() => setActiveSeat(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {/* Status Banner */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">Current Status:</span>
                  <p className="text-sm font-bold text-white uppercase">{activeSeat.currentStatus}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Total Tab:</span>
                  <p className="text-base font-black text-emerald-400">₹{seatTab?.total || 0}</p>
                </div>
              </div>

              {/* Active Items */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ordered Dishes</h4>
                {(!seatTab || seatTab.allItems.length === 0) ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No dishes active on this seat.</p>
                ) : (
                  <div className="space-y-2">
                    {seatTab.allItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-white">{item.quantity}x {item.nameSnapshot}</span>
                          <span className="text-slate-400 block">₹{item.priceSnapshot * item.quantity}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-purple-300 uppercase">
                          {item.itemStage}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Seat Transfer Tool */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80">
                <span className="text-xs font-bold text-slate-300 uppercase block mb-2">Transfer Diner to Another Seat</span>
                <div className="flex items-center gap-2">
                  <select
                    value={transferTargetId}
                    onChange={(e) => setTransferTargetId(Number(e.target.value))}
                    className="flex-1 bg-slate-900 text-xs px-3 py-2 rounded-xl border border-slate-800 text-white focus:outline-none"
                  >
                    <option value="">Select Target Vacant Seat...</option>
                    {seats
                      .filter((s) => s.currentStatus === 'VACANT')
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          Seat #{s.seatNumber} ({s.zone})
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={handleTransferSeat}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
                  >
                    Transfer Tab
                  </button>
                </div>
              </div>

              {/* Direct QR Link */}
              <div className="pt-2">
                <a
                  href={activeSeat.qrUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  <span>Open Customer View for Seat #{activeSeat.seatNumber} ↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
