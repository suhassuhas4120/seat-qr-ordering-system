'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  UtensilsCrossed,
  Tag,
  Search,
  Plus,
  RotateCcw,
  Percent,
  CheckCircle2,
  Lock,
  Unlock,
  Calendar,
  Clock,
  Trash2,
  Sparkles,
  Check,
  Flame,
} from 'lucide-react';
import { MENU_ITEMS, MENU_CATEGORIES } from '@/lib/data/menuData';
import { PromoRule } from './types';
import { realtimeBridge } from '@/lib/supabase';

export function ScreenM10Menu86Stock() {
  // Sourced dish stock availability map (persisted in localStorage & Supabase)
  const [stockMap, setStockMap] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined' && realtimeBridge.getDishAvailability) {
      const saved = realtimeBridge.getDishAvailability();
      const initial: Record<string, boolean> = {};
      MENU_ITEMS.forEach((dish) => {
        initial[dish.id] = saved[dish.id] !== undefined ? saved[dish.id] : true;
      });
      return initial;
    }
    return MENU_ITEMS.reduce((acc, dish) => {
      acc[dish.id] = true;
      return acc;
    }, {} as Record<string, boolean>);
  });

  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Promos list strictly loaded from persistent storage (zero fake default campaigns)
  const [promos, setPromos] = useState<PromoRule[]>(() => {
    if (typeof window !== 'undefined' && realtimeBridge.getPromos) {
      const saved = realtimeBridge.getPromos();
      if (saved && Array.isArray(saved)) {
        return saved.filter((p: PromoRule) => !['pr-0', 'pr-1', 'pr-2'].includes(p.id));
      }
    }
    return [];
  });

  // Form states for new offer
  const [offerName, setOfferName] = useState<string>('');
  const [promoCode, setPromoCode] = useState<string>('');
  const [discountVal, setDiscountVal] = useState<string>('10');
  const [minOrder, setMinOrder] = useState<string>('500');

  // Date and Time states
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const defaultEndStr = useMemo(() => new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], []);

  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(defaultEndStr);
  const [isAllDay, setIsAllDay] = useState<boolean>(true);
  const [startTime, setStartTime] = useState<string>('16:00');
  const [endTime, setEndTime] = useState<string>('19:00');

  // Listen for real-time availability changes from other screens/tabs
  useEffect(() => {
    const unsub = realtimeBridge.subscribeKDS({
      onAvailabilityChange: (data) => {
        setStockMap((prev) => ({ ...prev, [data.dishId]: data.isAvailable }));
      },
      onClearAll: () => {
        const allInStock: Record<string, boolean> = {};
        MENU_ITEMS.forEach((d) => (allInStock[d.id] = true));
        setStockMap(allInStock);
      },
    });
    return () => unsub();
  }, []);

  // Save promos whenever updated
  const updatePromos = useCallback((newPromos: PromoRule[]) => {
    setPromos(newPromos);
    if (realtimeBridge.savePromos) {
      realtimeBridge.savePromos(newPromos);
    }
  }, []);

  // Toggle dish stock (86 out / in stock)
  const toggleStock = async (dishId: string) => {
    if (isLocked) return;
    const nextVal = !stockMap[dishId];
    setStockMap((prev) => ({ ...prev, [dishId]: nextVal }));
    await realtimeBridge.setAvailability(dishId, nextVal);
  };

  // Reset all 49 dishes to In Stock
  const resetAllInStock = async () => {
    if (isLocked) return;
    const allTrue: Record<string, boolean> = {};
    for (const dish of MENU_ITEMS) {
      allTrue[dish.id] = true;
      await realtimeBridge.setAvailability(dish.id, true);
    }
    setStockMap(allTrue);
  };

  // Quick duration selection helper
  const handleQuickDuration = (days: number) => {
    setStartDate(todayStr);
    const end = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
    setEndDate(end);
  };

  // Quick time preset helper
  const handleTimePreset = (start: string, end: string) => {
    setIsAllDay(false);
    setStartTime(start);
    setEndTime(end);
  };

  // Submit new promotional campaign
  const handleAddOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerName.trim() || !promoCode.trim()) {
      alert('Please enter offer name and promo code.');
      return;
    }

    const timingStr = isAllDay
      ? 'All Day'
      : `${startTime} - ${endTime}`;

    const dateRangeStr = `${startDate} to ${endDate}`;

    const newRule: PromoRule = {
      id: `pr-${Date.now()}`,
      title: offerName.trim(),
      code: promoCode.trim().toUpperCase(),
      discountPercent: parseInt(discountVal, 10) || 10,
      minBillAmount: parseInt(minOrder, 10) || 500,
      isActive: true,
      description: 'Active Manager Campaign',
      startDate,
      endDate,
      startTime: isAllDay ? undefined : startTime,
      endTime: isAllDay ? undefined : endTime,
      isAllDay,
      timing: timingStr,
      dateRange: dateRangeStr,
    };

    const nextList = [newRule, ...promos];
    updatePromos(nextList);

    setOfferName('');
    setPromoCode('');
    setDiscountVal('10');
    setMinOrder('500');
    alert(`Campaign "${newRule.title}" activated with code ${newRule.code}`);
  };

  // Toggle active/paused state of a promo
  const togglePromoActive = (id: string) => {
    const nextList = promos.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p));
    updatePromos(nextList);
  };

  // Delete a promo campaign
  const deletePromo = (id: string, title: string) => {
    if (!confirm(`Remove campaign "${title}"?`)) return;
    const nextList = promos.filter((p) => p.id !== id);
    updatePromos(nextList);
  };

  // Dynamic real-time campaign validity status calculation
  const getPromoStatus = useCallback((p: PromoRule) => {
    if (!p.isActive) {
      return { label: 'PAUSED', cls: 'bg-slate-200 text-slate-700 border-slate-300' };
    }
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentClock = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

    if (p.startDate && currentDate < p.startDate) {
      return { label: 'UPCOMING', cls: 'bg-sky-100 text-sky-800 border-sky-300' };
    }
    if (p.endDate && currentDate > p.endDate) {
      return { label: 'EXPIRED', cls: 'bg-stone-200 text-stone-600 border-stone-300' };
    }

    if (!p.isAllDay && p.startTime && p.endTime) {
      if (currentClock < p.startTime) {
        return { label: 'UPCOMING TODAY', cls: 'bg-sky-100 text-sky-800 border-sky-300' };
      }
      if (currentClock > p.endTime) {
        return { label: 'CLOSED FOR DAY', cls: 'bg-amber-100 text-amber-800 border-amber-300' };
      }
    }

    return { label: 'LIVE NOW', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  }, []);

  const soldOutCount = Object.values(stockMap).filter((v) => !v).length;

  // Filter dishes by search and category
  const filteredDishes = useMemo(() => {
    return MENU_ITEMS.filter((dish) => {
      const matchesSearch = dish.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || dish.categoryId === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  return (
    <div className="w-full mx-auto p-1 space-y-4 font-mono">
      {/* Top Header Banner */}
      <div className="bg-white border border-[#EAE5DF] rounded-xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#9C3D1E] text-white shadow-sm">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <div>
            <span className="font-mono text-[10px] font-black uppercase tracking-wider text-orange-800 bg-orange-100 rounded px-1.5 py-0.5">
              MENU STOCKS &amp; OFFERS
            </span>
            <h1 className="text-base sm:text-lg font-black font-mono text-slate-900 mt-1">
              Menu Stocks and Offers
            </h1>
          </div>
        </div>
      </div>

      {/* 2-Column Split Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Real-Time Dish Availability (~50% / lg:col-span-6) */}
        <div className="lg:col-span-6 bg-white border border-[#EAE5DF] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-[#9C3D1E]" />
              <h3 className="font-mono text-xs font-black uppercase text-slate-900">
                Dish Availability ({MENU_ITEMS.length} Dishes)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsLocked(!isLocked)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                  isLocked
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-rose-50 text-rose-800 border border-rose-300 animate-pulse'
                }`}
                title={isLocked ? 'Click to Unlock Stock Editing' : 'Click to Lock Stock Editing'}
              >
                {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                <span>{isLocked ? 'Locked' : 'Unlocked'}</span>
              </button>
              <button
                type="button"
                onClick={resetAllInStock}
                disabled={isLocked}
                className="px-2.5 py-1 bg-[#FAF8F5] border border-slate-300 rounded-lg text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition cursor-pointer"
              >
                Reset All In-Stock
              </button>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#9C3D1E] text-white shadow-xs'
                  : 'bg-[#FAF8F5] text-slate-600 border border-slate-200 hover:bg-stone-200'
              }`}
            >
              All ({MENU_ITEMS.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('cat-biryani')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition cursor-pointer ${
                selectedCategory === 'cat-biryani'
                  ? 'bg-[#9C3D1E] text-white shadow-xs'
                  : 'bg-[#FAF8F5] text-slate-600 border border-slate-200 hover:bg-stone-200'
              }`}
            >
              Biryani &amp; Rice ({MENU_ITEMS.filter((d) => d.categoryId === 'cat-biryani').length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('cat-starters')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition cursor-pointer ${
                selectedCategory === 'cat-starters'
                  ? 'bg-[#9C3D1E] text-white shadow-xs'
                  : 'bg-[#FAF8F5] text-slate-600 border border-slate-200 hover:bg-stone-200'
              }`}
            >
              Starters ({MENU_ITEMS.filter((d) => d.categoryId === 'cat-starters').length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('cat-special')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition cursor-pointer ${
                selectedCategory === 'cat-special'
                  ? 'bg-[#9C3D1E] text-white shadow-xs'
                  : 'bg-[#FAF8F5] text-slate-600 border border-slate-200 hover:bg-stone-200'
              }`}
            >
              Specials &amp; Soups ({MENU_ITEMS.filter((d) => d.categoryId === 'cat-special').length})
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter dishes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#FAF8F5] border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-400 font-mono"
            />
          </div>

          {/* Dish Availability Scroll List */}
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {filteredDishes.map((dish) => {
              const inStock = stockMap[dish.id] ?? true;
              return (
                <div
                  key={dish.id}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs transition ${
                    inStock
                      ? 'bg-[#FAF8F5] border-slate-200 hover:border-slate-300'
                      : 'bg-rose-50 border-rose-300 shadow-2xs'
                  }`}
                >
                  <div className="pr-2 truncate">
                    <span className="font-bold text-slate-900 block truncate">{dish.title}</span>
                    <span className="text-[10px] text-slate-500 font-mono">₹{dish.price}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleStock(dish.id)}
                    disabled={isLocked}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                      isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
                    } ${
                      inStock
                        ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                        : 'bg-rose-600 text-white shadow-xs hover:bg-rose-700'
                    }`}
                  >
                    {inStock ? 'IN STOCK' : '86 OUT'}
                  </button>
                </div>
              );
            })}

            {promos.length === 0 && (
              <div className="py-10 text-center text-slate-400 text-xs font-bold border border-dashed border-slate-300 rounded-xl bg-white p-6 space-y-1">
                <p className="text-slate-700 font-black">No active campaigns</p>
                <p className="text-[11px] text-slate-400 font-medium">Use the form on the left to create and schedule real promotional offers.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Promotional Campaigns (~50% / lg:col-span-6) */}
        <div className="lg:col-span-6 bg-white border border-[#EAE5DF] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-[#9C3D1E]" />
              <h3 className="font-mono text-xs font-black uppercase text-slate-900">
                Add Promotional Offers
              </h3>
            </div>
          </div>

          {/* Creation Form with Full Date & Time Scheduling */}
          <form onSubmit={handleAddOffer} className="space-y-3 bg-[#FAF8F5] border border-slate-200 rounded-xl p-3.5">
            {/* Row 1: Name and Code */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-0.5 block">Offer Name</label>
                <input
                  type="text"
                  placeholder="e.g. Festival Treat"
                  value={offerName}
                  onChange={(e) => setOfferName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-0.5 block">Promo Code</label>
                <input
                  type="text"
                  placeholder="e.g. TREAT20"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 uppercase focus:outline-none focus:ring-1 focus:ring-orange-400 font-bold"
                />
              </div>
            </div>

            {/* Row 2: Discount & Min Order */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-0.5 block">Discount %</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  placeholder="e.g. 15"
                  value={discountVal}
                  onChange={(e) => setDiscountVal(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-0.5 block">Min Order ₹</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  placeholder="e.g. 500"
                  value={minOrder}
                  onChange={(e) => setMinOrder(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>
            </div>

            {/* Row 3: Date Range & Duration Selector */}
            <div className="space-y-1.5 border-t border-slate-200/80 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase text-slate-700 flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-orange-600" />
                  <span>Offer Dates &amp; Duration</span>
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleQuickDuration(0)}
                    className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-white border border-slate-200 hover:bg-orange-50 text-slate-600 cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDuration(3)}
                    className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-white border border-slate-200 hover:bg-orange-50 text-slate-600 cursor-pointer"
                  >
                    3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDuration(7)}
                    className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-white border border-slate-200 hover:bg-orange-50 text-slate-600 cursor-pointer"
                  >
                    7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDuration(30)}
                    className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-white border border-slate-200 hover:bg-orange-50 text-slate-600 cursor-pointer"
                  >
                    1 Month
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9.5px] text-slate-400 block">Start Date</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <span className="text-[9.5px] text-slate-400 block">End Date</span>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  />
                </div>
              </div>
            </div>

            {/* Row 4: Daily Time Window Selection */}
            <div className="space-y-1.5 border-t border-slate-200/80 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase text-slate-700 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-orange-600" />
                  <span>Daily Time Slot</span>
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsAllDay(true)}
                    className={`px-2 py-0.5 rounded text-[9.5px] font-bold cursor-pointer transition ${
                      isAllDay
                        ? 'bg-[#9C3D1E] text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-stone-100'
                    }`}
                  >
                    All Day
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAllDay(false)}
                    className={`px-2 py-0.5 rounded text-[9.5px] font-bold cursor-pointer transition ${
                      !isAllDay
                        ? 'bg-[#9C3D1E] text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-stone-100'
                    }`}
                  >
                    Custom Hours
                  </button>
                </div>
              </div>

              {!isAllDay && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                    <button
                      type="button"
                      onClick={() => handleTimePreset('16:00', '19:00')}
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white border border-slate-200 hover:bg-orange-50 text-slate-600 shrink-0 cursor-pointer"
                    >
                      Happy Hours (4-7 PM)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTimePreset('12:00', '16:00')}
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white border border-slate-200 hover:bg-orange-50 text-slate-600 shrink-0 cursor-pointer"
                    >
                      Lunch (12-4 PM)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTimePreset('19:00', '23:00')}
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white border border-slate-200 hover:bg-orange-50 text-slate-600 shrink-0 cursor-pointer"
                    >
                      Dinner (7-11 PM)
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9.5px] text-slate-400 block">From Time</span>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-400"
                      />
                    </div>
                    <div>
                      <span className="text-[9.5px] text-slate-400 block">To Time</span>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-400"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-[#9C3D1E] text-white rounded-lg text-xs font-bold hover:bg-orange-700 transition cursor-pointer shadow-xs active:scale-[0.99]"
            >
              + Activate Promo Campaign
            </button>
          </form>

          {/* Active Campaigns List with Live Schedule Badges */}
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {promos.map((p) => {
              const statusInfo = getPromoStatus(p);
              return (
                <div
                  key={p.id}
                  className="p-3 bg-[#FAF8F5] border border-slate-200 rounded-xl space-y-2 transition-all hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-slate-900 text-xs sm:text-sm">
                          {p.title}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-orange-100 text-[#9C3D1E] text-[10px] font-black border border-orange-200">
                          {p.code}
                        </span>
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${statusInfo.cls}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-600 block mt-0.5 font-bold">
                        {p.discountPercent}% Off • Min Bill ₹{p.minBillAmount}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => togglePromoActive(p.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                          p.isActive
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        {p.isActive ? 'ACTIVE' : 'PAUSED'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePromo(p.id, p.title)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Remove campaign"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Date & Time Schedule Pill Details */}
                  <div className="p-2 rounded-lg bg-white border border-slate-200/80 flex items-center justify-between flex-wrap gap-2 text-[10.5px]">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Calendar className="h-3 w-3 text-orange-600 shrink-0" />
                      <span>{p.startDate || 'Start'} to {p.endDate || 'End'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Clock className="h-3 w-3 text-orange-600 shrink-0" />
                      <span>{p.isAllDay ? 'All Day' : p.timing || 'Custom Hours'}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {promos.length === 0 && (
              <div className="py-10 text-center text-slate-400 text-xs font-bold border border-dashed border-slate-300 rounded-xl bg-white p-6 space-y-1">
                <p className="text-slate-700 font-black">No active campaigns</p>
                <p className="text-[11px] text-slate-400 font-medium">Use the form on the left to create and schedule real promotional offers.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
