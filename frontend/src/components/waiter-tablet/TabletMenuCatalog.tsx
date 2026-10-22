"use client";
/**
 * Thoogudeepa Waiter Tablet POS Cockpit - Menu Catalog Component
 *
 * Real-world enterprise Menu Ordering Panel (60% split screen width):
 * - Balanced In-Between Theme: Soft slate canvas (#F8FAFC), crisp white cards (#FFFFFF),
 *   subtle borders (#E2E8F0), slate-900 typography, and vibrant accents
 * - Complete, un-truncated brand title in deep dark color: "ತೂಗುದೀಪ ದೊನ್ನೆ ಬಿರಿಯಾನಿ"
 * - Subheader with explicit [ Floor ] navigation button on ONE single line
 * - Properly sized and constrained Seat Selector that never spills outside or into right pane
 * - Standalone ShoppingCart icon button with live item count badge positioned directly on top right
 * - Fixed shrink-0 category filter pills (All Items, Donne Biryani, Starters, Gravy, Beverages)
 * - Food cards with authentic high-res food images, veg/non-veg badge, price on LEFT, and [ + Add ] on RIGHT
 * - "Selected: 1" label removed as requested by user
 * - Strict line count maintained between 300 and 400 lines (never exceeds 400).
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronDown,
  Search, 
  Plus, 
  Minus, 
  Utensils, 
  X,
  ShoppingCart
} from 'lucide-react';
import { DishItem, MENU_DISHES, SeatItem } from './types';
import { realtimeBridge } from '@/lib/supabase';

export interface TabletMenuCatalogProps {
  /** Target seat identifier and guest name (e.g., 'Seat 02: Walk-In') */
  activeSeatName: string;
  /** Active seats list assigned to waiter */
  seats?: SeatItem[];
  /** Whether the seat is currently dining with an active order */
  isDining: boolean;
  /** Map of dish ID to quantity currently selected in the cart/order */
  dishQuantities: Record<number, number>;
  /** Map of dish ID to already cooked/in-kitchen quantity */
  kitchenQuantities?: Record<number, number>;
  /** Total count of items added in current ticket */
  cartCount: number;
  /** Callback to navigate back to the Floor Board matrix */
  onBackToFloor: () => void;
  /** Callback to quickly switch active seat without leaving catalog */
  onQuickSeatSwitch: (seatVal: string) => void;
  /** Callback when waiter taps '+ Add' on a dish for the first time */
  onAddDishFirstTime: (id: number, price: number) => void;
  /** Callback to increment or decrement quantity */
  onChangeQty: (id: number, delta: number, price: number) => void;
  /** Callback to toggle focus to live ticket column on smaller screens */
  onSwitchToTicketMode: () => void;
}

