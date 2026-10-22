"use client";
/**
 * Thoogudeepa Waiter Tablet POS Cockpit - Floor Grid Component
 *
 * Real-world enterprise Floor Seat Matrix:
 * - Balanced In-Between Theme: Soft slate canvas (#F8FAFC), crisp white cards (#FFFFFF),
 *   subtle borders (#E2E8F0), slate-900 typography, and vibrant accents
 * - Floor header with status filter pills: [All Seats (10)], [Occupied], [Vacant]
 * - Dynamic seat allocation based on logged-in waiter (Seats 01-10, 11-20, 21-30, 31-40)
 * - Dynamic KPI summary cards (Total Seats, Occupancy %, Zone Sales)
 * - 5-column seat matrix with real-world color logic:
 *   * Warm Amber: Actively dining seat
 *   * Clean Emerald: Vacant / clean seat ready for new walk-in guests
 *   * Vibrant Rose: Customer requested bill settlement
 * - Customer app aligned action buttons:
 *   * [ Take Order ] with Plus icon for vacant seats
 *   * [ View Order ] with Eye icon for dining seats
 *   * [ Collect Bill ] with Receipt icon for bill requests
 * - Standardized badge tokens (uniform 24px height, 10px bold uppercase font)
 */

import React, { useState, useMemo } from 'react';
import { 
  Clock,
  Plus,
  Eye,
  Receipt
} from 'lucide-react';
import { SeatItem } from './types';

export interface TabletFloorGridProps {
  /** Array of seats assigned to Waiter */
  seats: SeatItem[];
  /** Active waiter staff name */
  waiterName?: string;
  /** Assigned seating zone range (e.g. 'Zone 1 (Seats 01-10)') */
  assignedZone?: string;
  /** Callback when waiter clicks to take order or view existing ticket */
  onOpenOrder: (seatId: string, seatName: string, customer: string, amount: number, isDining: boolean) => void;
  /** Callback when waiter clicks 'Collect Bill' to switch directly to right pane bill */
  onOpenBill: (seatName: string, customer: string, amount: number) => void;
}

