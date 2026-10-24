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
  CreditCard,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
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

interface TipPayoutRecord {
  id: string;
  captainName: string;
  amount: number;
  timestamp: string;
}

interface EnhancedStaffMember extends StaffRosterMember {
  digitalCollected: number;
  totalSales: number;
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
  const [tipPayouts, setTipPayouts] = useState<TipPayoutRecord[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('thoogudeepa_v2_tip_payouts');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
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
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('thoogudeepa_v2_tip_payouts');
        setTipPayouts(raw ? JSON.parse(raw) : []);
      } catch {}
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
      assignedSection: 'Takeaway (Seat 0 / Parcel)',
      zoneMin: 0,
      zoneMax: 0,
      isTakeaway: true,
    },
  ], []);

  // Compute live cash collected, digital sales, handovers, and active table counts per captain
  const staffList: EnhancedStaffMember[] = useMemo(() => {
    return STAFF_CONFIG.map((conf) => {
      // Find all bills matching this captain's zone
      const zoneBills = settledBills.filter((b) => {
        if (conf.isTakeaway) {
          return (
            b.tableName === 'Seat 0 (Parcel)' ||
            b.tableName === 'TK-01' ||
            (b.tableName || '').toLowerCase().includes('parcel') ||
            (b.tableName || '').toLowerCase().includes('takeaway') ||
            b.seatNumber === 0 ||
            (b.seatLabel || '').toLowerCase().includes('takeaway') ||
            (b.seatLabel || '').toLowerCase().includes('parcel')
          );
        }
        const sNum = Number(b.seatNumber) || 0;
        return sNum >= conf.zoneMin && sNum <= conf.zoneMax;
      });

      // Split into Cash vs Digital
      const cashBills = zoneBills.filter((b) => (b.method || '').toUpperCase() === 'CASH');
      const digitalBills = zoneBills.filter((b) => (b.method || '').toUpperCase() !== 'CASH');

      const cashCollected = cashBills.reduce(
        (sum, b) => sum + (Number(b.grandTotal) || 0),
        0
      );
      const digitalCollected = digitalBills.reduce(
        (sum, b) => sum + (Number(b.grandTotal) || 0),
        0
      );
      const totalSales = cashCollected + digitalCollected;

      // Find total cash handed over to safe by this staff member
      const staffHandovers = handovers.filter(
        (h) => h.staffId === conf.id || h.staffName === conf.name
      );
      const cashHandedOver = staffHandovers.reduce(
        (sum, h) => sum + (Number(h.amount) || 0),
        0
      );

      // Count distinct active tables currently placed/seated in this zone from liveOrders
      const activeTablesSet = new Set<string>();
      (liveOrders || []).forEach((lo) => {
        const chairRaw = (lo.order.chair_id || '').trim();
        const isTk =
          chairRaw === '0' ||
          chairRaw === '00' ||
          chairRaw === 'TK-00' ||
          chairRaw === 'TK-01' ||
          chairRaw.toLowerCase().includes('takeaway') ||
          chairRaw.toLowerCase().includes('parcel') ||
          (lo.order as any).seat_id === 0;

        if (conf.isTakeaway && isTk) {
          activeTablesSet.add('Seat 0 (Parcel)');
        } else if (!conf.isTakeaway && !isTk) {
          const chairNum = parseInt(chairRaw.replace(/[^0-9]/g, ''), 10) || 1;
          if (chairNum >= conf.zoneMin && chairNum <= conf.zoneMax) {
            const tableNum = Math.ceil(chairNum / 4);
            activeTablesSet.add(`T-${String(tableNum).padStart(2, '0')}`);
          }
        }
      });
      const activeTablesCount = activeTablesSet.size;

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
        digitalCollected,
        totalSales,
      };
    });
  }, [STAFF_CONFIG, settledBills, handovers, liveOrders]);

  // Aggregate statistics
  const totalCashCollected = staffList.reduce((sum, s) => sum + s.cashCollected, 0);
  const totalCashHandedOver = staffList.reduce((sum, s) => sum + s.cashHandedOver, 0);
  const totalDigitalCollected = staffList.reduce((sum, s) => sum + s.digitalCollected, 0);
  const totalSalesAll = staffList.reduce((sum, s) => sum + s.totalSales, 0);
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
    cashHandedOver: number,
    directAmount?: number
  ) => {
    const amountDue = Math.max(0, cashCollected - cashHandedOver);
    const amount = typeof directAmount === 'number' ? directAmount : Number(handoverAmounts[staffId] ?? '');

    if (!Number.isFinite(amount) || amount <= 0 || amount > amountDue) {
      toast.error(`Please enter an amount between ₹1 and ₹${amountDue.toLocaleString('en-IN')} for ${staffName}.`);
      return;
    }

    if (realtimeBridge.recordCashHandover) {
      realtimeBridge.recordCashHandover(staffId, staffName, amount);
    }
    setHandoverAmounts((cur) => ({ ...cur, [staffId]: '' }));
    reloadData();
    toast.success(`₹${amount.toLocaleString('en-IN')} received from ${staffName} into Manager Till Safe.`);
  };

  // Handle tip payout
  const handlePayTip = (captainName: string, amount: number) => {
    if (amount <= 0) return;
    if (realtimeBridge.recordTipPayout) {
      realtimeBridge.recordTipPayout(captainName, amount);
    }
    reloadData();
    toast.success(`₹${amount.toLocaleString('en-IN')} tip paid out to ${captainName}!`);
  };

  // Handle manual tip credit (e.g. cash tip handed to manager)
  const handleAddTip = (captainName: string, amount: number) => {
    if (amount <= 0) return;
    try {
      const tipsRaw = localStorage.getItem('thoogudeepa_v2_captain_tips');
      const tips = tipsRaw ? JSON.parse(tipsRaw) : {};
      tips[captainName] = (tips[captainName] || 0) + amount;
      localStorage.setItem('thoogudeepa_v2_captain_tips', JSON.stringify(tips));
      reloadData();
      toast.success(`+₹${amount.toLocaleString('en-IN')} tip credited to ${captainName}.`);
    } catch {
      toast.error('Failed to credit tip.');
    }
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
              Waiter Cash Handover &amp; Shift Tips
            </h1>
          </div>
        </div>

        {/* Global Cash Status Overview */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-xs font-bold text-slate-700 bg-[#FAF8F5] border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <Banknote className="h-4 w-4 text-slate-700" />
            <span>Cash Sales: <strong className="text-slate-900">₹{totalCashCollected.toLocaleString('en-IN')}</strong></span>
          </div>
          <div className="text-xs font-bold text-slate-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" />
            <span>In Safe: <strong className="text-emerald-700">₹{totalCashHandedOver.toLocaleString('en-IN')}</strong></span>
          </div>
          <div className="text-xs font-bold text-slate-700 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-600" />
            <span>Pending Due: <strong className="text-[#9C3D1E]">₹{totalCashDue.toLocaleString('en-IN')}</strong></span>
          </div>
          <div className="text-xs font-bold text-slate-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <Gift className="h-4 w-4 text-purple-600" />
            <span>Tips Pool: <strong className="text-purple-700">₹{totalTipsToday.toLocaleString('en-IN')}</strong></span>
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
              Total Shift Sales: ₹{totalSalesAll.toLocaleString('en-IN')}
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
                        {st.assignedSection} • {st.tablesCount} Active {st.role === 'Parcel Desk' ? 'Queue' : 'Tables'}
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

                  {/* 4-Item Breakdown Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border-t border-slate-200 pt-2 text-slate-600">
                    <div>
                      Cash Sales: <span className="font-black text-slate-900">₹{st.cashCollected.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      UPI/Card: <span className="font-bold text-slate-500">₹{st.digitalCollected.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      In Safe: <span className="font-black text-emerald-700">₹{st.cashHandedOver.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      Pending Due: <span className="font-black text-[#9C3D1E]">₹{amountDue.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Handover Action Controls */}
                  {amountDue > 0 && (
                    <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-slate-200/50">
                      <div className="flex items-center gap-1.5 flex-1">
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
                          className="px-3 py-1 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition cursor-pointer shrink-0"
                        >
                          Receive
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleHandoverSubmit(st.id, st.name, st.cashCollected, st.cashHandedOver, amountDue)
                        }
                        className="px-3 py-1 bg-[#9C3D1E] text-white rounded-lg text-xs font-bold hover:bg-orange-700 transition cursor-pointer shrink-0 whitespace-nowrap flex items-center justify-center gap-1"
                      >
                        <Check className="h-3 w-3" />
                        <span>Receive Full (₹{amountDue.toLocaleString('en-IN')})</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Recent Handover Audit Ledger */}
          <div className="border-t border-slate-200 pt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-600" />
                <span>Handover Safe Log</span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold">{handovers.length} receipts</span>
            </div>

            {handovers.length > 0 ? (
              <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                {handovers.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF8F5] border border-slate-200 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{h.staffName}</span>
                      <span className="text-[10px] text-slate-400">{h.timestamp} • Received into safe</span>
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
                Captain Tips Pool
              </h3>
            </div>
            <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Available: ₹{totalTipsToday.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="space-y-2.5">
            {staffTipsList.map((st) => (
              <div
                key={st.name}
                className="p-3 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">{st.name}</span>
                    <span className="text-[10px] text-slate-500">{st.section}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 font-bold block">Available Tip</span>
                    <span className="font-black font-mono text-emerald-700 text-sm">
                      ₹{st.tipAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/60">
                  <div className="flex items-center gap-1">
                    <span className="text-[9.5px] font-bold text-slate-400 mr-0.5">Add:</span>
                    {[50, 100, 200].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleAddTip(st.name, amt)}
                        className="px-1.5 py-0.5 rounded bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-200 text-[10px] font-bold transition cursor-pointer"
                      >
                        +₹{amt}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePayTip(st.name, st.tipAmount)}
                    disabled={st.tipAmount === 0}
                    className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-emerald-700 transition cursor-pointer shrink-0"
                  >
                    Pay Tip (₹{st.tipAmount})
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Tip Payouts Ledger */}
          <div className="border-t border-slate-200 pt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-600" />
                <span>Tip Payouts Log</span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold">{tipPayouts.length} payouts</span>
            </div>

            {tipPayouts.length > 0 ? (
              <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                {tipPayouts.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#FAF8F5] border border-slate-200 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{t.captainName}</span>
                      <span className="text-[10px] text-slate-400">{t.timestamp}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-emerald-700 text-xs">
                        -₹{Number(t.amount).toLocaleString('en-IN')}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        PAID OUT
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400 bg-[#FAF8F5] rounded-lg border border-dashed border-slate-200 text-xs">
                No tip payouts recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
