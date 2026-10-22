'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Check } from 'lucide-react';
import CustomerBottomNav from '../../../../components/navigation/CustomerBottomNav';
import { useHardwareBack } from '../../../../lib/hooks/useHardwareBack';
import { getActiveDiningSession, clearActiveDiningSession, updateActiveDiningSession } from '../../../../lib/session/diningSession';
import { useCart } from '../../../../lib/context/CartContext';
import { realtimeBridge } from '../../../../lib/supabase';

function PaymentSuccessContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const chairId = (params?.chairId as string) || '12';
  const { clearCart } = useCart();

  // Device hardware back button & swipe back: return to profile
  useHardwareBack(`/seat/${chairId}/profile`);

  const modeParam = searchParams?.get('mode') || 'UPI';
  const amountParam = searchParams?.get('amount');
  const tipParam = searchParams?.get('tip');

  const [settledAmount, setSettledAmount] = useState<number>(
    amountParam ? Number(amountParam) : 0
  );
  const [appliedTip, setAppliedTip] = useState<number>(0);
  const [transactionId, setTransactionId] = useState<string>('');

  // Mark session as paid, save settled receipt record, and release anti-cheat lock
  useEffect(() => {
    const s = getActiveDiningSession();
    const storedTipStr = typeof window !== 'undefined' ? sessionStorage.getItem(`thoogudeepa_selected_tip_${chairId}`) : null;
    const tipFromStorage = storedTipStr === '₹ 30' ? 30 : storedTipStr === '₹ 50' ? 50 : storedTipStr === '₹ 100' ? 100 : 0;
    const tipAmount = tipParam !== null && tipParam !== undefined ? Number(tipParam) : tipFromStorage;
    setAppliedTip(tipAmount);

    let finalAmount = Number(amountParam) || 0;
    if (s && s.seatId === chairId) {
      if (!finalAmount) {
        finalAmount = (s.totalAmount || 0) + tipAmount;
      }
      setSettledAmount(finalAmount);
      try {
        localStorage.setItem(
          `thoogudeepa_settled_receipt_${chairId}`,
          JSON.stringify({
            ticketNumber: s.ticketNumber,
            seatId: chairId,
            items: s.items || [],
            subtotal: s.items && s.items.length > 0
              ? s.items.reduce((acc, it) => acc + it.price * it.quantity, 0)
              : Math.round((finalAmount - tipAmount) / 1.05),
            tip: tipAmount,
            totalAmount: finalAmount,
            mode: modeParam,
            settledAt: Date.now(),
          })
        );
      } catch {
        // Ignore storage errors
      }
    } else {
      try {
        const storedReceipt = localStorage.getItem(`thoogudeepa_settled_receipt_${chairId}`);
        if (storedReceipt) {
          const parsed = JSON.parse(storedReceipt);
          if (parsed.totalAmount) {
            setSettledAmount(parsed.totalAmount);
            finalAmount = parsed.totalAmount;
          }
          if (parsed.tip) {
            setAppliedTip(parsed.tip);
          }
        }
      } catch {
        // Ignore storage errors
      }
    }

    // Persist or generate clean transaction ID
    const txnKey = `thoogudeepa_txn_id_${chairId}`;
    let txn = '';
    try {
      txn = localStorage.getItem(txnKey) || '';
      if (!txn) {
        txn = `TXN-${chairId}-${Math.floor(10000000 + Math.random() * 90000000)}`;
        localStorage.setItem(txnKey, txn);
      }
    } catch {
      txn = `TXN-${chairId}-${Date.now().toString().slice(-8)}`;
    }
    setTransactionId(txn);

    updateActiveDiningSession({ paymentStatus: 'paid' });
    realtimeBridge.settleBill(chairId, modeParam, finalAmount);
    clearActiveDiningSession();
    clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chairId, modeParam, amountParam, tipParam]);

  // Completion timestamp recorded once and persisted permanently
  const [completionTimestamp, setCompletionTimestamp] = useState<{ date: string; time: string }>({
    date: '',
    time: '',
  });

  useEffect(() => {
    const storageKey = `thoogudeepa_payment_timestamp_${chairId}`;
    const stored = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.date && parsed.time) {
          setCompletionTimestamp(parsed);
          return;
        }
      } catch {
        // Fall through if parsing fails
      }
    }

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const formattedTime = `${hours}:${minutes}:${seconds}`;

    const timestampData = {
      date: formattedDate,
      time: formattedTime,
    };

    setCompletionTimestamp(timestampData);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(timestampData));
    }
  }, [chairId]);

  // Automatic transition to Bill page after 3 seconds
  const [countdown, setCountdown] = useState<number>(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.replace(`/seat/${chairId}/receipt`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [chairId]);

  // Details rows for the receipt/transaction card
  const transactionRows = [
    { label: 'Transaction ID', value: transactionId || `TXN-${chairId}-90823411` },
    ...(appliedTip > 0 ? [{ label: 'Staff Tip (Waiter)', value: `₹ ${appliedTip}` }] : []),
    { label: 'Total Settled', value: `₹ ${settledAmount}` },
    { label: 'Payment Mode', value: modeParam },
    { label: 'Seat Assigned', value: `Seat #${chairId}` },
    { label: 'Time', value: completionTimestamp.time || '--:--:--' },
    { label: 'Date', value: completionTimestamp.date || '--/--/----' },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col justify-between max-w-md mx-auto relative px-4 pt-4 pb-36 text-[#1A2621]">
      {/* Scrollable Content Container */}
      <div className="w-full flex flex-col items-center gap-6">
        {/* Top Header */}
        <header className="w-full flex items-center justify-center py-2 border-b border-[rgba(220,226,222,0.7)] pb-3 relative">
          <h1 className="text-base font-bold tracking-tight text-[#1A2621]">Payment Completed</h1>
        </header>

        {/* Central Success Badge Section */}
        <div className="w-full flex flex-col items-center justify-center pt-4 pb-2">
          {/* Concentric Circular Container with Check Badge */}
          <div className="w-32 h-32 rounded-full border border-[rgba(220,226,222,0.8)] flex items-center justify-center bg-[#FFFEFC] shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-3 relative">
            <div className="w-24 h-24 rounded-full border border-emerald-600 flex items-center justify-center bg-gradient-to-r from-[#244436] to-[#1e382c] text-white shadow-md">
              <Check className="w-12 h-12 stroke-[3]" />
            </div>
          </div>

          {/* Success Title */}
          <h2 className="text-lg font-black tracking-tight mt-5 mb-1 text-center text-[#1A2621]">
            Payment Successful!
          </h2>

          {/* Success Subtitle Line */}
          <p className="text-xs text-[#244436] font-bold tracking-wide text-center">
            Successfully Settled ₹ {settledAmount}
          </p>
        </div>

        {/* Transaction Summary Card */}
        <div className="w-full flex flex-col gap-2.5">
          <span className="text-xs font-black uppercase tracking-wider text-[#1A2621]">
            Settlement Summary
          </span>

          <div className="w-full border border-[rgba(220,226,222,0.8)] rounded-3xl p-5 flex flex-col gap-3.5 bg-[#FFFEFC] shadow-[0_4px_20px_-4px_rgba(36,68,54,0.06)]">
            {transactionRows.map((row, idx) => (
              <div key={idx} className="w-full flex items-center justify-between text-xs">
                <span className="text-[#5A6860] font-semibold">{row.label}</span>
                <span className="font-bold text-[#1A2621]">{row.value}</span>
              </div>
            ))}

            {/* Status Row with Pill */}
            <div className="w-full flex items-center justify-between text-xs pt-1 border-t border-[rgba(220,226,222,0.7)]">
              <span className="text-[#5A6860] font-semibold">Status</span>
              <span className="border border-emerald-500 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-900 shadow-2xs">
                Paid &amp; Settled
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sticky View Bill Button directly above the bottom nav icons */}
      <div className="sticky bottom-16 z-30 w-full bg-[#FFFEFC]/95 backdrop-blur-md pt-2 pb-2">
        <Link
          href={`/seat/${chairId}/receipt`}
          className="w-full bg-gradient-to-r from-[#244436] to-[#DD6B28] text-white py-3.5 px-4 text-sm font-bold uppercase tracking-wider rounded-xl flex items-center justify-center cursor-pointer active:opacity-90 transition-all text-center shadow-md hover:shadow-lg"
        >
          View Tax Invoice {countdown > 0 ? `(${countdown}s)` : ''}
        </Link>
      </div>

      {/* Fixed Bottom Navigation Bar - Home, likes, cart disabled; Profile enabled */}
      <CustomerBottomNav
        chairId={chairId}
        disabledTabs={['home', 'likes', 'tracking', 'cart']}
      />
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-[#F9F8F5] to-[#F3F1EC]" />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
