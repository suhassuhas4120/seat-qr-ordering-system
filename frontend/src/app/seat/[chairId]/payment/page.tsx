'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Bell,
  Plus,
  Check,
  QrCode,
  Banknote,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Building2,
  CreditCard as CreditCardIcon,
  X
} from 'lucide-react';
import { useHardwareBack } from '../../../../lib/hooks/useHardwareBack';
import {
  getActiveDiningSession,
  isDeviceLockedToDifferentSeat,
  ActiveDiningSession
} from '../../../../lib/session/diningSession';
import { getMenuItemById } from '../../../../lib/data/menuData';
import { realtimeBridge } from '../../../../lib/supabase';

function CustomerSelfPaymentContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const chairId = (params?.chairId as string) || '12';

  // Device hardware back button & swipe back: return to bill/order summary
  useHardwareBack(`/seat/${chairId}/bill`);

  const amountParam = searchParams?.get('amount');
  const tipParam = searchParams?.get('tip');
  const discountParam = searchParams?.get('discount');
  const promoParam = searchParams?.get('promo');
  const discountAmount = discountParam ? Number(discountParam) : 0;

  const [session, setSession] = useState<ActiveDiningSession | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<number | null>(1); // 1 = UPI by default
  const [selectedCardId, setSelectedCardId] = useState<string | null>('card1');
  const [selectedBank, setSelectedBank] = useState<string>('HDFC Bank');
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [isCashNotified, setIsCashNotified] = useState<boolean>(false);
  const [showAddMethodModal, setShowAddMethodModal] = useState<boolean>(false);
  const [customUpiInput, setCustomUpiInput] = useState<string>('');

  const normalizeSeatId = (id?: string | null) => (id || '').replace(/[^0-9]/g, '').replace(/^0+/, '') || '0';

  // Anti-cheat verification on mount
  useEffect(() => {
    // 1. Verify if device is locked to a different seat's unpaid dining session
    const lockCheck = isDeviceLockedToDifferentSeat(chairId);
    if (lockCheck.isLocked && lockCheck.activeSeatId) {
      router.replace(`/seat/${lockCheck.activeSeatId}/payment`);
      return;
    }

    // 2. Verify active session for this seat
    const s = getActiveDiningSession();
    if (s) {
      if (s.paymentStatus === 'paid') {
        router.replace(`/seat/${chairId}/payment-success`);
        return;
      }
      if (s.seatId !== chairId) {
        router.replace(`/seat/${s.seatId}/payment`);
        return;
      }
      setSession(s);
    }
  }, [chairId, router]);

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

  const rawPayable = billTotal + tipAmount;
  const calculatedGrandPayable = Math.max(0, rawPayable - discountAmount);
  const grandPayable = amountParam ? Number(amountParam) : calculatedGrandPayable;

  // Realtime synchronization with Waiter & Captain KDS / POS
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
            setSelectedCardId('card1');
          }
        }
      },
      onBillSettled: (data) => {
        const targetNorm = normalizeSeatId(data.normChairId || data.chairId || data.rawChairId);
        const currentNorm = normalizeSeatId(chairId);
        if (targetNorm === currentNorm || data.chairId === chairId || data.rawChairId === chairId) {
          const modeVal = data.paymentMethod || 'Cash';
          const amtVal = data.amount || grandPayable;
          window.location.replace(`/seat/${chairId}/payment-success?mode=${encodeURIComponent(modeVal)}&amount=${amtVal}&tip=${tipAmount}${discountAmount > 0 ? `&discount=${discountAmount}&promo=${encodeURIComponent(promoParam || '')}` : ''}`);
        }
      },
      onSeatOccupancyChange: (data) => {
        const targetNorm = normalizeSeatId(data.chairId);
        const currentNorm = normalizeSeatId(chairId);
        if ((targetNorm === currentNorm || data.chairId === chairId) && !data.isOccupied) {
          window.location.replace(`/seat/${chairId}/payment-success?mode=Cash&amount=${grandPayable}&tip=${tipAmount}${discountAmount > 0 ? `&discount=${discountAmount}&promo=${encodeURIComponent(promoParam || '')}` : ''}`);
        }
      }
    });

    return () => unsub();
  }, [chairId, grandPayable, tipAmount, discountAmount, promoParam]);

  const cards = [
    {
      id: 'card1',
      methodId: 1,
      title: 'UPI / INSTANT QR',
      number: `upi://pay?pa=thoogudeepa@okicici&seat=${chairId}`,
      holder: `Seat #${chairId} Guest`,
      holderLabel: 'SEAT IDENTIFIER',
      expiry: 'LIVE INSTANT',
      expiryLabel: 'STATUS',
      logo: 'UPI',
      bgGradient: 'from-[#1E3A2F] to-[#28483B]',
      border: 'border-[#2D5042]',
    },
    {
      id: 'card2',
      methodId: 2,
      title: 'RUPAY / DEBIT CARD',
      number: '•••• •••• •••• 8765',
      holder: `Seat #${chairId} Guest`,
      holderLabel: 'CARD HOLDER',
      expiry: '12 / 29',
      expiryLabel: 'VALID THRU',
      logo: 'RUPAY',
      bgGradient: 'from-[#2D3E4E] to-[#1E2B37]',
      border: 'border-[#3E5266]',
    },
    {
      id: 'card3',
      methodId: 2,
      title: 'CREDIT / TAP TO PAY',
      number: '•••• •••• •••• 9901',
      holder: `Seat #${chairId} Guest`,
      holderLabel: 'CARD HOLDER',
      expiry: '08 / 30',
      expiryLabel: 'VALID THRU',
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

  const popularBanks = [
    { id: 'hdfc', name: 'HDFC Bank', code: 'HDFC' },
    { id: 'sbi', name: 'State Bank of India', code: 'SBI' },
    { id: 'icici', name: 'ICICI Bank', code: 'ICICI' },
    { id: 'axis', name: 'Axis Bank', code: 'AXIS' },
    { id: 'kotak', name: 'Kotak Mahindra', code: 'KOTAK' },
    { id: 'pnb', name: 'Punjab National Bank', code: 'PNB' },
  ];

  const upiId = 'thoogudeepa@okicici';
  const upiDeepLink = `upi://pay?pa=${upiId}&pn=Thoogudeepa%20Military%20Hotel&am=${grandPayable}&tn=Seat-${chairId}&cu=INR`;

  const handleCopyUpi = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(upiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2500);
    }
  };

  const handleNotifyCashCaptain = () => {
    setIsCashNotified(true);
    realtimeBridge.notifyBillModeActive(chairId, grandPayable, { mode: 'cash' });
  };

  const handleConfirmUpiPaid = async () => {
    await realtimeBridge.notifyCustomerPaidUpi({
      chairId,
      amount: grandPayable,
      ticketNumber: session?.ticketNumber,
    });
    router.push(`/seat/${chairId}/payment-success?mode=UPI&amount=${grandPayable}&tip=${tipAmount}${discountAmount > 0 ? `&discount=${discountAmount}&promo=${encodeURIComponent(promoParam || '')}` : ''}`);
  };

  // Determine selected method label
  const selectedMethodObj = paymentMethods.find((m) => m.id === selectedMethod);
  const selectedMethodName = selectedMethod === 3
    ? `NetBanking (${selectedBank})`
    : selectedMethodObj?.label || 'UPI';

  return (
    <div className="min-h-screen w-full flex flex-col justify-between max-w-md mx-auto relative px-4 pt-4 pb-28 text-[#1A2621]">
      {/* Scrollable Content Container */}
      <div className="w-full flex flex-col gap-6">
        {/* Top Header */}
        <header className="w-full flex items-center justify-between py-2 border-b border-[#EAE3D5] pb-3">
          {/* Back Navigation Button to Order Summary & Bill */}
          <Link
            href={`/seat/${chairId}/bill`}
            className="w-10 h-10 border border-[#EAE3D5] rounded-xl flex items-center justify-center cursor-pointer active:opacity-70 bg-[#FBF9F4] text-[#1A2621] shadow-2xs hover:border-[#1E3A2F]"
            aria-label="Back to Bill"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          {/* Center Title */}
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-black tracking-tight text-[#1E3A2F]">Payment</h1>
            <span className="text-[10px] text-[#8C7A6B] font-bold uppercase tracking-wider">
              Seat #{chairId} &bull; Bill Settlement
            </span>
          </div>

          {/* Right Notification Bell */}
          <Link
            href={`/seat/${chairId}/assistant?from=${encodeURIComponent(`/seat/${chairId}/payment`)}`}
            className="w-10 h-10 border border-[#EAE3D5] rounded-xl flex items-center justify-center cursor-pointer active:opacity-70 bg-[#FBF9F4] text-[#1E3A2F] shadow-2xs hover:border-[#1E3A2F]"
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
                    setSelectedCardId(card.id);
                    setSelectedMethod(card.methodId);
                  }}
                  className={`w-[300px] rounded-3xl p-5 flex flex-col justify-between h-44 shrink-0 snap-center cursor-pointer transition-all bg-gradient-to-br ${card.bgGradient} ${card.border} text-white ${
                    isSelected
                      ? 'shadow-lg ring-2 ring-[#D46238] opacity-100 scale-[1.01]'
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
                          {card.holderLabel}
                        </span>
                        <span className="text-xs font-bold text-white">
                          {card.holder}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">
                          {card.expiryLabel}
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
            CHOOSE PAYMENT METHOD
          </span>

          {/* Methods Horizontal Row */}
          <div className="w-full flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
            {paymentMethods.map((method) => {
              if (method.isAdd) {
                return (
                  <button
                    key="add"
                    type="button"
                    onClick={() => setShowAddMethodModal(true)}
                    className="w-10 h-10 rounded-full border border-[#DCE4DC] flex items-center justify-center shrink-0 cursor-pointer active:opacity-70 bg-[#FBF9F4] text-[#1A2621] shadow-2xs hover:border-[#C85A32] transition-colors"
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
                    setSelectedMethod(method.id);
                    if (method.id === 1) setSelectedCardId('card1');
                    else if (method.id === 2) setSelectedCardId('card2');
                    else setSelectedCardId(null);
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

        {/* Dynamic Payment Method Display - UPI (1) */}
        {selectedMethod === 1 && (
          <div className="w-full border border-emerald-300 bg-emerald-50/90 rounded-3xl p-5 flex flex-col items-center text-center gap-3 shadow-[0_4px_20px_-4px_rgba(36,68,54,0.08)] animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-emerald-950 font-black text-xs uppercase tracking-wider">
              <QrCode className="w-4 h-4 text-emerald-700" />
              <span>Instant UPI Payment</span>
            </div>

            {/* Dynamic QR Code */}
            <div className="p-3 bg-[#FFFEFC] border border-[rgba(220,226,222,0.9)] rounded-2xl shadow-sm relative">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiDeepLink)}`}
                alt="UPI QR Code"
                className="w-40 h-40 object-contain rounded-xl"
              />
              <div className="absolute inset-0 pointer-events-none rounded-2xl border border-emerald-500/20" />
            </div>

            {/* Amount details */}
            <div className="flex flex-col items-center text-center">
              <span className="text-lg font-black text-[#1A2621] font-mono">
                ₹ {grandPayable}
              </span>
              <span className="text-[11px] text-[#5A6860] font-bold mt-0.5">
                Scan with GPay &bull; PhonePe &bull; Paytm &bull; BHIM
              </span>
            </div>

            {/* Direct Mobile UPI Deep Link & Copy Buttons */}
            <div className="w-full flex flex-col gap-2 pt-1">
              <a
                href={upiDeepLink}
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in UPI App (GPay / PhonePe)</span>
              </a>

              <div className="w-full flex items-center justify-between gap-2 bg-emerald-100/70 border border-emerald-200 px-3 py-2 rounded-xl text-xs">
                <span className="font-mono text-emerald-900 font-bold truncate">
                  {upiId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-emerald-800 hover:text-emerald-950 shrink-0 cursor-pointer"
                >
                  {copiedUpi ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy ID</span>
                    </>
                  )}
                </button>
              </div>

              {/* I Have Paid Confirmation Button */}
              <button
                type="button"
                onClick={handleConfirmUpiPaid}
                className="w-full py-2 px-3 text-[11px] font-extrabold text-emerald-900 bg-white/80 border border-emerald-300 rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>I have completed UPI transfer</span>
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Payment Method Display - Card (2) */}
        {selectedMethod === 2 && (
          <div className="w-full border border-sky-300 bg-sky-50/90 rounded-3xl p-5 flex flex-col gap-3 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sky-950 font-black text-xs uppercase tracking-wider">
                <CreditCardIcon className="w-4 h-4 text-sky-700" />
                <span>Credit / Debit Card</span>
              </div>
              <span className="text-[10px] font-bold text-sky-800 bg-sky-200/60 px-2 py-0.5 rounded-full">
                256-Bit SSL
              </span>
            </div>

            <p className="text-xs text-sky-900 font-medium">
              Pay securely via RuPay, Visa, MasterCard, or Amex with instant OTP verification.
            </p>

            <Link
              href={`/seat/${chairId}/card-details?card=${selectedCardId || 'card2'}&amount=${grandPayable}&tip=${tipAmount}${discountAmount > 0 ? `&discount=${discountAmount}&promo=${encodeURIComponent(promoParam || '')}` : ''}`}
              className="w-full py-3 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] text-center"
            >
              <CreditCardIcon className="w-4 h-4" />
              <span>Enter Card &amp; CVV Details</span>
            </Link>
          </div>
        )}

        {/* Dynamic Payment Method Display - NetBanking (3) */}
        {selectedMethod === 3 && (
          <div className="w-full border border-indigo-300 bg-indigo-50/90 rounded-3xl p-5 flex flex-col gap-3 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-950 font-black text-xs uppercase tracking-wider">
                <Building2 className="w-4 h-4 text-indigo-700" />
                <span>Net Banking</span>
              </div>
              <span className="text-[10px] font-bold text-indigo-800 bg-indigo-200/60 px-2 py-0.5 rounded-full">
                All Indian Banks
              </span>
            </div>

            <span className="text-[11px] text-indigo-900 font-bold">
              Select Your Bank:
            </span>

            <div className="grid grid-cols-3 gap-2">
              {popularBanks.map((bank) => {
                const isSelected = selectedBank === bank.name;
                return (
                  <button
                    key={bank.id}
                    type="button"
                    onClick={() => setSelectedBank(bank.name)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      isSelected
                        ? 'border-2 border-indigo-700 bg-white text-indigo-900 font-black shadow-xs ring-1 ring-indigo-700'
                        : 'border-indigo-200 bg-white/70 text-indigo-950 font-bold hover:bg-white'
                    }`}
                  >
                    <span className="text-xs font-black">{bank.code}</span>
                    <span className="text-[9px] text-[#5A6860] truncate w-full mt-0.5">{bank.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-indigo-800 mt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>You will be redirected to {selectedBank}&apos;s secure authorization gateway.</span>
            </div>
          </div>
        )}

        {/* Dynamic Payment Method Display - Cash (4) */}
        {selectedMethod === 4 && (
          <div className="w-full border border-amber-300 bg-amber-50/90 rounded-3xl p-5 flex flex-col items-center text-center gap-3 shadow-sm animate-in fade-in duration-200">
            <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 mb-0.5">
              <Banknote className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-amber-950 uppercase tracking-wider">
              Cash Payment Selected
            </span>
            <p className="text-xs text-amber-900 font-bold">
              Please hand over <span className="font-black text-sm text-[#1A2621]">₹{grandPayable}</span> in cash to your Floor Captain.
            </p>

            <button
              type="button"
              onClick={handleNotifyCashCaptain}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isCashNotified
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-700 hover:bg-amber-800 text-white shadow-xs'
              }`}
            >
              {isCashNotified ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Captain Alerted for Cash Collection</span>
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  <span>Call Floor Captain for Cash Pickup</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-200/60 rounded-full text-[10px] font-extrabold text-amber-900">
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
              <span>Floor Captain terminal is notified of Table #{chairId}</span>
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

          {/* Real Item Rows with FSSAI Badges & Customization Notes */}
          <div className="w-full flex flex-col gap-3">
            {session?.items && session.items.length > 0 ? (
              session.items.map((item, idx) => {
                const numericId = item.id.replace('dish-', '');
                const dishData = getMenuItemById(numericId);
                const isVeg = dishData.isVegetarian ?? (item.dish_id === 'dish-1' || item.dish_id === 'dish-4');

                return (
                  <div key={idx} className="w-full flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Dish Thumbnail */}
                      <div className="w-11 h-11 rounded-xl border border-white overflow-hidden flex items-center justify-center shrink-0 bg-[#fbf9f5] shadow-xs relative">
                        <img
                          src={dishData.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover object-center"
                        />
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {/* FSSAI Badge */}
                          <div className={`w-3 h-3 rounded-[2px] border flex items-center justify-center shrink-0 p-[1px] bg-white ${
                            isVeg ? 'border-emerald-600' : 'border-[#8B2500]'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              isVeg ? 'bg-emerald-600' : 'bg-[#8B2500]'
                            }`} />
                          </div>
                          <span className="text-xs font-bold truncate text-[#1A2621]">
                            {item.title} &times; {item.quantity}
                          </span>
                        </div>
                        {item.notes && (
                          <span className="text-[10px] text-[#8C7A6B] italic truncate pl-4">
                            Note: &ldquo;{item.notes}&rdquo;
                          </span>
                        )}
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
                  <div className="w-11 h-11 rounded-xl border border-white overflow-hidden flex items-center justify-center shrink-0 bg-[#fbf9f5] shadow-xs">
                    <img
                      src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80"
                      alt="Donne Biryani"
                      className="w-full h-full object-cover object-center"
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
                <span>Staff Tip (Floor Waiter)</span>
                <span className="text-[#D46238]">+ ₹ {tipAmount}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="w-full flex items-center justify-between text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Promo Applied ({promoParam || 'Discount'})
                </span>
                <span className="font-black text-emerald-700">- ₹ {discountAmount}</span>
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
            <span className="text-2xl font-black text-[#1E3A2F]">
              ₹ {grandPayable}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Continue Button with Dual Gradient & Glowing Shadow */}
      <div className="sticky bottom-0 z-30 w-full bg-[#FAF7F0]/95 backdrop-blur-md pt-3 pb-4 border-t border-[#EAE3D5]">
        {selectedMethod === 2 ? (
          /* Card Selected -> Goes to Card Details */
          <Link
            href={`/seat/${chairId}/card-details?card=${selectedCardId || 'card2'}&amount=${grandPayable}&tip=${tipAmount}${discountAmount > 0 ? `&discount=${discountAmount}&promo=${encodeURIComponent(promoParam || '')}` : ''}`}
            className="w-full py-4 bg-gradient-to-r from-[#1E3A2F] via-[#244436] to-[#C85A32] text-white text-sm font-bold uppercase tracking-wider rounded-full flex items-center justify-center cursor-pointer active:opacity-90 shadow-[0_8px_25px_rgba(200,90,50,0.35)] hover:shadow-[0_10px_28px_rgba(200,90,50,0.4)] transition-all text-center"
          >
            Continue to Card Details (₹ {grandPayable})
          </Link>
        ) : selectedMethod !== null ? (
          /* Method Selected (UPI, NetBank, Cash) -> Goes to Payment Success */
          <Link
            href={`/seat/${chairId}/payment-success?mode=${encodeURIComponent(selectedMethodName)}&amount=${grandPayable}&tip=${tipAmount}${discountAmount > 0 ? `&discount=${discountAmount}&promo=${encodeURIComponent(promoParam || '')}` : ''}`}
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

      {/* Add Custom Payment Method Modal */}
      {showAddMethodModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#FFFEFC] rounded-3xl p-6 flex flex-col gap-4 shadow-2xl border border-[#DCE4DC] animate-in fade-in slide-in-from-bottom duration-200">
            <div className="w-full flex items-center justify-between pb-2 border-b border-[#EAE3D5]">
              <span className="text-sm font-black uppercase tracking-wider text-[#1E3A2F]">
                Add Payment Method
              </span>
              <button
                type="button"
                onClick={() => setShowAddMethodModal(false)}
                className="w-8 h-8 rounded-full border border-[#DCE4DC] flex items-center justify-center text-[#5A6860] hover:text-[#1A2621] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href={`/seat/${chairId}/card-details?card=custom&amount=${grandPayable}&tip=${tipAmount}${discountAmount > 0 ? `&discount=${discountAmount}&promo=${encodeURIComponent(promoParam || '')}` : ''}`}
                className="w-full p-3 rounded-2xl border border-[#DCE4DC] bg-[#FAF8F5] flex items-center gap-3 hover:border-[#1E3A2F] transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-[#1E3A2F] text-white flex items-center justify-center shrink-0">
                  <CreditCardIcon className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-[#1A2621]">Add New Debit / Credit Card</span>
                  <span className="text-[10px] text-[#5A6860]">Visa, MasterCard, RuPay, Amex</span>
                </div>
              </Link>

              <div className="flex flex-col gap-1.5 p-3 rounded-2xl border border-[#DCE4DC] bg-[#FAF8F5]">
                <span className="text-xs font-black text-[#1A2621]">Enter Custom UPI ID</span>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    placeholder="e.g. yourname@okhdfcbank"
                    value={customUpiInput}
                    onChange={(e) => setCustomUpiInput(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-[#DCE4DC] rounded-xl bg-white focus:outline-none focus:border-emerald-600 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customUpiInput.trim().includes('@')) {
                        setShowAddMethodModal(false);
                        setSelectedMethod(1);
                      }
                    }}
                    className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Set
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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
