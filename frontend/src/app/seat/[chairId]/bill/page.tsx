'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, Bell, ArrowLeft, Ticket, Banknote, Scan, Receipt, ArrowRight, QrCode, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { useHardwareBack } from '../../../../lib/hooks/useHardwareBack';
import { getActiveDiningSession, setActiveDiningSession, ActiveDiningSession } from '../../../../lib/session/diningSession';
import { realtimeBridge } from '../../../../lib/supabase';

export default function OrderSummaryBillPage() {
  const params = useParams();
  const chairId = (params?.chairId as string) || '12';

  // Device hardware back button & swipe back: return to live tracking
  useHardwareBack(`/seat/${chairId}/tracking`);

  const seatNumber = chairId.replace(/[^0-9]/g, '') || chairId;

  const [session, setSession] = useState<ActiveDiningSession | null>(null);
  const [promoCode, setPromoCode] = useState<string>('');
  const [selectedTip, setSelectedTip] = useState<string>('None');
  const [showWaiterModal, setShowWaiterModal] = useState<boolean>(false);
  const [waiterCalled, setWaiterCalled] = useState<boolean>(false);
  const [waiterSelectedMode, setWaiterSelectedMode] = useState<'none' | 'qr' | 'cash'>('none');
  const [isReportingPaid, setIsReportingPaid] = useState<boolean>(false);
  const [selectedPaymentSubMode, setSelectedPaymentSubMode] = useState<'scan' | 'cash'>('cash');

  const tipOptions = ['None', '₹ 30', '₹ 50', '₹ 100'];

  const handleSelectTip = (opt: string) => {
    setSelectedTip(opt);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`thoogudeepa_selected_tip_${chairId}`, opt);
    }
  };

  const itemsList = session?.items && session.items.length > 0 ? session.items : [];
  const itemsSubtotal = itemsList.length > 0
    ? itemsList.reduce((acc, it) => acc + it.price * it.quantity, 0)
    : (session?.totalAmount ? Math.round(session.totalAmount / 1.05) : 0);

  const cgst = Math.round(itemsSubtotal * 0.025);
  const sgst = Math.round(itemsSubtotal * 0.025);
  const gstAmount = cgst + sgst;
  const billTotal = itemsSubtotal + gstAmount;

  const tipAmount = selectedTip === '₹ 30' ? 30 : selectedTip === '₹ 50' ? 50 : selectedTip === '₹ 100' ? 100 : 0;
  const grandPayable = billTotal + tipAmount;

  const sessionRef = React.useRef(session);
  sessionRef.current = session;
  const grandPayableRef = React.useRef(grandPayable);
  grandPayableRef.current = grandPayable;
  const itemsSubtotalRef = React.useRef(itemsSubtotal);
  itemsSubtotalRef.current = itemsSubtotal;
  const tipAmountRef = React.useRef(tipAmount);
  tipAmountRef.current = tipAmount;

  const normalizeSeatId = (id?: string | null) => (id || '').replace(/[^0-9]/g, '').replace(/^0+/, '') || '0';

  const handleCallCaptain = () => {
    setWaiterCalled(true);
    setShowWaiterModal(false);
    const cleanNum = normalizeSeatId(chairId);
    const paddedSeat = `Seat ${cleanNum.padStart(2, '0')}`;
    realtimeBridge.requestBill(chairId, grandPayable, {
      chairId,
      seatNumber: paddedSeat,
      orderId: session?.orderId || '',
      ticketNumber: session?.ticketNumber,
      amount: grandPayable,
      items: (session?.items || []).map((it) => ({
        id: it.id,
        title: it.title,
        quantity: it.quantity,
        price: it.price,
      })),
    });
    realtimeBridge.sendServiceAlert({
      seatNumber: paddedSeat,
      title: `Bill Requested (₹${grandPayable})`,
      message: `Bill settlement requested for Seat ${cleanNum}: ₹${grandPayable}${tipAmount > 0 ? ` (incl. ₹${tipAmount} tip)` : ''}`,
      guestName: `Seat ${cleanNum} Guest`,
      type: 'customer_call',
      billAmount: grandPayable,
      isUrgent: true,
    }).catch(console.error);
  };

  useEffect(() => {
    if (waiterSelectedMode === 'qr' || waiterSelectedMode === 'cash') {
      const el = document.getElementById('waiter-payment-sync-card');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [waiterSelectedMode]);

  useEffect(() => {
    // Restore any previously chosen tip for this seat
    if (typeof window !== 'undefined') {
      const storedTip = sessionStorage.getItem(`thoogudeepa_selected_tip_${chairId}`);
      if (storedTip) {
        setSelectedTip(storedTip);
      }
    }

    const cleanChair = chairId.replace(/[^0-9]/g, '');
    const normChair = normalizeSeatId(chairId);

    // 1. Check if bill request is already active
    const activeReq =
      realtimeBridge.getActiveBillRequest(chairId) ||
      realtimeBridge.getActiveBillRequest(cleanChair) ||
      realtimeBridge.getActiveBillRequest(normChair);

    if (activeReq) {
      setWaiterCalled(true);
    }

    // 2. Fetch authoritative live order for this specific seat from floor orders
    realtimeBridge.getOrderForSeat(cleanChair || chairId).then((res) => {
      if (res.order && res.items && res.items.length > 0) {
        const liveItems = res.items.map((it, idx) => ({
          id: it.id || it.dish_id || `item-${cleanChair}-${idx}`,
          dish_id: it.dish_id,
          title: it.dish_name || 'Dish',
          quantity: it.quantity,
          price: it.price,
          stage: it.stage,
          notes: it.notes,
          addons: it.addons,
        }));
        const liveSession: ActiveDiningSession = {
          seatId: chairId,
          ticketNumber: res.order.ticket_number || '',
          orderId: res.order.id || `ord-${Date.now()}`,
          orderStatus: 'pending',
          paymentStatus: 'unpaid',
          orderedAt: res.order.created_at ? new Date(res.order.created_at).getTime() : Date.now(),
          totalAmount: res.order.total_amount || liveItems.reduce((acc, it) => acc + it.price * it.quantity, 0),
          items: liveItems,
        };
        setSession(liveSession);
        setActiveDiningSession(liveSession);
      } else if (activeReq && activeReq.items && activeReq.items.length > 0) {
        const verifiedSession: ActiveDiningSession = {
          seatId: chairId,
          ticketNumber: activeReq.ticketNumber || '',
          orderId: activeReq.orderId || `ord-${Date.now()}`,
          orderStatus: 'pending',
          paymentStatus: 'unpaid',
          orderedAt: activeReq.requestedAt || Date.now(),
          totalAmount: activeReq.amount,
          items: activeReq.items.map((it, idx) => ({
            id: it.id || `item-${chairId}-${idx}`,
            title: it.title || it.dish_name || 'Dish',
            quantity: it.quantity,
            price: it.price,
          })),
        };
        setSession(verifiedSession);
        setActiveDiningSession(verifiedSession);
      } else {
        // 3. Fallback to local dining session if order is pending sync
        const s = getActiveDiningSession();
        if (s && s.paymentStatus === 'unpaid') {
          if (s.seatId !== chairId) {
            window.location.replace(`/seat/${s.seatId}/bill`);
            return;
          }
          setSession(s);
        }
      }
    });

    // Supplementary check: if seat is already in billing mode from waiter actions
    realtimeBridge.getFloorSeats().then((floorSeats) => {
      const currentSeat = floorSeats.find((s) => {
        const c1 = normalizeSeatId(s.seatNumber);
        const c2 = normalizeSeatId(s.id);
        return c1 === normChair || c2 === normChair || s.id === chairId;
      });
      if (currentSeat && currentSeat.status === 'billing') {
        setWaiterCalled(true);
        setWaiterSelectedMode('qr');
      }
    });

    const unsub = realtimeBridge.subscribeKDS({
      onBillModeActive: (data) => {
        const targetNorm = normalizeSeatId(data.normChairId || data.chairId || data.rawChairId);
        const currentNorm = normalizeSeatId(chairId);
        if (targetNorm === currentNorm || data.chairId === chairId || data.rawChairId === chairId) {
          setWaiterCalled(true);
          const activeMode = data.mode === 'cash' ? 'cash' : 'qr';
          setWaiterSelectedMode(activeMode);
        }
      },
      onBillRequested: (data) => {
        const targetNorm = normalizeSeatId(data.normChairId || data.chairId);
        const currentNorm = normalizeSeatId(chairId);
        if (targetNorm === currentNorm || data.chairId === chairId) {
          setWaiterCalled(true);
          if (data.verification?.items && data.verification.items.length > 0) {
            const syncedItems = data.verification.items.map((it, idx) => ({
              id: it.id || `item-${chairId}-${idx}`,
              title: it.title || it.dish_name || 'Dish',
              quantity: it.quantity,
              price: it.price,
            }));
            const updated: ActiveDiningSession = {
              seatId: chairId,
              ticketNumber: data.verification.ticketNumber || '',
              orderId: data.verification.orderId || '',
              orderStatus: 'pending',
              paymentStatus: 'unpaid',
              orderedAt: Date.now(),
              totalAmount: data.amount || syncedItems.reduce((acc, it) => acc + it.price * it.quantity, 0),
              items: syncedItems,
            };
            setSession(updated);
            setActiveDiningSession(updated);
          }
        }
      },
      onBillSettled: (data) => {
        const targetNorm = normalizeSeatId(data.normChairId || data.chairId || data.rawChairId);
        const currentNorm = normalizeSeatId(chairId);
        if (targetNorm === currentNorm || data.chairId === chairId || data.rawChairId === chairId) {
          const modeVal = data.paymentMethod || 'Cash';
          const amtVal = data.amount || grandPayableRef.current;
          try {
            localStorage.setItem(
              `thoogudeepa_settled_receipt_${chairId}`,
              JSON.stringify({
                ticketNumber: sessionRef.current?.ticketNumber || data.ticketNumber,
                seatId: chairId,
                items: sessionRef.current?.items || [],
                subtotal: itemsSubtotalRef.current,
                tip: tipAmountRef.current,
                totalAmount: amtVal,
                mode: modeVal,
                settledAt: Date.now(),
              })
            );
          } catch {}
          window.location.replace(`/seat/${chairId}/payment-success?mode=${encodeURIComponent(modeVal)}&amount=${amtVal}&tip=${tipAmountRef.current}`);
        }
      },
      onSeatOccupancyChange: (data) => {
        const targetNorm = normalizeSeatId(data.chairId);
        const currentNorm = normalizeSeatId(chairId);
        if ((targetNorm === currentNorm || data.chairId === chairId) && !data.isOccupied) {
          window.location.replace(`/seat/${chairId}/payment-success?mode=Cash&amount=${grandPayableRef.current}&tip=${tipAmountRef.current}`);
        }
      }
    });

    return () => unsub();
  }, [chairId]);

  const handleCustomerConfirmQrPayment = async () => {
    setIsReportingPaid(true);
    await realtimeBridge.notifyCustomerPaidUpi({
      chairId,
      rawChairId: chairId,
      amount: grandPayable,
      ticketNumber: session?.ticketNumber,
    });
    try {
      localStorage.setItem(
        `thoogudeepa_settled_receipt_${chairId}`,
        JSON.stringify({
          ticketNumber: session?.ticketNumber,
          seatId: chairId,
          items: session?.items || [],
          subtotal: itemsSubtotal,
          tip: tipAmount,
          totalAmount: grandPayable,
          mode: 'UPI QR',
          settledAt: Date.now(),
        })
      );
    } catch {}
    window.location.replace(`/seat/${chairId}/payment-success?mode=UPI%20QR&amount=${grandPayable}&tip=${tipAmount}`);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between max-w-md mx-auto relative px-4 pt-4 pb-28 text-[#1A2621]">
      {/* Scrollable Content Container */}
      <div className="w-full flex flex-col gap-5">
        {/* Top Header */}
        <header className="w-full flex items-center justify-between py-2 border-b border-[rgba(220,226,222,0.7)] pb-3">
          <Link
            href={`/seat/${chairId}/tracking`}
            className="w-10 h-10 border border-[rgba(220,226,222,0.8)] rounded-xl flex items-center justify-center cursor-pointer active:opacity-70 bg-[#FFFEFC] text-[#1A2621] shadow-2xs"
            aria-label="Back to Tracking"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          <div className="text-center flex flex-col items-center">
            <span className="text-xs font-black tracking-widest uppercase text-[#1A2621]">
              Order Summary
            </span>
            <span className="text-[10px] text-[#5A6860] font-bold uppercase mt-0.5">
              Seat #{seatNumber}
            </span>
          </div>

          <Link
            href={`/seat/${chairId}/assistant?from=${encodeURIComponent(`/seat/${chairId}/bill`)}`}
            className="w-10 h-10 border border-[rgba(220,226,222,0.8)] rounded-xl flex items-center justify-center cursor-pointer active:opacity-70 bg-[#FFFEFC] text-[#244436] shadow-2xs"
            aria-label="Assistant & Call Waiter"
          >
            <Bell className="w-5 h-5" />
          </Link>
        </header>

        {/* Card 1: Items & Price Breakdown Section */}
        <div className="w-full border border-[rgba(220,226,222,0.8)] rounded-2xl p-4 flex flex-col gap-4 bg-[#FFFEFC] shadow-[0_4px_20px_-4px_rgba(36,68,54,0.06)] print:hidden">
          {!session ? (
            <div className="w-full py-8 flex flex-col items-center justify-center text-center gap-2">
              <Receipt className="w-8 h-8 text-[#5A6860]" />
              <span className="text-xs font-bold text-[#5A6860]">
                No active unsettled bill for Seat #{seatNumber}.
              </span>
              <Link
                href={`/seat/${chairId}/menu`}
                className="mt-1 px-4 py-2 rounded-xl bg-gradient-to-r from-[#244436] to-[#DD6B28] text-white text-[11px] font-black uppercase tracking-wider shadow-md hover:opacity-95"
              >
                Order Dishes First
              </Link>
            </div>
          ) : (
            <>
              {/* Section Header */}
              <div className="w-full flex items-center justify-between border-b border-[rgba(220,226,222,0.7)] pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#1A2621]">
                  Ticket #{session.ticketNumber}
                </span>
                <span className="text-[10px] font-bold border border-[#244436]/20 px-2 py-0.5 rounded-full uppercase bg-[#F9F8F5] text-[#244436]">
                  Dine-In
                </span>
              </div>

              {/* Real Order Breakdown with Each Item & Price */}
              {itemsList.length > 0 ? (
                <div className="w-full flex flex-col gap-2.5 py-1">
                  {itemsList.map((it, idx) => (
                    <div key={idx} className="w-full flex items-center justify-between text-xs py-0.5">
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="font-bold text-[#1A2621] truncate">
                          {it.quantity} &times; {it.title}
                        </span>
                        <span className="text-[10px] text-[#5A6860] font-semibold">
                          ₹ {it.price} each
                        </span>
                      </div>
                      <span className="font-black text-[#244436] shrink-0">
                        ₹ {it.price * it.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full flex flex-col gap-2 py-1">
                  <div className="w-full flex items-center justify-between text-xs font-bold text-[#1A2621]">
                    <span>Authentic Military Dining Order</span>
                    <span className="text-[#244436]">₹ {itemsSubtotal}</span>
                  </div>
                  <div className="text-[10px] text-[#5A6860] font-medium">
                    Steamed donne biryani &amp; military starters steamed in traditional herbal spices.
                  </div>
                </div>
              )}

              {/* Subtotal & Taxes Breakdown */}
              <div className="w-full border-t border-[rgba(220,226,222,0.7)] pt-3 flex flex-col gap-1.5 text-xs text-[#5A6860]">
                <div className="w-full flex items-center justify-between">
                  <span>Item Subtotal ({itemsList.reduce((acc, curr) => acc + curr.quantity, 0)} items)</span>
                  <span className="font-bold text-[#1A2621]">₹ {itemsSubtotal}</span>
                </div>
                <div className="w-full flex items-center justify-between text-[#5A6860]">
                  <span>CGST (2.5%)</span>
                  <span className="font-bold text-[#1A2621]">₹ {cgst}</span>
                </div>
                <div className="w-full flex items-center justify-between text-[#5A6860]">
                  <span>SGST (2.5%)</span>
                  <span className="font-bold text-[#1A2621]">₹ {sgst}</span>
                </div>
                {tipAmount > 0 && (
                  <div className="w-full flex items-center justify-between text-[#244436] font-bold bg-emerald-50/80 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                    <span>Staff Tip (Waiter)</span>
                    <span className="text-[#DD6B28]">+ ₹ {tipAmount}</span>
                  </div>
                )}
              </div>

              {/* Total Payable Box */}
              <div className="w-full border-t border-[rgba(220,226,222,0.8)] pt-3 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-black uppercase tracking-wider text-[#1A2621]">
                    Total Payable
                  </span>
                  {tipAmount > 0 && (
                    <span className="text-[10px] text-[#DD6B28] font-bold">
                      Includes ₹{tipAmount} Tip
                    </span>
                  )}
                </div>
                <span className="text-xl font-black text-[#244436]">
                  ₹ {grandPayable}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Promo Code Section */}
        {session && (
          <div className="w-full border border-[rgba(220,226,222,0.8)] rounded-2xl p-2 flex items-center justify-between gap-2 bg-[#FFFEFC] shadow-[0_4px_16px_-4px_rgba(36,68,54,0.05)] print:hidden">
            <div className="flex items-center gap-2 pl-2 flex-1">
              <Ticket className="w-4 h-4 text-[#5A6860] shrink-0" />
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Promo Code"
                className="w-full text-xs font-bold outline-none bg-transparent text-[#1A2621] uppercase placeholder:normal-case placeholder:font-normal placeholder:text-zinc-400"
              />
            </div>
            <button
              type="button"
              className="px-4 py-2 border border-[#244436]/30 bg-[#244436] text-white text-xs font-bold rounded-xl uppercase tracking-wider cursor-pointer active:opacity-80"
            >
              Apply
            </button>
          </div>
        )}

        {/* Card 2: Add Tip Section */}
        {session && (
          <div className="w-full border border-[rgba(220,226,222,0.8)] rounded-2xl p-4 flex flex-col gap-3 bg-[#FFFEFC] shadow-[0_4px_16px_-4px_rgba(36,68,54,0.05)] print:hidden">
            <div className="w-full flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-[#1A2621]">
                Add Tip for Staff
              </span>
              <span className="text-[11px] font-bold text-[#DD6B28]">
                {selectedTip}
              </span>
            </div>

            <div className="w-full grid grid-cols-4 gap-2 mt-1">
              {tipOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelectTip(opt)}
                  className={`py-2 text-xs font-bold rounded-xl border cursor-pointer transition-all ${
                    selectedTip === opt
                      ? 'border-[#244436] bg-[#244436] text-white shadow-2xs'
                      : 'border-[rgba(220,226,222,0.8)] bg-[#FFFEFC] text-[#5A6860] hover:text-[#1A2621] hover:border-[#244436]/40'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Printable Invoice Container (Only visible during window.print()) */}
      <div className="hidden print:block w-full text-black p-4 font-mono text-xs">
        <div className="text-center font-bold text-base mb-0.5">THOOGUDEEPA MILITARY HOTEL</div>
        <div className="text-center text-[10px] text-zinc-600">Authentic Donne Biryani Mane</div>
        <div className="text-center text-[10px] text-zinc-600">GSTIN: 29AABCT1332M1Z4</div>
        <div className="border-b border-black my-2" />
        <div className="flex justify-between">
          <span>Seat: #{seatNumber}</span>
          <span>Ticket: #{session?.ticketNumber || seatNumber}</span>
        </div>
        <div className="flex justify-between">
          <span suppressHydrationWarning>Date: {new Date().toLocaleDateString('en-IN')}</span>
          <span suppressHydrationWarning>Time: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="border-b border-black my-2" />
        <div className="flex justify-between font-bold">
          <span>Item</span>
          <span>Price</span>
        </div>
        <div className="border-b border-dashed border-black my-1" />
        {itemsList.map((it, idx) => (
          <div key={idx} className="flex justify-between py-0.5">
            <span>{it.quantity}x {it.title}</span>
            <span>₹ {it.price * it.quantity}</span>
          </div>
        ))}
        <div className="border-b border-dashed border-black my-1" />
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>₹ {itemsSubtotal}</span>
        </div>
        <div className="flex justify-between">
          <span>CGST (2.5%):</span>
          <span>₹ {cgst}</span>
        </div>
        <div className="flex justify-between">
          <span>SGST (2.5%):</span>
          <span>₹ {sgst}</span>
        </div>
        {tipAmount > 0 && (
          <div className="flex justify-between">
            <span>Staff Tip:</span>
            <span>₹ {tipAmount}</span>
          </div>
        )}
        <div className="border-b border-black my-1" />
        <div className="flex justify-between font-bold text-sm">
          <span>Total Payable:</span>
          <span>₹ {grandPayable}</span>
        </div>
        <div className="border-b border-black my-2" />
        <div className="text-center text-[10px] mt-2">Thank you! Visit again.</div>
      </div>

      {/* Bottom Sticky Payment Actions */}
      {session && (
        <div className="sticky bottom-0 z-30 w-full bg-[#FFFEFC]/95 backdrop-blur-md pt-2 pb-2 flex flex-col gap-2.5 border-t border-[rgba(220,226,222,0.8)] print:hidden">
          <div className="w-full grid grid-cols-2 gap-3">
            {/* Pay via Waiter */}
            <button
              type="button"
              onClick={handleCallCaptain}
              className={`w-full border py-3 px-3 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl flex items-center justify-center cursor-pointer active:opacity-85 transition-all shadow-2xs text-center ${
                waiterCalled
                  ? 'border-[#244436] bg-[#244436] text-white'
                  : 'border-[rgba(220,226,222,0.9)] bg-[#FFFEFC] text-[#1A2621] hover:border-[#244436]/40'
              }`}
            >
              {waiterCalled ? 'Floor Captain Called ✓' : 'Pay via Waiter'}
            </button>

            {/* Self Pay */}
            {waiterCalled ? (
              <button
                type="button"
                disabled
                className="w-full border border-zinc-200 bg-zinc-100 text-zinc-400 py-3 px-3 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl flex items-center justify-center cursor-not-allowed shadow-none text-center opacity-60"
              >
                Self Pay
              </button>
            ) : (
              <Link
                href={`/seat/${chairId}/payment?amount=${grandPayable}&tip=${tipAmount}`}
                className="w-full bg-gradient-to-r from-[#244436] to-[#DD6B28] text-white py-3 px-3 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl flex items-center justify-center cursor-pointer active:opacity-90 transition-all shadow-md text-center hover:shadow-lg"
              >
                Self Pay
              </Link>
            )}
          </div>

          {/* Synchronized Pay via Waiter Settlement View */}
          {waiterCalled && (
            <div id="waiter-payment-sync-card" className="w-full flex flex-col gap-3 pt-2">
              {/* Scenario 1: Floor Captain selected UPI QR */}
              {waiterSelectedMode === 'qr' && (
                <div className="w-full border border-emerald-300 bg-emerald-50/90 rounded-2xl p-4 flex flex-col items-center text-center gap-3 shadow-[0_4px_20px_-4px_rgba(36,68,54,0.08)] animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-emerald-950 font-black text-xs uppercase tracking-wider">
                    <QrCode className="w-4 h-4 text-emerald-700" />
                    <span>Floor Captain Selected UPI QR Code</span>
                  </div>

                  <div className="p-3 bg-[#FFFEFC] border border-[rgba(220,226,222,0.9)] rounded-2xl shadow-sm">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`upi://pay?pa=thoogudeepa@okicici&pn=Thoogudeepa&am=${grandPayable}&tn=Seat-${seatNumber}`)}`}
                      alt="UPI QR Code"
                      className="w-40 h-40 object-contain rounded-xl"
                    />
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <span className="text-sm font-black text-[#1A2621] font-mono">
                      Pay ₹ {grandPayable}
                    </span>
                    <span className="text-[10px] text-[#5A6860] font-bold mt-0.5">
                      UPI ID: thoogudeepa@okicici
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 bg-[#FFFEFC] border border-zinc-200 rounded-md text-[9px] font-black text-zinc-800 shadow-2xs">GPay</span>
                    <span className="px-2 py-0.5 bg-[#FFFEFC] border border-zinc-200 rounded-md text-[9px] font-black text-indigo-700 shadow-2xs">PhonePe</span>
                    <span className="px-2 py-0.5 bg-[#FFFEFC] border border-zinc-200 rounded-md text-[9px] font-black text-sky-700 shadow-2xs">Paytm</span>
                    <span className="px-2 py-0.5 bg-[#FFFEFC] border border-zinc-200 rounded-md text-[9px] font-black text-emerald-700 shadow-2xs">BHIM</span>
                  </div>

                  <button
                    type="button"
                    disabled={isReportingPaid}
                    onClick={handleCustomerConfirmQrPayment}
                    className="w-full mt-1 bg-gradient-to-r from-[#244436] to-[#DD6B28] text-white py-3.5 px-4 text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all shadow-md hover:shadow-lg"
                  >
                    {isReportingPaid ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-200" />
                        <span>Notifying Floor Captain...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                        <span>I Have Paid ₹{grandPayable}</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Scenario 2: Floor Captain selected Cash */}
              {waiterSelectedMode === 'cash' && (
                <div className="w-full border border-amber-300 bg-amber-50/90 rounded-2xl p-4 flex flex-col items-center text-center gap-2 shadow-sm animate-in fade-in duration-200">
                  <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 mb-0.5">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-black text-amber-950 uppercase tracking-wider">
                    Captain Selected Cash Payment
                  </span>
                  <p className="text-xs text-amber-900 font-bold">
                    Please hand over <span className="font-black text-sm text-[#1A2621]">₹{grandPayable}</span> to your Floor Captain.
                  </p>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-200/60 rounded-full text-[10px] font-extrabold text-amber-900 mt-1">
                    <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                    <span>Captain is collecting cash and finalizing your bill...</span>
                  </div>
                </div>
              )}

              {/* Scenario 3: Waiter Called, awaiting QR or Cash selection */}
              {waiterSelectedMode === 'none' && (
                <div className="w-full border border-[rgba(220,226,222,0.9)] bg-[#FFFEFC] rounded-2xl p-3.5 flex flex-col items-center text-center gap-1.5 shadow-2xs">
                  <span className="text-xs font-black text-[#1A2621] uppercase tracking-wider">
                    Floor Captain Called
                  </span>
                  <p className="text-[11px] text-[#5A6860] font-medium">
                    Captain is approaching Seat #{seatNumber} with payment terminal.
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Awaiting captain to select QR or Cash</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pay via Waiter Confirmation Modal */}
      {showWaiterModal && (
        <div className="fixed inset-0 z-50 bg-[#1A2621]/60 backdrop-blur-xs flex items-center justify-center px-4 animate-in fade-in duration-150 print:hidden">
          <div className="w-full max-w-sm bg-[#FFFEFC] border border-[rgba(220,226,222,0.9)] rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl relative">
            <h2 className="text-base font-black tracking-tight mb-2 mt-2 text-[#1A2621]">
              Call Floor Captain for Payment?
            </h2>
            <div className="w-8 h-0.5 bg-[#244436] my-2" />
            <p className="text-xs text-[#5A6860] mb-1">
              Are you sure you want to call the Floor Captain for payment at
            </p>
            <p className="text-sm font-black text-[#244436] mb-1">
              Seat #{seatNumber}
            </p>
            <p className="text-[11px] text-[#5A6860] mb-6">
              A captain will visit your seat with the payment terminal and QR scanner.
            </p>

            <div className="w-full grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setWaiterCalled(false);
                  setShowWaiterModal(false);
                }}
                className="w-full border border-[rgba(220,226,222,0.9)] bg-[#FFFEFC] text-[#5A6860] hover:text-[#1A2621] py-3 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:opacity-75 transition-all shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>No, Go Back</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setWaiterCalled(true);
                  setShowWaiterModal(false);
                  const paddedSeat = `Seat ${seatNumber.padStart(2, '0')}`;
                  realtimeBridge.requestBill(chairId, grandPayable, {
                    chairId,
                    seatNumber: paddedSeat,
                    orderId: session?.orderId || '',
                    ticketNumber: session?.ticketNumber,
                    amount: grandPayable,
                    items: (session?.items || []).map((it) => ({
                      id: it.id,
                      title: it.title,
                      quantity: it.quantity,
                      price: it.price,
                    })),
                  });
                  realtimeBridge.sendServiceAlert({
                    seatNumber: paddedSeat,
                    title: `Bill Requested (₹${grandPayable})`,
                    message: `Bill settlement requested for Seat ${seatNumber}: ₹${grandPayable}${tipAmount > 0 ? ` (incl. ₹${tipAmount} tip)` : ''}`,
                    guestName: `Seat ${seatNumber} Guest`,
                    type: 'customer_call',
                    billAmount: grandPayable,
                    isUrgent: true,
                  }).catch(console.error);
                }}
                className="w-full bg-gradient-to-r from-[#244436] to-[#DD6B28] text-white py-3 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:opacity-90 transition-all shadow-md"
              >
                <span>Yes, Call Captain</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
