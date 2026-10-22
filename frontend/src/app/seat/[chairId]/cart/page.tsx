'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Heart, Minus, Plus, Bell, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../../../../lib/context/CartContext';
import CustomerBottomNav from '../../../../components/navigation/CustomerBottomNav';
import { useHardwareBack } from '../../../../lib/hooks/useHardwareBack';
import { realtimeBridge, OrderItemRecord } from '../../../../lib/supabase';
import { 
  setActiveDiningSession, 
  getActiveDiningSession,
  clearActiveDiningSession,
  getDeviceToken, 
  isDeviceLockedToDifferentSeat 
} from '../../../../lib/session/diningSession';
import { getMenuItemById } from '../../../../lib/data/menuData';

export default function CustomerCartPage() {
  const params = useParams();
  const router = useRouter();
  const chairId = (params?.chairId as string) || '12';
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  }, [chairId, router]);

  // Device hardware back button & swipe back: return to menu
  useHardwareBack(`/seat/${chairId}/menu`);

  const { items, getItemQuantity, updateQuantity, likedItems, clearCart } = useCart();
  const likedCount = Object.values(likedItems).filter(Boolean).length;

  // Real items present in cart with quantity > 0 (strictly zero dummy items)
  const activeItemIds = useMemo(() => {
    return Object.keys(items).filter((id) => (items[id]?.quantity || 0) > 0);
  }, [items]);

  // Slidable suggestions to complement meal
  const extraItems = ['5', '6', '8', '10', '13', '14'].filter((id) => !activeItemIds.includes(id));

  // Compute live subtotal, GST (5%), and total
  const subtotal = useMemo(() => {
    return activeItemIds.reduce((sum, id) => {
      const qty = items[id]?.quantity || 0;
      const dish = getMenuItemById(id);
      return sum + dish.price * qty;
    }, 0);
  }, [activeItemIds, items]);

  const gstAmount = Math.round(subtotal * 0.05);
  const grandTotal = subtotal + gstAmount;

  const handlePlaceOrder = async () => {
    if (isSubmitting || activeItemIds.length === 0) return;
    setIsSubmitting(true);
    try {
      const ticketNum = `TK-${chairId}-${Math.floor(1000 + Math.random() * 9000)}`;
      
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
        const notes = notesParts.length > 0 ? notesParts.join(' • ') : undefined;
        const uniqueId = `item-${chairId}-${id}-${nowTs}-${idx}`;

        return {
          id: uniqueId,
          chair_id: chairId,
          seat_label: `SEAT ${chairId}`,
          dish_id: id.startsWith('dish-') ? id : `dish-${id}`,
          dish_name: catalogEntry.title,
          quantity: qty,
          price: catalogEntry.price,
          stage: 'PLACED' as const,
          notes,
          addons: cartEntry?.addOns,
        };
      });

      // 1. Anti-Cheat Check: Cannot place order for another seat if device owes a different seat
      const lockCheck = isDeviceLockedToDifferentSeat(chairId);
      if (lockCheck.isLocked && lockCheck.activeSeatId) {
        router.replace(`/seat/${lockCheck.activeSeatId}/tracking`);
        return;
      }

      // 2. Anti-Hijack Check: Verify seat is not occupied by another customer
      const deviceToken = getDeviceToken();
      const occupancy = await realtimeBridge.getSeatOccupancy(chairId, deviceToken);
      if (occupancy.isOccupied && !occupancy.isOwner) {
        router.replace(`/seat/${chairId}`);
        return;
      }

      if (!occupancy.isOccupied) {
        clearActiveDiningSession();
      }

      const existingSession = occupancy.isOccupied ? getActiveDiningSession() : null;
      const isSameSession =
        existingSession &&
        existingSession.seatId === chairId &&
        existingSession.paymentStatus === 'unpaid';

      if (typeof window !== 'undefined') {
        const cleanC = chairId.replace(/[^0-9]/g, '');
        try {
          localStorage.removeItem(`thoogudeepa_ticket_dispatched_${chairId}`);
          localStorage.removeItem(`thoogudeepa_ticket_dispatched_${cleanC}`);
          localStorage.removeItem(`thoogudeepa_item_stages_${chairId}`);
          localStorage.removeItem(`thoogudeepa_item_stages_${cleanC}`);
        } catch {}
      }

      const activeTicketNumber = isSameSession ? existingSession.ticketNumber : ticketNum;

      const orderRecord = {
        ticket_number: activeTicketNumber,
        chair_id: chairId,
        seat_label: `SEAT ${chairId}`,
        status: 'pending' as const,
        total_amount: grandTotal,
        device_token: deviceToken,
      };

      const result = await realtimeBridge.placeOrder(orderRecord, orderItems);
      const generatedOrderId = result.orderId || `ord-${Date.now()}`;

      const newDishes = orderItems.map((oi) => ({
        id: oi.id || oi.dish_id,
        dish_id: oi.dish_id,
        title: oi.dish_name,
        quantity: oi.quantity,
        price: oi.price,
        stage: 'PLACED' as const,
        notes: oi.notes,
        addons: oi.addons,
      }));

      const mergedDishes =
        isSameSession && existingSession.items && existingSession.items.length > 0
          ? [...existingSession.items, ...newDishes]
          : newDishes;

      const mergedTotal =
        (isSameSession && existingSession.totalAmount ? existingSession.totalAmount : 0) + grandTotal;

      setActiveDiningSession({
        seatId: chairId,
        ticketNumber: activeTicketNumber,
        orderId: isSameSession ? existingSession.orderId : generatedOrderId,
        orderStatus: 'pending',
        paymentStatus: 'unpaid',
        orderedAt: isSameSession ? existingSession.orderedAt : Date.now(),
        totalAmount: mergedTotal,
        deviceToken,
        items: mergedDishes,
      });

      // Clear tray after dispatch and reset any previous bill requests for fresh ordering
      clearCart();
      realtimeBridge.clearActiveBillRequest(chairId);

      router.push(`/seat/${chairId}/tracking`);
    } catch (err) {
      console.error('Order dispatch error:', err);
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

          {/* Right Notification Bell */}
          <Link
            href={`/seat/${chairId}/assistant?from=${encodeURIComponent(`/seat/${chairId}/cart`)}`}
            className="w-10 h-10 border border-[rgba(220,226,222,0.8)] rounded-xl flex items-center justify-center cursor-pointer active:opacity-70 bg-[#FFFEFC] text-[#244436] shadow-2xs"
            aria-label="Assistant & Call Waiter"
          >
            <Bell className="w-5 h-5" />
          </Link>
        </header>

        {/* Empty State Banner (Displayed when activeItemIds is 0) */}
        {activeItemIds.length === 0 ? (
          <div className="w-full border border-[rgba(220,226,222,0.8)] rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-3 bg-[#FFFEFC] mt-4 shadow-[0_4px_20px_-4px_rgba(36,68,54,0.06)]">
            <div className="w-16 h-16 rounded-full border border-[rgba(220,226,222,0.9)] flex items-center justify-center bg-[#F9F8F5]">
              <ShoppingBag className="w-8 h-8 text-[#5A6860]" />
            </div>
            <span className="text-sm font-black uppercase tracking-wider text-[#1A2621]">Your Tray is Empty</span>
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
            {activeItemIds.map((itemId) => {
              const qty = getItemQuantity(itemId) || 1;
              const dish = getMenuItemById(itemId);

              return (
                <div
                  key={itemId}
                  className="w-full border border-[rgba(220,226,222,0.8)] rounded-2xl p-3 flex items-center justify-between bg-[#FFFEFC] shadow-[0_4px_16px_-4px_rgba(36,68,54,0.05)] gap-3"
                >
                  {/* Circular Image Container */}
                  <div className="w-16 h-16 rounded-full border border-[rgba(220,226,222,0.9)] overflow-hidden flex items-center justify-center shrink-0 bg-[#fbf9f5] shadow-2xs p-0.5">
                    <img
                      src={dish.imageUrl}
                      alt={dish.title}
                      className="w-full h-full object-cover object-center rounded-full"
                      loading="lazy"
                    />
                  </div>

                  {/* Title and Price Section */}
                  <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                    <span className="text-xs font-bold text-[#1A2621] truncate">
                      {dish.title}
                    </span>
                    <span className="text-[11px] font-medium text-[#5A6860] line-clamp-1">
                      {dish.description}
                    </span>
                    <span className="text-xs font-black text-[#244436] mt-0.5">
                      ₹ {dish.price}
                    </span>
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

        {/* Horizontal Slidable Recommendations */}
        {extraItems.length > 0 && (
          <div className="w-full flex flex-col gap-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1A2621]">
                Recommended Complements
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
                    <div className="w-14 h-14 rounded-full border border-[rgba(220,226,222,0.9)] overflow-hidden flex items-center justify-center mb-1.5 bg-zinc-100 shadow-2xs">
                      <img
                        src={dish.imageUrl}
                        alt={dish.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>

                    <span className="text-xs font-bold truncate w-full text-[#1A2621]">
                      {dish.title}
                    </span>
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
          <div className="w-full flex flex-col gap-2.5 border-t border-[rgba(220,226,222,0.8)] pt-4 text-xs font-semibold bg-[#FFFEFC] p-4 rounded-2xl border shadow-[0_4px_20px_-4px_rgba(36,68,54,0.05)]">
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
            className="w-full bg-gradient-to-r from-[#244436] via-[#2d5242] to-[#DD6B28] text-white py-3.5 px-5 rounded-2xl flex items-center justify-between shadow-lg cursor-pointer active:scale-[0.99] transition-all disabled:opacity-50 hover:shadow-xl"
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
                {isSubmitting ? 'Sending to Kitchen...' : 'Send to Kitchen'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar */}
      <CustomerBottomNav chairId={chairId} activeTab="cart" />
    </div>
  );
}
