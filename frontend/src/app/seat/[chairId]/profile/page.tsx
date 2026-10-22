'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, Bell, User, Clock, Heart, ShoppingBag, UtensilsCrossed, BookOpen, ReceiptText } from 'lucide-react';
import CustomerBottomNav from '../../../../components/navigation/CustomerBottomNav';
import { useCart } from '../../../../lib/context/CartContext';
import { useHardwareBack } from '../../../../lib/hooks/useHardwareBack';

export default function CustomerProfilePage() {
  const params = useParams();
  const chairId = (params?.chairId as string) || '12';

  // Device hardware back button & swipe back: return to menu
  useHardwareBack(`/seat/${chairId}/menu`);

  const seatNumber = chairId.replace(/[^0-9]/g, '') || chairId;
  const { totalItemCount, likedItems } = useCart();
  const likedCount = Object.values(likedItems).filter(Boolean).length;

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#F9F8F5] via-[#F7F5F0] to-[#F3F1EC] text-[#1A2621] flex flex-col justify-between max-w-md mx-auto relative px-4 pt-4 pb-28">
      {/* Scrollable Content Container */}
      <div className="w-full flex flex-col gap-5">
        {/* Top Header */}
        <header className="w-full flex items-center justify-between py-2 border-b border-[#DCE2DE]/60 pb-3">
          {/* Back Navigation Button to Menu */}
          <Link
            href={`/seat/${chairId}/menu`}
            className="w-10 h-10 border border-[#DCE2DE] rounded-xl flex items-center justify-center cursor-pointer active:opacity-70 bg-[#FFFEFC] text-[#1A2621] shadow-xs"
            aria-label="Back to Menu"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          {/* Center Title */}
          <h1 className="text-base font-bold tracking-tight text-[#1A2621]">Profile</h1>

          {/* Right Notification Bell */}
          <Link
            href={`/seat/${chairId}/assistant?from=${encodeURIComponent(`/seat/${chairId}/profile`)}`}
            className="w-10 h-10 border border-[#DCE2DE] rounded-xl flex items-center justify-center cursor-pointer active:opacity-70 bg-[#FFFEFC] text-[#1A2621] shadow-xs"
            aria-label="Assistant & Call Waiter"
          >
            <Bell className="w-5 h-5" />
          </Link>
        </header>

        {/* Profile Avatar & Seat Badge */}
        <div className="w-full border border-[#DCE2DE] rounded-3xl p-6 flex flex-col items-center justify-center text-center gap-3 bg-[#FFFEFC] shadow-[0_4px_20px_-4px_rgba(36,68,54,0.06)]">
          <div className="w-20 h-20 rounded-full border border-[#DCE2DE] flex items-center justify-center bg-[#F4F1EA] shadow-xs">
            <User className="w-10 h-10 text-[#244436] stroke-[1.8]" />
          </div>

          <div className="flex flex-col items-center">
            <span className="text-base font-black tracking-tight text-[#1A2621]">Seat #{seatNumber} Guest</span>
            <span className="text-xs text-[#5A6860] font-semibold">Active Dining Session</span>
          </div>

          <div className="border border-[#244436]/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#244436]/5 text-[#244436]">
            Chair #{seatNumber} &bull; Section A
          </div>
        </div>

        {/* Quick Activity Shortcuts */}
        <div className="w-full flex flex-col gap-2.5">
          <span className="text-xs font-black uppercase tracking-wider text-[#5A6860]">
            Quick Actions
          </span>

          <div className="w-full flex flex-col gap-2">
            <Link
              href={`/seat/${chairId}/tracking`}
              className="w-full border border-[#DCE2DE] rounded-2xl p-4 flex items-center justify-between bg-[#FFFEFC] hover:bg-[#F4F1EA]/60 cursor-pointer active:opacity-80 transition-all shadow-xs"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#244436]" />
                <span className="text-xs font-bold text-[#1A2621]">Live Order Tracking</span>
              </div>
              <span className="text-xs font-black text-[#5A6860]">&rarr;</span>
            </Link>

            <Link
              href={`/seat/${chairId}/likes`}
              className="w-full border border-[#DCE2DE] rounded-2xl p-4 flex items-center justify-between bg-[#FFFEFC] hover:bg-[#F4F1EA]/60 cursor-pointer active:opacity-80 transition-all shadow-xs"
            >
              <div className="flex items-center gap-3">
                <Heart className="w-5 h-5 text-[#DD6B28]" />
                <span className="text-xs font-bold text-[#1A2621]">Wishlist / Liked Items</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#DD6B28] text-white text-[11px] font-black flex items-center justify-center shrink-0">
                  {likedCount}
                </span>
                <span className="text-xs font-black text-[#5A6860]">&rarr;</span>
              </div>
            </Link>

            <Link
              href={`/seat/${chairId}/cart`}
              className="w-full border border-[#DCE2DE] rounded-2xl p-4 flex items-center justify-between bg-[#FFFEFC] hover:bg-[#F4F1EA]/60 cursor-pointer active:opacity-80 transition-all shadow-xs"
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-[#244436]" />
                <span className="text-xs font-bold text-[#1A2621]">Cart Items</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#244436] text-white text-[11px] font-black flex items-center justify-center shrink-0">
                  {totalItemCount}
                </span>
                <span className="text-xs font-black text-[#5A6860]">&rarr;</span>
              </div>
            </Link>

            {/* View Menu Button below Cart Items */}
            <Link
              href={`/seat/${chairId}/menu`}
              className="w-full border border-[#DCE2DE] rounded-2xl p-4 flex items-center justify-between bg-[#FFFEFC] hover:bg-[#F4F1EA]/60 cursor-pointer active:opacity-80 transition-all shadow-xs"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-[#244436]" />
                <span className="text-xs font-bold text-[#1A2621]">View Menu</span>
              </div>
              <span className="text-xs font-black text-[#5A6860]">&rarr;</span>
            </Link>

            {/* View Your Bill Button below View Menu linking to receipt page */}
            <Link
              href={`/seat/${chairId}/receipt`}
              className="w-full border border-[#DCE2DE] rounded-2xl p-4 flex items-center justify-between bg-[#FFFEFC] hover:bg-[#F4F1EA]/60 cursor-pointer active:opacity-80 transition-all shadow-xs"
            >
              <div className="flex items-center gap-3">
                <ReceiptText className="w-5 h-5 text-[#244436]" />
                <span className="text-xs font-bold text-[#1A2621]">View Your Bill</span>
              </div>
              <span className="text-xs font-black text-[#5A6860]">&rarr;</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Navigation Bar with Profile Active */}
      <CustomerBottomNav chairId={chairId} activeTab="profile" />
    </div>
  );
}
