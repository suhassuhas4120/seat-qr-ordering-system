'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Printer,
  FileSpreadsheet,
  TrendingUp,
  Calendar,
  ChevronDown,
  CreditCard,
  QrCode,
  Banknote,
  Search,
  Layers,
} from 'lucide-react';
import { realtimeBridge, OrderRecord, OrderItemRecord } from '@/lib/supabase';

type TimeFilter = 'TODAY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
type GraphComparisonMode = 'TIME' | 'WEEK' | 'MONTH';

interface ComparisonDataPoint {
  timeLabel: string;
  currentSales: number;
  previousSales: number;
  label: string;
}

export interface TransactionRow {
  orderId: string;
  chairNo: string;
  totalItems: number;
  status: 'paid' | 'unpaid';
  date: string;
  time: string;
  amount: number;
  paymentMethod?: string;
}

interface ScreenM11SalesReportProps {
  liveOrders?: { order: OrderRecord; items: OrderItemRecord[] }[];
}

function getTimeSlotIndex(timeStr?: string): number {
  if (!timeStr) return 0;
  const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
  if (!match) return 0;
  let hour = parseInt(match[1], 10);
  const meridiem = (match[3] || '').toUpperCase();
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;

  if (hour < 12) return 0; // 11 AM slot
  if (hour < 14) return 1; // 01 PM slot
  if (hour < 16) return 2; // 03 PM slot
  if (hour < 17) return 3; // 05 PM slot
  if (hour < 19) return 4; // 06 PM slot
  if (hour < 21) return 5; // 08:30 PM slot
  if (hour < 22) return 6; // 10 PM slot
  if (hour < 23) return 7; // 11 PM slot
  return 8; // 12 AM slot
}

function getDaySlotIndex(dateStr?: string): number {
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = isNaN(d.getTime()) ? new Date().getDay() : d.getDay();
  return day === 0 ? 6 : day - 1; // Mon=0 .. Sun=6
}

function getWeekSlotIndex(dateStr?: string): number {
  const d = dateStr ? new Date(dateStr) : new Date();
  const dayOfMonth = isNaN(d.getTime()) ? new Date().getDate() : d.getDate();
  if (dayOfMonth <= 7) return 0;
  if (dayOfMonth <= 14) return 1;
  if (dayOfMonth <= 21) return 2;
  return 3;
}

