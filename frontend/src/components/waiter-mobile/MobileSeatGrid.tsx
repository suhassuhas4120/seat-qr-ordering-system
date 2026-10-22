"use client";
/**
 * Thoogudeepa Waiter Mobile Cockpit - Floor Seat Grid Component
 *
 * Real-world enterprise Waiter Floor Management interface:
 * - Balanced Modern Theme: Soft slate canvas (#F8FAFC), crisp white card (#FFFFFF),
 *   subtle borders (#E2E8F0), slate-900 typography, and vibrant accents
 * - Zone 1: Seats 01 to 10 Grid (2 columns on mobile smartphone)
 * - Filter Pills: All Seats (10), Occupied (4), Vacant (6) - strictly NO alerts filter here!
 * - Color-Coded Borders & Badges:
 *   * VACANT: Emerald green border (border-2 border-emerald-400), emerald badge, '+ Take Order' button
 *   * OCCUPIED: Amber border (border-2 border-amber-400), amber badge, item count, 'View Order' button
 *   * BILL REQ: Rose urgent border (border-2 border-rose-500), rose badge, 'Collect Bill' button
 * - Standardized badge tokens (uniform 22px height, 10px bold uppercase font)
 * - Direct routing to Order pad or Bill settlement screens
 * - Strict Line Count: Maintained strictly between 300 and 400 lines
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
  Plus, 
  Eye, 
  ShoppingBag,
  Receipt, 
  Users, 
  Clock, 
  Sparkles, 
  AlertCircle,
  CheckCircle2, 
  Filter,
  RefreshCw,
  Search
} from 'lucide-react';
import { SeatEntity, SeatFilterTab, INITIAL_SEAT_DATA } from './types';

export interface MobileSeatGridProps {
  /** Array of seat entities in waiter's assigned zone */
  readonly seats?: SeatEntity[];
  /** Assigned seat range label (e.g. 'Seats 01 to 10') */
  readonly seatRange?: string;
  /** Active waiter staff name */
  readonly waiterName?: string;
  /** Callback to take new order for vacant seat (opens menu catalog) */
  readonly onOpenTakeOrder?: (seatNumber: string, guestName?: string) => void;
  /** Callback to view already placed order for occupied seat (opens cart) */
  readonly onOpenViewOrder?: (seatNumber: string, guestName?: string) => void;
  /** Legacy callback to take or view order for a specific seat */
  readonly onOpenSeatOrder?: (seatNumber: string, guestName?: string) => void;
  /** Callback to route directly to bill collection */
  readonly onOpenSeatBill: (seatNumber: string, guestName: string, amount: number) => void;
  /** Optional callback to refresh seat data from backend */
  readonly onRefreshSeats?: () => void;
}

