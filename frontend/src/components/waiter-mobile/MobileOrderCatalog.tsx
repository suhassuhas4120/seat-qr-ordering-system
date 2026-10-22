"use client";
/**
 * Thoogudeepa Waiter Mobile Cockpit - Food Menu Catalog Component
 *
 * Real-world enterprise Waiter Order Pad & Food Catalog interface:
 * - Balanced Modern Theme: Soft slate canvas (#F8FAFC), crisp white card (#FFFFFF),
 *   subtle borders (#E2E8F0), slate-900 typography, and vibrant accents
 * - Top Order Bar: Target Seat Indicator with back action to Floor Grid
 * - Integrated Search Bar with tactile [ ✕ ] Clear Button
 * - Cart Icon with Badge Number positioned directly on top-right of the icon
 * - Category Filter Pills: All Items, Donne Biryani, Starters, Rice & Gravy, Beverages
 * - Item Cards: Non-Veg / Veg indicators, price, description, and '+ Add' / Stepper controls
 * - Sticky Floating Bottom KOT Summary Bar ('3 Items Added • ₹740' with 'PUNCH KOT' button)
 * - Strict Line Count: Maintained strictly between 300 and 400 lines
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  ArrowLeft, 
  Search, 
  X, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Flame, 
  Sparkles, 
  UtensilsCrossed, 
  Filter,
  Check,
  Bell
} from 'lucide-react';
import { 
  MenuItem, 
  CartItem, 
  MenuCategoryKey, 
  SAMPLE_MENU_ITEMS 
} from './types';
import { realtimeBridge } from '@/lib/supabase';

export interface MobileOrderCatalogProps {
  /** Active target seat number (e.g., 'Seat 02') */
  readonly activeSeatNumber: string;
  /** Active target guest name */
  readonly activeGuestName?: string;
  /** Available food catalog */
  readonly menuItems?: MenuItem[];
  /** Current cart item lines */
  readonly cartItems: CartItem[];
  /** Pending floor alerts count */
  readonly pendingAlertCount?: number;
  /** Callback to open alerts */
  readonly onOpenAlerts?: () => void;
  /** Callback when item quantity is modified */
  readonly onModifyQuantity: (item: MenuItem, change: number) => void;
  /** Callback when cart bottom sheet is toggled */
  readonly onOpenCartSheet: () => void;
  /** Callback to punch KOT to kitchen */
  readonly onPunchKOT: () => void;
  /** Navigation callback back to seats grid */
  readonly onBackToSeats: () => void;
}

