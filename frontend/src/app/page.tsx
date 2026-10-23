'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Smartphone, 
  UtensilsCrossed, 
  ChefHat, 
  Tablet, 
  LayoutDashboard, 
  QrCode, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Layers
} from 'lucide-react';
import { fetchApi } from '../lib/api';

export default function HomePage() {
  const [seats, setSeats] = useState<any[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<number>(14);
  const [selectedSeatUrl, setSelectedSeatUrl] = useState<string>('');
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    // Check backend connection
    fetchApi<any>('/api/seats/matrix')
      .then((data) => {
        setSeats(data);
        setBackendOnline(true);
        const s14 = data.find((s: any) => s.id === 14) || data[0];
        if (s14) setSelectedSeatUrl(s14.qrUrl);
      })
      .catch(() => setBackendOnline(false));
  }, []);

  const handleSeatChange = (seatId: number) => {
    setSelectedSeat(seatId);
    const found = seats.find((s) => s.id === seatId);
    if (found) setSelectedSeatUrl(found.qrUrl);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white p-4 md:p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between pb-8 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Sparkles className="w-6 h-6" />
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-200 bg-clip-text text-transparent">
              LUMIÈRE DINING
            </h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            100-Seat Collaborative Real-Time Restaurant Management Engine
          </p>
        </div>

        {/* Backend Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-medium">
          <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
          <span>{backendOnline ? 'Fastify Backend Online (Port 4000)' : 'Checking Backend...'}</span>
        </div>
      </div>

      {/* 5 Portals Grid */}
      <div className="max-w-6xl mx-auto mt-10">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          Select a Portal to Open
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Portal 1: Customer View */}
          <div className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 transition-all duration-300 shadow-xl flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                1. Customer Mobile PWA
              </h3>
              <p className="text-slate-400 text-sm mt-2">
                Simulates scanning the dynamic QR code at an individual seat. Zero customer data required, instant menu, item-level live tracker, and self-checkout.
              </p>

              {/* Quick Seat Selector */}
              <div className="mt-4 pt-4 border-t border-slate-800/60">
                <label className="text-xs font-semibold text-slate-400 uppercase">Test Seat Number:</label>
                <div className="flex items-center gap-2 mt-1.5">
                  <select
                    value={selectedSeat}
                    onChange={(e) => handleSeatChange(Number(e.target.value))}
                    className="bg-slate-800 text-slate-200 text-sm px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500 flex-1"
                  >
                    {seats.map((s) => (
                      <option key={s.id} value={s.id}>
                        Seat #{s.seatNumber} ({s.zone}) - {s.currentStatus}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <Link
              href={selectedSeatUrl || `/seat/${selectedSeat}`}
              className="mt-6 flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20"
            >
              <span>Open Customer Screen</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Portal 2: Kitchen Display System */}
          <div className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 transition-all duration-300 shadow-xl flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
                <ChefHat className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                2. Kitchen Display (KDS)
              </h3>
              <p className="text-slate-400 text-sm mt-2">
                Unified real-time kitchen screen. 3-column Kanban, granular dish-level bumping, consolidated batch cooking counts, and 1-tap 86 out-of-stock toggles.
              </p>
            </div>

            <Link
              href="/kds"
              className="mt-6 flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-all shadow-lg shadow-amber-500/20"
            >
              <span>Launch Kitchen KDS</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Portal 3: Waiter Mobile Handheld */}
          <div className="bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 transition-all duration-300 shadow-xl flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">
                3. Waiter Mobile View
              </h3>
              <p className="text-slate-400 text-sm mt-2">
                Pocket interface for floor servers. Fast PIN login, instant pickup alerts with haptic sound, table-side collaborative ordering, and mobile cash collection.
              </p>
            </div>

            <Link
              href="/waiter/mobile"
              className="mt-6 flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-semibold text-sm transition-all shadow-lg shadow-blue-500/20"
            >
              <span>Open Waiter Mobile</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Portal 4: Waiter Tablet Floor Matrix */}
          <div className="bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-6 transition-all duration-300 shadow-xl flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                <Tablet className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                4. Waiter Tablet Matrix
              </h3>
              <p className="text-slate-400 text-sm mt-2">
                Host & station tablet overview. Interactive 2D floor grid of all 100 seats across 5 zones, seat transfers, tab inspection, and section management.
              </p>
            </div>

            <Link
              href="/tablet"
              className="mt-6 flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-semibold text-sm transition-all shadow-lg shadow-purple-500/20"
            >
              <span>Open Tablet Matrix</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Portal 5: Master Manager Terminal */}
          <div className="bg-slate-900/90 border border-slate-800 hover:border-rose-500/50 rounded-2xl p-6 transition-all duration-300 shadow-xl flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4 group-hover:scale-110 transition-transform">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-rose-300 transition-colors">
                5. Manager Control Terminal
              </h3>
              <p className="text-slate-400 text-sm mt-2">
                Master command center. Real-time floor radar, live revenue analytics, waiter cash reconciliation ledger, menu management, and audit logs.
              </p>
            </div>

            <Link
              href="/manager"
              className="mt-6 flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-semibold text-sm transition-all shadow-lg shadow-rose-500/20"
            >
              <span>Open Manager Terminal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Multi-Window Pair Programming Tip */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Multi-Screen Testing Tip
              </h3>
              <p className="text-slate-400 text-xs mt-3 leading-relaxed">
                Open two side-by-side browser windows:
                <br /><strong className="text-emerald-300">Window 1:</strong> Customer Seat #14
                <br /><strong className="text-amber-300">Window 2:</strong> Kitchen KDS or Waiter Mobile
                <br />Add items or update dish stages in one window — watch the other window update instantly in under 50ms with zero refresh!
              </p>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 text-[11px] text-slate-400">
              Demo Staff PINs: Alex (<strong>1234</strong>), Maya (<strong>5678</strong>), Gordon (<strong>9999</strong>), David (<strong>0000</strong>)
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