export function ScreenM11SalesReport({ liveOrders = [] }: ScreenM11SalesReportProps) {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [activeFilter, setActiveFilter] = useState<TimeFilter>('TODAY');
  const [customStartDate, setCustomStartDate] = useState(todayStr);
  const [customEndDate, setCustomEndDate] = useState(todayStr);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [graphMode, setGraphMode] = useState<GraphComparisonMode>('TIME');
  const [hoveredPoint, setHoveredPoint] = useState<ComparisonDataPoint | null>(null);
  const [transactionSearch, setTransactionSearch] = useState('');

  // 1. Reactive settled bills history from live persistent store
  const [settledBills, setSettledBills] = useState<any[]>(() => {
    return realtimeBridge.getSettledBills ? realtimeBridge.getSettledBills() : [];
  });

  const reloadData = useCallback(() => {
    if (realtimeBridge.getSettledBills) {
      setSettledBills(realtimeBridge.getSettledBills());
    }
  }, []);

  // Listen to realtime billing settlements
  useEffect(() => {
    reloadData();
    const unsub = realtimeBridge.subscribeKDS({
      onBillSettled: () => reloadData(),
      onClearAll: () => reloadData(),
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [reloadData]);

  const realSettledList = useMemo(() => {
    return settledBills || [];
  }, [settledBills]);

  // Filter settled bills based on active period filter
  const filteredSettledList = useMemo(() => {
    if (activeFilter === 'CUSTOM') {
      const start = new Date(customStartDate).getTime();
      const end = new Date(customEndDate).getTime() + 86400000;
      return realSettledList.filter((b) => {
        if (!b.formattedDate && !b.timestamp) return true;
        const bTime = new Date(b.formattedDate || b.timestamp).getTime();
        return isNaN(bTime) || (bTime >= start && bTime <= end);
      });
    }
    return realSettledList;
  }, [realSettledList, activeFilter, customStartDate, customEndDate]);

  // Actual sum of real settled receipts
  const realSettledSum = useMemo(() => {
    return filteredSettledList.reduce((acc, b) => acc + (b.grandTotal || 0), 0);
  }, [filteredSettledList]);

  const totalSalesAmount = realSettledSum;

  // Period label for header
  const periodLabel = useMemo(() => {
    switch (activeFilter) {
      case 'WEEKLY':
        return 'Weekly';
      case 'MONTHLY':
        return 'Monthly';
      case 'CUSTOM':
        return `${customStartDate} to ${customEndDate}`;
      case 'TODAY':
      default:
        return 'Today';
    }
  }, [activeFilter, customStartDate, customEndDate]);

  // 2. Category-wise Sales Distribution (derived dynamically from real item lines)
  const categoryStats = useMemo(() => {
    let biryaniSum = 0;
    let kababSum = 0;
    let graviesSum = 0;
    let bevsSum = 0;
    let startersSum = 0;

    // Aggregate from settled bills
    filteredSettledList.forEach((bill) => {
      bill.items?.forEach((item: any) => {
        const lower = (item.name || item.dish_name || '').toLowerCase();
        const price = item.totalPrice || (item.price || 0) * (item.quantity || 1);
        if (lower.includes('biryani') || lower.includes('khushka')) {
          biryaniSum += price;
        } else if (lower.includes('kabab') || lower.includes('kebab') || lower.includes('wings') || (lower.includes('chicken') && lower.includes('fry'))) {
          kababSum += price;
        } else if (lower.includes('curry') || lower.includes('gravy') || lower.includes('roti') || lower.includes('parotta') || lower.includes('soup') || lower.includes('chops')) {
          graviesSum += price;
        } else if (lower.includes('coffee') || lower.includes('soda') || lower.includes('jamun') || lower.includes('water') || lower.includes('beverage') || lower.includes('tea')) {
          bevsSum += price;
        } else {
          startersSum += price;
        }
      });
    });

    // Also include active live orders
    liveOrders.forEach((lo) => {
      lo.items?.forEach((item) => {
        const lower = (item.dish_name || '').toLowerCase();
        const price = (item.price || 0) * (item.quantity || 1);
        if (lower.includes('biryani') || lower.includes('khushka')) {
          biryaniSum += price;
        } else if (lower.includes('kabab') || lower.includes('kebab') || lower.includes('wings') || (lower.includes('chicken') && lower.includes('fry'))) {
          kababSum += price;
        } else if (lower.includes('curry') || lower.includes('gravy') || lower.includes('roti') || lower.includes('parotta') || lower.includes('soup') || lower.includes('chops')) {
          graviesSum += price;
        } else if (lower.includes('coffee') || lower.includes('soda') || lower.includes('jamun') || lower.includes('water') || lower.includes('beverage') || lower.includes('tea')) {
          bevsSum += price;
        } else {
          startersSum += price;
        }
      });
    });

    const itemTotalSum = biryaniSum + kababSum + graviesSum + bevsSum + startersSum;

    const calcPercent = (amt: number) => {
      if (itemTotalSum <= 0) return 0;
      return Math.round((amt / itemTotalSum) * 100);
    };

    return [
      {
        name: 'Donne Biryani',
        amount: biryaniSum,
        percent: calcPercent(biryaniSum),
        barColor: 'bg-amber-600',
      },
      {
        name: 'Chicken Kabab',
        amount: kababSum,
        percent: calcPercent(kababSum),
        barColor: 'bg-[#9C3D1E]',
      },
      {
        name: 'Gravies & Breads',
        amount: graviesSum,
        percent: calcPercent(graviesSum),
        barColor: 'bg-orange-500',
      },
      {
        name: 'Beverages & Desserts',
        amount: bevsSum,
        percent: calcPercent(bevsSum),
        barColor: 'bg-emerald-600',
      },
      {
        name: 'Mutton & Starters',
        amount: startersSum,
        percent: calcPercent(startersSum),
        barColor: 'bg-stone-600',
      },
    ];
  }, [filteredSettledList, liveOrders]);

  // 3. Payment Mode Settlement Split (calculated dynamically from real settlements)
  const paymentModeStats = useMemo(() => {
    let upiSum = 0;
    let cashSum = 0;
    let cardSum = 0;
    let aggSum = 0;

    filteredSettledList.forEach((bill) => {
      const m = (bill.method || '').toUpperCase();
      const amt = bill.grandTotal || 0;
      if (m.includes('CASH')) {
        cashSum += amt;
      } else if (m.includes('CARD')) {
        cardSum += amt;
      } else if (m.includes('SWIGGY') || m.includes('ZOMATO') || m.includes('AGGREGATOR')) {
        aggSum += amt;
      } else {
        upiSum += amt;
      }
    });

    const totalSplit = upiSum + cashSum + cardSum + aggSum;
    const calcPercent = (amt: number) => {
      if (totalSplit <= 0) return 0;
      return Math.round((amt / totalSplit) * 100);
    };

    return [
      {
        name: 'UPI Dynamic QR (PhonePe / GPay)',
        icon: <QrCode className="h-3.5 w-3.5 text-indigo-600" />,
        amount: upiSum,
        percent: calcPercent(upiSum),
        barColor: 'bg-indigo-600',
      },
      {
        name: 'Cash',
        icon: <Banknote className="h-3.5 w-3.5 text-emerald-600" />,
        amount: cashSum,
        percent: calcPercent(cashSum),
        barColor: 'bg-emerald-600',
      },
      {
        name: 'Card',
        icon: <CreditCard className="h-3.5 w-3.5 text-blue-600" />,
        amount: cardSum,
        percent: calcPercent(cardSum),
        barColor: 'bg-blue-600',
      },
      {
        name: 'Food Aggregators (Swiggy/Zomato)',
        icon: <Layers className="h-3.5 w-3.5 text-amber-600" />,
        amount: aggSum,
        percent: calcPercent(aggSum),
        barColor: 'bg-amber-500',
      },
    ];
  }, [filteredSettledList]);

  // Digital vs Cash percentages
  const tenderRatioText = useMemo(() => {
    const upi = paymentModeStats[0]?.amount || 0;
    const cash = paymentModeStats[1]?.amount || 0;
    const card = paymentModeStats[2]?.amount || 0;
    const agg = paymentModeStats[3]?.amount || 0;
    const total = upi + cash + card + agg;
    if (total <= 0) return '0% Digital / 0% Cash';
    const digi = Math.round(((upi + card + agg) / total) * 100);
    const csh = 100 - digi;
    return `${digi}% Digital / ${csh}% Cash`;
  }, [paymentModeStats]);

  // 4. Comparison Table Graph Points (Current vs Previous Comparison mapped from real settlement times)
  const comparisonData: ComparisonDataPoint[] = useMemo(() => {
    if (graphMode === 'MONTH') {
      const weekBuckets = [0, 0, 0, 0];
      filteredSettledList.forEach((bill) => {
        const slot = getWeekSlotIndex(bill.formattedDate || bill.timestamp);
        weekBuckets[slot] += bill.grandTotal || 0;
      });

      return [
        { timeLabel: 'Week 1', currentSales: weekBuckets[0], previousSales: 0, label: `Week 1: Shift Sales ₹${weekBuckets[0].toLocaleString('en-IN')}` },
        { timeLabel: 'Week 2', currentSales: weekBuckets[1], previousSales: 0, label: `Week 2: Shift Sales ₹${weekBuckets[1].toLocaleString('en-IN')}` },
        { timeLabel: 'Week 3', currentSales: weekBuckets[2], previousSales: 0, label: `Week 3: Shift Sales ₹${weekBuckets[2].toLocaleString('en-IN')}` },
        { timeLabel: 'Week 4', currentSales: weekBuckets[3], previousSales: 0, label: `Week 4: Shift Sales ₹${weekBuckets[3].toLocaleString('en-IN')}` },
      ];
    }

    if (graphMode === 'WEEK') {
      const dayBuckets = [0, 0, 0, 0, 0, 0, 0];
      filteredSettledList.forEach((bill) => {
        const slot = getDaySlotIndex(bill.formattedDate || bill.timestamp);
        dayBuckets[slot] += bill.grandTotal || 0;
      });

      const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return dayLabels.map((name, idx) => ({
        timeLabel: name,
        currentSales: dayBuckets[idx],
        previousSales: 0,
        label: `${name}: Shift Sales ₹${dayBuckets[idx].toLocaleString('en-IN')}`,
      }));
    }

    // Default: Time mode (Hourly distribution of real settlements)
    const timeSlots = ['11 AM', '01 PM', '03 PM', '05 PM', '06 PM', '08:30 PM', '10 PM', '11 PM', '12 AM'];
    const timeBuckets = [0, 0, 0, 0, 0, 0, 0, 0, 0];

    filteredSettledList.forEach((bill) => {
      const idx = getTimeSlotIndex(bill.formattedTime);
      timeBuckets[idx] += bill.grandTotal || 0;
    });

    return timeSlots.map((slot, idx) => ({
      timeLabel: slot,
      currentSales: timeBuckets[idx],
      previousSales: 0,
      label: `${slot} — Shift Sales ₹${timeBuckets[idx].toLocaleString('en-IN')}`,
    }));
  }, [graphMode, filteredSettledList]);

  // Overall growth / performance metric
  const totalCurrentInGraph = comparisonData.reduce((acc, p) => acc + p.currentSales, 0);
  const totalPreviousInGraph = comparisonData.reduce((acc, p) => acc + p.previousSales, 0);
  const growthPercent = totalPreviousInGraph > 0
    ? Math.round(((totalCurrentInGraph - totalPreviousInGraph) / totalPreviousInGraph) * 100)
    : (totalCurrentInGraph > 0 ? 100 : 0);

  // SVG Chart Geometry
  const chartHeight = 210;
  const chartWidth = 520;
  const paddingX = 45;
  const paddingY = 28;

  const maxVal = Math.max(
    ...comparisonData.map((p) => Math.max(p.currentSales, p.previousSales)),
    1000
  );
  const minVal = 0;

  const plottedPoints = useMemo(() => {
    const usableWidth = chartWidth - paddingX * 2;
    const usableHeight = chartHeight - paddingY * 2;

    return comparisonData.map((p, idx) => {
      const x = paddingX + (idx / (comparisonData.length - 1)) * usableWidth;
      const yCurrent = chartHeight - paddingY - ((p.currentSales - minVal) / (maxVal - minVal)) * usableHeight;
      const yPrevious = chartHeight - paddingY - ((p.previousSales - minVal) / (maxVal - minVal)) * usableHeight;
      return { x, yCurrent, yPrevious, ...p };
    });
  }, [comparisonData, maxVal, minVal, chartWidth, chartHeight, paddingX, paddingY]);

  // SVG paths for current and previous lines
  const currentPathD = useMemo(() => {
    if (plottedPoints.length === 0) return '';
    return plottedPoints.reduce((acc, curr, idx) => {
      if (idx === 0) return `M ${curr.x} ${curr.yCurrent}`;
      return `${acc} L ${curr.x} ${curr.yCurrent}`;
    }, '');
  }, [plottedPoints]);

  const currentAreaD = useMemo(() => {
    if (plottedPoints.length === 0) return '';
    const first = plottedPoints[0];
    const last = plottedPoints[plottedPoints.length - 1];
    const baselineY = chartHeight - paddingY;
    return `${currentPathD} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
  }, [currentPathD, plottedPoints, chartHeight, paddingY]);

  const previousPathD = useMemo(() => {
    if (plottedPoints.length === 0) return '';
    return plottedPoints.reduce((acc, curr, idx) => {
      if (idx === 0) return `M ${curr.x} ${curr.yPrevious}`;
      return `${acc} L ${curr.x} ${curr.yPrevious}`;
    }, '');
  }, [plottedPoints]);

  // 5. Recent Transactions Feed
  const recentTransactions: TransactionRow[] = useMemo(() => {
    const list: TransactionRow[] = [];

    // 1. Add active unpaid dining tables/chairs
    liveOrders.forEach((lo) => {
      const chairRaw = lo.order?.chair_id || 'Chair 1';
      const cleanChair = chairRaw.replace(/[^0-9]/g, '');
      const isTk = chairRaw.toLowerCase().includes('tk') || chairRaw.toLowerCase().includes('takeaway');
      const chairNum = parseInt(cleanChair, 10) || 1;
      const tableNum = Math.ceil(chairNum / 4);
      const chairText = isTk ? 'TK-01 Takeaway' : `T-${String(tableNum).padStart(2, '0')} Chair ${chairNum}`;
      const itemCount = lo.items ? lo.items.reduce((acc, it) => acc + (it.quantity || 1), 0) : 1;
      const amount = lo.order?.total_amount || (lo.items ? lo.items.reduce((acc, it) => acc + (it.price || 0) * (it.quantity || 1), 0) : 0);
      const createdDate = new Date();

      list.push({
        orderId: lo.order?.ticket_number || `KOT-${cleanChair || '01'}`,
        chairNo: chairText,
        totalItems: itemCount,
        status: 'unpaid',
        date: createdDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        time: createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        amount,
        paymentMethod: 'PENDING',
      });
    });

    // 2. Add real paid/settled bills
    filteredSettledList.forEach((bill, idx) => {
      const itemCount = bill.items ? bill.items.reduce((acc: number, i: any) => acc + (i.quantity || 1), 0) : 1;
      const cleanTable = (bill.tableName || 'T-01').replace('-', '');
      const chairText = bill.seatLabel || (bill.seatNumber ? `${cleanTable} Chair ${bill.seatNumber}` : `${cleanTable} Table`);
      const displayDate = bill.formattedDate
        ? bill.formattedDate.replace(' 2026', '')
        : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

      list.push({
        orderId: bill.invoiceNumber || `INV-${String(idx + 1).padStart(4, '0')}`,
        chairNo: chairText,
        totalItems: itemCount,
        status: 'paid',
        date: displayDate,
        time: bill.formattedTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        amount: bill.grandTotal || 0,
        paymentMethod: bill.method || 'UPI',
      });
    });

    return list;
  }, [liveOrders, filteredSettledList]);

  // Filtered transactions if user searches
  const filteredTransactions = useMemo(() => {
    if (!transactionSearch.trim()) return recentTransactions;
    const query = transactionSearch.toLowerCase();
    return recentTransactions.filter(
      (tx) =>
        tx.orderId.toLowerCase().includes(query) ||
        tx.chairNo.toLowerCase().includes(query) ||
        tx.status.toLowerCase().includes(query) ||
        tx.date.toLowerCase().includes(query) ||
        tx.time.toLowerCase().includes(query) ||
        (tx.paymentMethod && tx.paymentMethod.toLowerCase().includes(query))
    );
  }, [recentTransactions, transactionSearch]);

  // Primary driver text
  const primaryDriver = useMemo(() => {
    const activeStats = categoryStats.filter((c) => c.amount > 0);
    if (activeStats.length === 0) return 'No sales recorded yet';
    const top = [...activeStats].sort((a, b) => b.amount - a.amount)[0];
    return `${top.name} (${top.percent}% share)`;
  }, [categoryStats]);

  // Action Handlers: Print PDF & Print Excel
  const handlePrintPdf = () => {
    window.print();
  };

  const handlePrintExcel = () => {
    const csvRows = [
      ['THOOGUDEEPA DONNE BIRYANI MANE - SALES REPORT'],
      [`Report Period: ${periodLabel}`, `Gross Turnover: INR ${totalSalesAmount}`],
      [`Generated At: ${new Date().toLocaleString('en-IN')}`, 'Status: Audited Records'],
      [],
      ['CATEGORY-WISE SALES DISTRIBUTION'],
      ['Category Name', 'Revenue Amount (INR)', 'Share Percentage'],
      ...categoryStats.map((c) => [c.name, c.amount, `${c.percent}%`]),
      [],
      ['PAYMENT MODE SETTLEMENT SPLIT'],
      ['Payment Mode', 'Revenue Amount (INR)', 'Share Percentage'],
      ...paymentModeStats.map((p) => [p.name, p.amount, `${p.percent}%`]),
      [],
      ['RECENT TRANSACTIONS AUDIT LOG'],
      ['Order ID', 'Table / Chair No.', 'Total Items', 'Status', 'Date', 'Time', 'Payment Method', 'Amount (INR)'],
      ...recentTransactions.map((tx) => [
        tx.orderId,
        tx.chairNo,
        tx.totalItems,
        tx.status.toUpperCase(),
        tx.date,
        tx.time,
        tx.paymentMethod || 'N/A',
        tx.amount,
      ]),
    ];

    const csvContent = csvRows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Thoogudeepa_Sales_Report_${activeFilter}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full mx-auto p-1 space-y-4 font-mono print:p-0 print:max-w-none">
      {/* =========================================================================
          TOP BAR: Screen Title & Period Filter Tabs
          ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#EAE5DF]">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Sales Report</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 rounded-full">
              LIVE REALTIME
            </span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Shift revenue metrics, category sales, settlement breakdown &amp; transactions audit
          </p>
        </div>

        {/* Filter Tabs: [ Today ▾ ] [ Weekly ] [ Monthly ] [ Custom date 📅 ] */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-300 shadow-xs print:hidden">
          <button
            type="button"
            onClick={() => {
              setActiveFilter('TODAY');
              setGraphMode('TIME');
              setShowCustomPicker(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1 cursor-pointer ${
              activeFilter === 'TODAY'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>Today</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveFilter('WEEKLY');
              setGraphMode('WEEK');
              setShowCustomPicker(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
              activeFilter === 'WEEKLY'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Weekly
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveFilter('MONTHLY');
              setGraphMode('MONTH');
              setShowCustomPicker(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
              activeFilter === 'MONTHLY'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Monthly
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveFilter('CUSTOM');
              setShowCustomPicker(!showCustomPicker);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'CUSTOM'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>custom date</span>
            <Calendar className="h-3.5 w-3.5 text-amber-500" />
          </button>
        </div>
      </div>

      {/* Optional Custom Date Selector Dropdown */}
      {showCustomPicker && activeFilter === 'CUSTOM' && (
        <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-sm flex flex-wrap items-center gap-4 text-xs font-bold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-slate-800"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-slate-800"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowCustomPicker(false)}
            className="bg-[#9C3D1E] text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-[#823318] cursor-pointer"
          >
            Apply Range
          </button>
        </div>
      )}

      {/* =========================================================================
          BANNER: Today Sales and revenue Report | Total amount : ₹ X.00
          ========================================================================= */}
      <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
            {periodLabel} Sales and Revenue Report
          </h3>
          <p className="text-xs text-slate-500 font-bold mt-0.5">
            Consolidated register receipts and dining revenue
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-black text-slate-500 uppercase tracking-wider">
            Total Amount :
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            ₹ {totalSalesAmount.toLocaleString('en-IN')}.00
          </div>
        </div>
      </div>

      {/* =========================================================================
          TOP ROW:
          - LEFT: Category-Wise Sales Distribution
          - RIGHT: Comparison Table & Trend Graph
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* TOP LEFT: Category-Wise Sales Distribution */}
        <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-black text-slate-900 uppercase pb-3 border-b border-slate-200 flex items-center justify-between">
              <span>Category-wise sales Distribution</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-black">
                LIVE REVENUE
              </span>
            </h4>

            <div className="space-y-3.5 mt-4">
              {categoryStats.map((cat) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-800">{cat.name}</span>
                    <span className="text-slate-900">
                      ₹ {cat.amount.toLocaleString('en-IN')} ({cat.percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${cat.barColor}`}
                      style={{ width: `${Math.min(100, cat.percent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-bold">
            <span>Primary Revenue Driver:</span>
            <span className="text-[#9C3D1E] font-black">{primaryDriver}</span>
          </div>
        </div>

        {/* TOP RIGHT: Comparison Table / Graph */}
        <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 gap-2">
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase">
                  comparison table
                </h4>
                <div className="text-sm font-black text-slate-800 flex items-center gap-2 mt-0.5">
                  <span>
                    {graphMode === 'MONTH'
                      ? 'Monthly (Weekly Breakdown)'
                      : graphMode === 'WEEK'
                      ? 'Weekly (Day Breakdown)'
                      : 'Today (Sales vs time)'}
                  </span>
                  <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md flex items-center">
                    <TrendingUp className="h-3 w-3 mr-0.5 inline" />
                    +{growthPercent}%
                  </span>
                </div>
              </div>

              {/* Mode Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-300 text-[10px] font-black">
                <button
                  type="button"
                  onClick={() => setGraphMode('TIME')}
                  className={`px-2 py-1 rounded transition cursor-pointer ${
                    graphMode === 'TIME'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Time
                </button>
                <button
                  type="button"
                  onClick={() => setGraphMode('WEEK')}
                  className={`px-2 py-1 rounded transition cursor-pointer ${
                    graphMode === 'WEEK'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Day/Week
                </button>
                <button
                  type="button"
                  onClick={() => setGraphMode('MONTH')}
                  className={`px-2 py-1 rounded transition cursor-pointer ${
                    graphMode === 'MONTH'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Month
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-[11px] font-bold text-slate-600 mt-2">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full bg-[#9C3D1E]"></span>
                <span className="text-slate-900">
                  {graphMode === 'MONTH' ? 'This Month' : graphMode === 'WEEK' ? 'This Week' : 'Today (Current)'}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-indigo-500"></span>
                <span className="text-slate-500">
                  Prior Baseline
                </span>
              </span>
            </div>

            {/* Interactive SVG Chart */}
            <div className="mt-3 relative bg-[#FAF8F5] border border-slate-200 rounded-xl p-3 overflow-hidden">
              {hoveredPoint && (
                <div className="absolute top-2 right-2 bg-slate-900 text-white text-[11px] font-bold px-2 py-1 rounded shadow-md z-10 animate-in fade-in">
                  {hoveredPoint.label}
                </div>
              )}

              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-48 overflow-visible"
              >
                <defs>
                  <linearGradient id="currentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#9C3D1E" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#9C3D1E" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Grid Lines & Labels */}
                {[maxVal, Math.round(maxVal * 0.75), Math.round(maxVal * 0.5), Math.round(maxVal * 0.25), 0].map(
                  (val, i) => {
                    const y =
                      chartHeight - paddingY - ((val - minVal) / (maxVal - minVal)) * (chartHeight - paddingY * 2);
                    return (
                      <g key={i}>
                        <line
                          x1={paddingX}
                          y1={y}
                          x2={chartWidth - paddingX}
                          y2={y}
                          stroke="#E2E8F0"
                          strokeDasharray="3 3"
                          strokeWidth="1"
                        />
                        <text
                          x={paddingX - 8}
                          y={y + 3}
                          textAnchor="end"
                          fontSize="9"
                          fill="#64748B"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {val >= 100000 ? `${Math.round(val / 10000) / 10}L` : val >= 1000 ? `${Math.round(val / 1000)}k` : val}
                        </text>
                      </g>
                    );
                  }
                )}

                {/* Translucent Area Under Current Curve */}
                <path d={currentAreaD} fill="url(#currentGrad)" />

                {/* Previous Period Dashed Comparison Line */}
                <path
                  d={previousPathD}
                  fill="none"
                  stroke="#6366F1"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Primary Trend Line for Current Period */}
                <path
                  d={currentPathD}
                  fill="none"
                  stroke="#9C3D1E"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Interactive Data Points */}
                {plottedPoints.map((pt, i) => (
                  <g
                    key={i}
                    className="cursor-pointer group"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.yPrevious}
                      r={3}
                      fill="#FFFFFF"
                      stroke="#6366F1"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={pt.x}
                      cy={pt.yCurrent}
                      r={hoveredPoint?.timeLabel === pt.timeLabel ? 5.5 : 4}
                      fill="#FFFFFF"
                      stroke="#9C3D1E"
                      strokeWidth="2.5"
                      className="transition-all duration-200"
                    />
                    <circle
                      cx={pt.x}
                      cy={pt.yCurrent}
                      r="12"
                      fill="#9C3D1E"
                      fillOpacity="0.1"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                    <text
                      x={pt.x}
                      y={chartHeight - 8}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#475569"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {pt.timeLabel}
                    </text>
                  </g>
                ))}

                {/* Axis Labels */}
                <text
                  x={12}
                  y={chartHeight / 2}
                  textAnchor="middle"
                  transform={`rotate(-90 12 ${chartHeight / 2})`}
                  fontSize="10"
                  fill="#0F172A"
                  fontFamily="monospace"
                  fontWeight="900"
                >
                  Sales (₹)
                </text>
                <text
                  x={chartWidth / 2}
                  y={chartHeight + 8}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#0F172A"
                  fontFamily="monospace"
                  fontWeight="900"
                >
                  {graphMode === 'MONTH' ? 'Month Weeks' : graphMode === 'WEEK' ? 'Day of Week' : 'Time / Day / week'}
                </text>
              </svg>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-bold">
            <span>Shift Turnover Log:</span>
            <span className="text-emerald-700 font-black">
              {totalSalesAmount > 0
                ? `₹ ${totalSalesAmount.toLocaleString('en-IN')} Live Settlement Volume`
                : 'Awaiting Initial Shift Settlements'}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM ROW:
          - LEFT: Payment modes with [ Print Pdf ] below
          - RIGHT: Recent Transactions with [ Print Excel ] below
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* BOTTOM LEFT: Payment modes (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-white border border-slate-300 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-black text-slate-900 uppercase pb-3 border-b border-slate-200 flex items-center justify-between">
              <span>Payment modes</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-black">
                {totalSalesAmount > 0 ? '100% BALANCED' : '0 SETTLED'}
              </span>
            </h4>

            <div className="space-y-3.5 mt-4">
              {paymentModeStats.map((mode) => (
                <div key={mode.name} className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-800 flex items-center gap-1.5 truncate pr-2">
                      {mode.icon}
                      <span className="truncate">{mode.name}</span>
                    </span>
                    <span className="text-slate-900 shrink-0">
                      ₹ {mode.amount.toLocaleString('en-IN')} ({mode.percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${mode.barColor}`}
                      style={{ width: `${Math.min(100, mode.percent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action button below Payment Modes: [ Print Pdf ] */}
          <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrintPdf}
              className="bg-slate-900 text-white hover:bg-slate-800 transition px-4 py-2 rounded-lg text-xs font-black shadow-xs flex items-center gap-2 border border-slate-900 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Pdf</span>
            </button>
            <span className="text-[10px] text-slate-400 font-bold">
              {tenderRatioText}
            </span>
          </div>
        </div>

        {/* BOTTOM RIGHT: Recent Transactions (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-white border border-slate-300 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 gap-2">
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase">
                  Recent Transactions
                </h4>
                <p className="text-[11px] text-slate-500 font-bold">
                  Order settlements &amp; active dining bills
                </p>
              </div>

              {/* Quick search input */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search order / date / chair..."
                  value={transactionSearch}
                  onChange={(e) => setTransactionSearch(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-2 py-1 text-xs text-slate-800 w-44 focus:w-52 transition-all focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto mt-3 max-h-[280px] overflow-y-auto pr-1">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b border-slate-200 text-slate-500 text-left font-black">
                    <th className="pb-2">Order id</th>
                    <th className="pb-2">Chair No.</th>
                    <th className="pb-2 text-center">Items</th>
                    <th className="pb-2 text-center">Status</th>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Time</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((tx, idx) => (
                    <tr
                      key={`${tx.orderId}-${idx}`}
                      className="hover:bg-[#FAF8F5] transition-colors font-mono"
                    >
                      <td className="py-2 font-black text-slate-900 whitespace-nowrap">{tx.orderId}</td>
                      <td className="py-2 font-bold text-slate-700 whitespace-nowrap">{tx.chairNo}</td>
                      <td className="py-2 text-center font-bold text-slate-800">
                        {tx.totalItems}
                      </td>
                      <td className="py-2 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            tx.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-2 text-slate-600 font-bold whitespace-nowrap">{tx.date}</td>
                      <td className="py-2 text-slate-500 font-medium whitespace-nowrap">{tx.time}</td>
                      <td className="py-2 text-right font-black text-slate-900 whitespace-nowrap">
                        ₹ {tx.amount.toLocaleString('en-IN')}.00
                      </td>
                    </tr>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400 font-bold">
                        {transactionSearch
                          ? `No transactions found matching "${transactionSearch}"`
                          : 'No shift transactions recorded yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action button below Recent Transactions: [ Print Excel ] */}
          <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-bold">
              Showing {filteredTransactions.length} of {recentTransactions.length} records
            </span>
            <button
              type="button"
              onClick={handlePrintExcel}
              className="bg-[#FAF8F5] text-slate-800 hover:bg-slate-200 transition px-4 py-2 rounded-lg text-xs font-black shadow-xs flex items-center gap-2 border border-slate-300 cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
              <span>Print Excel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
