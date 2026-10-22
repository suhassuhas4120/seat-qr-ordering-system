"use client";
/**
 * Thoogudeepa Waiter Mobile Cockpit - Live Cart & KOT Screen Component
 *
 * Real-world enterprise Waiter Live Cart & KOT Review Interface:
 * - Balanced Modern Theme: Soft slate canvas (#F8FAFC), crisp white card (#FFFFFF),
 *   subtle borders (#E2E8F0), slate-900 typography, and vibrant accents
 * - Screen 4 Architecture: Operates as full mobile screen (screen-cart)
 * - Top Header:
 *   * Hotel Name FIRST: 'ತೂಗುದೀಪ ದೊನ್ನೆ ಬಿರಿಯಾನಿ' [LIVE CART badge]
 *   * Waiter Name BELOW: 'Ramesh Kumar • {seatNumber}: {guestName}'
 *   * Alert Notification Bell ALWAYS at top right with live badge counter
 * - Multi-Round Consolidated Food Display:
 *   * Distinct NEW DRAFT ADDITIONS section with steppers and KOT Punch
 *   * Consolidated ACTIVE KITCHEN ORDERS with stage breakdown and Serve action
 * - Standardized Operational Badges:
 *   * PREPARING (Flame icon, Amber badge)
 *   * READY (CheckCircle icon, Emerald badge with Serve action)
 *   * PLACED (Clock icon, Slate badge)
 *   * SERVED (Check icon, Slate badge)
 * - Transparent Financial Computation: Subtotal, CGST + SGST (5%), Current Ticket Total
 * - Dedicated Action Buttons:
 *   * '+ ADD MORE ITEMS (OPEN MENU)' -> Redirects to Menu Catalog
 *   * 'PROCEED TO BILL SETTLEMENT' -> Redirects to Billing Checkout
 *   * 'VACATE / RESET TABLE' -> Quickly releases table cleanly
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  ArrowLeft, ShoppingBag, Plus, Minus, Flame, MessageSquare,
  Receipt, Clock, CheckCircle2, Check, PlusCircle, Bell, Trash2, RotateCcw
} from 'lucide-react';
import { CartItem, MenuItem, RESTAURANT_CONSTANTS } from './types';

export interface MobileLiveCartKOTProps {
  /** Target seat label (e.g., 'Seat 01') */
  readonly seatNumber: string;
  /** Dining guest name */
  readonly guestName?: string;
  /** Array of active cart line items */
  readonly cartItems: CartItem[];
  /** Is cart sheet visible (for drawer mode compatibility) */
  readonly isOpen?: boolean;
  /** Pending floor service alerts count */
  readonly pendingAlertCount?: number;
  /** Callback to close bottom cart sheet or navigate back */
  readonly onClose: () => void;
  /** Callback to adjust quantity */
  readonly onModifyQuantity: (item: MenuItem, change: number) => void;
  /** Callback to delete an item entirely */
  readonly onRemoveItem: (itemId: string) => void;
  /** Callback when KOT is confirmed and punched */
  readonly onFireKOT: (instructions: string) => void;
  /** Callback to redirect back to Menu Catalog (+ ADD MORE ITEMS) */
  readonly onOpenMenu?: () => void;
  /** Callback to proceed to billing settlement */
  readonly onProceedToBill?: (seatNumber: string, guestName: string, amount: number) => void;
  /** Whether customer has verified and requested bill via waiter */
  readonly isBillRequested?: boolean;
  /** Callback to open floor alerts */
  readonly onOpenAlerts?: () => void;
  /** Callback to mark an item as served */
  readonly onServeItem?: (itemId: string) => void;
  /** Optional callback to clear entire cart */
  readonly onClearCart?: () => void;
  /** Optional callback to cleanly vacate table */
  readonly onVacateTable?: (seatNumber: string) => void;
  /** Active KOT ticket number */
  readonly activeTicketNumber?: string;
  /** Optional flag: whether to render as full screen (Screen 4) */
  readonly isFullScreen?: boolean;
}

interface ConsolidatedCommittedDish {
  dishId: string;
  name: string;
  menuItem: MenuItem;
  totalQuantity: number;
  totalAmount: number;
  readyCount: number;
  servedCount: number;
  prepCount: number;
  recCount: number;
  placedCount: number;
  primaryStage: 'PLACED' | 'REC' | 'PREP' | 'READY' | 'SERVED';
  itemIds: string[];
}

