'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Banknote,
  Coins,
  Receipt,
  UserCheck,
  Check,
  Gift,
  Clock,
  ArrowDownToLine,
} from 'lucide-react';
import { realtimeBridge, OrderRecord, OrderItemRecord } from '@/lib/supabase';
import { StaffRosterMember } from './types';

interface ScreenM9WaiterCashProps {
  liveOrders?: { order: OrderRecord; items: OrderItemRecord[] }[];
}

interface HandoverReceipt {
  id: string;
  staffId: string;
  staffName: string;
  amount: number;
  timestamp: string;
  receivedBy: string;
}

export function ScreenM9WaiterCash({ liveOrders = [] }: ScreenM9WaiterCashProps) {
  const [settledBills, setSettledBills] = useState<any[]>(() => {
    return realtimeBridge.getSettledBills ? realtimeBridge.getSettledBills() : [];
  });
  const [handovers, setHandovers] = useState<HandoverReceipt[]>(() => {
    return realtimeBridge.getCashHandovers ? (realtimeBridge.getCashHandovers() as HandoverReceipt[]) : [];
  });
  const [captainTips, setCaptainTips] = useState<Record<string, number>>(() => {
    return realtimeBridge.getCaptainTips ? realtimeBridge.getCaptainTips() : {};
  });
  const [handoverAmounts, setHandoverAmounts] = useState<Record<string, string>>({});

  // Reload data from live persistent stores
  const reloadData = useCallback(() => {
    if (realtimeBridge.getSettledBills) {
      setSettledBills(realtimeBridge.getSettledBills());
    }
    if (realtimeBridge.getCashHandovers) {
      setHandovers(realtimeBridge.getCashHandovers() as HandoverReceipt[]);
    }
    if (realtimeBridge.getCaptainTips) {
      setCaptainTips(realtimeBridge.getCaptainTips());
    }
  }, []);

  // Listen for real-time bill settlement broadcasts
  useEffect(() => {
    reloadData();
    const unsub = realtimeBridge.subscribeKDS({
      onBillSettled: () => reloadData(),
      onCashHandover: () => reloadData(),
      onClearAll: () => reloadData(),
    });
    return () => unsub();
  }, [reloadData]);

  // Restaurant Floor Zone Captain Configuration
  const STAFF_CONFIG = useMemo(() => [
    {
      id: 'st-1',
      name: 'Captain Ramesh',
      role: 'Floor Captain',
      assignedSection: 'Zone 1 (Seats 01–25)',
      zoneMin: 1,
      zoneMax: 25,
      isTakeaway: false,
    },
    {
      id: 'st-2',
      name: 'Captain Suresh',
      role: 'Floor Captain',
      assignedSection: 'Zone 2 (Seats 26–50)',
      zoneMin: 26,
      zoneMax: 50,
      isTakeaway: false,
    },
    {
      id: 'st-3',
      name: 'Captain Anand',
      role: 'Floor Captain',
      assignedSection: 'Zone 3 (Seats 51–75)',
      zoneMin: 51,
      zoneMax: 75,
      isTakeaway: false,
    },
    {
      id: 'st-4',
      name: 'Captain Deepa',
      role: 'Floor Captain',
      assignedSection: 'Zone 4 (Seats 76–100)',
      zoneMin: 76,
      zoneMax: 100,
      isTakeaway: false,
    },
    {
      id: 'st-tk',
      name: 'Takeaway Counter',
      role: 'Parcel Desk',
      assignedSection: 'Takeaway (TK-01)',
      zoneMin: 0,
      zoneMax: 0,
      isTakeaway: true,
    },
  ], []);

  // Compute live cash collected, handovers, and active table counts per captain
  const staffList: StaffRosterMember[] = useMemo(() => {
    return STAFF_CONFIG.map((conf) => {
      // Find all cash-settled bills matching this captain's zone
      const cashBills = settledBills.filter((b) => {
        const isCash = (b.method || '').toUpperCase() === 'CASH';
        if (!isCash) return false;
        if (conf.isTakeaway) {
          return (
            b.tableName === 'TK-01' ||
            b.seatNumber === 0 ||
            (b.seatLabel || '').toLowerCase().includes('takeaway') ||
            (b.seatLabel || '').toLowerCase().includes('parcel')
          );
        }
        const sNum = Number(b.seatNumber) || 0;
        return sNum >= conf.zoneMin && sNum <= conf.zoneMax;
      });

      const cashCollected = cashBills.reduce(
        (sum, b) => sum + (Number(b.grandTotal) || 0),
        0
      );

      // Find total cash handed over to safe by this staff member
      const staffHandovers = handovers.filter(
        (h) => h.staffId === conf.id || h.staffName === conf.name
      );
      const cashHandedOver = staffHandovers.reduce(
        (sum, h) => sum + (Number(h.amount) || 0),
        0
      );

      // Count active tables currently placed/seated in this zone from liveOrders
      const activeTablesCount = (liveOrders || []).filter((lo) => {
        const chairRaw = (lo.order.chair_id || '').trim();
        const isTk =
          chairRaw === 'TK-01' ||
          chairRaw.toLowerCase().includes('takeaway') ||
          chairRaw.toLowerCase().includes('parcel');
        if (conf.isTakeaway) return isTk;
        if (isTk) return false;
        const chairNum = parseInt(chairRaw.replace(/[^0-9]/g, ''), 10) || 1;
        return chairNum >= conf.zoneMin && chairNum <= conf.zoneMax;
      }).length;

      return {
        id: conf.id,
        name: conf.name,
        role: conf.role,
        assignedSection: conf.assignedSection,
        tablesCount: activeTablesCount,
        status: 'ACTIVE',
        phone: '',
        cashCollected,
        cashHandedOver,
      };
    });
  }, [STAFF_CONFIG, settledBills, handovers, liveOrders]);

  // Aggregate statistics
  const totalCashCollected = staffList.reduce((sum, s) => sum + s.cashCollected, 0);
  const totalCashHandedOver = staffList.reduce((sum, s) => sum + s.cashHandedOver, 0);
  const totalCashDue = Math.max(0, totalCashCollected - totalCashHandedOver);

  // Tips per staff
  const staffTipsList = useMemo(() => {
    return STAFF_CONFIG.map((conf) => {
      const currentTip = captainTips[conf.name] || 0;
      return {
        name: conf.name,
        section: conf.assignedSection,
        tipAmount: currentTip,
      };
    });
  }, [STAFF_CONFIG, captainTips]);

  const totalTipsToday = staffTipsList.reduce((sum, val) => sum + val.tipAmount, 0);

  // Handle cash handover to Till Safe
  const handleHandoverSubmit = (
    staffId: string,
    staffName: string,
    cashCollected: number,
    cashHandedOver: number
  ) => {
    const amountDue = Math.max(0, cashCollected - cashHandedOver);
    const amount = Number(handoverAmounts[staffId] ?? '');

    if (!Number.isFinite(amount) || amount <= 0 || amount > amountDue) {
      alert(`Enter an amount between ₹1 and ₹${amountDue.toLocaleString('en-IN')} for ${staffName}.`);
      return;
    }

    if (realtimeBridge.recordCashHandover) {
      realtimeBridge.recordCashHandover(staffId, staffName, amount);
    }
    setHandoverAmounts((cur) => ({ ...cur, [staffId]: '' }));
    reloadData();
    alert(`₹${amount.toLocaleString('en-IN')} received from ${staffName} into Till Safe.`);
  };

  // Handle tip payout
  const handlePayTip = (captainName: string, amount: number) => {
    if (amount <= 0) return;
    if (realtimeBridge.recordTipPayout) {
      realtimeBridge.recordTipPayout(captainName, amount);
    }
    reloadData();
    alert(`₹${amount.toLocaleString('en-IN')} tip paid to ${captainName}!`);
  };

  return (
    <div className="w-full mx-auto p-1 space-y-4 font-mono">
      {/* Top Header Banner */}
      <div className="bg-white border border-[#EAE5DF] rounded-xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#9C3D1E] text-white shadow-sm">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <span className="font-mono text-[10px] font-black uppercase tracking-wider text-orange-800 bg-orange-100 rounded px-1.5 py-0.5">
              WAITER CASH &amp; TIPS
            </span>
            <h1 className="text-base sm:text-lg font-black font-mono text-slate-900 mt-1">
              Waiter Cash &amp; Tips
            </h1>
          </div>
        </div>

        {/* Global Cash Status Overview */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-xs font-bold text-slate-700 bg-[#FAF8F5] border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <Banknote className="h-4 w-4 text-emerald-600" />
            <span>Handed Over: <strong className="text-emerald-700">₹{totalCashHandedOver.toLocaleString('en-IN')}</strong></span>
          </div>
          <div className="text-xs font-bold text-slate-700 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-600" />
            <span>Due: <strong className="text-[#9C3D1E]">₹{totalCashDue.toLocaleString('en-IN')}</strong></span>
          </div>
        </div>
      </div>

      {/* 2-Column Split Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Waiter Cash Counter (~60% / lg:col-span-7) */}
        <div className="lg:col-span-7 bg-white border border-[#EAE5DF] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-[#9C3D1E]" />
              <h3 className="font-mono text-xs font-black uppercase text-slate-900">
                Captain Cash Handover
              </h3>
            </div>
            <span className="text-[10px] text-slate-500 font-bold">
              Total Collected: ₹{totalCashCollected.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Captain List Cards */}
          <div className="space-y-3">
            {staffList.map((st) => {
              const amountDue = Math.max(0, st.cashCollected - st.cashHandedOver);
              return (
                <div
                  key={st.id}
                  className="p-3.5 bg-[#FAF8F5] border border-slate-200 rounded-xl space-y-2.5 transition-all hover:border-slate-300"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-900">{st.name}</span>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-700">
                          {st.role}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        {st.assignedSection} • {st.tablesCount} Active Tables
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                        amountDue === 0
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                    >
                      {amountDue === 0 ? 'SETTLED' : `DUE: ₹${amountDue.toLocaleString('en-IN')}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs border-t border-slate-200 pt-2 text-slate-600">
                    <div>
                      Collected: <span className="font-black text-slate-900">₹{st.cashCollected.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      Handed Over: <span className="font-black text-emerald-700">₹{st.cashHandedOver.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      Due: <span className="font-black text-[#9C3D1E]">₹{amountDue.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {amountDue > 0 && (
                    <div className="flex gap-2 pt-1">
                      <input
                        type="number"
                        min="1"
                        max={amountDue}
                        placeholder={`Enter amount (up to ₹${amountDue})`}
                        value={handoverAmounts[st.id] || ''}
                        onChange={(e) =>
                          setHandoverAmounts({ ...handoverAmounts, [st.id]: e.target.value })
                        }
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-orange-400"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleHandoverSubmit(st.id, st.name, st.cashCollected, st.cashHandedOver)
                        }
                        className="px-3 py-1 bg-[#9C3D1E] text-white rounded-lg text-xs font-bold hover:bg-orange-700 transition cursor-pointer shrink-0"
                      >
                        Receive to Safe
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Recent Handover Audit Ledger */}
          <div className="border-t border-slate-200 pt-4 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-600" />
              <span>Handover Log</span>
            </div>

            {handovers.length > 0 ? (
              <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                {handovers.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#FAF8F5] border border-slate-200 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{h.staffName}</span>
                      <span className="text-[10px] text-slate-400">{h.timestamp}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-emerald-700 text-xs">
                        +₹{Number(h.amount).toLocaleString('en-IN')}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        IN SAFE
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400 bg-[#FAF8F5] rounded-lg border border-dashed border-slate-200 text-xs">
                No handovers recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Individual Captain Tips (~40% / lg:col-span-5) */}
        <div className="lg:col-span-5 bg-white border border-[#EAE5DF] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-[#9C3D1E]" />
              <h3 className="font-mono text-xs font-black uppercase text-slate-900">
                Captain Tips
              </h3>
            </div>
            <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Total Tips: ₹{totalTipsToday.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="space-y-2">
            {staffTipsList.map((st) => (
              <div
                key={st.name}
                className="flex items-center justify-between p-3 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 block">{st.name}</span>
                  <span className="text-[10px] text-slate-500">{st.section}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black font-mono text-slate-900 text-sm">
                    ₹{st.tipAmount.toLocaleString('en-IN')}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePayTip(st.name, st.tipAmount)}
                    disabled={st.tipAmount === 0}
                    className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold disabled:opacity-40 hover:bg-emerald-700 transition cursor-pointer"
                  >
                    Pay Tip
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
