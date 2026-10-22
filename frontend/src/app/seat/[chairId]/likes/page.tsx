'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, Bell, Heart, Minus, Plus } from 'lucide-react';
import { useCart } from '../../../../lib/context/CartContext';
import CustomerBottomNav from '../../../../components/navigation/CustomerBottomNav';
import { useHardwareBack } from '../../../../lib/hooks/useHardwareBack';
import { MENU_ITEMS } from '../../../../lib/data/menuData';

export default function CustomerLikesPage() {
  const params = useParams();
  const chairId = (params?.chairId as string) || '12';

  // Device hardware back button & swipe back: return to menu
  useHardwareBack(`/seat/${chairId}/menu`);

  const { likedItems, toggleLike, getItemQuantity, updateQuantity } = useCart();

  // Filter only items currently liked from authentic menu
  const likedDishes = useMemo(() => {
    return MENU_ITEMS.filter((item) => likedItems[item.id]);
  }, [likedItems]);

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
          <h1 className="text-base font-bold tracking-tight text-[#1A2621]">Liked Items</h1>

          {/* Right Notification Bell */}
          <Link
            href={`/seat/${chairId}/assistant?from=${encodeURIComponent(`/seat/${chairId}/likes`)}`}
            className="w-10 h-10 border border-[#DCE2DE] rounded-xl flex items-center justify-center cursor-pointer active:opacity-70 bg-[#FFFEFC] text-[#1A2621] shadow-xs"
            aria-label="Assistant & Call Waiter"
          >
            <Bell className="w-5 h-5" />
          </Link>
        </header>

        {/* Liked Items Grid / List */}
        {likedDishes.length === 0 ? (
          <div className="w-full border border-[#DCE2DE] rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-3 bg-[#FFFEFC] mt-8 shadow-[0_4px_20px_-4px_rgba(36,68,54,0.06)]">
            <div className="w-16 h-16 rounded-full border border-[#DCE2DE] flex items-center justify-center bg-[#F4F1EA]">
              <Heart className="w-8 h-8 text-[#5A6860]" />
            </div>
            <span className="text-sm font-black uppercase tracking-wider text-[#1A2621]">No Liked Items</span>
            <p className="text-xs text-[#5A6860]">
              Tap the heart icon on any dish card in the menu to add it to your liked section.
            </p>
            <Link
              href={`/seat/${chairId}/menu`}
              className="mt-2 bg-gradient-to-r from-[#244436] to-[#DD6B28] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm hover:opacity-95"
            >
              Browse Menu
            </Link>
          </div>
        ) : (
          <div className="w-full grid grid-cols-2 gap-3.5">
            {likedDishes.map((item) => {
              const currentQty = getItemQuantity(item.id);

              return (
                <div
                  key={item.id}
                  className="w-full border border-[#DCE2DE] rounded-2xl p-3 flex flex-col justify-between bg-[#FFFEFC] shadow-[0_4px_16px_-4px_rgba(36,68,54,0.05)]"
                >
                  <Link
                    href={`/seat/${chairId}/item/${item.id}`}
                    prefetch={false}
                    className="w-full flex flex-col items-center cursor-pointer"
                  >
                    {/* Circular Image Container */}
                    <div className="w-24 h-24 rounded-full border-2 border-[#DCE2DE] overflow-hidden flex items-center justify-center mb-2.5 bg-white shadow-xs">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>

                    <span className="text-xs font-bold text-center truncate w-full text-[#1A2621]">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-[#5A6860] text-center line-clamp-1 w-full mt-0.5">
                      {item.description}
                    </span>
                    <span className="text-xs font-black mt-1 text-[#244436]">₹ {item.price}</span>
                  </Link>

                  {/* Actions Row: Add/Stepper + Unlike Button */}
                  <div className="w-full flex items-center gap-2 mt-3 pt-2 border-t border-[#DCE2DE]/50">
                    {currentQty === 0 ? (
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-bold uppercase bg-gradient-to-r from-[#244436] to-[#DD6B28] text-white cursor-pointer active:opacity-90 shadow-xs"
                      >
                        Add
                      </button>
                    ) : (
                      <div className="flex-1 flex items-center justify-between rounded-lg bg-[#244436] text-white px-1.5 py-1">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, currentQty - 1)}
                          className="w-6 h-6 flex items-center justify-center font-bold text-base cursor-pointer active:opacity-60"
                          aria-label="Decrease"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-black">{currentQty}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, currentQty + 1)}
                          className="w-6 h-6 flex items-center justify-center font-bold text-base cursor-pointer active:opacity-60"
                          aria-label="Increase"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Unlike Heart Button */}
                    <button
                      type="button"
                      onClick={() => toggleLike(item.id)}
                      className="w-7 h-7 shrink-0 border border-[#DD6B28]/30 rounded-lg flex items-center justify-center cursor-pointer bg-[#DD6B28]/10 text-[#DD6B28] active:scale-90"
                      aria-label="Remove from liked"
                    >
                      <Heart className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fixed Bottom Navigation Bar with Likes active */}
      <CustomerBottomNav chairId={chairId} activeTab="likes" />
    </div>
  );
}
