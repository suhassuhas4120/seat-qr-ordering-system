'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Lock,
  Unlock,
  Receipt,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { realtimeBridge } from '@/lib/supabase';

export interface PettyExpenseItem {
  id: string;
  voucherNumber: string;
  description: string;
  category: 'Dairy & Fresh' | 'Kitchen Supplies' | 'Fuel/Gas' | 'Emergency Maintenance' | 'Miscellaneous';
  amount: number;
  paidTo: string;
  paidBy: string;
  time: string;
  date?: string;
}

interface ScreenM13PettyExpensesProps {
  openingFloat?: number;
}

export function ScreenM13PettyExpenses({ openingFloat }: ScreenM13PettyExpensesProps) {
  // Load persistent real petty vouchers from live store
  const [pettyExpenses, setPettyExpenses] = useState<PettyExpenseItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('thoogudeepa_v2_petty_expenses');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState<
    'Dairy & Fresh' | 'Kitchen Supplies' | 'Fuel/Gas' | 'Emergency Maintenance' | 'Miscellaneous'
  >('Dairy & Fresh');
  const [amount, setAmount] = useState('');
  const [paidTo, setPaidTo] = useState('');
  
  const [isCounterLocked, setIsCounterLocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('thoogudeepa_v2_counter_locked') === 'true';
    } catch {
      return false;
    }
  });

  const [showLockSuccess, setShowLockSuccess] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [shiftCashInflow, setShiftCashInflow] = useState<number>(0);

  // Calculate live shift cash collections from settled bills & waiter handovers
  const reloadShiftCash = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      let sum = 0;
      if (realtimeBridge.getCashHandovers) {
        const handovers = realtimeBridge.getCashHandovers();
        sum = handovers.reduce((acc: number, h: any) => acc + (h.amount || 0), 0);
      }
      if (realtimeBridge.getSettledBills) {
        const bills = realtimeBridge.getSettledBills();
        const cashFromBills = bills
          .filter((b: any) => (b.method || '').toUpperCase().includes('CASH'))
          .reduce((acc: number, b: any) => acc + (b.grandTotal || 0), 0);
        sum = Math.max(sum, cashFromBills);
      }
      setShiftCashInflow(sum);
    } catch {}
  }, []);

  // Live real-time clock, current date, and cash synchronization
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setCurrentDateStr(
        now.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      );
    };
    updateTime();
    reloadShiftCash();

    const interval = setInterval(updateTime, 1000);
    const unsub = realtimeBridge.subscribeKDS({
      onBillSettled: () => reloadShiftCash(),
      onCashHandover: () => reloadShiftCash(),
      onClearAll: () => reloadShiftCash(),
    });

    return () => {
      clearInterval(interval);
      if (typeof unsub === 'function') unsub();
    };
  }, [reloadShiftCash]);

  // Real shift calculations
  const morningCash = openingFloat && openingFloat > 0
    ? openingFloat
    : (typeof window !== 'undefined' ? Number(localStorage.getItem('thoogudeepa_opening_float')) || 50000 : 50000);
  const totalOutflow = pettyExpenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);
  const currentCashInTill = Math.max(0, morningCash - totalOutflow + shiftCashInflow);

  // Form submission handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim() || !amount) return;
    if (isCounterLocked) {
      alert('Cash counter is currently LOCKED! Please unlock the counter to record new vouchers.');
      return;
    }
    const numAmount = Number(amount) || 0;
    if (numAmount <= 0) return;

    const now = new Date();
    const newVoucher: PettyExpenseItem = {
      id: `pe-${Date.now()}`,
      voucherNumber: `V-${100 + pettyExpenses.length + 1}`,
      description: desc.trim(),
      category,
      amount: numAmount,
      paidTo: paidTo.trim() || 'Vendor',
      paidBy: 'Manjunath (Duty Lead)',
      time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      date: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    };

    const updated = [newVoucher, ...pettyExpenses];
    setPettyExpenses(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('thoogudeepa_v2_petty_expenses', JSON.stringify(updated));
      } catch {}
    }

    setDesc('');
    setAmount('');
    setPaidTo('');
  };

  // Counter Lock handler
  const handleToggleLockCounter = () => {
    if (!isCounterLocked) {
      setIsCounterLocked(true);
      setShowLockSuccess(true);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('thoogudeepa_v2_counter_locked', 'true');
        } catch {}
      }
      setTimeout(() => setShowLockSuccess(false), 3500);
    } else {
      setIsCounterLocked(false);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('thoogudeepa_v2_counter_locked', 'false');
        } catch {}
      }
    }
  };

  return (
    <div className="w-full mx-auto p-1 space-y-4 font-mono">
      {/* Top Title: Petty Expenses and cash counter */}
      <div className="pb-2 border-b border-[#EAE5DF] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Petty Expenses &amp; Cash Counter
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Vouchers, operational expenses &amp; cash drawer reconciliation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-black px-2.5 py-1 rounded-md flex items-center gap-1 ${
              isCounterLocked
                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}
          >
            {isCounterLocked ? <Lock className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
            <span>{isCounterLocked ? 'COUNTER LOCKED' : 'TILL OPEN & BALANCED'}</span>
          </span>
        </div>
      </div>

      {/* Main Content: 65% Left Column | 35% Right Column */}
      <div className="flex flex-col lg:flex-row gap-5 items-stretch">
        {/* =========================================================================
            LEFT COLUMN (65% width):
            1. Vouchers list (focused purely on disbursements)
            2. Record new Expense form
            ========================================================================= */}
        <div className="w-full lg:w-[65%] space-y-4 flex flex-col justify-between">
          {/* TOP BOX: Expenses Vouchers */}
          <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-xs flex-1 flex flex-col justify-between">
            <div>
              {/* Header with Title and Outflow numbers */}
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 gap-2">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  Expense Vouchers
                </h3>
                <div className="text-right text-xs">
                  <div className="font-bold text-slate-500">
                    Total Outflow :{' '}
                    <span className="font-black text-rose-700 text-sm">
                      - ₹ {totalOutflow.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="font-bold text-slate-500 mt-0.5">
                    Vouchers Recorded :{' '}
                    <span className="font-black text-slate-800 text-sm">
                      {pettyExpenses.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vouchers list */}
              <div className="space-y-2.5 mt-3 max-h-[300px] overflow-y-auto pr-1">
                {pettyExpenses.map((pe, idx) => (
                  <div
                    key={pe.id}
                    className="p-3 bg-[#FAF8F5] border border-slate-300 rounded-xl text-xs flex justify-between items-center hover:border-slate-400 transition"
                  >
                    <div className="space-y-1">
                      <div className="font-black text-slate-900 text-sm">
                        Exp {idx + 1} : {pe.description}
                      </div>
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-bold">
                        <span>
                          Category: <strong className="text-slate-800">{pe.category}</strong>
                        </span>
                        <span>
                          To: <strong className="text-slate-800">{pe.paidTo}</strong>
                        </span>
                        <span>
                          Paid by: <strong className="text-slate-800">{pe.paidBy}</strong>
                        </span>
                        <span className="text-slate-400">({pe.time})</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-3">
                      <div className="font-black text-base text-rose-700">
                        - ₹ {pe.amount.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                ))}

                {pettyExpenses.length === 0 && (
                  <div className="py-10 text-center text-slate-400 text-xs font-bold">
                    No petty expense vouchers recorded for this shift yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BOTTOM BOX: Record new Expense */}
          <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-black text-slate-900 pb-3 border-b border-slate-200 uppercase tracking-tight">
              Record new Expense
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3.5 mt-3 text-xs">
              {/* Expense Description */}
              <div>
                <label className="block font-black text-slate-700 mb-1 text-[11px] uppercase">
                  Expense Description
                </label>
                <input
                  type="text"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="e.g. Fresh curd & Nandini Milk, Banana leaves, Cylinder refill"
                  required
                  disabled={isCounterLocked}
                  className="w-full bg-[#FAF8F5] border border-slate-300 rounded-lg p-2.5 text-slate-800 font-medium focus:outline-none focus:border-slate-600 disabled:opacity-50"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block font-black text-slate-700 mb-1 text-[11px] uppercase">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e: any) => setCategory(e.target.value)}
                  disabled={isCounterLocked}
                  className="w-full bg-[#FAF8F5] border border-slate-300 rounded-lg p-2.5 text-slate-800 font-bold focus:outline-none focus:border-slate-600 disabled:opacity-50"
                >
                  <option value="Dairy & Fresh">Dairy &amp; Fresh</option>
                  <option value="Kitchen Supplies">Kitchen Supplies</option>
                  <option value="Fuel/Gas">Fuel/Gas</option>
                  <option value="Emergency Maintenance">Emergency Maintenance</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>

              {/* Two fields row: Amount ₹ | Paid to: vendor name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-black text-slate-700 mb-1 text-[11px] uppercase">
                    Amount ₹
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 540"
                    required
                    min="1"
                    disabled={isCounterLocked}
                    className="w-full bg-[#FAF8F5] border border-slate-300 rounded-lg p-2.5 text-slate-900 font-black focus:outline-none focus:border-slate-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block font-black text-slate-700 mb-1 text-[11px] uppercase">
                    Paid To: vendor name
                  </label>
                  <input
                    type="text"
                    value={paidTo}
                    onChange={(e) => setPaidTo(e.target.value)}
                    placeholder="e.g. Nandini Dairy, Gandhi Bazaar Mandi"
                    disabled={isCounterLocked}
                    className="w-full bg-[#FAF8F5] border border-slate-300 rounded-lg p-2.5 text-slate-800 font-medium focus:outline-none focus:border-slate-600 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Submit button: [ Pay Expense ] */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isCounterLocked}
                  className="bg-[#9C3D1E] text-white hover:bg-[#823318] transition px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  <Receipt className="h-3.5 w-3.5" />
                  <span>Pay Expense</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN (35% width):
            Cash counter status card (reconciled drawer balances)
            ========================================================================= */}
        <div className="w-full lg:w-[35%] bg-white border border-slate-300 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-5">
            {/* Header: cash counter status & Active badge with lock icon */}
            <div className="pb-3 border-b border-slate-200">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  cash counter status
                </h3>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    isCounterLocked
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  <span>{isCounterLocked ? 'Locked' : 'Active'}</span>
                  <Lock className="h-3 w-3" />
                </span>
              </div>

              {/* Manager name, Date, Time */}
              <div className="mt-2 text-xs font-bold text-slate-700 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">Manager name:</span>
                  <span className="font-black text-slate-900">
                    Manjunath (Duty Lead)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">Date:</span>
                  <span className="text-slate-800">{currentDateStr}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">Time:</span>
                  <span className="text-slate-800">{currentTimeStr}</span>
                </div>
              </div>
            </div>

            {/* Audit Figures */}
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-600 font-bold">Opening Cash Float :</span>
                <span className="font-black text-slate-900 text-sm">
                  ₹ {morningCash.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-600 font-bold">Petty Cash Outflows :</span>
                <span className="font-black text-rose-700 text-sm">
                  - ₹ {totalOutflow.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-600 font-bold">Shift Cash Collections :</span>
                <span className="font-black text-emerald-700 text-sm">
                  + ₹ {shiftCashInflow.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-[#FAF8F5] border border-slate-300 rounded-xl">
                <div>
                  <span className="text-slate-900 font-black block">Current Cash in Till :</span>
                  <span className="text-[10px] text-slate-500 font-medium">Opening float − Outflow + Collections</span>
                </div>
                <span className="font-black text-slate-900 text-lg">
                  ₹ {currentCashInTill.toLocaleString('en-IN')}
                </span>
              </div>

              {isCounterLocked ? (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-rose-800 font-bold">Night Vault Deposit :</span>
                    <span className="font-black text-rose-900 text-sm">₹ {currentCashInTill.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Physical Cash in Till After Drop :</span>
                    <span className="font-black text-slate-700">₹ 0</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center py-1 text-slate-500">
                  <span className="font-bold">Drawer Status :</span>
                  <span className="font-black text-emerald-700">Active &amp; Balanced</span>
                </div>
              )}
            </div>

            {/* Success toast upon locking */}
            {showLockSuccess && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 font-bold flex items-center gap-2 animate-in fade-in">
                <Check className="h-4 w-4 text-rose-700 shrink-0" />
                <span>Cash drawer closed, locked, and registered for night deposit!</span>
              </div>
            )}
          </div>

          {/* Action Button: Lock and close counter */}
          <div className="mt-6 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={handleToggleLockCounter}
              className={`w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                isCounterLocked
                  ? 'bg-slate-200 text-slate-800 hover:bg-slate-300 border border-slate-400'
                  : 'bg-slate-900 text-white hover:bg-slate-800 border border-slate-900'
              }`}
            >
              {isCounterLocked ? (
                <>
                  <Unlock className="h-4 w-4" />
                  <span>Unlock Counter (Re-Open Drawer)</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Lock and close counter</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
