"use client";
/**
 * Thoogudeepa Waiter Mobile Cockpit - Waiter Profile & Shift Dashboard Component
 *
 * Real-world enterprise Waiter Telemetry, Shift Summary & Report Printing:
 * - Balanced Modern Theme: Soft slate canvas (#F8FAFC), crisp white card (#FFFFFF),
 *   subtle borders (#E2E8F0), slate-900 typography, and vibrant accents
 * - Staff Profile Container:
 *   * Waiter avatar initials ('RK') with active green dot
 *   * Staff ID (#TH-104), Full Name ('Ramesh Kumar')
 *   * Section Assignment ('Seats 01 – 10 / Zone 1')
 * - Structured Shift Clock-In Timing with active duration ('4h 15m active')
 * - Direct 'Print Report' Thermal Bluetooth Printer Action Button
 * - 4-Card 2x2 Metric Grid:
 *   * Total Sales Handled: ₹14,850 (18 Bills Settled)
 *   * Tips Earned: ₹620 (Direct Cash + UPI)
 *   * KOTs Punched: 28 KOTs (Kitchen Sent)
 *   * Guests Served: 42 Guests (Zone 1 Turnover)
 * - Shift Audit Activity Log with timestamps and formatted amounts
 * - Compact, professional 'End Shift & Logout' action button (not oversized)
 * - Strict Line Count: Maintained strictly between 300 and 400 lines
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
  User, 
  Clock, 
  Printer, 
  BadgeIndianRupee, 
  Sparkles, 
  Send, 
  Users, 
  LogOut, 
  ShieldCheck, 
  CheckCircle2, 
  ChevronRight,
  TrendingUp,
  Award,
  Layers,
  History,
  ArrowLeft
} from 'lucide-react';
import { WaiterProfile, ShiftActivityLog } from './types';
import { realtimeBridge } from '@/lib/supabase';

export interface MobileProfileShiftProps {
  /** Active waiter profile metrics and credentials */
  readonly profile: WaiterProfile;
  /** Optional back navigation callback */
  readonly onBack?: () => void;
  /** Callback fired when waiter clocks out / ends shift */
  readonly onEndShift: () => void;
  /** Callback when thermal shift report is requested */
  readonly onPrintShiftReport?: () => void;
  /** Toast feedback callback */
  readonly onShowToast?: (message: string) => void;
}

