'use client';

import React, { useState, useMemo } from 'react';
import {
  Flame,
  Clock,
  Receipt,
  Printer,
  Share2,
  Search,
  Filter,
  CheckCheck,
  ChefHat,
  BellRing,
  PhoneCall,
  Droplets,
  Sparkles,
  Star,
} from 'lucide-react';
import { realtimeBridge, OrderRecord, OrderItemRecord, ServiceAlertRecord } from '@/lib/supabase';
import {
  SharedKDSTicket,
  SettledBillSnapshot,
  SharedPing,
  OrderStage,
} from '@/components/manager/types';

interface KitchenItemNotification {
  id: string;
  ticketId: string;
  itemId: string;
  tableNumber: string;
  chairNumber: number;
  itemName: string;
  quantity: number;
  options?: string;
  stage: OrderStage | string;
  timestamp: string;
  serverName: string;
}

interface ScreenM5KitchenSpeedProps {
  liveOrders?: { order: OrderRecord; items: OrderItemRecord[] }[];
  alerts?: ServiceAlertRecord[];
  onResolveAlert?: (id: string) => void;
}

export function ScreenM5KitchenSpeed({
  liveOrders = [],
  alerts = [],
  onResolveAlert,
}: ScreenM5KitchenSpeedProps) {
  const [activeTab, setActiveTab] = useState<'PLACED' | 'PAID'>('PLACED');
  const [placedFilter, setPlacedFilter] = useState<'ALL' | 'READY' | 'PREP' | 'PLACED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [settledBills, setSettledBills] = useState<SettledBillSnapshot[]>(() => {
    return realtimeBridge.getSettledBills ? realtimeBridge.getSettledBills() : [];
  });

  React.useEffect(() => {
    const updateBills = () => {
      if (realtimeBridge.getSettledBills) {
        setSettledBills(realtimeBridge.getSettledBills());
      }
    };
    updateBills();
    const unsub = realtimeBridge.subscribeKDS({
      onBillSettled: () => updateBills(),
      onClearAll: () => setSettledBills([]),
    });
    return () => unsub();
  }, []);

  // ── 1. Convert live orders strictly into SharedKDSTicket format (Zero Dummy Seeds) ──
  const liveTickets: SharedKDSTicket[] = useMemo(() => {
    return (liveOrders || []).map((lo, oIdx) => {
      const chairRaw = (lo.order.chair_id || '').trim();
      const isTk = chairRaw === 'TK-01' || chairRaw.toLowerCase().includes('takeaway') || chairRaw.toLowerCase().includes('parcel');
      const chairNum = parseInt(chairRaw.replace(/[^0-9]/g, ''), 10) || 1;
      const tableNum = isTk ? 0 : Math.ceil(chairNum / 4);
      const tNum = isTk ? 'TK-01' : `T-${String(tableNum).padStart(2, '0')}`;
      const orderIdPart = lo.order.id ? lo.order.id.slice(0, 4) : `${oIdx + 1}`;
      const elapsedMinutes = lo.order.created_at
        ? Math.max(1, Math.round((Date.now() - new Date(lo.order.created_at).getTime()) / 60000))
        : 1;
      return {
        id: lo.order.ticket_number || `KOT-${tNum}-${orderIdPart}`,
        tableNumber: tNum,
        serverName: isTk ? 'Takeaway Desk' : 'Floor Captain',
        timestamp: lo.order.created_at
          ? new Date(lo.order.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'Just now',
        elapsedMinutes,
        status: (lo.order.status as any) || 'NEW',
        items: (lo.items || []).map((it, iIdx) => ({
          id: it.id || `live-item-${chairNum}-${iIdx}`,
          name: it.dish_name,
          quantity: it.quantity,
          stage: it.stage || 'PLACED',
          prepMode: 'Standard',
          price: it.price,
          seatNumber: isTk ? 0 : chairNum,
        })),
        source: isTk ? 'WAITER' : 'CUSTOMER',
        seatNumber: isTk ? 0 : chairNum,
      };
    });
  }, [liveOrders]);

  // ── 2. Placed Orders: 100% Real Live Tickets ──
  const combinedPlacedOrders: SharedKDSTicket[] = liveTickets;

  // ── 3. Paid Orders: 100% Real Settled Bills ──
  const combinedPaidOrders: SettledBillSnapshot[] = settledBills;

  // ── 4. Customer Notifications: 100% Real Alerts ──
  const combinedCustomerPings: SharedPing[] = useMemo(() => {
    return (alerts || []).map((al) => {
      const chairRaw = (al.chairId || al.seatNumber || '').trim();
      const isTk = chairRaw === 'TK-01' || chairRaw.toLowerCase().includes('takeaway');
      const chairNum = parseInt(chairRaw.replace(/[^0-9]/g, ''), 10) || 1;
      const tableNum = isTk ? 0 : Math.ceil(chairNum / 4);
      return {
        id: al.id,
        tableNumber: isTk ? 'TK-01' : `T-${String(tableNum).padStart(2, '0')}`,
        seatNumber: isTk ? 0 : chairNum,
        type: al.type || 'WAITER',
        message: al.message || al.title || al.type,
        timestamp: al.timeAgo || (al.createdAt ? new Date(al.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'),
        status: al.isResolved ? 'RESOLVED' : 'PENDING',
        guestName: al.guestName || (isTk ? 'Takeaway Guest' : `Guest (Seat ${chairNum})`),
      };
    });
  }, [alerts]);

  // ── 5. Kitchen Item Notifications List ──
  const kitchenNotificationsList: KitchenItemNotification[] = useMemo(() => {
    const list: KitchenItemNotification[] = [];
    combinedPlacedOrders.forEach((tk) => {
      const defaultChair = tk.seatNumber || tk.items[0]?.seatNumber || 1;
      tk.items.forEach((it) => {
        list.push({
          id: `${tk.id}-${it.id}`,
          ticketId: tk.id,
          itemId: it.id,
          tableNumber: tk.tableNumber,
          chairNumber: it.seatNumber || defaultChair,
          itemName: it.name,
          quantity: it.quantity,
          options: it.options,
          stage: it.stage || 'PLACED',
          timestamp: tk.timestamp,
          serverName: tk.serverName,
        });
      });
    });
    return list;
  }, [combinedPlacedOrders]);

  // Filtered Placed Orders for Left Column
  const filteredPlaced = combinedPlacedOrders.filter((tk) => {
    const matchesSearch =
      tk.tableNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tk.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tk.items.some((it) => it.name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (placedFilter === 'READY') return tk.status === 'READY';
    if (placedFilter === 'PREP') return tk.status === 'PREP';
    if (placedFilter === 'PLACED') return tk.status === 'NEW';
    return true;
  });

  // Filtered Paid Orders for Left Column
  const filteredPaid = combinedPaidOrders.filter((bill) => {
    return (
      bill.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.method.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.items.some((it) => it.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  // Stage Badge Formatting: PLACED, RECEIVED, PREPARING, READY, SERVED
  const getStageBadge = (stage?: string, status?: string) => {
    const s = String(stage || status || '').toUpperCase().trim();
    if (s === 'SERVED') {
      return { text: 'SERVED', cls: 'bg-slate-100 text-slate-700 border-slate-300' };
    }
    if (s === 'READY' || s === 'PLATED') {
      return { text: 'READY', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    }
    if (s === 'PREPARING' || s === 'PREP' || s === 'COOKING') {
      return { text: 'PREPARING', cls: 'bg-amber-100 text-amber-800 border-amber-300' };
    }
    if (s === 'RECEIVED') {
      return { text: 'RECEIVED', cls: 'bg-blue-100 text-blue-800 border-blue-300' };
    }
    return { text: 'PLACED', cls: 'bg-orange-100 text-orange-800 border-orange-300' };
  };

  // Helper for Customer Ping Icon
  const getPingIcon = (type: string) => {
    const t = (type || '').toUpperCase();
    if (t.includes('WATER')) return <Droplets className="h-4 w-4 text-cyan-600" />;
    if (t.includes('BILL') || t.includes('PAY')) return <Receipt className="h-4 w-4 text-amber-600" />;
    if (t.includes('CLEAN')) return <Sparkles className="h-4 w-4 text-purple-600" />;
    if (t.includes('FEEDBACK') || t.includes('STAR'))
      return <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />;
    return <PhoneCall className="h-4 w-4 text-rose-600" />;
  };

  return (
    <div className="w-full mx-auto p-1 space-y-4 font-mono">
      {/* ── TOP TITLE HEADER BANNER ── */}
      <div className="bg-white border border-[#EAE5DF] rounded-xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#9C3D1E] text-white shadow-sm">
            <ChefHat className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-black uppercase tracking-wider text-orange-800 bg-orange-100 rounded px-1.5 py-0.5">
                KITCHEN &amp; NOTIFICATIONS
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-black font-mono text-slate-900 mt-1">
              Kitchen Orders and Customer Notifications
            </h1>
          </div>
        </div>
      </div>

      {/* ── 3-COLUMN SIDE-BY-SIDE LAYOUT (MATCHING SCREENSHOT) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ════════════════════════════════════════════════════════════════════
            SECTION 1: ORDERS SECTION (LEFT 6 COLS / ~50% WIDTH)
           ════════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-6 space-y-4">
          {/* Two Buttons: [ Placed orders ] and [ Paid orders ] */}
          <div className="grid grid-cols-2 gap-3">
            {/* Button 1: Placed orders */}
            <button
              onClick={() => {
                setActiveTab('PLACED');
                setSearchTerm('');
              }}
              className={`p-3.5 rounded-xl border-2 transition-all flex items-center justify-between text-left cursor-pointer active:scale-[0.99] ${
                activeTab === 'PLACED'
                  ? 'bg-[#9C3D1E] text-white border-[#9C3D1E] shadow-md ring-2 ring-[#9C3D1E]/40'
                  : 'bg-white text-slate-700 border-[#EAE5DF] hover:bg-[#FAF8F5]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`p-2 rounded-lg shrink-0 transition ${
                    activeTab === 'PLACED' ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  <Flame className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-black tracking-tight truncate">Placed orders</div>
                  <div
                    className={`text-[10px] truncate ${
                      activeTab === 'PLACED' ? 'text-white/70' : 'text-slate-400'
                    }`}
                  >
                    Active in queue
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 pl-1">
                <span
                  className={`text-xl font-black ${
                    activeTab === 'PLACED' ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {combinedPlacedOrders.length}
                </span>
              </div>
            </button>

            {/* Button 2: Paid orders */}
            <button
              onClick={() => {
                setActiveTab('PAID');
                setSearchTerm('');
              }}
              className={`p-3.5 rounded-xl border-2 transition-all flex items-center justify-between text-left cursor-pointer active:scale-[0.99] ${
                activeTab === 'PAID'
                  ? 'bg-[#9C3D1E] text-white border-[#9C3D1E] shadow-md ring-2 ring-[#9C3D1E]/40'
                  : 'bg-white text-slate-700 border-[#EAE5DF] hover:bg-[#FAF8F5]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`p-2 rounded-lg shrink-0 transition ${
                    activeTab === 'PAID' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  <Receipt className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-black tracking-tight truncate">Paid orders</div>
                  <div
                    className={`text-[10px] truncate ${
                      activeTab === 'PAID' ? 'text-white/70' : 'text-slate-400'
                    }`}
                  >
                    Settled bills
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 pl-1">
                <span
                  className={`text-xl font-black ${
                    activeTab === 'PAID' ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {combinedPaidOrders.length}
                </span>
              </div>
            </button>
          </div>

          {/* Search bar & Stage filters */}
          <div className="bg-white border border-[#EAE5DF] rounded-xl p-2.5 shadow-xs space-y-2">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={
                  activeTab === 'PLACED'
                    ? 'Search placed orders by table (e.g. T-04), dish name...'
                    : 'Search paid orders by invoice, table, method...'
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#FAF8F5] border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500"
              />
            </div>

            {activeTab === 'PLACED' && (
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs pt-1 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 mr-1 flex items-center gap-1 shrink-0">
                  <Filter className="h-3 w-3" />
                  <span>FILTER:</span>
                </span>
                {(['ALL', 'READY', 'PREP', 'PLACED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setPlacedFilter(st)}
                    className={`px-2 py-0.5 rounded-md font-bold transition text-[11px] shrink-0 cursor-pointer ${
                      placedFilter === st
                        ? 'bg-[#9C3D1E] text-white'
                        : 'bg-[#FAF8F5] text-slate-600 hover:bg-stone-200 border border-slate-200'
                    }`}
                  >
                    {st === 'ALL'
                      ? `All (${combinedPlacedOrders.length})`
                      : st === 'READY'
                      ? `Ready (${combinedPlacedOrders.filter((t) => t.status === 'READY').length})`
                      : st === 'PREP'
                      ? `Prep (${combinedPlacedOrders.filter((t) => t.status === 'PREP').length})`
                      : `Placed (${combinedPlacedOrders.filter((t) => t.status === 'NEW').length})`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2-Column Grid of Orders (Minimum 20 orders, Clean Overview) */}
          {activeTab === 'PLACED' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span className="font-bold">
                  Showing {filteredPlaced.length} Placed Orders
                </span>
                <span className="text-[10px] text-slate-400">Real-time active tickets</span>
              </div>

              {filteredPlaced.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[780px] overflow-y-auto pr-1">
                  {filteredPlaced.map((tk) => {
                    const chairNum = tk.seatNumber || tk.items[0]?.seatNumber || 1;
                    const overallStage = getStageBadge(undefined, tk.status);

                    return (
                      <div
                        key={tk.id}
                        className="p-3 rounded-xl border border-[#EAE5DF] bg-white shadow-xs flex flex-col justify-between hover:border-orange-300 transition"
                      >
                        <div>
                          {/* Ticket Header */}
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-black text-slate-900 text-xs sm:text-sm">
                                  Table {tk.tableNumber}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                  Chair {chairNum}
                                </span>
                              </div>
                              <div className="text-[9.5px] text-slate-400 font-bold mt-0.5">
                                {tk.id} • {tk.timestamp}
                              </div>
                            </div>

                            <span
                              className={`px-1.5 py-0.5 rounded text-[9.5px] font-black border ${overallStage.cls}`}
                            >
                              {overallStage.text}
                            </span>
                          </div>

                          {/* Items List (Read-Only Badges) */}
                          <div className="mt-2 space-y-1.5">
                            {tk.items.map((it, idx) => {
                              const itemBadge = getStageBadge(it.stage, tk.status);
                              return (
                                <div
                                  key={it.id || idx}
                                  className="p-1.5 rounded-lg bg-[#FAF8F5] border border-slate-200/80 flex items-center justify-between gap-1.5 text-xs"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-black text-orange-600 text-xs shrink-0">
                                        {it.quantity}x
                                      </span>
                                      <span className="font-bold text-slate-800 text-xs truncate">
                                        {it.name}
                                      </span>
                                    </div>
                                    {it.options && (
                                      <div className="text-[9.5px] text-slate-400 truncate">
                                        ({it.options})
                                      </div>
                                    )}
                                  </div>

                                  <span
                                    className={`text-[9px] font-black px-1.5 py-0.5 rounded border shrink-0 ${itemBadge.cls}`}
                                  >
                                    {itemBadge.text}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Clean Card Footer (No Buttons) */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 font-bold">
                            {tk.items.reduce((s, i) => s + i.quantity, 0)} Items Total
                          </span>
                          <span className="text-slate-400 font-medium">
                            Capt: <strong className="text-slate-700">{tk.serverName}</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-10 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200 space-y-1">
                  <ChefHat className="h-7 w-7 text-slate-300 mx-auto mb-1" />
                  <div className="font-bold text-xs text-slate-700">No Active Placed Orders in Kitchen</div>
                  <p className="text-[11px] text-slate-400">
                    Live orders placed from Customer QR, Waiter Mobile, or Cashier POS will appear here instantly.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Paid Orders 2-Column Grid */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span className="font-bold">
                  Showing {filteredPaid.length} Paid Orders
                </span>
                <span className="text-[10px] text-slate-400">Shift settled receipts</span>
              </div>

              {filteredPaid.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[780px] overflow-y-auto pr-1">
                  {filteredPaid.map((bill, idx) => {
                    const methodBadgeClass =
                      bill.method === 'UPI'
                        ? 'bg-purple-100 text-purple-900 border-purple-200'
                        : bill.method === 'CASH'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                        : 'bg-blue-100 text-blue-900 border-blue-200';

                    return (
                      <div
                        key={bill.invoiceNumber || idx}
                        className="p-3 rounded-xl border border-[#EAE5DF] bg-white shadow-xs flex flex-col justify-between hover:border-emerald-300 transition"
                      >
                        <div>
                          {/* Bill Header */}
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-black text-slate-900 text-xs sm:text-sm">
                                  Table {bill.tableName}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-slate-100 text-slate-700">
                                  {bill.seatLabel || 'Whole Table'}
                                </span>
                              </div>
                              <div className="text-[9.5px] text-slate-400 font-bold mt-0.5">
                                {bill.invoiceNumber} • {bill.formattedTime}
                              </div>
                            </div>

                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-0.5">
                              <CheckCheck className="h-3 w-3" />
                              <span>PAID</span>
                            </span>
                          </div>

                          {/* Items Breakdown */}
                          <div className="mt-2 space-y-1">
                            {bill.items.map((it, iIdx) => (
                              <div
                                key={it.id || iIdx}
                                className="p-1.5 rounded bg-[#FAF8F5] border border-slate-200/60 flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="font-black text-slate-900 shrink-0">
                                    {it.quantity}x
                                  </span>
                                  <span className="font-bold text-slate-800 truncate">
                                    {it.name}
                                  </span>
                                </div>
                                <span className="font-black text-slate-900 shrink-0">
                                  ₹ {it.totalPrice || it.price * it.quantity}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Financials & Method */}
                          <div className="mt-2 p-2 bg-[#FAF8F5] rounded-lg border border-slate-200 text-xs space-y-0.5">
                            <div className="flex justify-between text-slate-500 text-[10px]">
                              <span>Subtotal + GST:</span>
                              <span>
                                ₹ {bill.subtotal} + ₹ {bill.totalTax}
                              </span>
                            </div>
                            <div className="flex justify-between font-black text-slate-900 text-xs pt-1 border-t border-slate-200">
                              <span>TOTAL PAID:</span>
                              <span className="text-[#9C3D1E]">₹ {bill.grandTotal}.00</span>
                            </div>
                          </div>
                        </div>

                        {/* Footer Details */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${methodBadgeClass}`}
                          >
                            {bill.method}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => alert(`Thermal Tax Invoice Re-Printed for ${bill.invoiceNumber}`)}
                              className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-stone-100 text-slate-600 transition cursor-pointer"
                              title="Print Receipt"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => alert(`Digital receipt shared for ${bill.invoiceNumber}`)}
                              className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-stone-100 text-slate-600 transition cursor-pointer"
                              title="Share Receipt"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-10 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200 space-y-1">
                  <Receipt className="h-7 w-7 text-slate-300 mx-auto mb-1" />
                  <div className="font-bold text-xs text-slate-700">No Settled Bills for this Shift Yet</div>
                  <p className="text-[11px] text-slate-400">
                    Bills settled from POS Billing or Waiter will be logged here with complete receipts.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 2: KITCHEN NOTIFICATIONS (MIDDLE 3 COLS / ~25% WIDTH)
            Separated by vertical border line (lg:border-l lg:border-slate-200 lg:pl-5)
           ════════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-3 lg:border-l lg:border-slate-200 lg:pl-5 space-y-3">
          {/* Section Header */}
          <div className="bg-white border border-[#EAE5DF] rounded-xl p-3.5 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-100 text-orange-700">
                <ChefHat className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                  Kitchen Notifications
                </h2>
                <div className="text-[10px] text-slate-400 font-bold">
                  Table, Chair &amp; Item Live Stages
                </div>
              </div>
            </div>

            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-800 border border-orange-200">
              {kitchenNotificationsList.length}
            </span>
          </div>

          {/* Kitchen Notifications Scrollable Feed (Clean Overview, No Advance Button) */}
          <div className="space-y-2.5 max-h-[860px] overflow-y-auto pr-1">
            {kitchenNotificationsList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200 space-y-1">
                <ChefHat className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                <div className="font-bold text-xs text-slate-700">No Kitchen Notifications</div>
                <p className="text-[10px] text-slate-400">
                  Dishes placed in kitchen will stream their live status here.
                </p>
              </div>
            ) : (
              kitchenNotificationsList.map((notif) => {
                const stageBadge = getStageBadge(notif.stage);
                const isReady = notif.stage === 'PLATED';
                const isPrep = notif.stage === 'PREP';
                const isServed = notif.stage === 'SERVED';
                const isReceived = notif.stage === 'RECEIVED';
                const isTk = notif.tableNumber === 'TK-01' || String(notif.chairNumber) === '0';

                return (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-xl border bg-white shadow-2xs space-y-2 transition-all hover:shadow-xs ${
                      isReady
                        ? 'border-emerald-300 bg-emerald-50/20'
                        : isPrep
                        ? 'border-amber-300 bg-amber-50/20'
                        : isServed
                        ? 'border-slate-200 bg-slate-50/40 opacity-75'
                        : isReceived
                        ? 'border-blue-300 bg-blue-50/20'
                        : 'border-orange-200 bg-orange-50/20'
                    }`}
                  >
                    {/* Top row: Table No, Chair No, Time */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-slate-900 text-xs">
                          {isTk ? 'Takeaway Desk' : `Table ${notif.tableNumber}`}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9.5px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                          {isTk ? 'Parcel' : `Chair ${notif.chairNumber}`}
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{notif.timestamp}</span>
                      </span>
                    </div>

                    {/* Item Details: Quantity & Name */}
                    <div className="p-2 rounded-lg bg-[#FAF8F5] border border-slate-200/70">
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-black text-orange-600 text-xs shrink-0">
                              {notif.quantity}x
                            </span>
                            <span className="font-black text-slate-900 text-xs">
                              {notif.itemName}
                            </span>
                          </div>
                          {notif.options && (
                            <div className="text-[9.5px] text-slate-400 mt-0.5">
                              ({notif.options})
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom row: Live Status Badge & Server Info */}
                    <div className="flex items-center justify-between pt-1">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black border ${stageBadge.cls}`}
                      >
                        {stageBadge.text}
                      </span>

                      <span className="text-[9.5px] font-bold text-slate-400">
                        Pass: <strong className="text-slate-600">{notif.serverName}</strong>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            SECTION 3: CUSTOMER NOTIFICATIONS (RIGHT 3 COLS / ~25% WIDTH)
            Separated by vertical border line (lg:border-l lg:border-slate-200 lg:pl-5)
           ════════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-3 lg:border-l lg:border-slate-200 lg:pl-5 space-y-3">
          {/* Section Header */}
          <div className="bg-white border border-[#EAE5DF] rounded-xl p-3.5 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-100 text-red-700">
                <BellRing className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                  Customer Notifications
                </h2>
                <div className="text-[10px] text-slate-400 font-bold">
                  Guest Table &amp; Chair Requests
                </div>
              </div>
            </div>

            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800 border border-red-200">
              {combinedCustomerPings.length}
            </span>
          </div>

          {/* Customer Notifications Scrollable Feed */}
          <div className="space-y-2.5 max-h-[860px] overflow-y-auto pr-1">
            {combinedCustomerPings.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200 space-y-1">
                <BellRing className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                <div className="font-bold text-xs text-slate-700">No Active Customer Notifications</div>
                <p className="text-[10px] text-slate-400">
                  Guest service calls (Water, Waiter, Bill) will ping here instantly.
                </p>
              </div>
            ) : (
              combinedCustomerPings.map((ping) => {
                const isResolved = ping.status === 'RESOLVED';
                const isPending = ping.status === 'PENDING';
                const isTk = ping.tableNumber === 'TK-01' || ping.seatNumber === 0;

                return (
                  <div
                    key={ping.id}
                    className={`p-3 rounded-xl border bg-white shadow-2xs space-y-2 transition-all hover:shadow-xs ${
                      isResolved
                        ? 'border-slate-200 bg-slate-50/50 opacity-70'
                        : isPending
                        ? 'border-red-200 bg-red-50/15'
                        : 'border-blue-200 bg-blue-50/15'
                    }`}
                  >
                    {/* Top row: Icon, Table, Chair, Time */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="p-1 rounded-md bg-[#FAF8F5] border border-slate-200 shrink-0">
                          {getPingIcon(ping.type)}
                        </div>
                        <span className="font-black text-slate-900 text-xs">
                          {isTk ? 'Takeaway Desk' : `Table ${ping.tableNumber}`}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9.5px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                          {isTk
                            ? 'Parcel'
                            : typeof ping.seatNumber === 'number'
                            ? `Chair ${ping.seatNumber}`
                            : 'Table'}
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-400 font-bold">
                        {ping.timestamp}
                      </span>
                    </div>

                    {/* Message & Type */}
                    <div className="p-2 rounded-lg bg-[#FAF8F5] border border-slate-200/70">
                      <div className="flex items-center justify-between gap-1 text-[11px]">
                        <span className="font-black text-slate-800 uppercase text-[10px]">
                          {ping.type} REQUEST
                        </span>
                        <span className="text-[9.5px] text-slate-400">
                          {ping.guestName || 'Guest'}
                        </span>
                      </div>
                      {ping.message && (
                        <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                          {ping.message}
                        </p>
                      )}
                    </div>

                    {/* Bottom row: Live Status badge */}
                    <div className="flex items-center justify-between pt-1">
                      <span
                        className={`px-2 py-0.5 rounded text-[9.5px] font-black border ${
                          isResolved
                            ? 'bg-slate-100 text-slate-600 border-slate-300'
                            : isPending
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-blue-100 text-blue-800 border-blue-300'
                        }`}
                      >
                        {ping.status}
                      </span>

                      <span className="text-[9.5px] font-bold text-slate-400">
                        {isResolved ? 'Resolved by Waiter' : 'Awaiting Floor Server'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
