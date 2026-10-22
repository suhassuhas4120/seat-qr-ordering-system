'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ChevronLeft,
  Calendar,
  Clock,
  Armchair,
  User,
  UtensilsCrossed,
  Download,
  CheckCircle2,
  Smile,
  Meh,
  Frown,
  Angry,
  ChefHat,
  MessageCircle,
  ArrowRight,
  Receipt
} from 'lucide-react';
import { useHardwareBack } from '../../../../lib/hooks/useHardwareBack';

interface SettledReceipt {
  ticketNumber: string;
  seatId?: string;
  items?: { id: string; title: string; quantity: number; price: number }[];
  subtotal?: number;
  tip?: number;
  totalAmount: number;
  mode: string;
  settledAt: number;
}

export default function CustomerReceiptPage() {
  const params = useParams();
  const chairId = (params?.chairId as string) || '12';

  // Device hardware back button & swipe back: return to profile
  useHardwareBack(`/seat/${chairId}/profile`);

  const seatNumber = chairId.replace(/[^0-9]/g, '') || chairId;

  const [receipt, setReceipt] = useState<SettledReceipt | null>(null);
  const [selectedRating, setSelectedRating] = useState<string>('opt-1');
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(`thoogudeepa_settled_receipt_${chairId}`);
      if (stored) {
        setReceipt(JSON.parse(stored));
      }
    } catch {
      // Ignore storage errors
    }
  }, [chairId]);

  const ratingOptions = [
    { id: 'opt-1', label: 'Excellent', icon: ChefHat },
    { id: 'opt-2', label: 'Good', icon: Smile },
    { id: 'opt-3', label: 'Okay', icon: Meh },
    { id: 'opt-4', label: 'Bad', icon: Frown },
    { id: 'opt-5', label: 'Terrible', icon: Angry },
  ];

  const itemsList = receipt?.items && receipt.items.length > 0 ? receipt.items : [];
  const totalAmount = receipt?.totalAmount || 0;
  const tipAmount = receipt?.tip || 0;
  const subtotal = receipt?.subtotal || (itemsList.length > 0
    ? itemsList.reduce((acc, it) => acc + it.price * it.quantity, 0)
    : Math.max(0, Math.round((totalAmount - tipAmount) / 1.05)));
  const cgst = Math.round(subtotal * 0.025);
  const sgst = Math.round(subtotal * 0.025);

  const settleTimestamp = receipt?.settledAt;
  const settleDate = settleTimestamp ? new Date(settleTimestamp) : null;

  const formattedDate = settleDate
    ? `${String(settleDate.getDate()).padStart(2, '0')}/${String(
        settleDate.getMonth() + 1
      ).padStart(2, '0')}/${settleDate.getFullYear()}`
    : mounted
    ? `${String(new Date().getDate()).padStart(2, '0')}/${String(
        new Date().getMonth() + 1
      ).padStart(2, '0')}/${new Date().getFullYear()}`
    : '19/10/2026';

  const formattedTime = settleDate
    ? `${String(settleDate.getHours()).padStart(2, '0')}:${String(
        settleDate.getMinutes()
      ).padStart(2, '0')}`
    : mounted
    ? `${String(new Date().getHours()).padStart(2, '0')}:${String(
        new Date().getMinutes()
      ).padStart(2, '0')}`
    : '04:25';

  const handleShareWhatsApp = () => {
    let text = `*THOOGUDEEPA MILITARY HOTEL*\n`;
    text += `Authentic Donne Biryani Mane\n`;
    text += `--------------------------------\n`;
    text += `Seat: Seat #${seatNumber}\n`;
    text += `Invoice: #${receipt?.ticketNumber || seatNumber}\n`;
    text += `Date: ${formattedDate} at ${formattedTime}\n`;
    text += `Paid via: ${receipt?.mode || 'UPI'}\n`;
    text += `--------------------------------\n`;
    text += `*ITEMS:*\n`;
    if (itemsList.length > 0) {
      itemsList.forEach((it) => {
        text += `• ${it.quantity}x ${it.title} - ₹${it.price * it.quantity}\n`;
      });
    } else {
      text += `• Military Dining - ₹${subtotal}\n`;
    }
    text += `--------------------------------\n`;
    text += `Item Subtotal: ₹${subtotal}\n`;
    text += `CGST (2.5%): ₹${cgst}\n`;
    text += `SGST (2.5%): ₹${sgst}\n`;
    if (tipAmount > 0) {
      text += `Staff Tip: ₹${tipAmount}\n`;
    }
    text += `*TOTAL PAID: ₹${totalAmount}*\n`;
    text += `Status: PAID & SETTLED ✅\n`;
    text += `--------------------------------\n`;
    text += `Thank you for dining with us! 🙏`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleDownloadBill = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between max-w-md mx-auto relative px-4 pt-4 pb-12 text-[#1A2621]">
      {/* Scrollable Upper Content Container */}
      <div className="w-full flex flex-col gap-4">
        {/* Top Header */}
        <header className="w-full flex items-center justify-between py-2 border-b border-[rgba(220,226,222,0.7)] pb-3">
          <Link
            href={`/seat/${chairId}/profile`}
            className="w-10 h-10 border border-[rgba(220,226,222,0.8)] rounded-xl flex items-center justify-center cursor-pointer active:opacity-70 bg-[#FFFEFC] text-[#1A2621] shadow-2xs"
            aria-label="Back to Profile"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          <div className="text-center flex flex-col items-center">
            <h1 className="text-sm font-black tracking-wider uppercase text-[#1A2621]">
              Bill Details
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-[#5A6860] font-bold uppercase">
                Seat #{seatNumber}
              </span>
            </div>
          </div>

          <div className="w-10 h-10" />
        </header>

        {!receipt ? (
          <div className="w-full py-16 flex flex-col items-center justify-center text-center gap-3 border border-[rgba(220,226,222,0.8)] rounded-3xl bg-[#FFFEFC] p-6 my-4 shadow-[0_4px_20px_-4px_rgba(36,68,54,0.06)]">
            <div className="w-14 h-14 rounded-full border border-[rgba(220,226,222,0.9)] bg-[#F9F8F5] flex items-center justify-center shadow-xs">
              <Receipt className="w-6 h-6 text-[#244436]" />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-black uppercase text-[#1A2621]">
                No Paid Bills Found
              </h2>
              <p className="text-xs text-[#5A6860] font-medium max-w-xs">
                There are no settled invoices on record for Seat #{seatNumber}.
              </p>
            </div>
            <Link
              href={`/seat/${chairId}/menu`}
              className="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#244436] to-[#DD6B28] text-white text-xs font-black uppercase tracking-wider shadow-md hover:opacity-95"
            >
              Go to Menu
            </Link>
          </div>
        ) : (
          <>
            {/* Card 1: Restaurant Identity & Order Details Card */}
            <div className="w-full border border-[rgba(220,226,222,0.8)] rounded-3xl p-4 flex flex-col gap-3 bg-[#FFFEFC] shadow-[0_4px_16px_-4px_rgba(36,68,54,0.05)]">
              <div className="w-full flex items-center gap-3 pb-3 border-b border-[rgba(220,226,222,0.7)]">
                <div className="w-12 h-12 rounded-full border border-[rgba(220,226,222,0.9)] flex items-center justify-center bg-[#FFFEFC] overflow-hidden shrink-0 shadow-2xs">
                  <img
                    src="/logo.jpg"
                    alt="Thoogudeepa"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="text-xs font-black uppercase tracking-wide text-[#1A2621]">THOOGUDEEPA</span>
                  <span className="text-[10px] text-[#5A6860] font-medium uppercase">Authentic Donne Biryani Mane</span>
                </div>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full border border-[rgba(220,226,222,0.9)] flex items-center justify-center shrink-0 bg-[#F9F8F5]">
                    <Calendar className="w-3.5 h-3.5 text-[#244436]" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] text-[#5A6860] font-bold uppercase tracking-wider">Date</span>
                    <span className="text-xs font-bold text-[#1A2621]" suppressHydrationWarning>{formattedDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full border border-[rgba(220,226,222,0.9)] flex items-center justify-center shrink-0 bg-[#F9F8F5]">
                    <Clock className="w-3.5 h-3.5 text-[#244436]" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] text-[#5A6860] font-bold uppercase tracking-wider">Time</span>
                    <span className="text-xs font-bold text-[#1A2621]" suppressHydrationWarning>{formattedTime}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full border border-[rgba(220,226,222,0.9)] flex items-center justify-center shrink-0 bg-[#F9F8F5]">
                    <Armchair className="w-3.5 h-3.5 text-[#244436]" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] text-[#5A6860] font-bold uppercase tracking-wider">Seat</span>
                    <span className="text-xs font-bold text-[#1A2621]">Seat #{seatNumber}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full border border-[rgba(220,226,222,0.9)] flex items-center justify-center shrink-0 bg-[#F9F8F5]">
                    <UtensilsCrossed className="w-3.5 h-3.5 text-[#244436]" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] text-[#5A6860] font-bold uppercase tracking-wider">Mode</span>
                    <span className="text-xs font-bold text-[#1A2621]">Dine-In</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Items Description & Amount Breakdown */}
            <div className="w-full border border-[rgba(220,226,222,0.8)] rounded-3xl p-4 flex flex-col gap-3 bg-[#FFFEFC] shadow-[0_4px_16px_-4px_rgba(36,68,54,0.05)] print:hidden">
              <div className="w-full flex items-center justify-between pb-2 border-b border-[rgba(220,226,222,0.7)] text-[11px] font-black uppercase tracking-wider text-[#5A6860]">
                <span>Item Description</span>
                <span>Amount</span>
              </div>

              {itemsList.length > 0 ? (
                <div className="w-full flex flex-col gap-2.5">
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
                <div className="w-full flex flex-col gap-2.5">
                  <div className="w-full flex items-center justify-between text-xs font-bold text-[#1A2621]">
                    <span>Military Dining (Ticket #{receipt.ticketNumber})</span>
                    <span className="text-[#244436]">₹ {subtotal}</span>
                  </div>
                </div>
              )}

              {/* Subtotals & Taxes */}
              <div className="w-full flex flex-col gap-2 pt-3 border-t border-[rgba(220,226,222,0.7)] text-xs font-semibold">
                <div className="w-full flex items-center justify-between text-[#5A6860]">
                  <span>Item Subtotal ({itemsList.reduce((acc, curr) => acc + curr.quantity, 0)} items)</span>
                  <span className="text-[#1A2621]">₹ {subtotal}</span>
                </div>
                <div className="w-full flex items-center justify-between text-[#5A6860]">
                  <span>CGST (2.5%)</span>
                  <span className="text-[#1A2621]">₹ {cgst}</span>
                </div>
                <div className="w-full flex items-center justify-between text-[#5A6860]">
                  <span>SGST (2.5%)</span>
                  <span className="text-[#1A2621]">₹ {sgst}</span>
                </div>
                {tipAmount > 0 && (
                  <div className="w-full flex items-center justify-between text-[#244436] font-bold bg-emerald-50/80 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                    <span>Staff Tip (Waiter)</span>
                    <span className="text-[#DD6B28]">+ ₹ {tipAmount}</span>
                  </div>
                )}
              </div>

              {/* Grand Total Amount Paid */}
              <div className="w-full flex items-center justify-between pt-3 border-t border-[rgba(220,226,222,0.8)] text-sm font-black uppercase tracking-wider text-[#1A2621]">
                <span>Total Amount Paid</span>
                <span className="text-base font-black text-[#244436]">₹ {totalAmount}</span>
              </div>
            </div>

            {/* Card 3: Payment Method & Settlement Status */}
            <div className="w-full border border-[rgba(220,226,222,0.8)] rounded-3xl p-3.5 px-4 flex items-center justify-between bg-[#FFFEFC] shadow-[0_4px_16px_-4px_rgba(36,68,54,0.05)] print:hidden">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full border border-emerald-300 flex items-center justify-center shrink-0 bg-emerald-50">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-black uppercase tracking-wide text-[#1A2621]">Paid via {receipt.mode}</span>
                  <span className="text-[10px] text-[#5A6860] font-mono">Invoice #{receipt.ticketNumber}</span>
                </div>
              </div>

              <div className="border border-emerald-500 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                <span>Settled</span>
              </div>
            </div>

            {/* Action Buttons: Download Bill & Share via WhatsApp */}
            <div className="w-full grid grid-cols-2 gap-2.5 print:hidden">
              <button
                type="button"
                onClick={handleDownloadBill}
                className="w-full border border-[rgba(220,226,222,0.9)] bg-[#FFFEFC] hover:bg-[#F9F8F5] text-[#1A2621] py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer active:opacity-75 transition-all shadow-2xs"
              >
                <Download className="w-4 h-4 text-[#244436] shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider">Download Bill</span>
              </button>
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="w-full bg-[#244436] hover:bg-[#1e382c] text-white py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer active:opacity-85 transition-all shadow-xs"
              >
                <MessageCircle className="w-4 h-4 text-white shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider">Share WhatsApp</span>
              </button>
            </div>
          </>
        )}

        {/* Printable Invoice Container (Only visible during window.print()) */}
        <div className="hidden print:block w-full text-black p-4 font-mono text-xs">
          <div className="text-center font-bold text-base mb-0.5">THOOGUDEEPA MILITARY HOTEL</div>
          <div className="text-center text-[10px] text-zinc-600">Authentic Donne Biryani Mane</div>
          <div className="text-center text-[10px] text-zinc-600">GSTIN: 29AABCT1332M1Z4</div>
          <div className="border-b border-black my-2" />
          <div className="flex justify-between">
            <span>Seat: #{seatNumber}</span>
            <span>Invoice: #{receipt?.ticketNumber || seatNumber}</span>
          </div>
          <div className="flex justify-between">
            <span suppressHydrationWarning>Date: {formattedDate}</span>
            <span suppressHydrationWarning>Time: {formattedTime}</span>
          </div>
          <div className="flex justify-between">
            <span>Mode: {receipt?.mode || 'UPI'}</span>
            <span>Status: SETTLED</span>
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
            <span>₹ {subtotal}</span>
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
            <span>Total Paid:</span>
            <span>₹ {totalAmount}</span>
          </div>
          <div className="border-b border-black my-2" />
          <div className="text-center text-[10px] mt-2">Thank you! Visit again.</div>
        </div>

        {/* Customer Feedback Card */}
        <div className="w-full border border-[rgba(220,226,222,0.8)] rounded-3xl p-4 flex flex-col gap-3 bg-[#FFFEFC] shadow-[0_4px_16px_-4px_rgba(36,68,54,0.05)]">
          <div className="w-full flex items-center justify-between pb-1 border-b border-[rgba(220,226,222,0.7)]">
            <span className="text-xs font-black uppercase tracking-wider text-[#1A2621]">
              Rate Dining Experience
            </span>
          </div>

          <div className="w-full grid grid-cols-5 gap-1.5 pt-1">
            {ratingOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedRating === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedRating(opt.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#244436] bg-[#244436] text-white shadow-2xs'
                      : 'border-[rgba(220,226,222,0.8)] bg-[#FFFEFC] hover:bg-[#F9F8F5] text-[#5A6860] hover:text-[#1A2621]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[9px] font-bold">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
