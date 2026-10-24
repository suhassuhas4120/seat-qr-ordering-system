'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ChevronLeft,
  Heart,
  Minus,
  Plus,
  Flame,
  Clock,
  Sparkles,
  Check,
  ShoppingBag,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { useCart } from '../../../../../lib/context/CartContext';
import { useHardwareBack } from '../../../../../lib/hooks/useHardwareBack';
import { getMenuItemById, MENU_CATEGORIES } from '../../../../../lib/data/menuData';
import { realtimeBridge } from '../../../../../lib/supabase';
import { getDeviceToken, isDeviceLockedToDifferentSeat } from '../../../../../lib/session/diningSession';

export default function ItemCustomizationPage() {
  const router = useRouter();
  const params = useParams();
  const chairId = (params?.chairId as string) || '12';
  const itemId = (params?.itemId as string) || '1';

  // Anti-Cheat & Seat Occupancy Guard
  useEffect(() => {
    const lock = isDeviceLockedToDifferentSeat(chairId);
    if (lock.isLocked && lock.activeSeatId) {
      router.replace(`/seat/${lock.activeSeatId}/tracking`);
      return;
    }

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

  const {
    items,
    getItemQuantity,
    addItemWithDetails,
    toggleLike,
    isItemLiked,
    totalItemCount,
  } = useCart();

  // Retrieve authentic item data
  const dish = useMemo(() => getMenuItemById(itemId), [itemId]);
  const [imgSrc, setImgSrc] = useState(dish.imageUrl || '/images/dishes/chicken-biryani.webp');
  const [isAddedToast, setIsAddedToast] = useState(false);

  useEffect(() => {
    setImgSrc(dish.imageUrl || '/images/dishes/chicken-biryani.webp');
  }, [dish.imageUrl]);

  const categoryName = useMemo(() => {
    return (
      MENU_CATEGORIES.find((cat) => cat.id === dish.categoryId)?.title ||
      'Donne Biryani'
    );
  }, [dish]);

  // Check if item is already in tray to pre-populate or inform customer
  const cleanId = itemId.replace(/^dish-/, '');
  const existingCartEntry =
    items[itemId] || items[cleanId] || items[`dish-${cleanId}`];
  const existingCartQty = getItemQuantity(itemId);

  const [quantity, setQuantity] = useState(1);
  const [selectedOption, setSelectedOption] = useState<string>(() => {
    return (
      existingCartEntry?.selectedOption ||
      (dish.options && dish.options.length > 0 ? dish.options[0] : 'Standard')
    );
  });
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(() => {
    return existingCartEntry?.addOns || [];
  });
  const [specialInstructions, setSpecialInstructions] = useState<string>(() => {
    return existingCartEntry?.specialInstructions || '';
  });

  // Add-on options with authentic pricing
  const availableAddOns = useMemo(() => {
    return (
      dish.addOns || [
        { name: 'Extra Salna Cup', price: 30 },
        { name: 'Boiled Egg (1 pc)', price: 25 },
        { name: 'Double Raita Bowl', price: 20 },
      ]
    );
  }, [dish]);

  // Compute add-ons surcharge
  const addOnsCost = useMemo(() => {
    return selectedAddOns.reduce((sum, addonName) => {
      const match = availableAddOns.find((a) => a.name === addonName);
      return sum + (match?.price || 0);
    }, 0);
  }, [selectedAddOns, availableAddOns]);

  const itemUnitPrice = dish.price + addOnsCost;
  const calculatedGrandTotal = itemUnitPrice * quantity;

  const toggleAddOn = (addonName: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(addonName)
        ? prev.filter((a) => a !== addonName)
        : [...prev, addonName]
    );
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(`/seat/${chairId}/menu`);
    }
  };

  const handleAddToCart = () => {
    if (!dish.inStock) return;
    addItemWithDetails(
      itemId,
      quantity,
      selectedOption,
      selectedAddOns,
      specialInstructions.trim() || undefined,
      addOnsCost
    );
    setIsAddedToast(true);
    setTimeout(() => {
      handleBack();
    }, 380);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between max-w-md mx-auto relative px-4 pt-4 pb-28 select-none text-[#1A2621]">
      {/* Scrollable Content Container */}
      <div className="w-full flex flex-col gap-6">
        {/* Top Header */}
        <header className="w-full flex items-center justify-between py-2">
          {/* Back Button to Menu with Scroll Position Preservation */}
          <button
            type="button"
            onClick={handleBack}
            className="w-10 h-10 border border-[rgba(220,226,222,0.8)] rounded-xl flex items-center justify-center cursor-pointer active:opacity-70 bg-[#FFFEFC] text-[#1A2621] shadow-2xs"
            aria-label="Back to Menu"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Title Space */}
          <div className="text-center font-black text-sm uppercase tracking-wider text-[#1A2621]">
            Dish Details
          </div>

          {/* Favorite Action Button connected to global likes */}
          <button
            type="button"
            onClick={() => toggleLike(itemId)}
            className={`w-10 h-10 border rounded-xl flex items-center justify-center cursor-pointer active:scale-95 transition-all ${
              isItemLiked(itemId)
                ? 'border-[#DD6B28] bg-[#DD6B28] text-white shadow-xs'
                : 'border-[rgba(220,226,222,0.8)] bg-[#FFFEFC] text-[#5A6860] hover:text-[#DD6B28]'
            }`}
            aria-label="Favorite"
          >
            <Heart className={`w-5 h-5 ${isItemLiked(itemId) ? 'fill-current' : ''}`} />
          </button>
        </header>

        {/* Big Rectangle Hero Dish Image Section */}
        <div className="w-full h-64 sm:h-72 rounded-3xl overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-[#DCE4DC] bg-[#FAF8F5] relative">
          <img
            src={imgSrc}
            alt={dish.title}
            onError={() => setImgSrc('/images/dishes/chicken-biryani.webp')}
            className="w-full h-full object-cover object-center"
          />

          {/* Out of Stock Overlay */}
          {!dish.inStock && (
            <div className="absolute inset-0 bg-black/65 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-1.5 z-10">
              <AlertCircle className="w-8 h-8 text-amber-400" />
              <span className="text-sm font-black uppercase tracking-wider">
                Currently Sold Out
              </span>
              <span className="text-[11px] text-zinc-300">
                Fresh military batch preparing shortly
              </span>
            </div>
          )}
        </div>

        {/* Title, Badges & Price Section */}
        <div className="w-full flex items-start justify-between border-b border-[rgba(220,226,222,0.8)] pb-4 gap-3">
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="flex items-center gap-2">
              {/* FSSAI Dietary Badge */}
              <span
                className={`w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 ${
                  dish.isVegetarian
                    ? 'border-emerald-600 bg-emerald-50/50'
                    : 'border-red-600 bg-red-50/50'
                }`}
                title={dish.isVegetarian ? 'Vegetarian' : 'Non-Vegetarian'}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    dish.isVegetarian ? 'bg-emerald-600' : 'bg-red-600'
                  }`}
                />
              </span>
              <div className="text-lg font-black leading-tight text-[#1A2621]">
                {dish.title}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              <span className="text-xs font-bold text-[#5A6860] uppercase tracking-wide bg-[#FAF8F5] px-2 py-0.5 rounded border border-[rgba(220,226,222,0.7)]">
                {categoryName}
              </span>

              {dish.isSpicy && (
                <span
                  title="Spicy Military Masala"
                  className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200"
                >
                  <Flame className="w-3 h-3 fill-current text-red-500" />
                  <span>Spicy</span>
                </span>
              )}

              {dish.prepTimeMinutes && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-[#5A6860] bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[rgba(220,226,222,0.8)]">
                  <Clock className="w-3 h-3 text-[#5A6860]" />
                  <span>~{dish.prepTimeMinutes} mins</span>
                </span>
              )}

              {dish.isSignature && (
                <span className="flex items-center gap-1 text-[10px] font-black uppercase text-[#DD6B28] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  <Sparkles className="w-3 h-3 text-[#DD6B28]" />
                  <span>Chef Choice</span>
                </span>
              )}
            </div>
          </div>

          <div className="text-2xl font-black text-right text-[#244436] shrink-0">
            ₹ {dish.price}
          </div>
        </div>

        {/* Authentic Description Section */}
        <div className="w-full flex flex-col gap-1.5 bg-[#FFFEFC] border border-[rgba(220,226,222,0.7)] p-4 rounded-2xl shadow-[0_4px_16px_-4px_rgba(36,68,54,0.05)]">
          <span className="text-xs font-black uppercase tracking-wider text-[#244436]">
            Heritage Recipe
          </span>
          <p className="text-xs text-[#5A6860] leading-relaxed">
            {dish.description}
          </p>
        </div>

        {/* Customization Options Section */}
        {dish.options && dish.options.length > 0 && (
          <div className="w-full flex flex-col gap-3 border-t border-[rgba(220,226,222,0.8)] pt-4">
            <span className="text-xs font-black uppercase tracking-wider text-[#1A2621]">
              Spice &amp; Preparation
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {dish.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelectedOption(opt)}
                  className={`py-2 px-3 border text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center justify-between gap-1.5 ${
                    selectedOption === opt
                      ? 'border-[#244436] bg-[#244436] text-[#FFFEFC] shadow-2xs'
                      : 'border-[rgba(220,226,222,0.8)] bg-[#FFFEFC] text-[#5A6860] hover:text-[#1A2621] hover:border-[#244436]/40'
                  }`}
                >
                  <span className="truncate">{opt}</span>
                  {selectedOption === opt && (
                    <Check className="w-3.5 h-3.5 text-emerald-300 stroke-[3] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add-ons Options Section */}
        <div className="w-full flex flex-col gap-2.5 border-t border-[rgba(220,226,222,0.8)] pt-4">
          <span className="text-xs font-black uppercase tracking-wider text-[#1A2621]">
            Authentic Accompaniments
          </span>
          <div className="flex flex-col gap-2">
            {availableAddOns.map((addon) => {
              const isChecked = selectedAddOns.includes(addon.name);
              return (
                <label
                  key={addon.name}
                  className={`flex items-center justify-between border p-3 rounded-xl cursor-pointer transition-all ${
                    isChecked
                      ? 'border-[#244436] bg-emerald-50/60 shadow-2xs'
                      : 'border-[rgba(220,226,222,0.8)] bg-[#FFFEFC] hover:bg-[#F9F8F5]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleAddOn(addon.name)}
                      className="w-4 h-4 accent-[#244436] cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-[#1A2621]">
                      {addon.name}
                    </span>
                  </div>
                  <span className="text-xs font-black text-[#244436]">
                    + ₹ {addon.price}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Special Cooking Instructions / Chef Note */}
        <div className="w-full flex flex-col gap-2 border-t border-[rgba(220,226,222,0.8)] pt-4">
          <div className="flex items-center justify-between">
            <label
              htmlFor="cooking-notes"
              className="text-xs font-black uppercase tracking-wider text-[#1A2621] flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#244436]" />
              <span>Cooking Instructions &amp; Notes</span>
            </label>
            <span className="text-[10px] text-[#5A6860] font-medium">
              {specialInstructions.length}/120
            </span>
          </div>
          <textarea
            id="cooking-notes"
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value.slice(0, 120))}
            placeholder="e.g. Less spicy, pack gravy separately, extra crispy cut..."
            rows={2}
            className="w-full text-xs p-3 rounded-xl border border-[rgba(220,226,222,0.9)] bg-[#FFFEFC] text-[#1A2621] placeholder:text-[#8A968F] focus:outline-hidden focus:border-[#244436] focus:ring-1 focus:ring-[#244436] resize-none"
          />
        </div>

        {/* Quantity Stepper Section */}
        <div className="w-full flex items-center justify-between border-t border-[rgba(220,226,222,0.8)] pt-4">
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-wider text-[#1A2621]">
              Quantity
            </span>
            {existingCartQty > 0 && (
              <span className="text-[11px] font-bold text-[#244436] mt-0.5">
                Currently in tray: {existingCartQty}
              </span>
            )}
          </div>
          <div className="flex items-center border border-[#244436] rounded-xl overflow-hidden bg-[#244436] text-white shadow-2xs">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={!dish.inStock}
              className="w-10 h-10 flex items-center justify-center cursor-pointer active:opacity-75 disabled:opacity-50"
              aria-label="Decrease quantity"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-10 text-center font-black text-sm">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              disabled={!dish.inStock}
              className="w-10 h-10 flex items-center justify-center cursor-pointer active:opacity-75 disabled:opacity-50"
              aria-label="Increase quantity"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="sticky bottom-0 z-30 w-full max-w-md bg-[#FFFEFC]/95 backdrop-blur-md border-t border-[rgba(220,226,222,0.8)] py-3 px-3 mt-8 flex flex-col gap-2">
        {totalItemCount > 0 && (
          <div className="w-full flex items-center justify-between text-xs px-1">
            <span className="text-[11px] text-[#5A6860] font-medium">
              Tray contains <strong className="text-[#1A2621]">{totalItemCount}</strong>{' '}
              {totalItemCount === 1 ? 'item' : 'items'}
            </span>
            <Link
              href={`/seat/${chairId}/cart`}
              className="text-[11px] font-bold text-[#244436] flex items-center gap-1 hover:underline"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>View Tray &rarr;</span>
            </Link>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col pl-1.5 pb-0.5">
            <span className="text-[10px] text-[#5A6860] uppercase font-bold tracking-wider">
              Item Total
            </span>
            <span className="text-xl font-black text-[#244436] leading-tight">
              ₹ {calculatedGrandTotal}
            </span>
          </div>

          {dish.inStock ? (
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex-1 bg-gradient-to-r from-[#244436] via-[#2d5242] to-[#DD6B28] text-white py-3.5 px-4 text-sm font-black uppercase tracking-wider cursor-pointer active:scale-[0.99] transition-all rounded-xl shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              {isAddedToast ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
                  <span>Added to Tray!</span>
                </>
              ) : (
                <span>Add to Tray</span>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="flex-1 bg-zinc-300 text-zinc-500 py-3.5 px-4 text-sm font-black uppercase tracking-wider rounded-xl cursor-not-allowed text-center"
            >
              Currently Unavailable
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
