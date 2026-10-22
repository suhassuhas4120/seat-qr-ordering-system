"use client";
/**
 * Thoogudeepa Waiter Tablet POS Cockpit - Live Ticket Component
 *
 * Real-world enterprise Live Order Ticket (40% split screen column):
 * - Balanced In-Between Theme: Soft slate canvas (#F1F5F9), crisp white cards (#FFFFFF),
 *   subtle borders (#E2E8F0), slate-900 typography, and vibrant accents
 * - Target seat header with live order timer
 * - Multi-Round Consolidated Food Display:
 *   * Distinct DRAFT additions section
 *   * Consolidated ACTIVE ORDERS by dish identity with stage breakdown and Serve action
 * - Itemized dish rows with standardized kitchen status badges:
 *   * PLACED: Order queued at POS
 *   * RECEIVED: Acknowledged by Kitchen Display System (KDS)
 *   * PREPARING: Master chef actively preparing in donne biryani pots
 *   * READY: Placed on pass counter with urgent emerald badge + [ Serve ] button
 *   * SERVED: Food delivered to dining seat — Non-clickable completed status
 * - Financial summary breakdown: Subtotal, GST (5%), and Grand Total
 * - Clean action buttons:
 *   * [ Send to Kitchen ] (Send icon, Disabled when no unplaced draft items)
 *   * [ Settle Bill ] (CreditCard icon, Disabled when 0 items or awaiting bill request)
 *   * [ Vacate Table ] (RotateCcw icon, releases table cleanly)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Timer,
  Send,
  CreditCard,
  Check,
  RotateCcw
} from 'lucide-react';
import { TicketItem, KitchenStatus } from './types';

export interface TabletLiveTicketProps {
  /** Target seat identifier and guest name */
  activeSeatName: string;
  /** List of ordered items on the active ticket */
  ticketItems: TicketItem[];
  /** Subtotal amount before taxes */
  subtotal: number;
  /** GST 5% calculation */
  gst: number;
  /** Grand Total including taxes */
  grandTotal: number;
  /** Callback to mark an item as served once picked up from kitchen pass */
  onServeItem: (itemId: number | string) => void;
  /** Callback to fire KOT directly to kitchen pass counter */
  onPunchKot: () => void;
  /** Callback to switch right-pane mode from ticket to Bill Settlement */
  onSwitchToBillMode: () => void;
  /** Callback to clear ticket items for a new guest */
  onClearTicket?: () => void;
  /** Callback to cleanly vacate table */
  onVacateTicket?: (seatNumber?: string) => void;
  /** Whether there are unplaced draft items on ticket ready to fire */
  hasUnplacedItems?: boolean;
  /** Whether the customer on this seat has actively requested the bill */
  isBillRequested?: boolean;
}

interface ConsolidatedTabletDish {
  dishId: number;
  name: string;
  imageUrl?: string;
  price: number;
  totalQuantity: number;
  totalAmount: number;
  readyCount: number;
  servedCount: number;
  prepCount: number;
  recCount: number;
  placedCount: number;
  primaryStage: KitchenStatus;
  orderItemIds: string[];
}

