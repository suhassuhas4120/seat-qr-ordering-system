'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Minus,
  Plus,
  Bell,
  ShoppingBag,
  ArrowRight,
  Trash2,
  Edit3,
  Loader2,
  Sparkles,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { useCart } from '../../../../lib/context/CartContext';
import CustomerBottomNav from '../../../../components/navigation/CustomerBottomNav';
import { useHardwareBack } from '../../../../lib/hooks/useHardwareBack';
import { realtimeBridge, OrderItemRecord } from '../../../../lib/supabase';
import {
  setActiveDiningSession,
  getActiveDiningSession,
  clearActiveDiningSession,
  getDeviceToken,
  isDeviceLockedToDifferentSeat,
} from '../../../../lib/session/diningSession';
import { getMenuItemById } from '../../../../lib/data/menuData';

export default function CustomerCartPage() {
  const params = useParams();
  const router = useRouter();
  const chairId = (params?.chairId as string) || '12';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tableNote, setTableNote] = useState('');
  const [activeSessionInfo, setActiveSessionInfo] = useState<any>(null);

  // Anti-Cheat & Seat Occupancy Guard on mount
  useEffect(() => {
    // 1. Device Lockout check
    const lock = isDeviceLockedToDifferentSeat(chairId);
    if (lock.isLocked && lock.activeSeatId) {
      router.replace(`/seat/${lock.activeSeatId}/tracking`);
      return;
    }

    // 2. Seat Occupancy Anti-Hijack check
    async function checkOccupancy() {
      const token = getDeviceToken();
      const occ = await realtimeBridge.getSeatOccupancy(chairId, token);
      if (occ.isOccupied && !occ.isOwner) {
        router.replace(`/seat/${chairId}`);
      }
    }
    checkOccupancy();

    // Check existing dining session
    const currentSession = getActiveDiningSession();
    const cleanChair = chairId.replace(/[^0-9]/g, '');
    const cleanSessionSeat = (currentSession?.seatId || '').replace(/[^0-9]/g, '');
    if (
      currentSession &&
      (cleanSessionSeat === cleanChair || currentSession.seatId === chairId) &&
      currentSession.paymentStatus === 'unpaid'
    ) {
      setActiveSessionInfo(currentSession);
    }
  }, [chairId, router]);

  // Device hardware back button & swipe back: return to menu
  useHardwareBack(`/seat/${chairId}/menu`);

  const { items, getItemQuantity, updateQuantity, likedItems, clearCart } = useCart();
  const likedCount = Object.values(likedItems).filter(Boolean).length;

  // Real items present in cart with quantity > 0 (strictly zero dummy items)
  const activeItemIds = useMemo(() => {
    return Object.keys(items).filter((id) => (items[id]?.quantity || 0) > 0);
  }, [items]);

  // Slidable military hotel suggestions to complement meal
  const extraItems = ['dish-18', 'dish-21', 'dish-13', 'dish-5', 'dish-6', 'dish-10'].filter(
    (id) => !activeItemIds.includes(id) && !activeItemIds.includes(id.replace(/^dish-/, ''))
  );

  // Compute live subtotal, GST (5%), and total with add-ons surcharge
  const subtotal = useMemo(() => {
    return activeItemIds.reduce((sum, id) => {
      const entry = items[id];
      const qty = entry?.quantity || 0;
      const dish = getMenuItemById(id);
      const addOnsCost = entry?.addOnsCost || 0;
      return sum + (dish.price + addOnsCost) * qty;
    }, 0);
  }, [activeItemIds, items]);

  const gstAmount = Math.round(subtotal * 0.05);
  const grandTotal = subtotal + gstAmount;

  const handleClearCart = () => {
    if (window.confirm('Clear all dishes from your dining tray?')) {
      clearCart();
    }
  };

  const handlePlaceOrder = async () => {
    if (isSubmitting || activeItemIds.length === 0) return;
    setIsSubmitting(true);
    try {
      const nowTs = Date.now();
      const orderItems: OrderItemRecord[] = activeItemIds.map((id, idx) => {
        const qty = items[id]?.quantity || 1;
        const catalogEntry = getMenuItemById(id);
        const cartEntry = items[id];
        const notesParts: string[] = [];
        if (cartEntry?.selectedOption) {
          notesParts.push(`Option: ${cartEntry.selectedOption}`);
        }
        if (cartEntry?.addOns && cartEntry.addOns.length > 0) {
          notesParts.push(`Add-ons: ${cartEntry.addOns.join(', ')}`);
        }
        if (cartEntry?.specialInstructions) {
          notesParts.push(`Note: ${cartEntry.specialInstructions}`);
        }
        if (tableNote.trim()) {
          notesParts.push(`Table Request: ${tableNote.trim()}`);
        }
        const notes = notesParts.length > 0 ? notesParts.join(' • ') : undefined;
        const uniqueId = `item-${chairId}-${id}-${nowTs}-${idx}`;
        const unitPriceWithAddons = catalogEntry.price + (cartEntry?.addOnsCost || 0);

        return {
          id: uniqueId,
          chair_id: chairId,
          seat_label: `SEAT ${chairId}`,
          dish_id: id.startsWith('dish-') ? id : `dish-${id}`,
          dish_name: catalogEntry.title,
          quantity: qty,
          price: unitPriceWithAddons,
          stage: 'PLACED' as const,
          notes,
          addons: cartEntry?.addOns,
        };
      });

      // 1. Anti-Cheat Check: Cannot place order for another seat if device owes a different seat
      const deviceToken = getDeviceToken();
      const lockCheck = isDeviceLockedToDifferentSeat(chairId);
      if (lockCheck.isLocked && lockCheck.activeSeatId) {
        const prevOcc = await realtimeBridge.getSeatOccupancy(lockCheck.activeSeatId, deviceToken);
        if (prevOcc.isOccupied) {
          router.replace(`/seat/${lockCheck.activeSeatId}/tracking`);
          return;
        } else {
          clearActiveDiningSession();
        }
      }

      // 2. Anti-Hijack Check: Verify seat is not occupied by another customer
      const occupancy = await realtimeBridge.getSeatOccupancy(chairId, deviceToken);
      if (occupancy.isOccupied && !occupancy.isOwner) {
        router.replace(`/seat/${chairId}`);
        return;
      }

      const cleanChair = chairId.replace(/[^0-9]/g, '');
      const existingSession = getActiveDiningSession();
      const cleanSessionSeat = (existingSession?.seatId || '').replace(/[^0-9]/g, '');
      const isSameSession =
        Boolean(existingSession &&
        (cleanSessionSeat === cleanChair || existingSession.seatId === chairId) &&
        existingSession.paymentStatus === 'unpaid');

      if (!occupancy.isOccupied && !isSameSession) {
        clearActiveDiningSession();
      }

      // Only clear cached dispatched tickets if this is a fresh new session
      if (!isSameSession && typeof window !== 'undefined') {
        const cleanC = chairId.replace(/[^0-9]/g, '');
        try {
          localStorage.removeItem(`thoogudeepa_ticket_dispatched_${chairId}`);
          localStorage.removeItem(`thoogudeepa_ticket_dispatched_${cleanC}`);
          localStorage.removeItem(`thoogudeepa_item_stages_${chairId}`);
          localStorage.removeItem(`thoogudeepa_item_stages_${cleanC}`);
        } catch {}
      }

      const fallbackTicket = isSameSession && existingSession.ticketNumber && !existingSession.ticketNumber.startsWith('TK-')
        ? existingSession.ticketNumber
        : `ORD-${chairId}`;

      const orderRecord = {
        ticket_number: fallbackTicket,
        chair_id: chairId,
        seat_label: `SEAT ${chairId}`,
        status: 'pending' as const,
        total_amount: grandTotal,
        device_token: deviceToken,
      };

      const result = await realtimeBridge.placeOrder(orderRecord, orderItems);
      const confirmedTicket = result.ticketNumber || orderRecord.ticket_number;
      const confirmedOrderId = result.orderId || `ord-${Date.now()}`;

      // Immediately synchronize authoritative active seat tab from server to guarantee exact totals & tickets
      const tab = await realtimeBridge.getOrderForSeat(cleanChair || chairId);
      const authoritativeTicket = tab.order?.ticket_number || confirmedTicket;
      let computedFromTab = 0;
      if (tab.items && tab.items.length > 0) {
        const sub = tab.items.reduce((acc, it) => acc + (it.price * (it.quantity || 1)), 0);
        computedFromTab = sub + Math.round(sub * 0.05);
      }
      const authoritativeTotal = (tab.order?.total_amount && tab.order.total_amount > 0)
        ? tab.order.total_amount
        : (computedFromTab > 0
            ? computedFromTab
            : ((isSameSession && existingSession.totalAmount ? existingSession.totalAmount : 0) + grandTotal));

      const authoritativeItems = tab.items && tab.items.length > 0
        ? tab.items.map((it) => ({
            id: it.id,
            dish_id: it.dish_id,
            title: it.dish_name || 'Dish',
            quantity: it.quantity,
            price: it.price,
            stage: it.stage,
            notes: it.notes,
            addons: it.addons,
          }))
        : orderItems.map((oi) => ({
            id: oi.id || oi.dish_id,
            dish_id: oi.dish_id,
            title: oi.dish_name,
            quantity: oi.quantity,
            price: oi.price,
            stage: 'PLACED' as const,
            notes: oi.notes,
            addons: oi.addons,
          }));

      // Preserve existing items if this is an additional ordering round
      let finalItems = authoritativeItems;
      if (isSameSession && (!tab.items || tab.items.length === 0) && existingSession?.items?.length) {
        const mappedPrev = existingSession.items.map((it) => ({
          id: it.id,
          dish_id: it.dish_id || it.id,
          title: it.title || 'Dish',
          quantity: it.quantity,
          price: it.price,
          stage: it.stage || ('PLACED' as const),
          notes: it.notes || '',
          addons: it.addons || [],
        }));
        finalItems = [...mappedPrev, ...authoritativeItems];
      }

      const storedCustName = typeof window !== 'undefined'
        ? (sessionStorage.getItem(`thoogudeepa_customer_name_${chairId}`) || localStorage.getItem(`thoogudeepa_customer_name_${chairId}`) || undefined)
        : undefined;

      setActiveDiningSession({
        seatId: chairId,
        ticketNumber: authoritativeTicket,
        orderId: confirmedOrderId,
        orderStatus: 'pending',
        paymentStatus: 'unpaid',
        orderedAt: isSameSession ? existingSession.orderedAt : Date.now(),
        totalAmount: authoritativeTotal,
        deviceToken,
        customerName: isSameSession ? (existingSession.customerName || storedCustName) : storedCustName,
        items: finalItems,
      });

      // Clear tray after dispatch and reset any previous bill requests for fresh ordering
      clearCart();
      realtimeBridge.clearActiveBillRequest(chairId);

      router.push(`/seat/${chairId}/tracking`);
    } catch (err: any) {
      console.error('Order dispatch error:', err);
      if (err?.message?.includes('SEAT_ALREADY_OCCUPIED') || err?.message?.includes('occupied')) {
        alert('This table has just been occupied by another customer. Please scan a vacant table.');
        router.replace(`/seat/${chairId}`);
        return;
      }
      if (err?.message?.includes('ACTIVE_SESSION_EXISTS')) {
        alert(err.message || 'You currently have an unsettled dining session at another table.');
        router.replace(`/seat/${chairId}`);
        return;
      }
      router.push(`/seat/${chairId}/tracking`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between max-w-md mx-auto relative px-4 pt-4 pb-36 text-[#1A2621]">
      {/* Top and Middle Content */}
      <div className="w-full flex flex-col gap-5">
        {/* Top Header */}
        <header className="w-full flex items-center justify-between py-2 border-b border-[rgba(220,226,222,0.7)] pb-3">
          {/* Back Navigation Button to Menu */}
          <Link
            href={`/seat/${chairId}/menu`}
            className="w-10 h-10 border border-[rgba(220,226,222,0.8)] rounded-xl flex items-center justify-center cursor-pointer active:opacity-70 bg-[#FFFEFC] text-[#1A2621] shadow-2xs"
            aria-label="Back to Menu"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          {/* Center Title */}
          <div className="flex flex-col items-center">
            <h1 className="text-base font-bold tracking-tight text-[#1A2621]">Your Tray</h1>
            <span className="text-[10px] text-[#5A6860] font-bold uppercase tracking-wider">
              Seat #{chairId}
            </span>
          </div>

          {/* Right Action: Call Waiter or Clear Cart */}
          <div className="flex items-center gap-2">
            {activeItemIds.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="w-10 h-10 border border-red-200 rounded-xl flex items-center justify-center cursor-pointer active:opacity-70 bg-red-50 text-red-600 shadow-2xs"
                title="Clear Tray"
                aria-label="Clear Tray"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <Link
              href={`/seat/${chairId}/assistant?from=${encodeURIComponent(`/seat/${chairId}/cart`)}`}
              className="w-10 h-10 border border-[rgba(220,226,222,0.8)] rounded-xl flex items-center justify-center cursor-pointer active:opacity-70 bg-[#FFFEFC] text-[#244436] shadow-2xs"
              aria-label="Assistant & Call Waiter"
            >
              <Bell className="w-5 h-5" />
            </Link>
          </div>
        </header>

        {/* Existing Active Tab Banner (if customer is adding more dishes to their table) */}
        {activeSessionInfo && (
          <div className="w-full flex items-center justify-between bg-emerald-50/90 border border-emerald-200 rounded-2xl px-3.5 py-2.5 text-xs shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
              <div className="flex flex-col">
                <span className="font-bold text-[#1A2621]">
                  Active Meal Tab #{activeSessionInfo.ticketNumber || `ORD-${chairId}`}
                </span>
                <span className="text-[10px] text-[#5A6860]">
                  Running balance: ₹{activeSessionInfo.totalAmount || 0}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
              Round 2 Ordering
            </span>
          </div>
        )}

        {/* Empty State Banner (Displayed when activeItemIds is 0) */}
        {activeItemIds.length === 0 ? (
          <div className="w-full border border-[rgba(220,226,222,0.8)] rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-3 bg-[#FFFEFC] mt-4 shadow-[0_4px_20px_-4px_rgba(36,68,54,0.06)]">
            <div className="w-16 h-16 rounded-full border border-[rgba(220,226,222,0.9)] flex items-center justify-center bg-[#F9F8F5]">
              <ShoppingBag className="w-8 h-8 text-[#5A6860]" />
            </div>
            <span className="text-sm font-black uppercase tracking-wider text-[#1A2621]">
              Your Tray is Empty
            </span>
            <p className="text-xs text-[#5A6860] max-w-xs">
              Explore authentic donne biryani, sizzling kebabs, and country curries from the menu.
            </p>
            <Link
              href={`/seat/${chairId}/menu`}
              className="mt-2 bg-gradient-to-r from-[#244436] to-[#DD6B28] text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:opacity-95"
            >
              Explore Menu
            </Link>
          </div>
        ) : (
          /* Active Cart Items List */
          <div className="w-full flex flex-col gap-3.5">
            <div className="w-full flex items-center justify-between text-xs font-bold text-[#5A6860]">
              <span>Dishes Selected ({activeItemIds.length})</span>
              <Link
                href={`/seat/${chairId}/menu`}
                className="text-xs text-[#244436] font-bold hover:underline"
              >
                + Add More Dishes
              </Link>
            </div>

            {activeItemIds.map((itemId) => {
              const qty = getItemQuantity(itemId) || 1;
              const dish = getMenuItemById(itemId);
              const entry = items[itemId];
              const addOnsCost = entry?.addOnsCost || 0;
              const lineItemTotal = (dish.price + addOnsCost) * qty;

              return (
                <div
                  key={itemId}
                  className="w-full border border-[rgba(220,226,222,0.8)] rounded-2xl p-3 flex items-center justify-between bg-[#FFFEFC] shadow-[0_4px_16px_-4px_rgba(36,68,54,0.05)] gap-3"
                >
                  {/* Clickable Circular Image Container leading to customization */}
                  <Link
                    href={`/seat/${chairId}/item/${itemId}`}
                    className="w-16 h-16 rounded-full border border-[rgba(220,226,222,0.9)] overflow-hidden flex items-center justify-center shrink-0 bg-[#fbf9f5] shadow-2xs p-0.5 hover:scale-105 transition-transform"
                    title="Edit dish customization"
                  >
                    <img
                      src={dish.imageUrl}
                      alt={dish.title}
                      className="w-full h-full object-cover object-center rounded-full"
                      loading="lazy"
                    />
                  </Link>

                  {/* Title and Customization Details Section */}
                  <div className="flex-1 flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {/* FSSAI Official Dietary Indicator */}
                      <span
                        className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center shrink-0 p-0.5 ${
                          dish.isVegetarian
                            ? 'border-emerald-600 bg-emerald-50/60'
                            : 'border-red-600 bg-red-50/60'
                        }`}
                        title={dish.isVegetarian ? 'Vegetarian' : 'Non-Vegetarian'}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            dish.isVegetarian ? 'bg-emerald-600' : 'bg-red-600'
                          }`}
                        />
                      </span>

                      <Link
                        href={`/seat/${chairId}/item/${itemId}`}
                        className="text-xs font-bold text-[#1A2621] truncate hover:text-[#244436] hover:underline flex items-center gap-1"
                        title="Click to customize"
                      >
                        <span className="truncate">{dish.title}</span>
                        <Edit3 className="w-3 h-3 text-[#5A6860] shrink-0 opacity-60" />
                      </Link>
                    </div>

                    {entry?.selectedOption && (
                      <span className="text-[10px] font-semibold text-[#244436] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 w-fit">
                        {entry.selectedOption}
                      </span>
                    )}

                    {entry?.addOns && entry.addOns.length > 0 && (
                      <span className="text-[10px] text-[#5A6860] line-clamp-1">
                        + {entry.addOns.join(', ')}
                      </span>
                    )}

                    {entry?.specialInstructions && (
                      <span className="text-[10px] italic text-amber-800 line-clamp-1">
                        Note: &ldquo;{entry.specialInstructions}&rdquo;
                      </span>
                    )}

                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs font-black text-[#244436]">
                        ₹ {lineItemTotal}
                      </span>
                      {addOnsCost > 0 && (
                        <span className="text-[10px] text-[#5A6860] font-medium">
                          (₹{dish.price + addOnsCost} ea)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stepper Pill */}
                  <div className="flex items-center border border-[#244436] rounded-xl bg-[#244436] text-white px-2 py-1 gap-2 shrink-0 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => updateQuantity(itemId, Math.max(0, qty - 1))}
                      className="w-5 h-5 flex items-center justify-center font-bold text-sm cursor-pointer active:opacity-70"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-black min-w-[14px] text-center">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(itemId, qty + 1)}
                      className="w-5 h-5 flex items-center justify-center font-bold text-sm cursor-pointer active:opacity-70"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* General Kitchen & Table Request Input */}
        {activeItemIds.length > 0 && (
          <div className="w-full flex flex-col gap-1.5 border border-[rgba(220,226,222,0.8)] rounded-2xl p-3 bg-[#FFFEFC] shadow-2xs">
            <label
              htmlFor="table-note"
              className="text-xs font-black uppercase tracking-wider text-[#1A2621] flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#244436]" />
              <span>Table Request / Kitchen Note</span>
            </label>
            <input
              id="table-note"
              type="text"
              value={tableNote}
              onChange={(e) => setTableNote(e.target.value.slice(0, 100))}
              placeholder="e.g. Serve all dishes together, bring water first..."
              className="w-full text-xs p-2.5 rounded-xl border border-[rgba(220,226,222,0.9)] bg-[#FAF8F5] text-[#1A2621] placeholder:text-[#8A968F] focus:outline-hidden focus:border-[#244436] focus:bg-white"
            />
          </div>
        )}

        {/* Horizontal Slidable Recommendations */}
        {extraItems.length > 0 && (
          <div className="w-full flex flex-col gap-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1A2621] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#DD6B28]" />
                <span>Recommended Complements</span>
              </span>
            </div>

            <div className="w-full flex items-center gap-3 overflow-x-auto no-scrollbar py-2">
              {extraItems.map((extraId) => {
                const dish = getMenuItemById(extraId);
                const extraQty = getItemQuantity(extraId);

                return (
                  <div
                    key={extraId}
                    className="w-36 shrink-0 border border-[rgba(220,226,222,0.8)] rounded-2xl p-3 flex flex-col items-center text-center bg-[#FFFEFC] shadow-[0_4px_16px_-4px_rgba(36,68,54,0.05)]"
                  >
                    <Link
                      href={`/seat/${chairId}/item/${extraId}`}
                      className="w-14 h-14 rounded-full border border-[rgba(220,226,222,0.9)] overflow-hidden flex items-center justify-center mb-1.5 bg-zinc-100 shadow-2xs hover:scale-105 transition-transform"
                    >
                      <img
                        src={dish.imageUrl}
                        alt={dish.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </Link>

                    <div className="w-full flex items-center justify-center gap-1">
                      <span
                        className={`w-2.5 h-2.5 rounded-[2px] border flex items-center justify-center shrink-0 p-0.5 ${
                          dish.isVegetarian
                            ? 'border-emerald-600 bg-emerald-50'
                            : 'border-red-600 bg-red-50'
                        }`}
                      >
                        <span
                          className={`w-1 h-1 rounded-full ${
                            dish.isVegetarian ? 'bg-emerald-600' : 'bg-red-600'
                          }`}
                        />
                      </span>
                      <span className="text-xs font-bold truncate text-[#1A2621]">
                        {dish.title}
                      </span>
                    </div>

                    <span className="text-[11px] font-black text-[#244436] mt-0.5">
                      ₹ {dish.price}
                    </span>

                    {extraQty === 0 ? (
                      <button
                        type="button"
                        onClick={() => updateQuantity(extraId, 1)}
                        className="w-full mt-2 py-1 border border-[#244436]/30 rounded-lg text-[11px] font-black uppercase bg-[#244436] text-white cursor-pointer active:opacity-85 shadow-2xs"
                      >
                        + Add
                      </button>
                    ) : (
                      <div className="w-full mt-2 flex items-center justify-between border border-[#244436] rounded-lg bg-[#244436] text-white px-2 py-0.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(extraId, extraQty - 1)}
                          className="text-xs font-bold px-1 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-[11px] font-bold">{extraQty}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(extraId, extraQty + 1)}
                          className="text-xs font-bold px-1 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Live Bill Breakdown */}
        {activeItemIds.length > 0 && (
          <div className="w-full flex flex-col gap-2.5 border border-[rgba(220,226,222,0.8)] text-xs font-semibold bg-[#FFFEFC] p-4 rounded-2xl shadow-[0_4px_20px_-4px_rgba(36,68,54,0.05)]">
            <div className="w-full flex items-center justify-between text-[#5A6860]">
              <span>Subtotal ({activeItemIds.length} dishes)</span>
              <span className="font-bold text-[#1A2621]">₹ {subtotal}</span>
            </div>
            <div className="w-full flex items-center justify-between text-[#5A6860]">
              <span>GST (5%)</span>
              <span className="font-bold text-[#1A2621]">₹ {gstAmount}</span>
            </div>
            <div className="w-full flex items-center justify-between text-sm font-black border-t border-[rgba(220,226,222,0.8)] pt-2 text-[#1A2621]">
              <span>Grand Total</span>
              <span className="text-base font-black text-[#244436]">₹ {grandTotal}</span>
            </div>
          </div>
        )}
      </div>

      {/* Floating Order Dispatch Footer */}
      {activeItemIds.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-30 max-w-md mx-auto px-4 py-2 bg-[#FFFEFC]/95 backdrop-blur-md border-t border-[rgba(220,226,222,0.7)]">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handlePlaceOrder}
            className="w-full bg-gradient-to-r from-[#244436] via-[#2d5242] to-[#DD6B28] text-white py-3.5 px-5 rounded-2xl flex items-center justify-between shadow-lg cursor-pointer active:scale-[0.99] transition-all disabled:opacity-60 hover:shadow-xl"
          >
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-100">
                {activeItemIds.length} Dishes
              </span>
              <span className="text-base font-black">
                ₹ {grandTotal}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider uppercase">
                {isSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Sending to Kitchen...</span>
                  </span>
                ) : activeSessionInfo ? (
                  'Add Dishes to Active Tab'
                ) : (
                  'Send to Kitchen'
                )}
              </span>
              {!isSubmitting && <ArrowRight className="w-4 h-4" />}
            </div>
          </button>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar */}
      <CustomerBottomNav chairId={chairId} activeTab="cart" />
    </div>
  );
}