export const MobileProfileShift: React.FC<MobileProfileShiftProps> = ({
  profile,
  onBack,
  onEndShift,
  onPrintShiftReport,
  onShowToast
}) => {
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState<boolean>(false);

  // Dynamic financial breakdown & recent operational activity logs from real settled bills
  const settledBills = typeof window !== 'undefined' && realtimeBridge.getSettledBills ? realtimeBridge.getSettledBills() : [];
  
  const cashTurnover = useMemo(() => {
    return settledBills
      .filter((b: any) => (b.method || '').toUpperCase().includes('CASH'))
      .reduce((sum: number, b: any) => sum + (b.grandTotal || 0), 0);
  }, [settledBills]);

  const recentActivities: ShiftActivityLog[] = useMemo(() => {
    if (settledBills.length === 0) {
      return [
        {
          id: 'act-0',
          title: 'Shift Active & Running',
          amountFormatted: 'Active',
          timestamp: 'Just now',
          badgeType: 'kot',
        },
      ];
    }
    return settledBills.slice(0, 5).map((b: any, idx: number) => ({
      id: `act-${b.id || idx}`,
      title: `Settled ${b.seatLabel || `Seat ${b.seatNumber}`} (${b.method || 'Cash'})`,
      amountFormatted: `+₹${b.grandTotal?.toLocaleString('en-IN') || 0}`,
      timestamp: b.formattedTime || 'Recent',
      badgeType: 'sale' as const,
    }));
  }, [settledBills]);

  // Print thermal shift report handler
  const handlePrintReport = useCallback(() => {
    setIsPrinting(true);
    setTimeout(() => {
      setIsPrinting(false);
      onPrintShiftReport?.();
      onShowToast?.('Shift report printed to POS thermal printer!');
    }, 600);
  }, [onPrintShiftReport, onShowToast]);

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col bg-slate-50 select-none overflow-hidden relative">
      
      {/* Top Profile Header with Hotel Name and Back Arrow */}
      <header className="p-3 bg-white border-b border-slate-200 flex items-center justify-between shadow-2xs shrink-0 select-none z-20">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center bg-white hover:bg-slate-100 active:scale-95 shrink-0 shadow-2xs text-slate-800 cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
          
          <div className="min-w-0 flex-1">
            <h1 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight truncate leading-tight">
              ತೂಗುದೀಪ ದೊನ್ನೆ ಬಿರಿಯಾನಿ
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[11px] font-bold text-slate-800 truncate">
                {profile.name}
              </span>
              <span className="text-slate-300 text-[10px]">•</span>
              <span className="text-[10px] font-semibold text-slate-500 truncate">
                {profile.assignedSeats}
              </span>
            </div>
          </div>
        </div>

        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-300 shrink-0">
          ● Shift Active
        </span>
      </header>

      {/* Main Profile & Stats Scroll View */}
      <div className="p-3.5 flex-1 overflow-y-auto no-scrollbar space-y-3 pb-24">
        
        {/* Waiter Identity & Shift Clock Card */}
        <div className="border border-slate-200 rounded-2xl p-3.5 bg-white shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            {/* Avatar Initials */}
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0 border border-amber-600/20">
              {profile.initials}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-black text-slate-900 truncate leading-tight">
                  {profile.name}
                </h3>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[7px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-200">
                  Captain
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                Staff ID: <span className="font-bold text-slate-800">{profile.staffId}</span>
              </p>
              <p className="text-[10px] text-slate-500 font-semibold truncate">
                Assigned Section: <span className="font-bold text-amber-700">{profile.assignedSeats}</span>
              </p>
            </div>
          </div>

          {/* Structured Shift Timing Badge & Print Report CTA */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold">
              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                Clocked In: {profile.clockInTime} 
                <span className="text-emerald-600 font-bold ml-1">({profile.activeDuration})</span>
              </span>
            </div>

            {/* Print Report Thermal Button */}
            <button
              type="button"
              onClick={handlePrintReport}
              disabled={isPrinting}
              className="h-7 px-2.5 border border-slate-300 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-50 active:scale-95 text-slate-800 flex items-center gap-1 btn-press shadow-2xs transition-all disabled:opacity-50"
            >
              <Printer className="w-3 h-3 text-slate-600" />
              <span>{isPrinting ? 'Printing...' : 'Print Report'}</span>
            </button>
          </div>
        </div>

        {/* 2x2 Clean Metric Cards Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          
          {/* Metric 1: Total Sales Handled */}
          <div className="border border-slate-200 rounded-2xl p-3 bg-white shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                Total Sales Handled
              </span>
              <BadgeIndianRupee className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <span className="text-base font-black block text-slate-900 leading-tight">
              ₹{profile.totalSales.toLocaleString('en-IN')}
            </span>
            <span className="text-[9px] text-slate-500 font-medium mt-0.5 block">
              {profile.billsSettledCount} Bills Settled
            </span>
          </div>

          {/* Metric 2: Tips Earned */}
          <div className="border border-slate-200 rounded-2xl p-3 bg-white shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                Tips Earned
              </span>
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-base font-black block text-emerald-600 leading-tight">
              ₹{profile.tipsEarned}
            </span>
            <span className="text-[9px] text-slate-500 font-medium mt-0.5 block">
              Cash + UPI Direct
            </span>
          </div>

          {/* Metric 3: KOTs Punched */}
          <div className="border border-slate-200 rounded-2xl p-3 bg-white shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                KOTs Punched
              </span>
              <Send className="w-3.5 h-3.5 text-sky-600" />
            </div>
            <span className="text-base font-black block text-sky-600 leading-tight">
              {profile.kotsPunched} KOTs
            </span>
            <span className="text-[9px] text-slate-500 font-medium mt-0.5 block">
              Kitchen Orders Fired
            </span>
          </div>

          {/* Metric 4: Guests Served */}
          <div className="border border-slate-200 rounded-2xl p-3 bg-white shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                Guests Served
              </span>
              <Users className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <span className="text-base font-black block text-indigo-600 leading-tight">
              {profile.guestsServed} Guests
            </span>
            <span className="text-[9px] text-slate-500 font-medium mt-0.5 block">
              Zone 1 Seat Turnover
            </span>
          </div>

        </div>

        {/* Shift Activity Audit Log Container */}
        <div className="border border-slate-200 rounded-2xl p-3.5 bg-white shadow-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                Recent Shift Activity Log
              </span>
            </div>
            <span className="text-[9px] font-bold text-slate-400">
              Live Feed
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {recentActivities.map(act => (
              <div 
                key={act.id}
                className="flex items-center justify-between pb-1.5 border-b border-slate-100 last:border-0 last:pb-0"
              >
                <div className="min-w-0 pr-2">
                  <span className="text-slate-800 font-bold truncate block">
                    {act.title}
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold">
                    {act.timestamp}
                  </span>
                </div>
                
                <span className={`text-[10px] font-black shrink-0 ${
                  act.badgeType === 'sale' ? 'text-emerald-600' : 'text-slate-600'
                }`}>
                  {act.amountFormatted}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* End Shift CTA Button (Clean, Not Oversized) */}
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={() => setShowConfirmLogout(true)}
            className="h-10 px-6 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-2 btn-press shadow-2xs transition-all"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>End Shift & Logout</span>
          </button>
        </div>

      </div>

      {/* Confirmation Modal for Ending Shift */}
      {showConfirmLogout && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[320px] bg-white rounded-2xl border border-slate-200 p-4 shadow-xl space-y-3 animate-in zoom-in-95 duration-150">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mb-2">
                <LogOut className="w-6 h-6 text-rose-600" />
              </div>
              <h4 className="text-xs font-black text-slate-900">
                End Shift & Handover Cash?
              </h4>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                {cashTurnover > 0
                  ? `Cash tender of ₹${cashTurnover.toLocaleString('en-IN')} will be deposited to Manager Safe.`
                  : 'Your shift report will be closed and session ended.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmLogout(false)}
                className="py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowConfirmLogout(false);
                  if (cashTurnover > 0 && realtimeBridge.recordCashHandover) {
                    realtimeBridge.recordCashHandover(profile.staffId || '#TH-104', profile.name || 'Waiter Lead', cashTurnover);
                  }
                  onEndShift();
                }}
                className="py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-2xs transition-colors"
              >
                Deposit & Clock Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MobileProfileShift;

