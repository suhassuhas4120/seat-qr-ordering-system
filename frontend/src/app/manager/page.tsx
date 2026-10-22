'use client';

import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  DollarSign, 
  Users, 
  TrendingUp, 
  ChefHat, 
  RefreshCw, 
  Receipt, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle,
  Ban,
  Lock,
  ArrowUpRight
} from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { toast } from 'sonner';
import { SOCKET_EVENTS } from '@seat-order/shared';

export default function ManagerDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [cashLedger, setCashLedger] = useState<any[]>([]);
  const [seats, setSeats] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'LEDGER' | 'SEATS'>('OVERVIEW');

  const refreshAll = async () => {
    try {
      const statsData = await fetchApi<any>('/api/manager/stats');
      setStats(statsData);

      const ledgerData = await fetchApi<any[]>('/api/manager/cash-ledger');
      setCashLedger(ledgerData);

      const seatMatrix = await fetchApi<any[]>('/api/seats/matrix');
      setSeats(seatMatrix);
    } catch (err) {
      // background
    }
  };

  useEffect(() => {
    refreshAll();

    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.JOIN_MANAGER);

    socket.on(SOCKET_EVENTS.SEAT_CLAIMED, refreshAll);
    socket.on(SOCKET_EVENTS.ORDER_PLACED, refreshAll);
    socket.on(SOCKET_EVENTS.ITEM_STAGE_UPDATED, refreshAll);
    socket.on(SOCKET_EVENTS.PAYMENT_SUCCESS, (payload: any) => {
      toast.success(`💳 Payment Settled: ₹${payload.amount} at Seat #${payload.seatNumber}`);
      refreshAll();
    });
    socket.on(SOCKET_EVENTS.SEAT_VACATED, refreshAll);

    return () => {
      socket.off(SOCKET_EVENTS.SEAT_CLAIMED, refreshAll);
      socket.off(SOCKET_EVENTS.ORDER_PLACED, refreshAll);
      socket.off(SOCKET_EVENTS.ITEM_STAGE_UPDATED, refreshAll);
      socket.off(SOCKET_EVENTS.SEAT_VACATED, refreshAll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col">
      {/* Header */}
      <header className="flex flex-col md:flex-row items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400">
            <LayoutDashboard className="w-7 h-7" />
          </span>
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide">MANAGER CONTROL TERMINAL</h1>
            <p className="text-xs text-slate-400">LUMIÈRE Dining • General Manager David Miller</p>
          </div>
        </div>

        <button
          onClick={refreshAll}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Sync Live Data</span>
        </button>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {/* Total Today's Revenue */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Revenue</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-black text-emerald-400">₹{stats?.totalRevenue || 0}</span>
            <span className="text-xs font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded">Live</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">{stats?.todayTransactionsCount || 0} paid settlements today</p>
        </div>

        {/* Live Seat Occupancy */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Floor Occupancy</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-black text-white">{stats?.occupiedSeats || 0} / 100</span>
            <span className="text-xs font-semibold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded">
              {stats?.occupancyPercentage || 0}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">100 individual seats across 5 zones</p>
        </div>

        {/* Active Kitchen Tickets */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Kitchen Tickets</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-black text-amber-400">{stats?.activeKitchenTicketsCount || 0}</span>
            <span className="text-xs font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded">KDS</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Dishes currently queued or cooking</p>
        </div>

        {/* Total Cash In Hand */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cash Collected on Floor</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-black text-sky-400">
              ₹{cashLedger.reduce((acc, c) => acc + c.total_cash_collected, 0)}
            </span>
            <span className="text-xs font-semibold text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded">Ledger</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Awaiting deposit into main drawer</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 mt-8 pb-3 border-b border-slate-800 text-xs font-bold">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'OVERVIEW' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
        >
          Recent Transactions
        </button>
        <button
          onClick={() => setActiveTab('LEDGER')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'LEDGER' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
        >
          Staff Cash Reconciliation Ledger ({cashLedger.length})
        </button>
        <button
          onClick={() => setActiveTab('SEATS')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'SEATS' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
          }`}
        >
          Floor Status Overview (100 Seats)
        </button>
      </div>

      {/* TAB 1: RECENT TRANSACTIONS */}
      {activeTab === 'OVERVIEW' && (
        <div className="mt-6 flex-1 bg-slate-900/60 rounded-3xl border border-slate-800 p-6 overflow-hidden flex flex-col">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
            Recent Payment Audit Log
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3">
            {(!stats?.recentPayments || stats.recentPayments.length === 0) ? (
              <p className="text-xs text-slate-500 py-8 text-center">No transactions recorded yet today.</p>
            ) : (
              stats.recentPayments.map((p: any) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold">
                      <Receipt className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-300 font-bold">{p.gatewayPaymentId}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-slate-400 border border-slate-800">
                          {p.gateway}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Seat #{p.seatId} • Settled by {p.settledByRole} • {new Date(p.completedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <span className="text-sm font-black text-emerald-400">₹{p.finalAmount}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: STAFF CASH RECONCILIATION LEDGER */}
      {activeTab === 'LEDGER' && (
        <div className="mt-6 flex-1 bg-slate-900/60 rounded-3xl border border-slate-800 p-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
            Waiter Handheld Cash Attribution Ledger
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            Every cash transaction collected by a waiter at a seat is attributed here to ensure drawer balance matches end-of-day cash.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cashLedger.map((staff) => (
              <div
                key={staff.staff_id}
                className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-base font-bold text-white">{staff.staff_name}</h4>
                  <span className="text-xs text-slate-400">{staff.cash_transactions_count} cash settlements recorded</span>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block uppercase">Cash In Hand</span>
                  <span className="text-2xl font-black text-sky-400">₹{staff.total_cash_collected}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: FLOOR STATUS OVERVIEW */}
      {activeTab === 'SEATS' && (
        <div className="mt-6 flex-1 bg-slate-900/60 rounded-3xl border border-slate-800 p-6 overflow-y-auto">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
            All 100 Seats Status Matrix
          </h3>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-2.5">
            {seats.map((s) => (
              <div
                key={s.id}
                className={`p-2.5 rounded-xl border text-center ${
                  s.currentStatus !== 'VACANT'
                    ? 'bg-rose-950/20 border-rose-500/40 text-rose-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}
              >
                <span className="text-xs block font-black">{s.seatNumber}</span>
                <span className="text-[9px] uppercase block mt-1">{s.currentStatus === 'VACANT' ? 'Free' : 'Occupied'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
