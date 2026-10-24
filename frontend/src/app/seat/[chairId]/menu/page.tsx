'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  Bell,
  ShoppingCart,
  Search,
  Heart,
  Minus,
  Plus,
  X,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { useCart } from '../../../../lib/context/CartContext';
import CustomerBottomNav from '../../../../components/navigation/CustomerBottomNav';
import { useHardwareBack } from '../../../../lib/hooks/useHardwareBack';
import { MENU_CATEGORIES, MENU_ITEMS } from '../../../../lib/data/menuData';
import { isDeviceLockedToDifferentSeat, getDeviceToken } from '../../../../lib/session/diningSession';
import { realtimeBridge } from '../../../../lib/supabase';

function CustomerMenuContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const chairId = (params?.chairId as string) || '12';

  // 1. Preserve Customer Name from entrance landing parameter (?name=...)
  const customerNameParam = searchParams?.get('name');
  useEffect(() => {
    if (customerNameParam && customerNameParam.trim()) {
      try {
        sessionStorage.setItem(`thoogudeepa_customer_name_${chairId}`, customerNameParam.trim());
        localStorage.setItem(`thoogudeepa_customer_name_${chairId}`, customerNameParam.trim());
      } catch {}
    }
  }, [customerNameParam, chairId]);

  // 2. Anti-Cheat & Seat Occupancy Guard
  useEffect(() => {
    // A. Device Lockout check (cannot order on another seat if active unsettled meal exists)
    const lock = isDeviceLockedToDifferentSeat(chairId);
    if (lock.isLocked && lock.activeSeatId && lock.activeSeatId !== chairId) {
      router.replace(`/seat/${lock.activeSeatId}/tracking`);
      return;
    }

    // B. Seat Occupancy Anti-Hijack check (cannot enter menu if table is occupied by a stranger)
    async function checkOccupancy() {
      const token = getDeviceToken();
      const occ = await realtimeBridge.getSeatOccupancy(chairId, token);
      if (occ.isOccupied && !occ.isOwner) {
        router.replace(`/seat/${chairId}`);
      }
    }
    checkOccupancy();
  }, [chairId, router]);

  // Device hardware back button & swipe back: return to seat entrance
  useHardwareBack(`/seat/${chairId}`);

  const { items, getItemQuantity, updateQuantity, totalItemCount, toggleLike, isItemLiked } = useCart();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [vegOnlyFilter, setVegOnlyFilter] = useState<boolean>(false);
  const [stockMap, setStockMap] = useState<Record<string, boolean>>(() => {
    return realtimeBridge.getDishAvailability ? realtimeBridge.getDishAvailability() : {};
  });

  // Calculate live subtotal for floating action bar
  const cartSubtotal = useMemo(() => {
    const activeItemIds = Object.keys(items).filter((id) => (items[id]?.quantity || 0) > 0);
    return activeItemIds.reduce((sum, id) => {
      const qty = items[id]?.quantity || 0;
      const cleanId = id.replace(/^dish-/, '');
      const dish = MENU_ITEMS.find((m) => m.id === id || m.id === `dish-${cleanId}` || m.id === cleanId);
      return sum + (dish ? dish.price * qty : 0);
    }, 0);
  }, [items]);

  useEffect(() => {
    if (realtimeBridge.getDishAvailability) {
      setStockMap(realtimeBridge.getDishAvailability());
    }
    const unsub = realtimeBridge.subscribeKDS({
      onAvailabilityChange: ({ dishId, isAvailable }) => {
        setStockMap((prev) => ({
          ...prev,
          [dishId]: isAvailable,
          [dishId.replace(/^dish-/, '')]: isAvailable,
          [`dish-${dishId.replace(/^dish-/, '')}`]: isAvailable,
        }));
      },
    });
    return () => {
      unsub();
    };
  }, []);

  const isDishAvailable = (id: string) => {
    const clean = id.replace(/^dish-/, '');
    if (stockMap[clean] === false || stockMap[`dish-${clean}`] === false) {
      return false;
    }
    return true;
  };

  // Filter items dynamically by selected category, dietary filter, and search query
  const filteredDishes = useMemo(() => {
    return MENU_ITEMS.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.categoryId === selectedCategory;
      const matchesDiet = !vegOnlyFilter || Boolean(item.isVegetarian);
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesDiet && matchesSearch;
    });
  }, [selectedCategory, vegOnlyFilter, searchQuery]);

  return (
    <div className="min-h-screen w-full flex flex-col justify-between max-w-md mx-auto relative text-[#1A2621]">
      {/* Scrollable Content Container */}
      <div className="w-full flex-1 px-4 pt-4 pb-28">
        {/* Top Header Section with Back Navigation */}
        <header className="w-full flex items-center justify-between py-2">
          {/* Back Navigation Button to Seat Entrance */}
          <Link
            href={`/seat/${chairId}`}
            className="w-10 h-10 border border-[rgba(220,226,222,0.8)] rounded-xl flex items-center justify-center cursor-pointer active:opacity-70 bg-[#FFFEFC] text-[#1A2621] shadow-2xs"
            aria-label="Back to Seat"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>

          {/* Center Title Space */}
          <div className="text-center">
            <span className="text-base font-black tracking-tight uppercase text-[#1E3A2F]">Menu</span>
          </div>

          {/* Right Spacer for Header Balance */}
          <div className="w-10 h-10" />
        </header>

        {/* Sticky Search & Category Bar Section pinned on scroll */}
        <div className="sticky top-0 z-20 bg-[#FAF7F0]/90 backdrop-blur-md pt-2 pb-3 flex flex-col gap-2.5 -mx-4 px-4 border-b border-[#EAE3D5] shadow-[0_4px_16px_-4px_rgba(200,90,50,0.04)]">
          {/* Row 1: Search Bar with Bell & Cart Beside It */}
          <div className="w-full flex items-center gap-2">
            {/* Search Input Container */}
            <div className="flex-1 border border-[#EAE3D5] rounded-2xl flex items-center px-3.5 py-2.5 gap-2 bg-[#FBF9F4] shadow-2xs min-w-0 focus-within:border-[#1E3A2F]">
              <Search className="w-4 h-4 text-[#8C7A6B] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Donne Biryani, Kebabs..."
                className="w-full text-sm outline-none bg-transparent text-[#1A2621] min-w-0 placeholder:text-[#A89F91]"
              />
              {searchQuery.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="w-5 h-5 rounded-full border border-[#EAE3D5] flex items-center justify-center cursor-pointer active:opacity-70 shrink-0 text-[#8C7A6B]"
                  aria-label="Clear Search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Bell Icon Button beside Search */}
            <Link
              href={`/seat/${chairId}/assistant?from=${encodeURIComponent(`/seat/${chairId}/menu`)}`}
              className="w-11 h-11 border border-[#EAE3D5] rounded-2xl flex items-center justify-center cursor-pointer active:opacity-70 bg-[#FBF9F4] text-[#1A2621] shrink-0 shadow-2xs hover:border-[#1E3A2F]"
              aria-label="Assistant & Call Waiter"
            >
              <Bell className="w-5 h-5 text-[#8C7A6B]" />
            </Link>

            {/* Cart Icon Button beside Search with live badge */}
            <Link
              href={`/seat/${chairId}/cart`}
              className="relative w-11 h-11 border border-[#EAE3D5] rounded-2xl flex items-center justify-center cursor-pointer active:opacity-80 bg-[#FBF9F4] text-[#1A2621] shrink-0 shadow-2xs hover:border-[#1E3A2F]"
              aria-label="Open Cart"
            >
              <ShoppingCart className="w-5 h-5 text-[#8C7A6B]" />
              {totalItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-[#1E3A2F] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border border-white shadow-xs">
                  {totalItemCount}
                </span>
              )}
            </Link>
          </div>

          {/* Row 2: Category Filter Pills + Quick Veg Only Filter */}
          <div className="w-full flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {/* Quick Dietary Toggle: Veg Only */}
            <button
              type="button"
              onClick={() => setVegOnlyFilter((prev) => !prev)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
                vegOnlyFilter
                  ? 'bg-emerald-700 text-white shadow-[0_2px_8px_rgba(4,120,87,0.35)]'
                  : 'border border-emerald-600/40 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full border border-current flex items-center justify-center p-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
              </span>
              <span>Veg Only</span>
            </button>

            {/* Standard Category Pills */}
            {MENU_CATEGORIES.map((category) => {
              const isActive = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-1.5 rounded-full text-xs whitespace-nowrap cursor-pointer transition-all ${
                    isActive
                      ? 'bg-[#1E3A2F] text-white font-bold shadow-[0_4px_12px_rgba(30,58,47,0.35)]'
                      : 'border border-[#EAE3D5] bg-[#FBF9F4] text-[#5A6860] font-semibold hover:text-[#1A2621] hover:border-[#1E3A2F]/40'
                  }`}
                >
                  {category.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Empty Search Results */}
        {filteredDishes.length === 0 ? (
          <div className="w-full border border-[#EAE3D5] rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-3 bg-[#FBF9F4] shadow-[0_4px_20px_-4px_rgba(200,90,50,0.06)] mt-12">
            <span className="text-sm font-black uppercase tracking-wider text-[#1A2621]">No Dishes Found</span>
            <p className="text-xs text-[#5A6860]">
              Try searching for something else or reset category filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setVegOnlyFilter(false);
              }}
              className="mt-2 bg-[#C85A32] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-[0_4px_14px_rgba(200,90,50,0.3)] hover:opacity-95 cursor-pointer"
            >
              Show All Menu
            </button>
          </div>
        ) : (
          /* 2-Column Product Cards Grid with circular image area */
          <div className="w-full grid grid-cols-2 gap-x-3.5 gap-y-24 mt-20">
            {filteredDishes.map((item) => {
              const currentQty = getItemQuantity(item.id);
              const isLiked = isItemLiked(item.id);
              const available = isDishAvailable(item.id);

              return (
                <div
                  key={item.id}
                  className={`relative rounded-3xl pt-20 sm:pt-22 pb-3.5 px-3 flex flex-col items-center text-center bg-gradient-to-b from-[#FAF8F5] via-[#F2EFE8] to-[#E5ECE5] border border-[#DCE4DC] shadow-[0_12px_28px_-6px_rgba(50,70,55,0.1)] transition-all ${
                    !available ? 'opacity-60 grayscale-[30%]' : 'hover:shadow-[0_16px_34px_-6px_rgba(50,70,55,0.15)]'
                  }`}
                >
                  {/* Clickable Card Body opening Item Details */}
                  <Link
                    href={`/seat/${chairId}/item/${item.id}`}
                    prefetch={false}
                    className="w-full flex flex-col items-center cursor-pointer active:opacity-75"
                  >
                    {/* Circular Image Container */}
                    <div className="absolute -top-16 sm:-top-18 w-32 h-32 sm:w-36 sm:h-36 rounded-full border-3 border-white bg-white overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.14)] flex items-center justify-center p-0.5">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover object-center rounded-full"
                        loading="lazy"
                      />
                    </div>

                    {/* FSSAI Veg / Non-Veg Indicator Badge & Special Tags */}
                    <div className="w-full flex items-center justify-center gap-1.5 mt-1 flex-wrap">
                      {/* Official FSSAI Indian Dietary Badge */}
                      <span
                        className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center p-0.5 shrink-0 ${
                          item.isVegetarian
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-600'
                            : 'border-rose-700 bg-rose-50 text-rose-700'
                        }`}
                        title={item.isVegetarian ? 'Vegetarian' : 'Non-Vegetarian'}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.isVegetarian ? 'bg-emerald-600' : 'bg-rose-700'
                          }`}
                        />
                      </span>

                      {!available ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[9px] font-black uppercase tracking-wider border border-rose-200">
                          Sold Out
                        </span>
                      ) : item.isSignature ? (
                        <div className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C85A32]" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#C85A32]">
                            SPECIAL
                          </span>
                        </div>
                      ) : null}

                      {item.isSpicy && available && (
                        <span title="Spicy Dish" className="inline-flex items-center shrink-0">
                          <Flame className="w-3 h-3 text-red-500 fill-red-500" />
                        </span>
                      )}
                    </div>

                    {/* Title Section */}
                    <div className="w-full text-xs font-bold mt-1 line-clamp-2 min-h-[32px] flex items-center justify-center text-[#1A2621]">
                      {item.title}
                    </div>

                    {/* Short Description Section */}
                    <div className="w-full text-[10px] text-[#5A6860] mt-1 line-clamp-2 min-h-[28px]">
                      {item.description}
                    </div>

                    {/* Price Section */}
                    <div className="w-full text-sm font-black mt-2 text-[#1E3A2F]">
                      ₹ {item.price}
                    </div>
                  </Link>

                  {/* Bottom Row: Terracotta Stepper/Add Button + Heart Like Button */}
                  {!available ? (
                    <div className="w-full mt-2.5 flex items-center justify-center">
                      <div className="w-full py-1.5 rounded-xl text-center text-[11px] font-black uppercase tracking-wider bg-slate-200 text-slate-500 cursor-not-allowed select-none">
                        Sold Out
                      </div>
                    </div>
                  ) : (
                    <div className="w-full mt-2.5 flex items-center gap-1.5">
                      {currentQty === 0 ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            updateQuantity(item.id, 1);
                          }}
                          className="flex-1 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#C85A32] text-white cursor-pointer active:opacity-85 shadow-[0_4px_14px_rgba(200,90,50,0.3)] hover:opacity-95 transition-all"
                        >
                          Add
                        </button>
                      ) : (
                        <div
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          className="flex-1 flex items-center justify-between rounded-xl bg-[#C85A32] text-white px-2 py-1 shadow-[0_4px_14px_rgba(200,90,50,0.3)]"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              updateQuantity(item.id, currentQty - 1);
                            }}
                            className="w-5 h-5 flex items-center justify-center font-bold text-sm cursor-pointer active:opacity-60"
                            aria-label="Decrease"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-black">{currentQty}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              updateQuantity(item.id, currentQty + 1);
                            }}
                            className="w-5 h-5 flex items-center justify-center font-bold text-sm cursor-pointer active:opacity-60"
                            aria-label="Increase"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Small Heart Like Button beside Add */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleLike(item.id);
                        }}
                        className={`w-8 h-8 rounded-xl border flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                          isLiked
                            ? 'bg-[#C85A32] text-white border-[#C85A32]'
                            : 'bg-white text-[#C85A32] border-[#EAE3D5] hover:border-[#C85A32]'
                        }`}
                        aria-label="Like item"
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-white' : ''}`} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modern Floating Bottom Cart Pill (Appears automatically when dishes are added) */}
      {totalItemCount > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-30 max-w-md mx-auto px-4 pointer-events-none animate-in slide-in-from-bottom duration-200">
          <Link
            href={`/seat/${chairId}/cart`}
            className="pointer-events-auto w-full py-3 px-4 bg-gradient-to-r from-[#244436] via-[#2d5242] to-[#DD6B28] text-white rounded-2xl shadow-[0_8px_24px_rgba(36,68,54,0.35)] flex items-center justify-between cursor-pointer active:scale-98 transition-all hover:shadow-[0_12px_28px_rgba(36,68,54,0.45)]"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-black text-xs text-white">
                {totalItemCount}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-black uppercase tracking-wider">View Dining Cart</span>
                <span className="text-[10px] text-white/80 font-semibold">
                  {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} • ₹ {cartSubtotal}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider bg-white/15 px-3 py-1.5 rounded-xl border border-white/20">
              <span>Checkout</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar */}
      <CustomerBottomNav chairId={chairId} activeTab="home" />
    </div>
  );
}

export default function CustomerMenuPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF7F0]" />}>
      <CustomerMenuContent />
    </Suspense>
  );
}
