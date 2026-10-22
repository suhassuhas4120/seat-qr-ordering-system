'use client';

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Users,
  Utensils,
  Clock,
  Printer,
  Trash2,
  Receipt,
  CheckCircle2,
  Store,
  Armchair,
  FileText,
  AlertCircle,
  RefreshCw,
  CreditCard,
  User,
} from 'lucide-react';
import { realtimeBridge, OrderRecord, OrderItemRecord, ServiceAlertRecord } from '@/lib/supabase';

interface ScreenM2Floor100Props {
  liveOrders: { order: OrderRecord; items: OrderItemRecord[] }[];
  alerts: ServiceAlertRecord[];
  onRefresh: () => void;
  onSelectTableForBilling?: (tableNumber: string) => void;
}

interface SeatOrderItem {
  id: string;
  name: string;
  quantity: number;
  prepTag: string; // '[D]' matching sketch
  price: number;
  stage: 'PLACED' | 'REC' | 'PREP' | 'READY' | 'SERVED';
}

export function ScreenM2Floor100({
  liveOrders,
  alerts,
  onRefresh,
  onSelectTableForBilling,
}: ScreenM2Floor100Props) {
  const [selectedSeatNum, setSelectedSeatNum] = useState<number>(1); // Default to Seat 01
  const [selectedZone, setSelectedZone] = useState<number | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VACANT' | 'OCCUPIED' | 'BILLING' | 'ALERT'>('ALL');
  const [printKotNotice, setPrintKotNotice] = useState<string | null>(null);
  const [vacatedSeats, setVacatedSeats] = useState<Set<string>>(new Set());
  const [shiftSales, setShiftSales] = useState<number>(() => {
    if (typeof window !== 'undefined' && realtimeBridge.getSettledBills) {
      const settled = realtimeBridge.getSettledBills();
      return settled.reduce((acc: number, b: any) => acc + (b.grandTotal || 0), 0);
    }
    return 0;
  });

  React.useEffect(() => {
    const updateStats = () => {
      if (realtimeBridge.getSettledBills) {
        const settled = realtimeBridge.getSettledBills();
        const sum = settled.reduce((acc: number, b: any) => acc + (b.grandTotal || 0), 0);
        setShiftSales(sum);
      }
    };
    updateStats();
    const unsub = realtimeBridge.subscribeKDS({
      onBillSettled: () => {
        updateStats();
        onRefresh();
      },
    });
    return () => unsub();
  }, [onRefresh]);

  // Generate 100 Individual Seats Data
  const seatGrid = useMemo(() => {
    const list = [];
    for (let i = 1; i <= 100; i++) {
      const chairId = i < 10 ? `0${i}` : `${i}`;
      const unpadded = String(i);

      if (vacatedSeats.has(chairId) || vacatedSeats.has(unpadded)) {
        list.push({
          seatNumber: i,
          chairId,
          status: 'vacant' as const,
          waiterName: i <= 25 ? 'Ramesh Kumar (Zone 1)' : i <= 50 ? 'Suresh M (Zone 2)' : i <= 75 ? 'Anand Kumar (Zone 3)' : 'Deepa Naik (Zone 4)',
          liveOrders: [],
          liveItems: [],
          alert: undefined,
          runningTotal: 0,
        });
        continue;
      }

      // Match live orders specifically for this seat
      const matchingLiveOrders = liveOrders.filter((o) => {
        const oChair = (o.order.chair_id || '').replace(/[^0-9]/g, '');
        return oChair === chairId || oChair === unpadded || Number(oChair) === i;
      });

      const allLiveItems: OrderItemRecord[] = [];
      matchingLiveOrders.forEach((o) => {
        if (o.items) allLiveItems.push(...o.items);
      });

      // Match alerts for this seat
      const activeAlert = alerts.find((a) => {
        const clean = a.seatNumber.replace(/[^0-9]/g, '');
        return clean === chairId || clean === unpadded || Number(clean) === i;
      });

      const activeBill = realtimeBridge.getActiveBillRequest(chairId) || realtimeBridge.getActiveBillRequest(unpadded);
      const isBilling = Boolean(activeBill) || activeAlert?.title?.toLowerCase().includes('bill');

      let status: 'vacant' | 'seated' | 'cooking' | 'ready_pass' | 'dining' | 'billing' | 'alert' = 'vacant';
      if (activeAlert) {
        status = 'alert';
      } else if (isBilling) {
        status = 'billing';
      } else if (allLiveItems.length > 0) {
        const hasReady = allLiveItems.some((it) => it.stage === 'READY');
        const hasPrep = allLiveItems.some((it) => it.stage === 'PREP' || it.stage === 'REC');
        const allServed = allLiveItems.every((it) => it.stage === 'SERVED');

        if (hasReady) status = 'ready_pass';
        else if (hasPrep) status = 'cooking';
        else if (allServed) status = 'dining';
        else status = 'seated';
      } else {
        status = 'vacant';
      }

      let waiterName = 'Ramesh Kumar (Zone 1)';
      if (i >= 26 && i <= 50) waiterName = 'Suresh M (Zone 2)';
      else if (i >= 51 && i <= 75) waiterName = 'Anand Kumar (Zone 3)';
      else if (i >= 76 && i <= 100) waiterName = 'Deepa Naik (Zone 4)';

      let total = 0;
      if (allLiveItems.length > 0) {
        const sub = allLiveItems.reduce((acc, it) => acc + (it.price || 0) * (it.quantity || 1), 0);
        total = sub + Math.round(sub * 0.05);
      } else if (matchingLiveOrders.length > 0) {
        total = matchingLiveOrders.reduce((acc, o) => acc + (o.order?.total_amount || 0), 0);
      } else if (activeBill && activeBill.amount) {
        total = activeBill.amount;
      }

      list.push({
        seatNumber: i,
        chairId,
        status,
        waiterName,
        liveOrders: matchingLiveOrders,
        liveItems: allLiveItems,
        alert: activeAlert,
        runningTotal: total,
      });
    }
    return list;
  }, [liveOrders, alerts, vacatedSeats]);

  // Selected Seat Data
  const activeSelectedSeat = useMemo(() => {
    return seatGrid.find((s) => s.seatNumber === selectedSeatNum) || seatGrid[0];
  }, [selectedSeatNum, seatGrid]);

  // Unified items list strictly for this particular seat
  const particularSeatOrders: SeatOrderItem[] = useMemo(() => {
    if (!activeSelectedSeat || !activeSelectedSeat.liveItems || activeSelectedSeat.liveItems.length === 0) {
      return [];
    }

    return activeSelectedSeat.liveItems.map((it, idx) => ({
      id: it.id || `live-${idx}`,
      name: it.dish_name,
      quantity: it.quantity,
      prepTag: '[D]',
      price: it.price,
      stage: it.stage || 'PLACED',
    }));
  }, [activeSelectedSeat]);

  // Calculate bill total strictly for this seat
  const calculatedBill = useMemo(() => {
    if (particularSeatOrders.length > 0) {
      const sum = particularSeatOrders.reduce((acc, it) => acc + it.price * it.quantity, 0);
      return sum + Math.round(sum * 0.05);
    }
    return activeSelectedSeat?.runningTotal || 0;
  }, [particularSeatOrders, activeSelectedSeat]);

  // Top KPIs
  const totalOccupiedSeats = useMemo(() => {
    return seatGrid.filter((s) => s.status !== 'vacant').length;
  }, [seatGrid]);
  const guestsSeatedCount = totalOccupiedSeats; // Current active seats occupied
  const occupancyPercentage = Math.round((totalOccupiedSeats / 100) * 100);

  // Active kitchen items count: total items placed order in kitchen
  const activeKitchenItemsCount = useMemo(() => {
    let count = 0;
    liveOrders.forEach((o) => {
      if (o.items && o.items.length > 0) {
        o.items.forEach((it) => {
          if (it.stage !== 'SERVED') {
            count += it.quantity || 1;
          }
        });
      }
    });
    return count;
  }, [liveOrders]);

  // Actions for this seat
  const handleVacateSeat = async () => {
    if (!activeSelectedSeat) return;
    if (confirm(`Confirm vacate Seat #${activeSelectedSeat.chairId}?`)) {
      await realtimeBridge.releaseSeat(activeSelectedSeat.chairId);
      setVacatedSeats((prev) => {
        const next = new Set(prev);
        next.add(activeSelectedSeat.chairId);
        next.add(String(activeSelectedSeat.seatNumber));
        return next;
      });
      onRefresh();
    }
  };

  const handlePrintKOT = () => {
    if (!activeSelectedSeat) return;
    if (particularSeatOrders.length === 0) {
      setPrintKotNotice(`No active orders to print KOT for Seat #${activeSelectedSeat.chairId}`);
      setTimeout(() => setPrintKotNotice(null), 3000);
      return;
    }
    setPrintKotNotice(`Thermal KOT dispatched for Seat #${activeSelectedSeat.chairId}`);
    setTimeout(() => setPrintKotNotice(null), 3000);
  };

  const handlePosBill = () => {
    if (!activeSelectedSeat) return;
    if (onSelectTableForBilling) {
      onSelectTableForBilling(`Seat-${activeSelectedSeat.chairId}`);
    }
  };

  return (
    <div className="w-full mx-auto p-1 space-y-3 font-mono">
      {/* ────────────────────────────────────────────────────────────
          TOP 4 KPI METRICS STRIP
          Total sales -> | Guests seated | Active kitchen kot | Table occupancy
         ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Box 1: Total sales -> */}
        <div className="bg-white border-2 border-slate-300 rounded-xl p-3 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-black text-slate-600">
            <span>Total sales &rarr;</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl md:text-2xl font-black text-slate-900 mt-1">
            ₹ {shiftSales.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-emerald-700 font-bold mt-1">
            ● Real-Time Day Collections
          </p>
        </div>

        {/* Box 2: Guests seated */}
        <div className="bg-white border-2 border-slate-300 rounded-xl p-3 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-black text-slate-600">
            <span>Guests seated</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-xl md:text-2xl font-black text-slate-900 mt-1">
            {guestsSeatedCount} <span className="text-xs text-slate-500 font-bold">Guests</span>
          </div>
          <p className="text-[10px] text-slate-500 font-bold mt-1">
            Dining in Hall right now
          </p>
        </div>

        {/* Box 3: Active kitchen kot */}
        <div className="bg-white border-2 border-slate-300 rounded-xl p-3 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-black text-slate-600">
            <span>Active kitchen kot</span>
            <Utensils className="h-4 w-4 text-orange-600" />
          </div>
          <div className="text-xl md:text-2xl font-black text-orange-800 mt-1">
            {activeKitchenItemsCount} <span className="text-xs text-slate-500 font-bold">Items</span>
          </div>
          <p className="text-[10px] text-amber-700 font-bold mt-1">
            Dishes placed in kitchen
          </p>
        </div>

        {/* Box 4: Table occupancy */}
        <div className="bg-white border-2 border-slate-300 rounded-xl p-3 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-black text-slate-600">
            <span>Table occupancy</span>
            <Clock className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-xl md:text-2xl font-black text-purple-900 mt-1">
            {totalOccupiedSeats} / 100 <span className="text-xs text-slate-500 font-bold">Seats</span>
          </div>
          <p className="text-[10px] text-purple-700 font-bold mt-1">
            {occupancyPercentage}% floor capacity active
          </p>
        </div>
      </div>

      {printKotNotice && (
        <div className="p-2.5 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{printKotNotice}</span>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          2-COLUMN SPLIT MASTER LAYOUT
          LEFT: Restaurant Seats live status matrix (~60%)
          RIGHT: Particular Seat Orders (No Chairs, Only That Particular Seat) (~40%)
         ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* ══════════════════════════════════════════════════════════
            LEFT SIDE: Restaurant Seats live status matrix (lg:col-span-7)
           ══════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 bg-white border-2 border-slate-300 rounded-xl p-3.5 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
            <div>
              <h2 className="text-xs sm:text-sm font-black font-mono text-slate-900 uppercase">
                RESTAURANT SEATS LIVE STATUS MATRIX
              </h2>
              <p className="text-[10px] text-slate-400">
                Click any seat to inspect orders on the right
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onRefresh}
                className="p-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Zones & Filters Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: 'ALL', label: 'All 100' },
                { id: 1, label: 'Z1 (01-25)' },
                { id: 2, label: 'Z2 (26-50)' },
                { id: 3, label: 'Z3 (51-75)' },
                { id: 4, label: 'Z4 (76-100)' },
              ].map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setSelectedZone(z.id as any)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                    selectedZone === z.id
                      ? 'bg-[#9C3D1E] text-white shadow-xs'
                      : 'bg-[#FAF8F5] border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {z.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'OCCUPIED', label: 'Seated' },
                { id: 'BILLING', label: 'Billing' },
                { id: 'VACANT', label: 'Vacant' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id as any)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                    statusFilter === f.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-300 text-slate-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* 100 Seats Matrix Tiles */}
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-[540px] overflow-y-auto no-scrollbar p-1">
            {seatGrid
              .filter((s) => {
                if (selectedZone !== 'ALL') {
                  if (selectedZone === 1 && (s.seatNumber < 1 || s.seatNumber > 25)) return false;
                  if (selectedZone === 2 && (s.seatNumber < 26 || s.seatNumber > 50)) return false;
                  if (selectedZone === 3 && (s.seatNumber < 51 || s.seatNumber > 75)) return false;
                  if (selectedZone === 4 && (s.seatNumber < 76 || s.seatNumber > 100)) return false;
                }
                if (statusFilter === 'VACANT' && s.status !== 'vacant') return false;
                if (statusFilter === 'OCCUPIED' && (s.status === 'vacant' || s.status === 'billing')) return false;
                if (statusFilter === 'BILLING' && s.status !== 'billing') return false;
                if (statusFilter === 'ALERT' && s.status !== 'alert') return false;
                return true;
              })
              .map((seat) => {
                const isSelected = selectedSeatNum === seat.seatNumber;
                let bgCls = 'bg-white';
                let borderCls = 'border-slate-300';
                let statusLabel = 'VACANT';

                if (seat.status === 'alert') {
                  bgCls = 'bg-rose-50';
                  borderCls = 'border-rose-400 ring-2 ring-rose-400 animate-pulse';
                  statusLabel = 'CALL';
                } else if (seat.status === 'billing') {
                  bgCls = 'bg-amber-50';
                  borderCls = 'border-amber-500 ring-1 ring-amber-400';
                  statusLabel = 'BILL';
                } else if (seat.status === 'ready_pass') {
                  bgCls = 'bg-emerald-50';
                  borderCls = 'border-emerald-500';
                  statusLabel = 'READY';
                } else if (seat.status === 'cooking') {
                  bgCls = 'bg-blue-50';
                  borderCls = 'border-blue-400';
                  statusLabel = 'PREP';
                } else if (seat.status === 'dining' || seat.status === 'seated') {
                  bgCls = 'bg-purple-50';
                  borderCls = 'border-purple-300';
                  statusLabel = 'SEATED';
                }

                if (isSelected) {
                  borderCls = 'border-[#9C3D1E] ring-3 ring-[#9C3D1E]/40 scale-105 z-10';
                  bgCls = 'bg-orange-50/80';
                }

                return (
                  <div
                    key={seat.seatNumber}
                    onClick={() => {
                      setSelectedSeatNum(seat.seatNumber);
                    }}
                    className={`${bgCls} ${borderCls} border-2 rounded-xl p-2 h-20 flex flex-col justify-between hover:shadow-md transition cursor-pointer select-none`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-900">#{seat.chairId}</span>
                      <span className="text-[8px] font-black px-1 rounded bg-black/5 text-slate-700">
                        {statusLabel}
                      </span>
                    </div>

                    {seat.status !== 'vacant' ? (
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-black text-emerald-800 truncate">
                          ₹{seat.runningTotal}
                        </div>
                        <div className="text-[8px] text-slate-500 truncate">
                          {seat.waiterName.split(' ')[0]}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[9px] text-slate-400">Available</div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            RIGHT SIDE: Particular Seat Orders (Strictly That Seat)
            - No Chairs / No Sub-Chair Tabs
            - Active Seat Orders Header
            - Line Items for That Specific Seat
            - Total Seat Bill
            - [ POS BILL ] [ PRINT KOT ] [ VACATE ]
            - Customer Notifications for This Seat
           ══════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 bg-white border-2 border-slate-300 rounded-xl p-4 shadow-sm space-y-4">
          {/* Header for That Particular Seat */}
          <div className="border-b border-slate-200 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#9C3D1E] text-white font-black text-base flex items-center justify-center shadow-xs">
                  #{activeSelectedSeat?.chairId || '01'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-slate-900">
                      Seat #{activeSelectedSeat?.chairId || '01'}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {activeSelectedSeat?.waiterName || 'Ramesh Kumar (Zone 1)'}
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-black px-2.5 py-1 rounded-md bg-orange-100 text-[#9C3D1E] uppercase tracking-wider">
                {activeSelectedSeat?.status || 'VACANT'}
              </span>
            </div>
          </div>

          {/* Table Orders Header & Clean Items List (No Chairs!) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                TABLE ORDERS
              </h4>
              <span className="text-[10px] text-slate-500 font-bold">
                {particularSeatOrders.length} items
              </span>
            </div>

            {particularSeatOrders.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs font-mono bg-[#FAF8F5] rounded-xl border border-dashed border-slate-300">
                No active orders for Seat #{activeSelectedSeat?.chairId || '01'}. Seat is currently available.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
                {particularSeatOrders.map((it) => (
                  <div
                    key={it.id}
                    className="p-3 bg-[#FAF8F5] border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:border-slate-300 transition"
                  >
                    <div className="flex-1 pr-2 truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-900">
                          {it.quantity}x {it.name}
                        </span>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                          {it.prepTag}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-1">
                        Status: <span className="font-bold text-orange-800">{it.stage}</span>
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-black font-mono text-slate-900 text-base">
                        ₹{it.price * it.quantity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total Seat Bill */}
          <div className="border-t-2 border-slate-300 pt-3 flex items-center justify-between text-sm">
            <span className="font-black text-slate-800 uppercase tracking-wider">
              TOTAL TABLE BILL
            </span>
            <span className="font-black font-mono text-2xl text-[#9C3D1E]">
              ₹ {calculatedBill}
            </span>
          </div>

          {/* 3 Prominent Action Buttons */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {/* POS BILL Button */}
            <button
              type="button"
              onClick={handlePosBill}
              className="py-2.5 px-2 bg-[#9C3D1E] text-white rounded-xl font-mono text-xs font-black uppercase tracking-wider shadow-xs hover:bg-orange-700 transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>POS BILL</span>
            </button>

            {/* Print KOT Button */}
            <button
              type="button"
              onClick={handlePrintKOT}
              className="py-2.5 px-2 bg-slate-800 text-white rounded-xl font-mono text-xs font-black uppercase tracking-wider shadow-xs hover:bg-slate-900 transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>PRINT KOT</span>
            </button>

            {/* Vacate Button */}
            <button
              type="button"
              onClick={handleVacateSeat}
              className="py-2.5 px-2 bg-rose-50 border-2 border-rose-300 text-rose-800 rounded-xl font-mono text-xs font-black uppercase tracking-wider hover:bg-rose-100 transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>VACATE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