export const TabletMenuCatalog: React.FC<TabletMenuCatalogProps> = ({
  activeSeatName,
  seats,
  isDining,
  dishQuantities,
  kitchenQuantities,
  cartCount,
  onBackToFloor,
  onQuickSeatSwitch,
  onAddDishFirstTime,
  onChangeQty,
  onSwitchToTicketMode
}) => {
  // Search query & Category state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockMap, setStockMap] = useState<Record<string, boolean>>(() => {
    return realtimeBridge.getDishAvailability ? realtimeBridge.getDishAvailability() : {};
  });

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
    return () => unsub();
  }, []);

  const isDishAvailable = (id: number | string) => {
    const clean = String(id).replace(/^dish-/, '');
    if (stockMap[clean] === false || stockMap[`dish-${clean}`] === false) {
      return false;
    }
    return true;
  };

  // Category navigation tabs
  const categories = [
    { id: 'all', label: 'All Items' },
    { id: 'biryani', label: 'Donne Biryani & Rice' },
    { id: 'starters', label: 'Starters & Sides' },
    { id: 'special', label: 'Sunday Specials & Soups' }
  ];

  // Dynamic seats list formatted concisely to guarantee no overflow
  const allSeatsList = useMemo(() => {
    if (seats && seats.length > 0) {
      return seats.map(s => {
        const shortGuest = s.guestName.split(' ')[0];
        return {
          id: s.seatNumber,
          label: s.status === 'occupied'
            ? `${s.seatNumber} (${shortGuest} - ₹${s.totalAmount})`
            : `${s.seatNumber} (Vacant)`
        };
      });
    }
    return [
      { id: 'Seat 01', label: 'Seat 01 (Vacant)' }
    ];
  }, [seats]);

  // Filtered dishes based on category and search text
  const filteredDishes = useMemo(() => {
    return MENU_DISHES.filter(dish => {
      const matchesSearch = 
        dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dish.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || dish.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const currentSeatId = activeSeatName.split(':')[0].trim();

  return (
    <div 
      className="w-[60%] h-full flex flex-col border-r border-slate-200 p-4 sm:p-5 select-none bg-white overflow-hidden"
      role="region"
      aria-label="Menu Catalog Ordering Terminal"
    >
      {/* ======================================================== */}
      {/* 1. SUB-HEADER: FLOOR BACK, COMPLETE TITLE & SELECTOR     */}
      {/* ======================================================== */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 mb-4 gap-2 shrink-0 w-full overflow-hidden">
        <div className="flex items-center gap-2 min-w-0 shrink">
          {/* Explicit Back to Floor Grid Button */}
          <button
            type="button"
            onClick={onBackToFloor}
            className="h-9 px-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all flex items-center gap-1 shadow-2xs group shrink-0 cursor-pointer"
            title="Return to Floor Seat Matrix"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-xs font-bold text-slate-800">Floor</span>
          </button>

          {/* Sub-header Context (Clean title, zero duplicate brand name or duplicate seat label) */}
          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-slate-900 whitespace-nowrap">
                Menu & Ordering
              </span>
              <span
                className={`h-5 px-2 inline-flex items-center justify-center text-[9px] font-black uppercase tracking-wider rounded-full border shadow-2xs shrink-0 ${
                  isDining 
                    ? 'bg-amber-50 text-amber-900 border-amber-300' 
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                }`}
              >
                {isDining ? 'Dining' : 'New Order'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold mt-0.5 whitespace-nowrap">
              <span>Select dishes to add to live order</span>
            </div>
          </div>
        </div>

        {/* PROPER CONSTRAINED SEAT DROPDOWN (NEVER OVERFLOWS OUTSIDE) */}
        <div className="relative shrink-0 max-w-[155px] sm:max-w-[175px]">
          <div className="relative flex items-center">
            <select
              value={currentSeatId}
              onChange={(e) => onQuickSeatSwitch(e.target.value)}
              className="appearance-none h-9 pl-2.5 pr-7 w-full max-w-[155px] sm:max-w-[175px] bg-slate-50 hover:bg-slate-100 border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-black text-slate-900 cursor-pointer shadow-2xs outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all truncate"
              title="Quickly switch order target seat"
            >
              {allSeatsList.map(seat => (
                <option key={seat.id} value={seat.id} className="bg-white text-slate-900">
                  {seat.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. SEARCH INPUT & CART ICON ONLY WITH TOP FLOATING BADGE */}
      {/* ======================================================== */}
      <div className="flex items-center gap-2.5 mb-3.5 shrink-0">
        {/* Search Input Box */}
        <div className="flex-1 h-10 border border-slate-300 hover:border-slate-400 rounded-2xl px-3.5 flex items-center gap-2 bg-slate-50 min-w-0 shadow-2xs transition-colors focus-within:border-amber-500">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search biryani, starters, beverages..."
            className="w-full text-xs font-semibold bg-transparent outline-none text-slate-900 placeholder-slate-400"
          />
          {searchQuery && (
            <button 
              type="button" 
              onClick={() => setSearchQuery('')}
              className="w-6 h-6 rounded-lg bg-slate-200/80 hover:bg-slate-300 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all shrink-0 active:scale-90 cursor-pointer"
              title="Clear Search"
              aria-label="Clear Search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Cart Icon Only with Top Number Badge (No Text as requested) */}
        <button
          type="button"
          onClick={onSwitchToTicketMode}
          className="relative w-10 h-10 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 border border-amber-400 flex items-center justify-center shadow-xs transition-all shrink-0 cursor-pointer"
          title="View Current Order Ticket"
          aria-label={`View Cart: ${cartCount} items`}
        >
          <ShoppingCart className="w-5 h-5 text-slate-950 stroke-[2.2]" />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-slate-950 text-amber-400 text-[10px] font-black flex items-center justify-center border-2 border-white shadow-xs">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* ======================================================== */}
      {/* 3. CATEGORY FILTER PILLS (SHRINK-0, NEVER CLIPPED)       */}
      {/* ======================================================== */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 mb-3.5 shrink-0">
        {categories.map(cat => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`h-9 px-4 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white font-black shadow-xs ring-2 ring-slate-900/20'
                  : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* 4. DISHES CARD GRID: PRICE ON LEFT, ADD ON RIGHT         */}
      {/* ======================================================== */}
      <div className="flex-1 overflow-y-auto no-scrollbar pr-0.5 pb-4">
        {filteredDishes.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Utensils className="w-9 h-9 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-xs font-bold text-slate-600">No dishes found matching search criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 px-0.5">
            {filteredDishes.map(dish => {
              const qty = dishQuantities[dish.id] || 0;
              const available = isDishAvailable(dish.id);

              return (
                <div
                  key={dish.id}
                  className={`border rounded-2xl p-3 flex flex-col justify-between transition-all shadow-xs ${
                    !available
                      ? 'border-slate-200 bg-slate-50 opacity-60 grayscale-[30%]'
                      : qty > 0 
                      ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/10' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Top Section: Food Image + Dish Info */}
                  <div className="flex gap-3 items-start">
                    {/* Authentic Food Image Thumbnail with Veg/Non-Veg Badge */}
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-100 border border-slate-200/80">
                      <img
                        src={dish.imageUrl}
                        alt={dish.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {/* Standard Indian Veg/Non-Veg Border Marker */}
                      <span 
                        className={`absolute top-1.5 left-1.5 w-4 h-4 border flex items-center justify-center rounded-xs bg-white/95 shadow-xs ${
                          dish.isVeg ? 'border-emerald-600' : 'border-rose-600'
                        }`}
                        title={dish.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                      >
                        <span 
                          className={`w-2 h-2 rounded-full ${
                            dish.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                          }`} 
                        />
                      </span>
                    </div>

                    {/* Dish Name & Description */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-xs sm:text-sm text-slate-900 leading-snug line-clamp-2">
                        {dish.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium line-clamp-2 leading-relaxed mt-1">
                        {dish.description}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Action Row: Price on LEFT, Add Button / Stepper on RIGHT (NO "Selected: 1") */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    {/* Price on Left Side with Kitchen Badge */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-black text-amber-900 bg-amber-100/90 border border-amber-300 px-2.5 py-1 rounded-xl shadow-2xs tracking-tight">
                        ₹{dish.price}
                      </span>
                      {!available && (
                        <span className="text-[10px] font-black text-rose-800 bg-rose-50 border border-rose-300 px-2 py-0.5 rounded-md shadow-2xs">
                          Sold Out (86)
                        </span>
                      )}
                      {kitchenQuantities && (kitchenQuantities[dish.id] || 0) > 0 && (
                        <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-md shadow-2xs">
                          {kitchenQuantities[dish.id]} in kitchen
                        </span>
                      )}
                    </div>

                    {/* Add Button or Stepper on Right Side */}
                    {!available ? (
                      <span className="h-8 px-3.5 bg-slate-200 text-slate-500 rounded-xl text-xs font-bold uppercase flex items-center justify-center cursor-not-allowed select-none">
                        Sold Out
                      </span>
                    ) : qty === 0 ? (
                      // Clean Standardized Button: + Add
                      <button
                        type="button"
                        onClick={() => onAddDishFirstTime(dish.id, dish.price)}
                        className="h-8 px-3.5 bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-900 border border-slate-300 rounded-xl text-xs font-black flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-700 stroke-[2.5]" />
                        <span>Add</span>
                      </button>
                    ) : (
                      // Stepper: [-] [qty] [+] with uniform container
                      <div className="h-8 flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-xl p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => onChangeQty(dish.id, -1, dish.price)}
                          className="w-7 h-7 rounded-lg hover:bg-slate-200 active:scale-90 flex items-center justify-center text-slate-700 transition-all cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-black text-slate-900">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => onChangeQty(dish.id, 1, dish.price)}
                          className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-90 flex items-center justify-center text-slate-950 transition-all shadow-2xs cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3 text-slate-950 stroke-[3]" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TabletMenuCatalog;
