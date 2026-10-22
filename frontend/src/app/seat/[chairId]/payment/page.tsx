'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ChevronLeft, Bell, Plus, Check, QrCode, Banknote, CheckCircle2 } from 'lucide-react';
import { useHardwareBack } from '../../../../lib/hooks/useHardwareBack';
import { getActiveDiningSession, ActiveDiningSession } from '../../../../lib/session/diningSession';
import { getMenuItemById } from '../../../../lib/data/menuData';
import { realtimeBridge } from '../../../../lib/supabase';

function CustomerSelfPaymentContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const chairId = (params?.chairId as string) || '12';

  // Device hardware back button & swipe back: return to bill/order summary
  useHardwareBack(`/seat/${chairId}/bill`);

  const amountParam = searchParams?.get('amount');
  const tipParam = searchParams?.get('tip');

  const [session, setSession] = useState<ActiveDiningSession | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<number | null>(1);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const normalizeSeatId = (id?: string | null) => (id || '').replace(/[^0-9]/g, '').replace(/^0+/, '') || '0';

  useEffect(() => {
    const s = getActiveDiningSession();
    if (s && s.paymentStatus === 'unpaid') {
      if (s.seatId !== chairId) {
        window.location.replace(`/seat/${s.seatId}/payment`);
        return;
      }
      setSession(s);
    }
  }, [chairId]);

  const storedTipStr = typeof window !== 'undefined' ? sessionStorage.getItem(`thoogudeepa_selected_tip_${chairId}`) : null;
  const tipFromStorage = storedTipStr === '₹ 30' ? 30 : storedTipStr === '₹ 50' ? 50 : storedTipStr === '₹ 100' ? 100 : 0;
  const tipAmount = tipParam !== null && tipParam !== undefined ? Number(tipParam) : tipFromStorage;

  const itemsList = session?.items && session.items.length > 0 ? session.items : [];
  const itemsSubtotal = itemsList.length > 0
    ? itemsList.reduce((acc, it) => acc + it.price * it.quantity, 0)
    : (session?.totalAmount ? Math.round(session.totalAmount / 1.05) : 0);

  const cgst = Math.round(itemsSubtotal * 0.025);
  const sgst = Math.round(itemsSubtotal * 0.025);
  const gstAmount = cgst + sgst;
  const billTotal = itemsSubtotal + gstAmount;

  const grandPayable = amountParam ? Number(amountParam) : (billTotal + tipAmount);

  useEffect(() => {
    const unsub = realtimeBridge.subscribeKDS({
      onBillModeActive: (data) => {
        const targetNorm = normalizeSeatId(data.normChairId || data.chairId || data.rawChairId);
        const currentNorm = normalizeSeatId(chairId);
        if (targetNorm === currentNorm || data.chairId === chairId || data.rawChairId === chairId) {
          if (data.mode === 'cash') {
            setSelectedMethod(4);
            setSelectedCardId(null);
          } else {
            setSelectedMethod(1);
            setSelectedCardId(null);
          }
        }
      },
      onBillSettled: (data) => {
        const targetNorm = normalizeSeatId(data.normChairId || data.chairId || data.rawChairId);
        const currentNorm = normalizeSeatId(chairId);
        if (targetNorm === currentNorm || data.chairId === chairId || data.rawChairId === chairId) {
          const modeVal = data.paymentMethod || 'Cash';
          const amtVal = data.amount || grandPayable;
          window.location.replace(`/seat/${chairId}/payment-success?mode=${encodeURIComponent(modeVal)}&amount=${amtVal}&tip=${tipAmount}`);
        }
      },
      onSeatOccupancyChange: (data) => {
        const targetNorm = normalizeSeatId(data.chairId);
        const currentNorm = normalizeSeatId(chairId);
        if ((targetNorm === currentNorm || data.chairId === chairId) && !data.isOccupied) {
          window.location.replace(`/seat/${chairId}/payment-success?mode=Cash&amount=${grandPayable}&tip=${tipAmount}`);
        }
      }
    });

    return () => unsub();
  }, [chairId, grandPayable, tipAmount]);

  const cards = [
    {
      id: 'card1',
      title: 'UPI / INSTANT QR',
      number: `upi://pay?pa=thoogudeepa@upi&seat=${chairId}`,
      holder: `Seat #${chairId} Guest`,
      expiry: 'LIVE',
      logo: 'UPI',
      bgGradient: 'from-[#1E3A2F] to-[#28483B]',
      border: 'border-[#2D5042]',
    },
    {
      id: 'card2',
      title: 'RUPAY / DEBIT CARD',
      number: '•••• •••• •••• 8765',
      holder: `Seat #${chairId} Guest`,
      expiry: '12 / 29',
      logo: 'RUPAY',
      bgGradient: 'from-[#2D3E4E] to-[#1E2B37]',
      border: 'border-[#3E5266]',
    },
    {
      id: 'card3',
      title: 'CREDIT / TAP TO PAY',
      number: '•••• •••• •••• 9901',
      holder: `Seat #${chairId} Guest`,
      expiry: '08 / 30',
      logo: 'VISA',
      bgGradient: 'from-[#6E351F] to-[#4F2312]',
      border: 'border-[#8A462B]',
    },
  ];

  // Payment channels
  const paymentMethods = [
    { id: 0, isAdd: true },
    { id: 1, label: 'UPI' },
    { id: 2, label: 'Card' },
    { id: 3, label: 'NetBank' },
    { id: 4, label: 'Cash' },
  ];

  // Determine selected method name
  const selectedMethodObj = paymentMethods.find((m) => m.id === selectedMethod);
  const selectedMethodName = selectedMethodObj?.label || 'UPI';

  return (
    <div className="min-h-screen w-full flex flex-col justify-between max-w-md mx-auto relative px-4 pt-4 pb-28 text-[#1A2621]">
      {/* Scrollable Content Container */}
      <div className="w-full flex flex-col gap-6">
        {/* Top Header */}
        <header className="w-full flex items-center justify-between py-2 border-b border-[#EAE3D5] pb-3">
          {/* Back Navigation Button to Order Summary & Bill */}
          <Link
            href={`/seat/${chairId}/bill`}
            className="w-10 h-10 border border-[#EAE3D5] rounded-xl flex items-center justify-center cursor-pointer active:opacity-70 bg-[#FBF9F4] text-[#1A2621] shadow-2xs"
            aria-label="Back to Bill"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          {/* Center Title */}
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-black tracking-tight text-[#1E3A2F]">Payment</h1>
            <span className="text-[10px] text-[#8C7A6B] font-bold uppercase tracking-wider">
              Seat #{chairId}
            </span>
          </div>

          {/* Right Notification Bell */}
          <Link
            href={`/seat/${chairId}/assistant?from=${encodeURIComponent(`/seat/${chairId}/payment`)}`}
            className="w-10 h-10 border border-[#EAE3D5] rounded-xl flex items-center justify-center cursor-pointer active:opacity-70 bg-[#FBF9F4] text-[#1E3A2F] shadow-2xs"
            aria-label="Assistant & Call Waiter"
          >
            <Bell className="w-5 h-5" />
          </Link>
        </header>

        {/* Horizontal Slidable Cards Carousel */}
        <div className="w-full overflow-x-auto no-scrollbar py-2 -mx-4 px-4 snap-x snap-mandatory">
          <div className="flex gap-4 w-max">
            {cards.map((card) => {
              const isSelected = selectedCardId === card.id;

              return (
                <div
                  key={card.id}
                  onClick={() => {
                    if (selectedCardId === card.id) {
                      setSelectedCardId(null);
                    } else {
                      setSelectedCardId(card.id);
                      setSelectedMethod(null);
                    }
                  }}
                  className={`w-[300px] rounded-3xl p-5 flex flex-col justify-between h-44 shrink-0 snap-center cursor-pointer transition-all bg-gradient-to-br ${card.bgGradient} ${card.border} text-white ${
                    isSelected
                      ? 'shadow-md ring-2 ring-[#D46238] opacity-100'
                      : 'shadow-xs opacity-85 hover:opacity-100 border'
                  }`}
                >
                  {/* Top row inside card: Title & Brand / Logo */}
                  <div className="w-full flex items-center justify-between">
                    <span className="text-sm font-black tracking-wider uppercase text-white/95">
                      {card.title}
                    </span>
                    <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs ${
                      isSelected
                        ? 'bg-[#D46238] text-white'
                        : 'bg-white/20 text-white backdrop-blur-xs border border-white/20'
                    }`}>
                      {isSelected ? 'SELECTED' : card.logo}
                    </div>
                  </div>

                  {/* Middle row: Card Number / Identifier */}
                  <div className="text-base font-mono font-bold tracking-widest my-auto truncate text-white">
                    {card.number}
                  </div>

                  {/* Bottom row: Meta Details with Gold Chip */}
                  <div className="w-full flex items-end justify-between">
                    {/* Golden microchip */}
                    <div className="w-9 h-7 rounded-md bg-gradient-to-tr from-[#C99C53] via-[#E5BF7E] to-[#B88A42] p-0.5 shadow-xs flex items-center justify-center">
                      <div className="w-6 h-5 border border-[#8C6B2E]/60 rounded-xs flex items-center justify-center">
                        <div className="w-3 h-2 border-t border-b border-[#8C6B2E]/60" />
                      </div>
                    </div>

                    <div className="flex gap-5 text-right">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">
                          Detail 1
                        </span>
                        <span className="text-xs font-bold text-white">
                          {card.holder}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">
                          Expiry 2
                        </span>
                        <span className="text-xs font-bold text-white">
                          {card.expiry}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section: Choose Method */}
        <div className="w-full flex flex-col gap-3">
          <span className="text-xs font-black uppercase tracking-wider text-[#8C7A6B]">
            CHOOSE METHOD
          </span>

          {/* Methods Horizontal Row */}
          <div className="w-full flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
            {paymentMethods.map((method) => {
              if (method.isAdd) {
                return (
                  <button
                    key="add"
                    type="button"
                    className="w-10 h-10 rounded-full border border-[#DCE4DC] flex items-center justify-center shrink-0 cursor-pointer active:opacity-70 bg-[#FBF9F4] text-[#1A2621] shadow-2xs hover:border-[#C85A32]"
                    aria-label="Add Method"
                  >
                    <Plus className="w-5 h-5 text-[#C85A32]" />
                  </button>
                );
              }

              const isSelected = selectedMethod === method.id;

              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setSelectedMethod(null);
                    } else {
                      setSelectedMethod(method.id);
                      setSelectedCardId(null);
                    }
                  }}
                  className={`px-4 py-2.5 rounded-full border flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-2 border-[#D46238] bg-[#FBF9F4] text-[#D46238] shadow-[0_0_12px_rgba(212,98,56,0.25)] font-black'
                      : 'border border-[#DCE4DC] bg-[#EAF0E9] text-[#1A2621] font-bold hover:border-[#1E3A2F]/40'
                  }`}
                  aria-label={method.label}
                >
                  <span className="text-xs font-black uppercase tracking-wider">
                    {method.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Synchronized Payment Method Display */}
        {selectedMethod === 1 && (
          <div className="w-full border border-emerald-300 bg-emerald-50/90 rounded-3xl p-5 flex flex-col items-center text-center gap-3 shadow-[0_4px_20px_-4px_rgba(36,68,54,0.08)] animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-emerald-950 font-black text-xs uppercase tracking-wider">
              <QrCode className="w-4 h-4 text-emerald-700" />
              <span>UPI QR Code Payment</span>
            </div>

            <div className="p-3 bg-[#FFFEFC] border border-[rgba(220,226,222,0.9)] rounded-2xl shadow-sm">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=thoogudeepa@okicici&pn=Thoogudeepa&am=${grandPayable}&tn=Seat-${chairId}`)}`}
                alt="UPI QR Code"
                className="w-40 h-40 object-contain rounded-xl"
              />
            </div>

            <div className="flex flex-col items-center text-center">
              <span className="text-sm font-black text-[#1A2621] font-mono">
                Pay ₹ {grandPayable}
              </span>
              <span className="text-[10px] text-[#5A6860] font-bold mt-0.5">
                Scan with any UPI app (GPay, PhonePe, Paytm, BHIM)
              </span>
            </div>
          </div>
        )}

        {selectedMethod === 4 && (
          <div className="w-full border border-amber-300 bg-amber-50/90 rounded-3xl p-5 flex flex-col items-center text-center gap-2 shadow-sm animate-in fade-in duration-200">
            <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 mb-0.5">
              <Banknote className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-amber-950 uppercase tracking-wider">
              Cash Payment Selected
            </span>
            <p className="text-xs text-amber-900 font-bold">
              Please hand over <span className="font-black text-sm text-[#1A2621]">₹{grandPayable}</span> in cash to your Floor Captain.
            </p>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-200/60 rounded-full text-[10px] font-extrabold text-amber-900 mt-1">
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
              <span>Captain is collecting cash and finalizing your bill...</span>
            </div>
          </div>
        )}

        {/* Items & Price Breakdown Section */}
        <div className="w-full rounded-3xl p-5 flex flex-col gap-4 bg-gradient-to-b from-[#FAF8F5] via-[#F2EFE8] to-[#E5ECE5] border border-[#DCE4DC] shadow-[0_12px_28px_-6px_rgba(50,70,55,0.1)]">
          {/* Section Header with terracotta badge */}
          <div className="w-full flex items-center justify-between border-b border-[#DCE4DC] pb-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#1E3A2F]">
              ITEMS &amp; PRICE BREAKDOWN
            </span>
            <span className="text-[10px] font-bold px-3 py-1 rounded-full uppercase bg-[#D46238] text-white shadow-xs">
              {itemsList.length > 0 ? `${itemsList.length} Dishes` : 'Dine-In'}
            </span>
          </div>

          {/* Real Item Rows */}
          <div className="w-full flex flex-col gap-3">
            {session?.items && session.items.length > 0 ? (
              session.items.map((item, idx) => {
                const numericId = item.id.replace('dish-', '');
                const dishData = getMenuItemById(numericId);
                return (
                  <div key={idx} className="w-full flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden flex items-center justify-center shrink-0 bg-[#fbf9f5] shadow-xs p-0.5">
                        <img
                          src={dishData.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover object-center rounded-full"
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold truncate text-[#1A2621]">
                          {item.title} &times; {item.quantity}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-black shrink-0 text-[#1E3A2F]">
                      ₹ {item.price * item.quantity}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="w-full flex items-center justify-between gap-3 py-1">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden flex items-center justify-center shrink-0 bg-[#fbf9f5] shadow-xs p-0.5">
                    <img
                      src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80"
                      alt="Donne Biryani"
                      className="w-full h-full object-cover object-center rounded-full"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold truncate text-[#1A2621]">
                      Authentic Military Dining
                    </span>
                    <span className="text-[10px] text-[#5A6860] font-semibold">
                      Dine-in Order Session
                    </span>
                  </div>
                </div>
                <span className="text-xs font-black shrink-0 text-[#1E3A2F]">
                  ₹ {itemsSubtotal}
                </span>
              </div>
            )}
          </div>

          {/* Subtotal & Taxes Breakdown */}
          <div className="w-full border-t border-[#DCE4DC] pt-3 flex flex-col gap-1.5 text-xs text-[#5A6860]">
            <div className="w-full flex items-center justify-between">
              <span>Item Subtotal ({itemsList.reduce((acc, curr) => acc + curr.quantity, 0)} items)</span>
              <span className="font-bold text-[#1A2621]">₹ {itemsSubtotal}</span>
            </div>
            <div className="w-full flex items-center justify-between text-[#5A6860]">
              <span>Taxes &amp; Charges (5% GST)</span>
              <span className="font-bold text-[#1A2621]">₹ {gstAmount}</span>
            </div>
            {tipAmount > 0 && (
              <div className="w-full flex items-center justify-between text-[#1E3A2F] font-bold bg-[#EAF0E9] px-2.5 py-1.5 rounded-xl border border-[#DCE4DC]">
                <span>Staff Tip (Waiter)</span>
                <span className="text-[#D46238]">+ ₹ {tipAmount}</span>
              </div>
            )}
          </div>

          {/* Total Payable Box */}
          <div className="w-full border-t border-[#DCE4DC] pt-3 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-black uppercase tracking-wider text-[#1E3A2F]">
                TOTAL PAYABLE
              </span>
              {tipAmount > 0 && (
                <span className="text-[10px] text-[#D46238] font-bold">
                  Includes ₹{tipAmount} Tip
                </span>
              )}
            </div>
            <span className="text-xl font-black text-[#1E3A2F]">
              ₹ {grandPayable}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Continue Button with Dual Gradient & Glowing Shadow */}
      <div className="sticky bottom-0 z-30 w-full bg-[#FAF7F0]/95 backdrop-blur-md pt-3 pb-4 border-t border-[#EAE3D5]">
        {selectedCardId ? (
          /* Card Selected -> Goes to Card Details */
          <Link
            href={`/seat/${chairId}/card-details?card=${selectedCardId}&amount=${grandPayable}&tip=${tipAmount}`}
            className="w-full py-4 bg-gradient-to-r from-[#1E3A2F] via-[#244436] to-[#C85A32] text-white text-sm font-bold uppercase tracking-wider rounded-full flex items-center justify-center cursor-pointer active:opacity-90 shadow-[0_8px_25px_rgba(200,90,50,0.35)] hover:shadow-[0_10px_28px_rgba(200,90,50,0.4)] transition-all text-center"
          >
            Continue with Card
          </Link>
        ) : selectedMethod !== null ? (
          /* Method Selected -> Goes to Payment Success */
          <Link
            href={`/seat/${chairId}/payment-success?mode=${encodeURIComponent(selectedMethodName)}&amount=${grandPayable}&tip=${tipAmount}`}
            className="w-full py-4 bg-gradient-to-r from-[#1E3A2F] via-[#244436] to-[#C85A32] text-white text-sm font-bold uppercase tracking-wider rounded-full flex items-center justify-center cursor-pointer active:opacity-90 shadow-[0_8px_25px_rgba(200,90,50,0.35)] hover:shadow-[0_10px_28px_rgba(200,90,50,0.4)] transition-all text-center"
          >
            Pay ₹ {grandPayable} via {selectedMethodName}
          </Link>
        ) : (
          /* Nothing Selected */
          <button
            type="button"
            disabled
            className="w-full py-4 border border-zinc-200 bg-zinc-100 text-zinc-400 text-sm font-bold uppercase tracking-wider rounded-full flex items-center justify-center cursor-not-allowed text-center opacity-70"
          >
            Select Payment Method
          </button>
        )}
      </div>
    </div>
  );
}

export default function CustomerSelfPaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-[#F9F8F5] to-[#F3F1EC]" />}>
      <CustomerSelfPaymentContent />
    </Suspense>
  );
}
