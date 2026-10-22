'use client';

import React, { useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ChevronLeft, CreditCard, Calendar, Eye, EyeOff } from 'lucide-react';
import { useHardwareBack } from '../../../../lib/hooks/useHardwareBack';

function CardDetailsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const chairId = (params?.chairId as string) || '12';

  // Device hardware back button & swipe back: return to payment methods
  useHardwareBack(`/seat/${chairId}/payment`);

  const cardParam = searchParams?.get('card') || 'card1';
  const amountParam = searchParams?.get('amount') || '';
  const tipParam = searchParams?.get('tip') || '';

  // Cards catalog matching payment page
  const cardPresets: Record<string, { title: string; number: string; holder: string; expiry: string; logo: string }> = {
    card1: {
      title: 'CARD / PRIMARY',
      number: '•••• •••• •••• 2345',
      holder: `Seat #${chairId} Guest`,
      expiry: '02 / 28',
      logo: 'VISA',
    },
    card2: {
      title: 'CARD / SECONDARY',
      number: '•••• •••• •••• 8765',
      holder: `Seat #${chairId} Guest`,
      expiry: '09 / 29',
      logo: 'MASTERCARD',
    },
    card3: {
      title: 'CARD / UPI QR',
      number: '•••• •••• •••• 9901',
      holder: `Seat #${chairId} Guest`,
      expiry: '12 / 30',
      logo: 'RUPAY',
    },
  };

  const activeCard = cardPresets[cardParam] || cardPresets.card1;

  // Empty initial values by default - only placeholders shown
  const [cardholderName, setCardholderName] = useState('');
  const [cvv, setCvv] = useState('');
  const [showCvv, setShowCvv] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // Hidden native month picker ref
  const monthInputRef = useRef<HTMLInputElement>(null);

  // Current month and year in YYYY-MM format to restrict past dates
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentMonthNum = String(currentMonth).padStart(2, '0');
  const minMonth = `${currentYear}-${currentMonthNum}`;

  // Auto-format card number with a space after every 4 digits
  const handleCardNumberChange = (raw: string) => {
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 16);
    const parts = digitsOnly.match(/.{1,4}/g);
    const formatted = parts ? parts.join(' ') : '';
    setCardNumber(formatted);
  };

  // Convert YYYY-MM from input type="month" to MM/YY
  const handleMonthPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // "YYYY-MM"
    if (val && val.includes('-')) {
      const [year, month] = val.split('-');
      const formatted = `${month}/${year.slice(-2)}`;
      setExpiryDate(formatted);
    }
  };

  // Allow manual typing of MM/YY with auto slash
  const handleExpiryManualChange = (raw: string) => {
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 4);
    if (digitsOnly.length >= 3) {
      setExpiryDate(`${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`);
    } else {
      setExpiryDate(digitsOnly);
    }
  };

  // Validate if entered MM/YY is non-expired (current or future month/year)
  const isExpiryValid = (val: string): boolean => {
    if (!val || val.length < 5 || !val.includes('/')) return false;
    const [mStr, yStr] = val.split('/');
    const m = parseInt(mStr, 10);
    const y = parseInt(yStr, 10);

    if (isNaN(m) || isNaN(y) || m < 1 || m > 12) return false;

    // Full 4-digit year from 2-digit input (e.g. 26 -> 2026)
    const fullYear = 2000 + y;

    if (fullYear < currentYear) return false;
    if (fullYear === currentYear && m < currentMonth) return false;

    return true;
  };

  const isCurrentExpiryValid = isExpiryValid(expiryDate);

  // Validate that all fields have valid data
  const isFormComplete =
    cardholderName.trim().length > 0 &&
    cvv.trim().length >= 3 &&
    cardNumber.replace(/\s/g, '').length === 16 &&
    isCurrentExpiryValid;

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#F9F8F5] via-[#F7F5F0] to-[#F3F1EC] text-[#1A2621] flex flex-col justify-between max-w-md mx-auto relative px-4 pt-4 pb-28">
      {/* Scrollable Content Container */}
      <div className="w-full flex flex-col gap-6">
        {/* Top Header */}
        <header className="w-full flex items-center justify-between py-2 border-b border-[#DCE2DE]/60 pb-3">
          {/* Back Navigation Button to Payments */}
          <Link
            href={`/seat/${chairId}/payment`}
            className="w-10 h-10 border border-[#DCE2DE] rounded-xl flex items-center justify-center cursor-pointer active:opacity-70 bg-[#FFFEFC] text-[#1A2621] shadow-xs"
            aria-label="Back to Payments"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          {/* Center Title - Renamed to Card Payment */}
          <h1 className="text-base font-bold tracking-tight text-[#1A2621]">Card Payment</h1>

          {/* Spacer to keep title centered */}
          <div className="w-10 h-10" />
        </header>

        {/* Selected Card Preview Component */}
        <div className="w-full border border-[#DCE2DE] rounded-3xl p-5 flex flex-col justify-between h-48 bg-gradient-to-br from-[#244436] to-[#1C372B] text-white shadow-[0_8px_24px_rgba(36,68,54,0.18)]">
          {/* Top Row: Title & Logo Placeholder */}
          <div className="w-full flex items-center justify-between">
            <span className="text-sm font-black tracking-wide text-white/90">{activeCard.title}</span>
            <div className="border border-white/30 bg-white/10 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-white">
              {activeCard.logo}
            </div>
          </div>

          {/* Middle Row: Card Number Digits */}
          <div className="text-base font-mono font-bold tracking-widest my-auto text-white">
            {cardNumber.trim() ? cardNumber : activeCard.number}
          </div>

          {/* Bottom Row: Chip Placeholder & Details */}
          <div className="w-full flex items-end justify-between">
            {/* Chip Placeholder */}
            <div className="w-9 h-7 border border-[#DD6B28]/50 rounded-md flex items-center justify-center bg-gradient-to-tr from-[#DD6B28]/30 to-[#DD6B28]/60">
              <div className="w-5 h-4 border border-[#DD6B28]/60 rounded-xs" />
            </div>

            {/* Holder Name & Expiry Meta */}
            <div className="flex gap-6 text-right">
              <div className="flex flex-col">
                <span className="text-[9px] text-white/60 font-bold uppercase">Card Holder Name</span>
                <span className="text-xs font-bold text-white">
                  {cardholderName.trim() ? cardholderName : activeCard.holder}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-white/60 font-bold uppercase">Expiry Date</span>
                <span className="text-xs font-bold text-white">
                  {expiryDate.trim() ? expiryDate : activeCard.expiry}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Input Fields Section */}
        <div className="w-full flex flex-col gap-4">
          {/* Row 1: Cardholder Name & CVV Side-by-Side */}
          <div className="w-full grid grid-cols-5 gap-3">
            {/* Cardholder Name (3 cols) */}
            <div className="col-span-3 flex flex-col gap-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-[#5A6860]">
                Cardholder Name
              </label>
              <input
                type="text"
                placeholder="Full Name"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                className="w-full border border-[#DCE2DE] rounded-2xl px-3.5 py-3 text-xs font-bold focus:outline-hidden focus:border-[#244436] bg-[#FFFEFC] text-[#1A2621] placeholder-[#5A6860]/40 shadow-xs"
              />
            </div>

            {/* CVV (2 cols) with Eye Toggle */}
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-[#5A6860]">
                CVV
              </label>
              <div className="w-full border border-[#DCE2DE] rounded-2xl px-3 py-3 flex items-center justify-between bg-[#FFFEFC] text-[#1A2621] shadow-xs focus-within:border-[#244436]">
                <input
                  type={showCvv ? 'text' : 'password'}
                  maxLength={4}
                  placeholder="1234"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-xs font-bold focus:outline-hidden bg-transparent tracking-widest text-center text-[#1A2621] placeholder-[#5A6860]/40"
                />
                <button
                  type="button"
                  onClick={() => setShowCvv((prev) => !prev)}
                  className="text-[#5A6860] hover:text-[#1A2621] cursor-pointer shrink-0 ml-1.5"
                  aria-label={showCvv ? 'Hide CVV' : 'Show CVV'}
                >
                  {showCvv ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Card Number with Auto 4-digit Spacing */}
          <div className="w-full flex flex-col gap-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-[#5A6860]">
              Card Number
            </label>
            <div className="w-full border border-[#DCE2DE] rounded-2xl px-3.5 py-3 flex items-center justify-between bg-[#FFFEFC] text-[#1A2621] shadow-xs focus-within:border-[#244436]">
              <input
                type="text"
                maxLength={19}
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={(e) => handleCardNumberChange(e.target.value)}
                className="w-full text-xs font-bold focus:outline-hidden bg-transparent font-mono tracking-wider text-[#1A2621] placeholder-[#5A6860]/40"
              />
              <CreditCard className="w-4 h-4 text-[#5A6860] shrink-0 ml-2" />
            </div>
          </div>

          {/* Row 3: Expire Date with Month/Year Calendar Selector */}
          <div className="w-full flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-[#5A6860]">
                Expire Date
              </label>
              {expiryDate.length === 5 && !isCurrentExpiryValid && (
                <span className="text-[10px] font-bold text-red-600">
                  Invalid / Expired
                </span>
              )}
            </div>
            <div
              className={`w-full border rounded-2xl px-3.5 py-3 flex items-center justify-between bg-[#FFFEFC] text-[#1A2621] shadow-xs relative transition-colors ${
                expiryDate.length === 5 && !isCurrentExpiryValid
                  ? 'border-red-600 ring-1 ring-red-600'
                  : 'border-[#DCE2DE] focus-within:border-[#244436]'
              }`}
            >
              <input
                type="text"
                maxLength={5}
                placeholder="MM/YY"
                value={expiryDate}
                onChange={(e) => handleExpiryManualChange(e.target.value)}
                className="w-full text-xs font-bold focus:outline-hidden bg-transparent font-mono tracking-wider text-[#1A2621] placeholder-[#5A6860]/40"
              />

              {/* Hidden native month picker restricted to current and upcoming months/years */}
              <input
                ref={monthInputRef}
                type="month"
                min={minMonth}
                onChange={handleMonthPickerChange}
                className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
                tabIndex={-1}
                aria-hidden="true"
              />

              {/* Calendar icon button triggers native Month/Year picker */}
              <button
                type="button"
                onClick={() => {
                  try {
                    monthInputRef.current?.showPicker();
                  } catch {
                    monthInputRef.current?.focus();
                  }
                }}
                className="text-[#5A6860] hover:text-[#1A2621] cursor-pointer shrink-0 ml-2 active:opacity-70"
                aria-label="Open Month/Year Picker"
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Continue Button - Active only when all details are filled */}
      <div className="sticky bottom-0 z-30 w-full bg-[#FFFEFC]/95 backdrop-blur-sm pt-3 pb-4 border-t border-[#DCE2DE]/60">
        {isFormComplete ? (
          <Link
            href={`/seat/${chairId}/payment-success?mode=Card&card=${cardParam}${amountParam ? `&amount=${amountParam}` : ''}${tipParam ? `&tip=${tipParam}` : ''}`}
            className="w-full bg-gradient-to-r from-[#244436] to-[#DD6B28] text-white py-3.5 px-4 text-sm font-bold uppercase tracking-wider rounded-xl flex items-center justify-center cursor-pointer active:opacity-90 transition-opacity text-center shadow-[0_4px_16px_rgba(36,68,54,0.2)] hover:opacity-95"
          >
            Continue
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="w-full border border-[#DCE2DE] bg-[#F4F1EA] text-[#5A6860] py-3.5 px-4 text-sm font-bold uppercase tracking-wider rounded-xl flex items-center justify-center cursor-not-allowed text-center opacity-70"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}

export default function CustomerCardDetailsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F9F8F5]" />}>
      <CardDetailsContent />
    </Suspense>
  );
}