export const MobileOrderCatalog: React.FC<MobileOrderCatalogProps> = ({
  activeSeatNumber,
  activeGuestName = 'Walk-In Guest',
  menuItems = SAMPLE_MENU_ITEMS,
  cartItems,
  pendingAlertCount = 2,
  onOpenAlerts,
  onModifyQuantity,
  onOpenCartSheet,
  onPunchKOT,
  onBackToSeats
}) => {
  const [activeCategory, setActiveCategory] = useState<MenuCategoryKey>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
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

  const isDishAvailable = (id: string) => {
    const clean = id.replace(/^dish-/, '');
    if (stockMap[clean] === false || stockMap[`dish-${clean}`] === false) {
      return false;
    }
    return true;
  };

  // Category definitions with active counts
  const categories: { key: MenuCategoryKey; label: string }[] = useMemo(() => [
    { key: 'all', label: 'All Items' },
    { key: 'biryani', label: 'Donne Biryani & Rice' },
    { key: 'starters', label: 'Starters & Sides' },
    { key: 'special', label: 'Sunday Specials & Soups' }
  ], []);

  // Compute total item count in cart
  const totalCartCount = useMemo(() => {
    return cartItems.reduce((acc, curr) => acc + curr.quantity, 0);
  }, [cartItems]);

  // Compute running subtotal
  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((acc, curr) => acc + curr.lineTotal, 0);
  }, [cartItems]);

  // Separate new draft items from already cooking items
  const draftItems = useMemo(() => {
    return cartItems.filter(c => !c.orderItemId && !c.isFired && c.stage !== 'REC' && c.stage !== 'PREP' && c.stage !== 'READY' && c.stage !== 'SERVED');
  }, [cartItems]);

  const draftQuantities = useMemo(() => {
    const map = new Map<string, number>();
    draftItems.forEach(item => {
      map.set(item.menuItem.id, (map.get(item.menuItem.id) || 0) + item.quantity);
    });
    return map;
  }, [draftItems]);

  const firedQuantities = useMemo(() => {
    const map = new Map<string, number>();
    cartItems.filter(c => c.isFired || Boolean(c.orderItemId) || c.stage === 'REC' || c.stage === 'PREP' || c.stage === 'READY' || c.stage === 'SERVED').forEach(item => {
      map.set(item.menuItem.id, (map.get(item.menuItem.id) || 0) + item.quantity);
    });
    return map;
  }, [cartItems]);

  const draftCount = useMemo(() => {
    return draftItems.reduce((acc, curr) => acc + curr.quantity, 0);
  }, [draftItems]);

  const draftSubtotal = useMemo(() => {
    return draftItems.reduce((acc, curr) => acc + curr.lineTotal, 0);
  }, [draftItems]);

  // Filtered menu items by category and query
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      // Category filter
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesKannada = item.kannadaName ? item.kannadaName.includes(q) : false;
        const matchesDesc = item.description.toLowerCase().includes(q);
        if (!matchesName && !matchesKannada && !matchesDesc) return false;
      }
      return true;
    });
  }, [menuItems, activeCategory, searchQuery]);

  // Clear search input
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col bg-slate-50 select-none overflow-hidden relative">
      
      {/* Top Order Pad Header: Hotel Name FIRST, Waiter Below, Bell Always on Right */}
      <header className="p-3 bg-white border-b border-slate-200 flex items-center justify-between shadow-2xs shrink-0 select-none z-20">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBackToSeats}
            className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center bg-white hover:bg-slate-100 btn-press shrink-0 shadow-2xs text-slate-700"
            title="Back to Seats"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs font-black text-slate-900 tracking-tight truncate leading-tight">
                ತೂಗುದೀಪ ದೊನ್ನೆ ಬಿರಿಯಾನಿ
              </h1>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[11px] font-bold text-slate-800 truncate">Ramesh Kumar</span>
              <span className="text-slate-300 text-[10px]">•</span>
              <span className="text-[10px] font-semibold text-slate-500 truncate">
                {activeSeatNumber}: {activeGuestName}
              </span>
            </div>
          </div>
        </div>

        {/* Alert Bell Icon Always at Top Right */}
        <button
          type="button"
          onClick={onOpenAlerts}
          className="relative w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center bg-white hover:bg-slate-50 btn-press shrink-0 shadow-2xs"
          title="Alerts"
        >
          <Bell className="w-4 h-4 text-slate-700" />
          {pendingAlertCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-2xs animate-pulse">
              {pendingAlertCount}
            </span>
          )}
        </button>
      </header>

      {/* Search Input Bar Row: Larger Search Bar, Icon-only Cart, Larger Filter Pills */}
      <div className="p-3 bg-white border-b border-slate-100 shrink-0 space-y-2.5 shadow-2xs z-10">
        <div className="flex items-center gap-2.5">
          {/* Search Bar with Dedicated ✕ Clear Button */}
          <div className="relative flex-1 flex items-center min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search biryani, starters..."
              className="w-full h-10 pl-9 pr-8 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 transition-all"
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 w-4.5 h-4.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
                title="Clear search"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {/* ONLY CART ICON NOT TEXT WITH NUMBER OF ITEMS PLACED */}
          <button
            type="button"
            onClick={onOpenCartSheet}
            className="relative w-10 h-10 rounded-xl border border-amber-500 bg-amber-500 hover:bg-amber-600 active:scale-95 flex items-center justify-center btn-press shadow-xs shrink-0 cursor-pointer transition-all"
            title="Open Cart"
          >
            <ShoppingBag className="w-5 h-5 text-white" />
            {totalCartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-slate-900 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs border-2 border-white">
                {totalCartCount}
              </span>
            )}
          </button>
        </div>

        {/* Horizontal Category Filter Pills (Enlarged Height, Padding & Bold Typography) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {categories.map(cat => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`h-10 px-4.5 rounded-xl text-xs sm:text-sm font-black shrink-0 transition-all shadow-2xs cursor-pointer ${
                activeCategory === cat.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Dishes Catalog List: Flex-1 scrollable area stops cleanly above KOT dock */}
      <div className="p-3 flex-1 overflow-y-auto no-scrollbar space-y-3 pb-4">
        {filteredMenuItems.length === 0 ? (
          /* Empty Search State */
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mb-2 mx-auto">
              <UtensilsCrossed className="w-6 h-6 text-slate-400" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">No Dishes Found</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Try searching with another item or category keyword.
            </p>
          </div>
        ) : (
          filteredMenuItems.map(dish => {
            const currentDraftQty = draftQuantities.get(dish.id) || 0;
            const inKitchenQty = firedQuantities.get(dish.id) || 0;
            const isNonVeg = dish.dietary === 'non_veg';
            const available = isDishAvailable(dish.id);

            return (
              <div
                key={dish.id}
                className={`border rounded-2xl p-3 shadow-xs flex items-center gap-3.5 transition-all ${
                  !available ? 'bg-slate-50 border-slate-200 opacity-60 grayscale-[30%]' : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Dish Thumbnail Image */}
                {dish.image && (
                  <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200 relative shadow-2xs">
                    <img 
                      src={dish.image} 
                      alt={dish.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    {dish.isBestseller && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                        ★ BEST
                      </span>
                    )}
                  </div>
                )}

                {/* Dish Info: Proper Readable Typography & Prominent Price */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {/* Food Dietary Indicator */}
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      isNonVeg ? 'bg-rose-500' : 'bg-emerald-500'
                    }`} />
                    <h4 className="text-sm sm:text-base font-black text-slate-900 truncate leading-snug">
                      {dish.name}
                    </h4>
                  </div>

                  {dish.kannadaName && (
                    <span className="text-xs sm:text-sm font-extrabold text-amber-900 block truncate mt-0.5">
                      {dish.kannadaName}
                    </span>
                  )}

                  <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-1 mt-0.5 leading-normal">
                    {dish.description}
                  </p>

                  {/* PROMINENT HIGH-VISIBILITY PRICE BADGE */}
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm sm:text-base font-black text-amber-950 font-mono bg-amber-100 border border-amber-300 px-3 py-0.5 rounded-lg shadow-2xs inline-block">
                      ₹{dish.price}
                    </span>
                    {!available && (
                      <span className="text-[10px] font-black text-rose-800 bg-rose-50 border border-rose-300 px-2 py-0.5 rounded-md shadow-2xs">
                        Sold Out (86)
                      </span>
                    )}
                    {inKitchenQty > 0 && (
                      <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-md shadow-2xs">
                        {inKitchenQty} in kitchen
                      </span>
                    )}
                  </div>
                </div>

                {/* Add / Stepper Controls with generous touch target */}
                <div className="flex items-center shrink-0">
                  {!available ? (
                    <span className="h-8 px-3 rounded-xl bg-slate-200 text-slate-500 text-xs font-bold uppercase flex items-center select-none cursor-not-allowed">
                      Sold Out
                    </span>
                  ) : currentDraftQty > 0 ? (
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => onModifyQuantity(dish, -1)}
                        className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center font-bold text-slate-800 btn-press shadow-2xs cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center text-xs sm:text-sm font-black text-slate-900">
                        {currentDraftQty}
                      </span>
                      <button
                        type="button"
                        onClick={() => onModifyQuantity(dish, 1)}
                        className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center font-bold btn-press shadow-2xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onModifyQuantity(dish, 1)}
                      className="h-8 px-3.5 rounded-xl border-2 border-amber-500 bg-amber-50/70 hover:bg-amber-100 active:scale-95 text-xs font-black text-amber-900 btn-press flex items-center gap-1 shadow-2xs cursor-pointer transition-all"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Add</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* DOCKED SOLID BOTTOM KOT BAR: Physical flex child firmly docked at bottom of screen */}
      {draftCount > 0 ? (
        <div className="shrink-0 p-3 bg-white border-t-2 border-slate-200 flex items-center justify-between shadow-[0_-8px_24px_rgba(0,0,0,0.12)] z-30 animate-in slide-in-from-bottom-2 duration-150">
          <div>
            <span className="text-sm sm:text-base font-black text-slate-900 block leading-tight">
              {draftCount} New Items • ₹{draftSubtotal}
            </span>
            <span className="text-[10px] sm:text-xs text-amber-600 font-bold block mt-0.5">
              Draft - Ready for Kitchen Pass
            </span>
          </div>

          <button
            type="button"
            onClick={onPunchKOT}
            className="h-11 px-5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl flex items-center gap-2 btn-press shadow-md transition-all cursor-pointer"
          >
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>Send to KOT</span>
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
          </button>
        </div>
      ) : totalCartCount > 0 ? (
        <div className="shrink-0 p-3 bg-white border-t-2 border-slate-200 flex items-center justify-between shadow-[0_-8px_24px_rgba(0,0,0,0.12)] z-30 animate-in slide-in-from-bottom-2 duration-150">
          <div>
            <span className="text-sm sm:text-base font-black text-slate-900 block leading-tight">
              {totalCartCount} Items in Kitchen • ₹{cartSubtotal}
            </span>
            <span className="text-[10px] sm:text-xs text-emerald-600 font-bold block mt-0.5">
              Active Dining Session
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenCartSheet}
            className="h-11 px-5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-900 font-black text-xs sm:text-sm rounded-xl flex items-center gap-2 border border-slate-300 shadow-2xs transition-all cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-slate-700" />
            <span>View Live KOT</span>
          </button>
        </div>
      ) : null}

    </div>
  );
};

export default MobileOrderCatalog;