export const MobileLiveCartKOT: React.FC<MobileLiveCartKOTProps> = ({
  seatNumber = 'Seat 01',
  guestName = 'Walk-In Guest',
  cartItems,
  activeTicketNumber,
  isOpen = true,
  pendingAlertCount = 0,
  onClose,
  onModifyQuantity,
  onRemoveItem,
  onFireKOT,
  onOpenMenu,
  onProceedToBill,
  isBillRequested = false,
  onOpenAlerts,
  onServeItem,
  onClearCart,
  onVacateTable,
  isFullScreen = true
}) => {
  const [kitchenNotes, setKitchenNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showVacateConfirm, setShowVacateConfirm] = useState<boolean>(false);

  // Separate draft items from fired kitchen items
  const draftItems = useMemo(() => {
    return cartItems.filter(c => !c.orderItemId && !c.isFired);
  }, [cartItems]);

  // List committed items individually without 3x/4x grouping to avoid confusion
  const committedItems = useMemo(() => {
    const committed = cartItems.filter(c => Boolean(c.orderItemId || c.isFired));
    const list: Array<{
      item: CartItem;
      unitKey: string;
      orderItemId: string;
      unitPrice: number;
      stage: 'PLACED' | 'REC' | 'PREP' | 'READY' | 'SERVED';
    }> = [];

    committed.forEach((c, cIdx) => {
      const qty = c.quantity || 1;
      const stage = (c.stage as string) || 'PLACED';
      const effStage: 'PLACED' | 'REC' | 'PREP' | 'READY' | 'SERVED' =
        stage === 'SERVED' ? 'SERVED' :
        stage === 'READY' ? 'READY' :
        (stage === 'PREP' || stage === 'PREPARING') ? 'PREP' :
        (stage === 'REC' || stage === 'RECEIVED') ? 'REC' : 'PLACED';

      const unitP = c.menuItem.price || Math.round(c.lineTotal / qty) || 0;

      for (let q = 0; q < qty; q++) {
        const uKey = c.orderItemId ? String(c.orderItemId) : `cart-${c.menuItem.id}-${cIdx}-${q}`;
        list.push({
          item: c,
          unitKey: uKey,
          orderItemId: c.orderItemId ? String(c.orderItemId) : String(c.menuItem.id),
          unitPrice: unitP,
          stage: effStage,
        });
      }
    });

    return list;
  }, [cartItems]);

  // Compute subtotal from all items
  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, curr) => acc + curr.lineTotal, 0);
  }, [cartItems]);

  // Compute GST amounts (2.5% CGST + 2.5% SGST = 5%)
  const cgst = useMemo(() => Math.round(subtotal * RESTAURANT_CONSTANTS.TAX_RATE_CGST), [subtotal]);
  const sgst = useMemo(() => Math.round(subtotal * RESTAURANT_CONSTANTS.TAX_RATE_SGST), [subtotal]);
  const grandTotal = useMemo(() => subtotal + cgst + sgst, [subtotal, cgst, sgst]);

  // Total quantity count across all items
  const totalItemCount = useMemo(() => {
    return cartItems.reduce((acc, curr) => acc + curr.quantity, 0);
  }, [cartItems]);

  const handleServeDish = useCallback((dish: ConsolidatedCommittedDish) => {
    const targetKey = dish.itemIds[0] || dish.dishId || dish.name;
    if (onServeItem) {
      onServeItem(targetKey);
    }
  }, [onServeItem]);

  // Fire KOT submission handler
  const handlePunchOrder = useCallback(() => {
    if (draftItems.length === 0) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onFireKOT(kitchenNotes);
      setKitchenNotes('');
    }, 400);
  }, [draftItems, kitchenNotes, onFireKOT]);

  if (!isOpen) return null;

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col bg-slate-50 overflow-hidden select-none">
      
      {/* Top Cart Header: Hotel Name FIRST, Waiter Below, Bell Always on Right */}
      <header className="p-3 bg-white border-b border-slate-200 flex items-center justify-between shadow-2xs shrink-0 select-none z-20">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center bg-white hover:bg-slate-100 btn-press shrink-0 shadow-2xs text-slate-700"
            title="Back to Seats"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs font-black text-slate-900 tracking-tight truncate leading-tight">
                ತೂಗುದೀಪ ದೊನ್ನೆ ಬಿರಿಯಾನಿ
              </h1>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[11px] font-bold text-slate-800 truncate">Ramesh Kumar</span>
              <span className="text-slate-300 text-[10px]">•</span>
              <span className="text-[10px] font-semibold text-slate-500 truncate">
                {seatNumber}: {guestName}
              </span>
            </div>
          </div>
        </div>

        {/* Alert Bell Always on Top Right */}
        <button
          type="button"
          onClick={onOpenAlerts}
          className="relative w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center bg-white hover:bg-slate-50 btn-press shrink-0 shadow-2xs"
          title="Alerts"
        >
          <Bell className="w-4 h-4 text-slate-700" />
          {pendingAlertCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-2xs animate-pulse">
              {pendingAlertCount}
            </span>
          )}
        </button>
      </header>

      {/* Cart Content: Live Ordered Food & Status Modes */}
      <div className="p-3.5 flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-3 pb-4">
        
        {/* Ticket Header Pill */}
        <div className="flex items-center justify-between mb-1 px-1">
          <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Seat Review ({totalItemCount} Total Items)
          </span>
          {activeTicketNumber && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
              KOT #{activeTicketNumber}
            </span>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <ShoppingBag className="w-10 h-10 text-slate-300 mb-2 stroke-[1.5]" />
            <p className="text-sm font-black text-slate-700">No active dishes in cart</p>
            <p className="text-xs text-slate-400 mt-0.5">Dishes placed for this seat will appear here</p>
          </div>
        ) : (
          <>
            {/* SECTION 1: NEW DRAFT ADDITIONS (UNPUNCHED) */}
            {draftItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    New Draft Additions ({draftItems.reduce((acc, curr) => acc + curr.quantity, 0)})
                  </span>
                  <span className="text-[10px] font-extrabold text-amber-700">Ready to punch</span>
                </div>

                {draftItems.map((item, idx) => {
                  const isNonVeg = item.menuItem.dietary === 'non_veg';
                  return (
                    <div
                      key={`draft-${item.menuItem.id}-${idx}`}
                      className="border border-amber-300/80 bg-amber-50/40 rounded-2xl p-2.5 shadow-xs flex items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                          <img
                            src={item.menuItem.image || "/images/dishes/chicken-donne-biryani.jpg"}
                            alt={item.menuItem.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/logo.jpg';
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${isNonVeg ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                            <span className="text-xs sm:text-sm font-black text-slate-900 block truncate">
                              {item.menuItem.name}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-600 font-bold block mt-0.5">
                            ₹{item.menuItem.price} each • <span className="text-amber-800 font-black">₹{item.lineTotal}</span>
                          </span>
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-amber-300 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => onModifyQuantity(item.menuItem, -1)}
                          className="w-6 h-6 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center font-bold text-slate-800 btn-press cursor-pointer"
                          title="Reduce quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-black text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onModifyQuantity(item.menuItem, 1)}
                          className="w-6 h-6 rounded-lg bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center font-bold btn-press cursor-pointer"
                          title="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* SECTION 2: ACTIVE KITCHEN ORDERS (EACH ITEM LISTED SEPARATELY) */}
            {committedItems.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Active Kitchen Orders ({committedItems.length})
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">Live Stage</span>
                </div>

                {committedItems.map((unit) => {
                  const item = unit.item;
                  const isServed = unit.stage === 'SERVED';
                  const isNonVeg = item.menuItem.dietary === 'non_veg';

                  return (
                    <div
                      key={`committed-${unit.unitKey}`}
                      className={`border rounded-2xl p-2.5 shadow-xs flex items-center justify-between gap-2.5 transition-all ${
                        isServed
                          ? 'border-slate-200 bg-slate-100/70 opacity-70'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                          <img
                            src={item.menuItem.image || "/images/dishes/chicken-donne-biryani.jpg"}
                            alt={item.menuItem.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/logo.jpg';
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${isNonVeg ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                            <span className={`text-xs sm:text-sm block truncate ${
                              isServed ? 'font-bold text-slate-400 line-through decoration-2' : 'font-black text-slate-900'
                            }`}>
                              {item.menuItem.name}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-bold block mt-0.5">
                            <span className="text-amber-800 font-black">₹{unit.unitPrice}</span>
                          </span>
                        </div>
                      </div>

                      {/* Operational Status Badges & Serve Action */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {unit.stage === 'READY' && (
                          <div className="flex items-center gap-1.5">
                            <span className="h-6 px-2.5 inline-flex items-center gap-1 justify-center text-[10px] font-black uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>READY</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (onServeItem) {
                                  onServeItem(unit.orderItemId || String(unit.item.menuItem.id));
                                }
                              }}
                              className="h-6 px-2.5 rounded-lg text-[10px] sm:text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 active:scale-95 transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer animate-pulse"
                              title="Mark as Served to Seat"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Serve</span>
                            </button>
                          </div>
                        )}

                        {unit.stage === 'PREP' && (
                          <div className="flex items-center gap-1.5">
                            <span className="h-6 px-2.5 inline-flex items-center gap-1.5 justify-center text-[10px] font-black uppercase tracking-wider rounded-full bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                              <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-500 animate-pulse" />
                              <span>PREPARING</span>
                            </span>
                          </div>
                        )}

                        {unit.stage === 'REC' && (
                          <div className="flex items-center gap-1.5">
                            <span className="h-6 px-2.5 inline-flex items-center gap-1.5 justify-center text-[10px] font-black uppercase tracking-wider rounded-full bg-sky-50 text-sky-800 border border-sky-300 shadow-2xs">
                              <Clock className="w-3.5 h-3.5 text-sky-600" />
                              <span>RECEIVED</span>
                            </span>
                          </div>
                        )}

                        {unit.stage === 'PLACED' && (
                          <div className="flex items-center gap-1.5">
                            <span className="h-6 px-2.5 inline-flex items-center gap-1.5 justify-center text-[10px] font-black uppercase tracking-wider rounded-full bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              <span>PLACED</span>
                            </span>
                          </div>
                        )}

                        {isServed && (
                          <span className="h-6 px-2.5 inline-flex items-center gap-1.5 justify-center text-[10px] font-black uppercase tracking-wider rounded-full bg-slate-200 text-slate-700 border border-slate-300 shadow-2xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>SERVED</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Order Bill Financial Summary Card */}
        <div className="border border-slate-200 rounded-2xl p-3 bg-white shadow-xs space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-500 font-medium">
            <span>Items Subtotal ({totalItemCount} items)</span>
            <span className="font-bold text-slate-800">₹{subtotal}.00</span>
          </div>
          <div className="flex items-center justify-between text-slate-500 font-medium">
            <span>CGST + SGST (5%)</span>
            <span className="font-bold text-slate-800">₹{cgst + sgst}.00</span>
          </div>
          <div className="flex items-center justify-between text-slate-900 font-black text-sm pt-2 border-t border-slate-100">
            <span>Current Ticket Total</span>
            <span className="text-amber-700 font-black">₹{grandTotal}.00</span>
          </div>
        </div>

        {/* Customer Kitchen Instructions Note Box (Available when drafting additions) */}
        {draftItems.length > 0 && (
          <div className="border border-slate-200 rounded-2xl p-3 bg-white shadow-xs space-y-1.5">
            <label className="block text-[9px] font-black text-slate-600 uppercase tracking-wider">
              Kitchen Instructions / Notes
            </label>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={kitchenNotes}
                onChange={(e) => setKitchenNotes(e.target.value)}
                placeholder="E.g., less spicy, extra raita, donne on side..."
                className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* CART ACTION BUTTONS: Fire KOT, '+ Add More Items', 'Proceed to Bill', & 'Vacate Table' */}
        <div className="space-y-2 pt-1">
          {/* Button 0: Fire KOT to Kitchen for Draft Items */}
          {draftItems.length > 0 && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handlePunchOrder}
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 btn-press shadow-md transition-all cursor-pointer"
            >
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>
                {isSubmitting
                  ? 'FIRING TO KITCHEN...'
                  : `PUNCH KOT (${draftItems.reduce((acc, curr) => acc + curr.quantity, 0)} Items • ₹${draftItems.reduce((acc, curr) => acc + curr.lineTotal, 0)})`}
              </span>
            </button>
          )}

          {/* Button 1: Add More Items (Redirects back to Menu Catalog) */}
          <button
            type="button"
            onClick={onOpenMenu}
            className="w-full h-11 border-2 border-slate-900 bg-white hover:bg-slate-50 text-slate-900 font-black text-xs rounded-xl flex items-center justify-center gap-2 btn-press shadow-2xs transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-slate-900" />
            <span>ADD MORE ITEMS (OPEN MENU)</span>
          </button>

          {/* Button 2: Proceed to Bill Checkout */}
          <button
            type="button"
            disabled={cartItems.length === 0}
            onClick={() => onProceedToBill?.(seatNumber, guestName, grandTotal)}
            className={`w-full h-11 font-black text-xs rounded-xl flex items-center justify-center gap-2 btn-press transition-all ${
              cartItems.length === 0
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                : isBillRequested
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md cursor-pointer ring-2 ring-amber-400'
                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs cursor-pointer'
            }`}
            title={
              cartItems.length === 0
                ? 'No items on table to bill'
                : isBillRequested
                ? 'Customer requested bill via app - Click to settle'
                : 'Proceed to bill settlement'
            }
          >
            <Receipt className={`w-4 h-4 ${isBillRequested ? 'text-slate-950 stroke-[2.5]' : cartItems.length > 0 ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>
              {cartItems.length === 0
                ? 'NO ACTIVE ORDERS'
                : isBillRequested
                ? `★ BILL REQUESTED (₹${grandTotal})`
                : `SETTLE BILL (₹${grandTotal})`}
            </span>
          </button>

          {/* Button 3: Fast Vacate / Clean Table Control */}
          {onVacateTable && (
            <div className="pt-1">
              {!showVacateConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowVacateConfirm(true)}
                  className="w-full h-9 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Vacate & Reset Seat</span>
                </button>
              ) : (
                <div className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-rose-900">Vacate {seatNumber}?</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowVacateConfirm(false)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowVacateConfirm(false);
                        onVacateTable(seatNumber);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold"
                    >
                      Confirm Vacate
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileLiveCartKOT;