export const MobileSeatGrid: React.FC<MobileSeatGridProps> = ({
  seats = INITIAL_SEAT_DATA,
  seatRange = 'Seats 01 to 10',
  waiterName = 'Ramesh Kumar',
  onOpenTakeOrder,
  onOpenViewOrder,
  onOpenSeatOrder,
  onOpenSeatBill,
  onRefreshSeats
}) => {
  const [activeFilter, setActiveFilter] = useState<SeatFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Calculate dynamic filter counts
  const counts = useMemo(() => {
    const total = seats.length;
    const occupied = seats.filter(s => s.status === 'occupied' || s.status === 'billing').length;
    const vacant = seats.filter(s => s.status === 'vacant').length;
    return { total, occupied, vacant };
  }, [seats]);

  // Filtered seats array based on active pill and search query
  const filteredSeats = useMemo(() => {
    return seats.filter(seat => {
      // Status filter
      if (activeFilter === 'occupied' && (seat.status !== 'occupied' && seat.status !== 'billing')) {
        return false;
      }
      if (activeFilter === 'vacant' && seat.status !== 'vacant') {
        return false;
      }
      // Search query filter (seat number or guest name)
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSeat = seat.seatNumber.toLowerCase().includes(q);
        const matchesGuest = seat.guestName ? seat.guestName.toLowerCase().includes(q) : false;
        if (!matchesSeat && !matchesGuest) return false;
      }
      return true;
    });
  }, [seats, activeFilter, searchQuery]);

  // Handle seat card action click
  const handleSeatAction = useCallback((seat: SeatEntity) => {
    if (seat.status === 'billing') {
      onOpenSeatBill(seat.seatNumber, seat.guestName || 'Guest', seat.runningTotal || 840);
    } else if (seat.status === 'occupied') {
      if (onOpenViewOrder) {
        onOpenViewOrder(seat.seatNumber, seat.guestName || 'Dining Guest');
      } else if (onOpenSeatOrder) {
        onOpenSeatOrder(seat.seatNumber, seat.guestName || 'Dining Guest');
      }
    } else {
      if (onOpenTakeOrder) {
        onOpenTakeOrder(seat.seatNumber, 'Walk-In Guest');
      } else if (onOpenSeatOrder) {
        onOpenSeatOrder(seat.seatNumber, 'Walk-In Guest');
      }
    }
  }, [onOpenTakeOrder, onOpenViewOrder, onOpenSeatOrder, onOpenSeatBill]);

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col bg-slate-50 select-none overflow-hidden">
      
      {/* Sticky Filter Controls Sub-Bar */}
      <div className="px-3 py-2 bg-white border-b border-slate-200 shrink-0 shadow-2xs">
        {/* Filter Pills Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            
            {/* All Seats Pill */}
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`h-7 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap shadow-2xs cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-slate-900 text-white font-black'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              All Seats ({counts.total})
            </button>

            {/* Occupied Pill */}
            <button
              type="button"
              onClick={() => setActiveFilter('occupied')}
              className={`h-7 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap shadow-2xs cursor-pointer ${
                activeFilter === 'occupied'
                  ? 'bg-amber-600 text-white font-black'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              Occupied ({counts.occupied})
            </button>

            {/* Vacant Pill */}
            <button
              type="button"
              onClick={() => setActiveFilter('vacant')}
              className={`h-7 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap shadow-2xs cursor-pointer ${
                activeFilter === 'vacant'
                  ? 'bg-emerald-600 text-white font-black'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              Vacant ({counts.vacant})
            </button>

          </div>

          {/* Quick Refresh Button */}
          {onRefreshSeats && (
            <button
              type="button"
              onClick={onRefreshSeats}
              className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 active:scale-90 shrink-0 shadow-2xs cursor-pointer"
              title="Refresh Floor Status"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>

      {/* Main Floor Grid Scroll View */}
      <div className="p-3.5 flex-1 overflow-y-auto no-scrollbar pb-24">
        
        {filteredSeats.length === 0 ? (
          /* Empty Filter State */
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mb-2 mx-auto">
              <Filter className="w-6 h-6 text-slate-400" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">No Seats Found</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">
              No seats match your selected filter criteria.
            </p>
          </div>
        ) : (
          /* 2-Column Responsive Seat Card Grid (Matching Tablet POS Architecture) */
          <div className="grid grid-cols-2 gap-2.5">
            {filteredSeats.map(seat => {
              const isBilling = seat.status === 'billing';
              const isOccupied = seat.status === 'occupied';
              const isVacant = seat.status === 'vacant';

              return (
                <div
                  key={seat.id}
                  className={`rounded-2xl p-3 flex flex-col justify-between bg-white shadow-xs transition-all ${
                    isBilling
                      ? 'border-2 border-rose-500 ring-1 ring-rose-500/20 shadow-sm'
                      : isOccupied
                      ? 'border-2 border-amber-400'
                      : 'border-2 border-emerald-400'
                  }`}
                >
                  {/* Card Content Top Header */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs sm:text-sm font-black text-slate-900">
                        {seat.seatNumber}
                      </span>

                      {/* Standardized Badge Token */}
                      {isBilling && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-300 animate-pulse">
                          BILL REQ
                        </span>
                      )}
                      {isOccupied && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300">
                          DINING
                        </span>
                      )}
                      {isVacant && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-300">
                          VACANT
                        </span>
                      )}
                    </div>

                    {/* Guest Name & Operational Subtitle */}
                    {isVacant ? (
                      <>
                        <div className="text-xs font-bold text-slate-500">
                          Available
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Ready for walk-in
                        </div>
                        {/* Seat Status Row (Matching Tablet!) */}
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-500 text-[10px] sm:text-[11px]">Seat Status:</span>
                          <span className="text-xs font-black text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-lg shadow-2xs">
                            Ready
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {seat.guestName || 'Guest'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{seat.diningDuration || '15m'} active</span>
                        </div>
                        {/* Total Bill Row (Matching Tablet!) */}
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-600 text-[10px] sm:text-[11px]">Total Bill:</span>
                          <span className="text-xs font-black text-amber-900 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-lg shadow-2xs">
                            ₹{seat.runningTotal || 850}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Seat CTA Button */}
                  <div className="mt-2.5">
                    {isBilling ? (
                      <button
                        type="button"
                        onClick={() => handleSeatAction(seat)}
                        className="w-full h-8 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 active:scale-95 text-white flex items-center justify-center gap-1 shadow-2xs cursor-pointer transition-all"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Collect Bill</span>
                      </button>
                    ) : isOccupied ? (
                      <button
                        type="button"
                        onClick={() => handleSeatAction(seat)}
                        className="w-full h-8 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 active:scale-95 text-slate-800 border border-slate-300 flex items-center justify-center gap-1 shadow-2xs cursor-pointer transition-all"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-amber-700" />
                        <span>View Order</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSeatAction(seat)}
                        className="w-full h-8 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white flex items-center justify-center gap-1 shadow-2xs cursor-pointer transition-all"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Take Order</span>
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
};

export default MobileSeatGrid;


