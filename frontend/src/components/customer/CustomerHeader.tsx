'use client';

import React, { useState } from 'react';
import { BellRing, Droplets, Receipt, Sparkles, CheckCircle2 } from 'lucide-react';

interface CustomerHeaderProps {
  chairNumber: number;
  chairLabel: string;
  hasActiveOrders: boolean;
  onCallWaiter: () => void;
  onRequestWater: () => void;
  onOpenBill: () => void;
  billRequested: boolean;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({
  chairNumber,
  chairLabel,
  hasActiveOrders,
  onCallWaiter,
  onRequestWater,
  onOpenBill,
  billRequested,
}) => {
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [waterCalled, setWaterCalled] = useState(false);

  const handleWaiterClick = () => {
    setWaiterCalled(true);
    onCallWaiter();
    setTimeout(() => setWaiterCalled(false), 5000);
  };

  const handleWaterClick = () => {
    setWaterCalled(true);
    onRequestWater();
    setTimeout(() => setWaterCalled(false), 5000);
  };

  return (
    <header className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-amber-900/30 text-white px-4 py-3 shadow-xl">
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & Seat identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-black text-zinc-950 text-xl shadow-lg shadow-amber-900/40">
            T
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base tracking-wide text-amber-100">
                THOOGUDEEPA
              </h1>
              <span className="text-[10px] uppercase tracking-wider bg-amber-500/20 text-amber-300 font-semibold px-1.5 py-0.5 rounded border border-amber-500/30">
                V2
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {chairLabel || `Chair #${chairNumber}`}
              </span>
              <span className="text-[11px] text-zinc-400">Post-Payment Dining</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Water Button */}
          <button
            onClick={handleWaterClick}
            disabled={waterCalled}
            title="Request Water"
            className={`p-2 rounded-xl text-xs font-medium flex items-center gap-1 border transition-all ${
              waterCalled
                ? 'bg-blue-900/50 text-blue-200 border-blue-700/60'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            {waterCalled ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                <span className="hidden sm:inline">Sent</span>
              </>
            ) : (
              <>
                <Droplets className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">Water</span>
              </>
            )}
          </button>

          {/* Waiter Button */}
          <button
            onClick={handleWaiterClick}
            disabled={waiterCalled}
            title="Call Waiter"
            className={`p-2 rounded-xl text-xs font-medium flex items-center gap-1 border transition-all ${
              waiterCalled
                ? 'bg-amber-900/50 text-amber-200 border-amber-700/60'
                : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            {waiterCalled ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Server Notified</span>
              </>
            ) : (
              <>
                <BellRing className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Call Server</span>
              </>
            )}
          </button>

          {/* Bill Button */}
          <button
            onClick={onOpenBill}
            title="View Bill"
            className={`px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              billRequested
                ? 'bg-purple-900/50 text-purple-200 border-purple-600 animate-pulse'
                : hasActiveOrders
                ? 'bg-amber-600 hover:bg-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-900/30'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span className="hidden sm:inline">
              {billRequested ? 'Bill Requested' : 'Bill'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
