'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MENU_ITEMS, MENU_CATEGORIES } from '@/lib/data/menuData';
import { realtimeBridge, OrderRecord, OrderItemRecord } from '@/lib/supabase';
import {
  Printer,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  QrCode,
  Banknote,
  Search,
  UtensilsCrossed,
  CheckCircle2,
  Receipt,
  Armchair,
  Grid,
  X,
  Package,
  Send,
  Clock,
  Flame,
} from 'lucide-react';

interface BillItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  seatNumber: number | string;
  stage: string;
  isDraft?: boolean;
}

const ALL_100_SEATS = Array.from({ length: 100 }, (_, i) => (i + 1).toString().padStart(2, '0'));

interface ScreenM4BillingPOSProps {
  selectedSeatId?: string;
  onSelectSeatId?: (id: string) => void;
  liveOrders?: { order: OrderRecord; items: OrderItemRecord[] }[];
  onSettled?: () => void;
}

export function ScreenM4BillingPOS({
  selectedSeatId = '17',
  onSelectSeatId,
  liveOrders = [],
  onSettled,
}: ScreenM4BillingPOSProps) {
  // Normalize clean seat identifier (e.g. '17', '04', '01' or 'TK-01')
  const initialSeatNormalized = useMemo(() => {
    if (selectedSeatId === 'TK-01' || selectedSeatId?.toLowerCase().includes('takeaway')) {
      return 'TK-01';
    }
    const clean = selectedSeatId?.replace(/[^0-9]/g, '') || '17';
    return clean.padStart(2, '0');
  }, [selectedSeatId]);

  const [activeSeat, setActiveSeat] = useState<string>(initialSeatNormalized);
  const [seatDraftMap, setSeatDraftMap] = useState<Record<string, BillItem[]>>({});
  const [seatPickerModalOpen, setSeatPickerModalOpen] = useState<boolean>(false);
  const [modalZoneFilter, setModalZoneFilter] = useState<'ALL' | 'TAKEAWAY' | 'Z1' | 'Z2' | 'Z3' | 'Z4'>('ALL');
  const [modalSearch, setModalSearch] = useState<string>('');

  const [complimentary, setComplimentary] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CASH' | 'CARD'>('UPI');
  const [settledSuccess, setSettledSuccess] = useState<boolean>(false);
  const [punchNotice, setPunchNotice] = useState<string | null>(null);
  const [menuSearch, setMenuSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [printThermalOpen, setPrintThermalOpen] = useState<boolean>(false);

  const isTakeaway = activeSeat === 'TK-01' || activeSeat.toLowerCase().includes('takeaway');
  const seatDisplayTitle = isTakeaway ? 'Takeaway Parcel #01' : `Seat #${activeSeat}`;

  // Sync when selectedSeatId prop changes from Screen 2
  useEffect(() => {
    if (selectedSeatId === 'TK-01' || selectedSeatId?.toLowerCase().includes('takeaway')) {
      setActiveSeat('TK-01');
      setSettledSuccess(false);
      return;
    }
    const clean = selectedSeatId?.replace(/[^0-9]/g, '') || '17';
    const padded = clean.padStart(2, '0');
    setActiveSeat(padded);
    setSettledSuccess(false);
  }, [selectedSeatId]);

  // Set of occupied seats strictly from live orders (zero mock presets)
  const liveOccupiedSeats = useMemo(() => {
    const set = new Set<string>();
    liveOrders.forEach((o) => {
      const chairRaw = (o.order.chair_id || '').trim();
      if (chairRaw === 'TK-01' || chairRaw.toLowerCase().includes('takeaway') || chairRaw.toLowerCase().includes('parcel')) {
        set.add('TK-01');
      } else {
        const chairNum = chairRaw.replace(/[^0-9]/g, '');
        if (chairNum) {
          set.add(chairNum.padStart(2, '0'));
        }
      }
    });
    return set;
  }, [liveOrders]);

  // Real placed kitchen orders strictly for this seat
  const placedOrders = useMemo<BillItem[]>(() => {
    const isTk = activeSeat === 'TK-01' || activeSeat.toLowerCase().includes('takeaway');
    const unpadded = activeSeat.replace(/^0+/, '') || '1';
    const num = parseInt(unpadded, 10);

    const matchingLive = liveOrders.filter((o) => {
      const chairRaw = (o.order.chair_id || '').trim();
      if (isTk) {
        return chairRaw === 'TK-01' || chairRaw.toLowerCase().includes('takeaway') || chairRaw.toLowerCase().includes('parcel');
      }
      const oChair = chairRaw.replace(/[^0-9]/g, '');
      return oChair === activeSeat || oChair === unpadded || Number(oChair) === num;
    });

    const list: BillItem[] = [];
    matchingLive.forEach((lo) => {
      if (lo.items) {
        lo.items.forEach((it, idx) => {
          list.push({
            id: it.id || `live-${activeSeat}-${idx}`,
            name: it.dish_name,
            price: it.price,
            qty: it.quantity,
            seatNumber: isTk ? 'TK-01' : num,
            stage: it.stage || 'SERVED',
            isDraft: false,
          });
        });
      }
    });
    return list;
  }, [liveOrders, activeSeat]);

  // Draft items pending KOT punch or immediate settlement
  const draftItems = seatDraftMap[activeSeat] || [];

  // All combined items on the running bill
  const allCurrentBillItems = useMemo(() => {
    return [...placedOrders, ...draftItems];
  }, [placedOrders, draftItems]);

  // Switching active seat
  const handleSwitchSeat = (seatId: string) => {
    const clean = seatId.trim();
    if (clean === 'TK-01' || clean.toLowerCase().includes('takeaway')) {
      setActiveSeat('TK-01');
      setSettledSuccess(false);
      if (onSelectSeatId) {
        onSelectSeatId('TK-01');
      }
      return;
    }
    const numClean = clean.replace(/[^0-9]/g, '') || '17';
    const padded = numClean.padStart(2, '0');
    setActiveSeat(padded);
    setSettledSuccess(false);
    if (onSelectSeatId) {
      onSelectSeatId(padded);
    }
  };

  // Add item from menu into draft items list
  const handleAddDirectItem = (dish: typeof MENU_ITEMS[0]) => {
    setSeatDraftMap((prev) => {
      const currentDrafts = prev[activeSeat] || [];
      const idx = currentDrafts.findIndex((it) => it.name === dish.title);
      let updated: BillItem[];
      if (idx >= 0) {
        updated = currentDrafts.map((it, i) => (i === idx ? { ...it, qty: it.qty + 1 } : it));
      } else {
        updated = [
          ...currentDrafts,
          {
            id: `draft-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            name: dish.title,
            price: dish.price,
            qty: 1,
            seatNumber: isTakeaway ? 'TK-01' : parseInt(activeSeat, 10) || 17,
            stage: 'DRAFT',
            isDraft: true,
          },
        ];
      }
      return { ...prev, [activeSeat]: updated };
    });
  };

  const updateDraftItemQty = (id: string, delta: number) => {
    setSeatDraftMap((prev) => {
      const currentDrafts = prev[activeSeat] || [];
      const updated = currentDrafts
        .map((it) => (it.id === id ? { ...it, qty: it.qty + delta } : it))
        .filter((it) => it.qty > 0);
      return { ...prev, [activeSeat]: updated };
    });
  };

  const removeDraftItem = (id: string) => {
    setSeatDraftMap((prev) => {
      const currentDrafts = prev[activeSeat] || [];
      const updated = currentDrafts.filter((it) => it.id !== id);
      return { ...prev, [activeSeat]: updated };
    });
  };

  // Dispatch new items as a real KOT to the Kitchen
  const handlePunchKotToKitchen = async () => {
    if (draftItems.length === 0) return;
    const ticketNumber = isTakeaway
      ? `TK-${Date.now().toString().slice(-4)}`
      : `T-${activeSeat}-${Date.now().toString().slice(-3)}`;

    const newOrderRecord: OrderRecord = {
      ticket_number: ticketNumber,
      chair_id: isTakeaway ? 'TK-01' : activeSeat,
      seat_label: seatDisplayTitle,
      status: 'pending',
      total_amount: draftItems.reduce((sum, it) => sum + it.price * it.qty, 0),
      device_token: 'manager-pos',
    };

    const newOrderItems: OrderItemRecord[] = draftItems.map((it, idx) => ({
      chair_id: isTakeaway ? 'TK-01' : activeSeat,
      seat_label: seatDisplayTitle,
      dish_id: `dish-pos-${idx}`,
      dish_name: it.name,
      quantity: it.qty,
      price: it.price,
      stage: 'PLACED',
    }));

    await realtimeBridge.placeOrder(newOrderRecord, newOrderItems);

    setSeatDraftMap((prev) => {
      const next = { ...prev };
      delete next[activeSeat];
      return next;
    });

    setPunchNotice(`Thermal KOT #${ticketNumber} dispatched to Kitchen for ${seatDisplayTitle}!`);
    setTimeout(() => setPunchNotice(null), 3500);

    if (onSettled) {
      onSettled();
    }
  };

  // Pricing math
  const subtotal = allCurrentBillItems.reduce((sum, it) => sum + it.price * it.qty, 0);
  const gst = Math.round(subtotal * 0.05);
  const grandTotal = complimentary ? 0 : subtotal + gst;

  // Settle & Close Seat or Parcel
  const handleSettle = async () => {
    if (allCurrentBillItems.length === 0) return;
    setSettledSuccess(true);

    // If there were any unpunched draft items, complete their order record
    if (draftItems.length > 0) {
      const ticketNumber = isTakeaway
        ? `TK-${Date.now().toString().slice(-4)}`
        : `T-${activeSeat}-${Date.now().toString().slice(-3)}`;

      const newOrderRecord: OrderRecord = {
        ticket_number: ticketNumber,
        chair_id: isTakeaway ? 'TK-01' : activeSeat,
        seat_label: seatDisplayTitle,
        status: 'completed',
        total_amount: draftItems.reduce((sum, it) => sum + it.price * it.qty, 0),
        device_token: 'manager-pos',
      };

      const newOrderItems: OrderItemRecord[] = draftItems.map((it, idx) => ({
        chair_id: isTakeaway ? 'TK-01' : activeSeat,
        seat_label: seatDisplayTitle,
        dish_id: `dish-pos-${idx}`,
        dish_name: it.name,
        quantity: it.qty,
        price: it.price,
        stage: 'SERVED',
      }));

      await realtimeBridge.placeOrder(newOrderRecord, newOrderItems);
    }

    // Authoritative bill settlement
    await realtimeBridge.settleBill(activeSeat, paymentMethod, grandTotal);

    // Clear drafts for this seat
    setSeatDraftMap((prev) => {
      const next = { ...prev };
      delete next[activeSeat];
      return next;
    });

    if (onSettled) {
      onSettled();
    }

    setTimeout(() => {
      setSettledSuccess(false);
      setPrintThermalOpen(true);
    }, 1500);
  };

  const filteredDishes = MENU_ITEMS.filter((dish) => {
    const matchesCat = selectedCategory === 'all' || dish.categoryId === selectedCategory;
    const matchesSearch = dish.title.toLowerCase().includes(menuSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const modalFilteredSeats = useMemo(() => {
    return ALL_100_SEATS.filter((seatStr) => {
      const num = parseInt(seatStr, 10);
      if (modalZoneFilter === 'Z1' && (num < 1 || num > 25)) return false;
      if (modalZoneFilter === 'Z2' && (num < 26 || num > 50)) return false;
      if (modalZoneFilter === 'Z3' && (num < 51 || num > 75)) return false;
      if (modalZoneFilter === 'Z4' && (num < 76 || num > 100)) return false;

      if (modalSearch.trim()) {
        const query = modalSearch.trim().replace(/[^0-9]/g, '');
        if (query && !seatStr.includes(query) && !num.toString().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [modalZoneFilter, modalSearch]);

  return (
    <div className="w-full mx-auto p-1 space-y-4 font-mono">
      {/* Top Header Banner */}
      <div className="bg-white border border-[#EAE5DF] rounded-xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#9C3D1E] text-white shadow-sm">
            {isTakeaway ? <Package className="h-6 w-6" /> : <Receipt className="h-6 w-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-black uppercase tracking-wider text-orange-800 bg-orange-100 rounded px-1.5 py-0.5">
                POINT OF SALE
              </span>
              {isTakeaway && (
                <span className="font-mono text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 rounded px-1.5 py-0.5">
                  PARCEL COUNTER
                </span>
              )}
            </div>
            <h1 className="text-base sm:text-lg font-black font-mono text-slate-900 mt-1">
              Billing &amp; Cashier POS &bull; {seatDisplayTitle}
            </h1>
          </div>
        </div>

        {/* Seat & Takeaway Selection Controls */}
        <div className="flex items-center gap-2 flex-wrap xl:flex-nowrap">
          {/* Dedicated Takeaway Parcel Desk Quick Button */}
          <button
            type="button"
            onClick={() => handleSwitchSeat('TK-01')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-xs shrink-0 ${
              isTakeaway
                ? 'bg-amber-600 text-white ring-2 ring-amber-300'
                : 'bg-[#FAF8F5] border border-amber-300 text-amber-900 hover:bg-amber-100'
            }`}
          >
            <Package className="h-3.5 w-3.5 text-amber-500" />
            <span>Takeaway Parcel</span>
          </button>

          {/* Direct Dropdown for Takeaway + Any of the 100 Seats */}
          <div className="flex items-center gap-1.5 bg-[#FAF8F5] border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-xs">
            {isTakeaway ? (
              <Package className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            ) : (
              <Armchair className="h-3.5 w-3.5 text-[#9C3D1E] shrink-0" />
            )}
            <label htmlFor="seat-dropdown-pos" className="text-[11px] font-black text-slate-600 uppercase shrink-0">
              Seat:
            </label>
            <select
              id="seat-dropdown-pos"
              value={activeSeat}
              onChange={(e) => handleSwitchSeat(e.target.value)}
              className="bg-transparent text-xs font-black font-mono text-[#9C3D1E] outline-none cursor-pointer pr-1"
            >
              <option value="TK-01">📦 Takeaway / Parcel Desk (TK-01)</option>
              {ALL_100_SEATS.map((numStr) => {
                const hasOrder = liveOccupiedSeats.has(numStr);
                return (
                  <option key={numStr} value={numStr}>
                    Seat #{numStr} {hasOrder ? '• Active Order' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* "All 100 Seats" Interactive Grid Modal Button */}
          <button
            type="button"
            onClick={() => setSeatPickerModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF8F5] border border-slate-300 hover:border-[#9C3D1E] text-slate-800 hover:text-[#9C3D1E] rounded-lg text-xs font-bold transition cursor-pointer shadow-xs shrink-0"
          >
            <Grid className="h-3.5 w-3.5 text-[#9C3D1E]" />
            <span>All 100 Seats</span>
          </button>
        </div>
      </div>

      {punchNotice && (
        <div className="p-3 bg-emerald-50 border-2 border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{punchNotice}</span>
        </div>
      )}

      {/* Main 2-Column Split Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Orders Placed + New Draft Items + Bill Summary (~60% / lg:col-span-7) */}
        <div className="lg:col-span-7 bg-white border border-[#EAE5DF] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              {isTakeaway ? (
                <Package className="h-4 w-4 text-amber-600" />
              ) : (
                <Armchair className="h-4 w-4 text-[#9C3D1E]" />
              )}
              <span className="font-black text-sm text-slate-900">Current: {seatDisplayTitle}</span>
              <span className="text-xs text-slate-500 font-mono">
                ({allCurrentBillItems.length} total items)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPrintThermalOpen(true)}
              disabled={allCurrentBillItems.length === 0}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#FAF8F5] border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition disabled:opacity-40 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Bill</span>
            </button>
          </div>

          {/* Section 1: Active Placed Orders in Kitchen */}
          {placedOrders.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-orange-600" />
                  Placed Orders ({placedOrders.length} in kitchen)
                </span>
                <span className="text-[10px] text-slate-500 font-bold">Live Tracking</span>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar">
                {placedOrders.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between p-2.5 bg-[#FAF8F5] border border-slate-200 rounded-xl text-xs"
                  >
                    <div className="flex-1 pr-2 truncate">
                      <div className="font-bold text-slate-900 truncate">
                        {it.qty}x {it.name}
                      </div>
                      <div className="text-[10px] text-slate-500">₹{it.price} each</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                          it.stage === 'READY'
                            ? 'bg-emerald-100 text-emerald-800'
                            : it.stage === 'PREP'
                            ? 'bg-blue-100 text-blue-800'
                            : it.stage === 'SERVED'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {it.stage}
                      </span>
                      <span className="w-14 text-right font-black font-mono text-slate-900">
                        ₹{it.price * it.qty}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Newly Added Items (Draft - Pending Punch) */}
          {draftItems.length > 0 && (
            <div className="space-y-2 border-t border-dashed border-slate-300 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-amber-900 flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5 text-amber-600" />
                  New Items to Place ({draftItems.length} draft)
                </span>
                <span className="text-[10px] text-amber-700 font-bold">Pending KOT Punch</span>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar">
                {draftItems.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between p-2.5 bg-amber-50/60 border border-amber-200 rounded-xl text-xs"
                  >
                    <div className="flex-1 pr-2 truncate">
                      <div className="font-bold text-slate-900 truncate">{it.name}</div>
                      <div className="text-[10px] text-slate-500">₹{it.price} each</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                        DRAFT
                      </span>
                      <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-1.5 py-0.5">
                        <button
                          type="button"
                          onClick={() => updateDraftItemQty(it.id, -1)}
                          className="text-slate-500 hover:text-black font-bold p-0.5 cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="font-mono font-bold px-1">{it.qty}</span>
                        <button
                          type="button"
                          onClick={() => updateDraftItemQty(it.id, 1)}
                          className="text-slate-500 hover:text-black font-bold p-0.5 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="w-14 text-right font-black font-mono text-slate-900">
                        ₹{it.price * it.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeDraftItem(it.id)}
                        className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Punch KOT to Kitchen Action Button */}
              <button
                type="button"
                onClick={handlePunchKotToKitchen}
                className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs mt-1"
              >
                <Send className="h-3.5 w-3.5" />
                <span>
                  Punch KOT to Kitchen ({draftItems.reduce((sum, it) => sum + it.qty, 0)} Items)
                </span>
              </button>
            </div>
          )}

          {/* Empty State When Neither Placed Nor Draft Items Exist */}
          {allCurrentBillItems.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-xs font-mono bg-[#FAF8F5] rounded-xl border border-dashed border-slate-300 space-y-1">
              <div>No active orders for {seatDisplayTitle}.</div>
              <div className="text-[11px] text-slate-400">
                Click <span className="font-bold text-slate-600">+ Add</span> on any dish from the Menu Catalog on the right to start an order.
              </div>
            </div>
          )}

          {/* Pricing Calculation Summary */}
          <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono">₹{subtotal}</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>GST (5%):</span>
              <span className="font-mono">₹{gst}</span>
            </div>

            <div className="flex items-center justify-between text-slate-900 font-black text-base border-t border-slate-300 pt-2">
              <span>Total Table Bill:</span>
              <span className="text-[#9C3D1E] font-mono text-xl">₹{grandTotal}</span>
            </div>
          </div>

          {/* Payment Method Selector & Settle Button */}
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'UPI', label: 'UPI / QR', icon: QrCode },
                { id: 'CASH', label: 'Cash Desk', icon: Banknote },
                { id: 'CARD', label: 'Card / EDC', icon: CreditCard },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition cursor-pointer ${
                      paymentMethod === m.id
                        ? 'border-[#9C3D1E] bg-orange-50 text-[#9C3D1E] shadow-xs'
                        : 'border-slate-200 bg-[#FAF8F5] text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {settledSuccess ? (
              <div className="w-full py-3 bg-emerald-600 text-white rounded-xl text-center font-bold text-xs flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>{seatDisplayTitle} Bill Settled Successfully! Printing Thermal Slip...</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSettle}
                disabled={allCurrentBillItems.length === 0}
                className="w-full py-3 bg-[#9C3D1E] text-white rounded-xl font-mono text-xs font-black uppercase tracking-wider shadow-xs hover:bg-orange-700 transition disabled:opacity-40 cursor-pointer"
              >
                Settle &amp; Close {seatDisplayTitle} ({paymentMethod} ₹{grandTotal})
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Authoritative Menu Catalog (Matching Customer & Waiter) (~40% / lg:col-span-5) */}
        <div className="lg:col-span-5 bg-white border border-[#EAE5DF] rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-[#9C3D1E]" />
              <h3 className="font-mono text-xs font-black uppercase text-slate-900 truncate">
                Menu Catalog (Direct Add to {isTakeaway ? 'Takeaway' : `#${activeSeat}`})
              </h3>
            </div>
          </div>

          {/* Search & Category filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search dishes..."
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-400"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {MENU_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-[#9C3D1E] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.title}
                </button>
              ))}
            </div>
          </div>

          {/* Dishes list */}
          <div className="space-y-1.5 max-h-96 overflow-y-auto no-scrollbar pt-1">
            {filteredDishes.map((dish) => {
              const draftItem = draftItems.find((it) => it.name === dish.title);
              const draftQty = draftItem ? draftItem.qty : 0;
              const hasDraft = draftQty > 0;

              return (
                <div
                  key={dish.id}
                  className={`flex items-center justify-between p-2 rounded-lg border transition select-none text-xs ${
                    hasDraft
                      ? 'bg-orange-50/70 border-[#9C3D1E] shadow-2xs'
                      : 'bg-[#FAF8F5] border-slate-200 hover:border-orange-400 hover:bg-orange-50/30'
                  }`}
                >
                  <div
                    onClick={() => {
                      if (!hasDraft) handleAddDirectItem(dish);
                    }}
                    className="pr-2 truncate flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          dish.isVegetarian ? 'bg-emerald-600' : 'bg-rose-600'
                        }`}
                      />
                      <span className="font-bold text-slate-900 block truncate">{dish.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono ml-3.5">₹{dish.price}</span>
                  </div>

                  {hasDraft ? (
                    <div className="flex items-center gap-1 bg-white border border-[#9C3D1E] rounded-lg px-1.5 py-0.5 shadow-2xs shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (draftItem) updateDraftItemQty(draftItem.id, -1);
                        }}
                        className="text-[#9C3D1E] hover:bg-orange-100 rounded p-1 font-black cursor-pointer transition"
                        title="Decrease"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="font-mono font-black text-xs text-[#9C3D1E] px-1.5 min-w-[18px] text-center">
                        {draftQty}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (draftItem) updateDraftItemQty(draftItem.id, 1);
                        }}
                        className="text-[#9C3D1E] hover:bg-orange-100 rounded p-1 font-black cursor-pointer transition"
                        title="Increase"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddDirectItem(dish);
                      }}
                      className="px-2.5 py-1 bg-[#9C3D1E] hover:bg-orange-700 text-white rounded-lg font-bold text-[10px] transition cursor-pointer shrink-0 shadow-2xs flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Thermal Slip Preview Dialog */}
      {printThermalOpen && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-black font-mono w-full max-w-sm rounded-xl p-5 space-y-3 shadow-xl">
            <div className="text-center space-y-1 border-b border-black/20 pb-2">
              <h3 className="font-black text-sm uppercase">THOOGUDEEPA DONNE BIRYANI MANE</h3>
              <p className="text-[10px]">Opposite Town Hall, Bengaluru</p>
              <p className="text-[10px]">GSTIN: 29AABCT1234F1Z0</p>
            </div>
            <div className="text-xs flex justify-between">
              <span>{isTakeaway ? 'Type: TAKEAWAY / PARCEL' : `Seat: #${activeSeat}`}</span>
              <span>Date: {new Date().toLocaleDateString('en-IN')}</span>
            </div>
            <div className="border-t border-b border-black/20 py-2 space-y-1 text-xs">
              {allCurrentBillItems.map((it, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>
                    {it.qty}x {it.name}
                  </span>
                  <span>₹{it.price * it.qty}</span>
                </div>
              ))}
            </div>
            <div className="text-xs space-y-1 pt-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>GST (5%):</span>
                <span>₹{gst}</span>
              </div>
              <div className="text-xs flex justify-between font-bold border-t border-black/20 pt-1">
                <span>Grand Total ({paymentMethod}):</span>
                <span>₹{grandTotal}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPrintThermalOpen(false)}
              className="w-full py-2 bg-black text-white text-xs font-bold rounded cursor-pointer mt-2"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}

      {/* 100-Seat Floor Matrix Modal */}
      {seatPickerModalOpen && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border-2 border-[#9C3D1E] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono text-slate-900">
            {/* Modal Header */}
            <div className="p-4 bg-[#FAF8F5] border-b border-[#EAE5DF] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#9C3D1E] text-white shadow-xs">
                  <Grid className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    Select Any Seat &bull; 100-Seat Restaurant Floor
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Click any seat (01 - 100) or Takeaway Parcel to view and settle
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSeatPickerModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filter Tabs & Quick Filter */}
            <div className="p-3 bg-white border-b border-[#EAE5DF] flex flex-wrap items-center justify-between gap-2">
              {/* Zone Filter Tabs + Takeaway Tab */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {[
                  { id: 'ALL', label: 'All 100' },
                  { id: 'TAKEAWAY', label: '📦 Takeaway' },
                  { id: 'Z1', label: 'Z1 (01-25)' },
                  { id: 'Z2', label: 'Z2 (26-50)' },
                  { id: 'Z3', label: 'Z3 (51-75)' },
                  { id: 'Z4', label: 'Z4 (76-100)' },
                ].map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => {
                      if (z.id === 'TAKEAWAY') {
                        handleSwitchSeat('TK-01');
                        setSeatPickerModalOpen(false);
                      } else {
                        setModalZoneFilter(z.id as any);
                      }
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                      modalZoneFilter === z.id
                        ? 'bg-[#9C3D1E] text-white shadow-xs'
                        : 'bg-[#FAF8F5] border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {z.label}
                  </button>
                ))}
              </div>

              {/* Search Seat Input */}
              <div className="relative">
                <Search className="h-3 w-3 absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter seat #..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-32 bg-[#FAF8F5] border border-slate-300 rounded pl-7 pr-2 py-1 text-xs font-mono text-slate-900 outline-none focus:ring-1 focus:ring-[#9C3D1E]"
                />
              </div>
            </div>

            {/* 100 Seats Grid */}
            <div className="p-4 overflow-y-auto max-h-[55vh]">
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {modalFilteredSeats.map((numStr) => {
                  const isSelected = activeSeat === numStr;
                  const hasOrder = liveOccupiedSeats.has(numStr);

                  return (
                    <button
                      key={numStr}
                      type="button"
                      onClick={() => {
                        handleSwitchSeat(numStr);
                        setSeatPickerModalOpen(false);
                      }}
                      className={`relative p-2.5 rounded-xl border flex flex-col items-center justify-center transition cursor-pointer ${
                        isSelected
                          ? 'border-[#9C3D1E] bg-[#9C3D1E] text-white font-black shadow-md scale-105 ring-2 ring-orange-300'
                          : hasOrder
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-100 font-bold'
                          : 'border-slate-200 bg-[#FAF8F5] text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-[10px] uppercase tracking-wider opacity-75">
                        Seat
                      </span>
                      <span className="text-sm font-black font-mono">
                        #{numStr}
                      </span>
                      {hasOrder && !isSelected && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-600 mt-0.5" />
                      )}
                      {isSelected && (
                        <span className="text-[9px] uppercase font-black text-amber-200 mt-0.5">
                          ACTIVE
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[#FAF8F5] border-t border-[#EAE5DF] flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#9C3D1E]" /> Active
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Has Bill
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-300" /> Vacant
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSeatPickerModalOpen(false)}
                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