export const TabletLiveTicket: React.FC<TabletLiveTicketProps> = ({
  activeSeatName,
  ticketItems,
  subtotal,
  gst,
  grandTotal,
  onServeItem,
  onPunchKot,
  onSwitchToBillMode,
  onClearTicket,
  onVacateTicket,
  hasUnplacedItems = false,
  isBillRequested = true
}) => {
  const [kotSentSuccess, setKotSentSuccess] = useState<boolean>(false);
  const [kotOrderSerial, setKotOrderSerial] = useState<number>(104);
  const [ticketElapsedSeconds, setTicketElapsedSeconds] = useState<number>(340);
  const [showVacateConfirm, setShowVacateConfirm] = useState<boolean>(false);

  // Live order timer simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setTicketElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
  };

  const handleFireKot = () => {
    if (ticketItems.length === 0) return;
    setKotSentSuccess(true);
    setKotOrderSerial(prev => prev + 1);
    onPunchKot();
    setTimeout(() => {
      setKotSentSuccess(false);
    }, 2000);
  };

  // Separate draft items from already punched kitchen items
  const draftItems = useMemo(() => {
    return ticketItems.filter(item => !item.orderItemId && !item.isPunched);
  }, [ticketItems]);

  // List committed items individually without 3x/4x grouping to avoid confusion
  const committedItems = useMemo(() => {
    const committed = ticketItems.filter(item => Boolean(item.orderItemId || item.isPunched));
    const list: Array<{
      item: TicketItem;
      unitKey: string;
      orderItemId: string | number;
      price: number;
      status: KitchenStatus;
    }> = [];

    committed.forEach((item, itemIdx) => {
      const qty = item.quantity || 1;
      const status = item.status || 'PLACED';
      for (let q = 0; q < qty; q++) {
        const uKey = item.orderItemId ? String(item.orderItemId) : `ticket-${item.id}-${itemIdx}-${q}`;
        list.push({
          item,
          unitKey: uKey,
          orderItemId: item.orderItemId || item.id,
          price: item.price,
          status,
        });
      }
    });

    return list;
  }, [ticketItems]);

  const hasItems = ticketItems.length > 0;

  return (
    <div 
      id="right-mode-ticket" 
      className="flex flex-col justify-between h-full select-none bg-white rounded-2xl border border-slate-200 p-4 shadow-sm"
      role="region"
      aria-label="Live Seat Ticket and KOT Management"
    >
      <div className="flex flex-col h-[calc(100%-150px)]">
        {/* 1. TICKET HEADER: ACTIVE SEAT & TIMER */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-2.5">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Live Seat Ticket
              </h3>
              <span className="h-6 px-2.5 inline-flex items-center justify-center text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs">
                KOT #{kotOrderSerial}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-slate-800 font-extrabold">{activeSeatName}</span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                <Timer className="w-3 h-3 text-slate-500" />
                {formatTimer(ticketElapsedSeconds)}
              </span>
            </div>
          </div>
        </div>

        {/* Column Headers for Items and Kitchen Status */}
        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200 text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500">
          <span>Dish & Quantity</span>
          <span>Kitchen Status</span>
        </div>

        {/* 2. TICKET ITEMS LIST WITH MULTI-ROUND CONSOLIDATION */}
        <div className="space-y-2 overflow-y-auto no-scrollbar flex-1 pr-0.5 py-1">
          {!hasItems ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
              <p className="text-sm font-extrabold text-slate-700">No dishes on ticket</p>
              <p className="text-xs text-slate-400 mt-0.5">Select dishes from the menu to punch</p>
            </div>
          ) : (
            <>
              {/* DRAFT ITEMS SECTION */}
              {draftItems.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Draft Additions ({draftItems.reduce((acc, it) => acc + it.quantity, 0)})
                    </span>
                  </div>

                  {draftItems.map((item, idx) => (
                    <div
                      key={`draft-${item.id}-${idx}`}
                      className="border border-amber-300/80 bg-amber-50/50 rounded-xl p-2.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="min-w-0 flex-1">
                          <span className="font-black block truncate text-xs sm:text-sm text-slate-900">
                            {item.quantity}x {item.name}
                          </span>
                          <span className="text-xs text-slate-500 font-bold block mt-0.5">
                            ₹{item.price * item.quantity} (₹{item.price} each)
                          </span>
                        </div>
                        <span className="h-6 px-2.5 inline-flex items-center justify-center text-xs font-black uppercase tracking-wider rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                          DRAFT
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* COMMITTED ITEMS SECTION - SHOWN SEPARATELY PER PORTION */}
              {committedItems.length > 0 && (
                <div className="space-y-1.5">
                  {draftItems.length > 0 && (
                    <div className="flex items-center justify-between px-1 pt-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Kitchen Orders ({committedItems.length})
                      </span>
                    </div>
                  )}

                  {committedItems.map((unit) => {
                    const isServed = unit.status === 'SERVED';

                    return (
                      <div
                        key={`committed-${unit.unitKey}`}
                        className={`border rounded-xl p-3 transition-colors ${
                          isServed
                            ? 'border-slate-200 bg-slate-100/70 opacity-70 select-none'
                            : 'border-slate-200 bg-slate-50/70 shadow-2xs hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2.5">
                          <div className="min-w-0 flex-1">
                            <span className={`font-black block truncate text-xs sm:text-sm ${isServed ? 'text-slate-400 line-through decoration-2' : 'text-slate-900'}`}>
                              {unit.item.name}
                            </span>
                            <span className="text-xs text-slate-500 font-bold block mt-0.5">
                              ₹{unit.price}
                            </span>
                          </div>

                          {/* Operational Status Badges */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {unit.status === 'READY' && (
                              <div className="flex items-center gap-1.5">
                                <span className="h-6 px-2.5 inline-flex items-center justify-center text-xs font-black uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                                  READY
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onServeItem(unit.orderItemId || unit.item.id)}
                                  className="h-6 px-2.5 rounded-lg text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 active:scale-95 transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer animate-pulse"
                                  title="Mark as Served to Seat"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  <span>Serve</span>
                                </button>
                              </div>
                            )}

                            {unit.status === 'PREPARING' && (
                              <span className="h-6 px-2.5 inline-flex items-center justify-center text-xs font-black uppercase tracking-wider rounded-full bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                                PREPARING
                              </span>
                            )}

                            {unit.status === 'RECEIVED' && (
                              <span className="h-6 px-2.5 inline-flex items-center justify-center text-xs font-black uppercase tracking-wider rounded-full bg-sky-50 text-sky-800 border border-sky-300 shadow-2xs">
                                RECEIVED
                              </span>
                            )}

                            {unit.status === 'PLACED' && (
                              <span className="h-6 px-2.5 inline-flex items-center justify-center text-xs font-black uppercase tracking-wider rounded-full bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs">
                                PLACED
                              </span>
                            )}

                            {isServed && (
                              <span className="h-6 px-2.5 inline-flex items-center gap-1 justify-center text-xs font-black uppercase tracking-wider rounded-full bg-slate-200 text-slate-700 border border-slate-300 shadow-2xs">
                                <Check className="w-3 h-3 stroke-[3]" />
                                <span>SERVED</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 3. TICKET TOTALS & ACTION BUTTONS */}
      <div className="pt-3 border-t border-slate-200 mt-2 space-y-2">
        {/* Pricing Summary */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-slate-500 font-semibold text-[11px]">
            <span>Subtotal:</span>
            <span>₹{subtotal.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-slate-500 font-semibold text-[11px]">
            <span>GST (5% SGST + CGST):</span>
            <span>₹{gst.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-slate-900 font-black text-xs pt-1 border-t border-slate-200">
            <span>Grand Total:</span>
            <span className="text-sm font-black text-amber-700">
              ₹{grandTotal.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {/* Button 1: Punch KOT to Kitchen */}
          <button
            type="button"
            disabled={!hasUnplacedItems}
            onClick={handleFireKot}
            className={`h-11 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-2xs transition-all ${
              hasUnplacedItems
                ? 'bg-slate-900 hover:bg-slate-800 active:scale-95 text-white cursor-pointer'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
            }`}
            title={hasUnplacedItems ? "Fire KOT to Kitchen" : "All items on ticket already fired to kitchen"}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{kotSentSuccess ? 'Sent to Kitchen' : hasUnplacedItems ? 'Send to Kitchen' : 'All in Kitchen'}</span>
          </button>

          {/* Button 2: Collect Bill */}
          <button
            type="button"
            disabled={!hasItems}
            onClick={onSwitchToBillMode}
            className={`h-11 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-2xs transition-all ${
              !hasItems
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                : isBillRequested
                ? 'bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black cursor-pointer shadow-amber-500/20 ring-2 ring-amber-400'
                : 'bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-black cursor-pointer shadow-slate-900/20'
            }`}
            title={
              !hasItems
                ? "Punch order dishes first before bill collection"
                : isBillRequested
                ? "Customer requested bill via app - Switch to Settle Bill"
                : "Switch Right Pane to Settle Bill"
            }
          >
            <CreditCard className={`w-3.5 h-3.5 ${isBillRequested ? 'text-slate-950 stroke-[2.5]' : hasItems ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>
              {!hasItems
                ? 'Awaiting Orders'
                : isBillRequested
                ? '★ Settle Bill'
                : 'Settle Bill'}
            </span>
          </button>
        </div>

        {/* Vacate Table Action */}
        {onVacateTicket && (
          <div className="pt-0.5">
            {!showVacateConfirm ? (
              <button
                type="button"
                onClick={() => setShowVacateConfirm(true)}
                className="w-full h-8 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 font-bold text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Vacate / Reset Seat</span>
              </button>
            ) : (
              <div className="p-2 rounded-lg border border-rose-200 bg-rose-50 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-rose-900">Vacate {activeSeatName.split(':')[0]}?</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowVacateConfirm(false)}
                    className="px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-700 text-[10px] font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowVacateConfirm(false);
                      onVacateTicket();
                    }}
                    className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TabletLiveTicket;