export const TabletFloorGrid: React.FC<TabletFloorGridProps> = ({
  seats,
  waiterName = 'Ramesh Kumar',
  assignedZone = 'Zone 1 (Seats 01-10)',
  onOpenOrder,
  onOpenBill
}) => {
  // Selected status filter: 'all' | 'occupied' | 'vacant'
  const [filterStatus, setFilterStatus] = useState<'all' | 'occupied' | 'vacant'>('all');

  // Filtered seats based on selected pill
  const filteredSeats = useMemo(() => {
    if (filterStatus === 'all') return seats;
    return seats.filter(seat => seat.status === filterStatus);
  }, [seats, filterStatus]);

  // Dynamic range text
  const seatRangeText = useMemo(() => {
    if (seats.length === 0) return 'Seats 01 – 10';
    return `${seats[0].seatNumber} – ${seats[seats.length - 1].seatNumber}`;
  }, [seats]);

  // Aggregate statistics for active zone
  const occupiedCount = useMemo(() => {
    return seats.filter(s => s.status === 'occupied').length;
  }, [seats]);

  const vacantCount = useMemo(() => {
    return seats.filter(s => s.status === 'vacant').length;
  }, [seats]);

  const totalZoneSales = useMemo(() => {
    return seats.reduce((acc, s) => acc + s.totalAmount, 0);
  }, [seats]);

  const occupancyRate = useMemo(() => {
    if (seats.length === 0) return 0;
    return Math.round((occupiedCount / seats.length) * 100);
  }, [occupiedCount, seats]);

  const zoneTag = useMemo(() => {
    return assignedZone.split('(')[0].trim() || 'Floor Zone';
  }, [assignedZone]);

  return (
    <section 
      id="screen-seats" 
      className="w-full flex-1 flex flex-col p-5 bg-[#F8FAFC] overflow-y-auto no-scrollbar select-none"
      role="region"
      aria-label="Dining Floor Seat Matrix"
    >
      <div className="max-w-7xl mx-auto w-full">
        {/* ======================================================== */}
        {/* 1. FLOOR HEADER: TITLE, ASSIGNED ZONE & STATUS FILTERS    */}
        {/* ======================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-200 mb-4 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Floor Board • Assigned {seatRangeText}
              </h2>
              {/* Standardized Uniform Badge Size: h-6 px-2.5 text-[10px] */}
              <span className="h-6 px-2.5 inline-flex items-center justify-center text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs">
                {zoneTag}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Waiter: {waiterName} • Dining Matrix
            </p>
          </div>

          {/* Clean Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
              Filter:
            </span>

            {/* Pill 1: All Seats */}
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`h-8 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-slate-900 text-white font-black shadow-xs'
                  : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Seats ({seats.length})
            </button>

            {/* Pill 2: Occupied Seats */}
            <button
              type="button"
              onClick={() => setFilterStatus('occupied')}
              className={`h-8 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 cursor-pointer ${
                filterStatus === 'occupied'
                  ? 'bg-slate-900 text-white font-black shadow-xs'
                  : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Occupied ({occupiedCount})
            </button>

            {/* Pill 3: Vacant Seats */}
            <button
              type="button"
              onClick={() => setFilterStatus('vacant')}
              className={`h-8 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 cursor-pointer ${
                filterStatus === 'vacant'
                  ? 'bg-slate-900 text-white font-black shadow-xs'
                  : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Vacant ({vacantCount})
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. ZONE KPI STATISTIC TILES                              */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {/* Card 1: Assigned Range */}
          <div className="border border-slate-200 rounded-2xl p-3.5 bg-white flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                Total Seats
              </span>
              <span className="text-sm font-black text-slate-900 mt-0.5 block">
                {seatRangeText}
              </span>
            </div>
            {/* Standardized Uniform Badge Size: h-6 px-2.5 text-[10px] */}
            <span className="h-6 px-2.5 inline-flex items-center justify-center text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {seats.length} Seats
            </span>
          </div>

          {/* Card 2: Occupancy Rate */}
          <div className="border border-slate-200 rounded-2xl p-3.5 bg-white flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                Occupancy
              </span>
              <span className="text-sm font-black text-slate-900 mt-0.5 block">
                {occupiedCount} Full / {vacantCount} Empty
              </span>
            </div>
            {/* Standardized Uniform Badge Size: h-6 px-2.5 text-[10px] */}
            <span className="h-6 px-2.5 inline-flex items-center justify-center text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-amber-50 text-amber-700 border border-amber-300">
              {occupancyRate}% Full
            </span>
          </div>

          {/* Card 3: Zone Running Sales */}
          <div className="border border-slate-200 rounded-2xl p-3.5 bg-white flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                Running Sales
              </span>
              <span className="text-sm font-black text-emerald-600 mt-0.5 block">
                ₹{totalZoneSales.toLocaleString('en-IN')}
              </span>
            </div>
            <span className="h-6 px-2.5 inline-flex items-center justify-center text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300">
              Active
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. COLOR-CODED 5-COLUMN SEAT MATRIX                      */}
        {/* ======================================================== */}
        <div id="seats-grid-container" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {filteredSeats.map(seat => {
            const isOccupied = seat.status === 'occupied';
            const hasBill = Boolean(seat.hasBillRequest);

            let cardClasses = '';
            if (hasBill) {
              cardClasses = 'border-2 border-rose-400 bg-rose-50/50 text-slate-900 shadow-xs ring-1 ring-rose-400/40';
            } else if (isOccupied) {
              cardClasses = 'border border-amber-300 bg-amber-50/40 text-slate-900 shadow-xs ring-1 ring-amber-400/20';
            } else {
              cardClasses = 'border-2 border-emerald-500 bg-emerald-50/20 text-slate-800 hover:bg-emerald-50/40 transition-colors shadow-xs';
            }

            return (
              <div
                key={seat.id}
                className={`seat-card rounded-2xl p-3.5 flex flex-col justify-between transition-all ${cardClasses}`}
              >
                <div>
                  {/* Top: Seat Number & Standardized Badge (24px height) */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black tracking-tight text-slate-900">
                      {seat.seatNumber}
                    </span>

                    {/* Standardized Uniform Badge Size: h-6 px-2.5 text-[10px] */}
                    {hasBill ? (
                      <span className="h-6 px-2.5 inline-flex items-center justify-center text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-rose-100 text-rose-700 border border-rose-300 animate-pulse shadow-2xs">
                        BILL REQ
                      </span>
                    ) : isOccupied ? (
                      <span className="h-6 px-2.5 inline-flex items-center justify-center text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                        OCCUPIED
                      </span>
                    ) : (
                      <span className="h-6 px-2.5 inline-flex items-center justify-center text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs">
                        VACANT
                      </span>
                    )}
                  </div>

                  {/* Middle: Customer Name & Dining State */}
                  <div className="text-[12px] font-bold truncate text-slate-900">
                    {seat.guestName}
                  </div>
                  <div className="text-[10px] mt-0.5 font-semibold text-slate-500">
                    {isOccupied ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 shrink-0 text-slate-400" />
                        <span>{seat.orderCount} items • {seat.diningTime}</span>
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-bold">Clean & Ready</span>
                    )}
                  </div>

                  {/* Properly Positioned & Highlighted Price / Seat Status Row */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {isOccupied ? 'Total Bill:' : 'Seat Status:'}
                    </span>
                    {isOccupied ? (
                      <span className="text-xs font-black text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-lg shadow-2xs">
                        ₹{seat.totalAmount.toLocaleString('en-IN')}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                        Ready
                      </span>
                    )}
                  </div>
                </div>

                {/* Direct Action Button: Aligned with Customer App */}
                {isOccupied ? (
                  hasBill ? (
                    // Urgent Bill Requested -> Direct Collect Bill (Rose Button with Receipt Icon)
                    <button
                      type="button"
                      onClick={() => onOpenBill(seat.seatNumber, seat.guestName, seat.totalAmount)}
                      className="w-full h-8 mt-3 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      title="Collect Bill in Right-Side Container"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Collect Bill</span>
                    </button>
                  ) : (
                    // Regular Occupied Dining -> View Order (Lite Button with Eye Icon as requested)
                    <button
                      type="button"
                      onClick={() => onOpenOrder(seat.id, seat.seatNumber, seat.guestName, seat.totalAmount, true)}
                      className="w-full h-8 mt-3 rounded-xl text-xs font-extrabold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      title="View Active Seat Order"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-800" />
                      <span>View Order</span>
                    </button>
                  )
                ) : (
                  // Vacant Seat -> Take Order (Emerald Button with Plus Icon)
                  <button
                    type="button"
                    onClick={() => onOpenOrder(seat.id, seat.seatNumber, 'Walk-In Guest', 0, false)}
                    className="w-full h-8 mt-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    title="Take Order for Walk-In Guest"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Take Order</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TabletFloorGrid;
