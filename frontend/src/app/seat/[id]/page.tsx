'use client';

import { useState, useEffect, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  UtensilsCrossed, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Check, 
  Clock, 
  Bell, 
  CreditCard, 
  Sparkles, 
  AlertCircle,
  Receipt,
  ChefHat,
  CheckCircle2,
  X,
  Droplets
} from 'lucide-react';
import { fetchApi } from '../../../lib/api';
import { getSocket } from '../../../lib/socket';
import { audioSynth } from '../../../lib/audio';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import type { 
  MenuItem, 
  MenuCategory, 
  SeatTabSummary, 
  OrderItem, 
  ItemStage 
} from '@seat-order/shared';
import { SOCKET_EVENTS } from '@seat-order/shared';

export default function CustomerSeatPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const seatId = Number(resolvedParams.id);
  const searchParams = useSearchParams();
  const sig = searchParams.get('sig') || '';

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seat, setSeat] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | 'ALL'>('ALL');
  const [dietaryFilter, setDietaryFilter] = useState<string>('ALL');

  // Cart
  const [cart, setCart] = useState<Record<number, { item: MenuItem; quantity: number; notes: string }>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);

  // Live Order Tab
  const [tabSummary, setTabSummary] = useState<SeatTabSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'MENU' | 'TRACKER'>('MENU');

  // Payment
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<any>(null);

  // 1. Initial Claim & Auto-Rehydration
  useEffect(() => {
    async function initSeat() {
      try {
        setLoading(true);
        // Load menu first
        const menuData = await fetchApi<{ categories: MenuCategory[]; items: MenuItem[] }>('/api/menu');
        setCategories(menuData.categories);
        setMenuItems(menuData.items);

        // Claim or resume seat session
        const claimRes = await fetchApi<any>(`/api/seats/${seatId}/claim?sig=${sig}`);
        setSeat(claimRes.seat);
        setSession(claimRes.session);

        // Store session token in localStorage for tab recovery
        localStorage.setItem(`seat_session_${seatId}`, claimRes.session.sessionToken);

        // Fetch running seat tab if any
        const tabRes = await fetchApi<SeatTabSummary>(`/api/seats/${seatId}/tab`);
        setTabSummary(tabRes);
        if (tabRes.allItems.length > 0) {
          setActiveTab('TRACKER');
        }
      } catch (err: any) {
        setError(err.message || 'Unable to access seat.');
      } finally {
        setLoading(false);
      }
    }

    initSeat();
  }, [seatId, sig]);

  // 2. Real-Time WebSocket Listeners
  useEffect(() => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.JOIN_SEAT, { seatId });

    // When an order is placed on this seat (by customer or waiter!)
    const handleOrderPlaced = (payload: any) => {
      if (payload.seat.id === seatId) {
        toast.success(`New order placed (#${payload.order.orderNumber})!`);
        fetchApi<SeatTabSummary>(`/api/seats/${seatId}/tab`).then((tab) => {
          setTabSummary(tab);
          setActiveTab('TRACKER');
        });
      }
    };

    // When an individual item stage changes (QUEUED -> COOKING -> READY -> SERVED)
    const handleItemStageUpdated = (payload: any) => {
      if (payload.seatId === seatId) {
        setTabSummary((prev) => {
          if (!prev) return prev;
          const updatedItems = prev.allItems.map((i) =>
            i.id === payload.itemId ? { ...i, itemStage: payload.newStage as ItemStage } : i
          );
          return { ...prev, allItems: updatedItems };
        });

        if (payload.newStage === 'COOKING') {
          toast.info('Chef started preparing your dish!');
        } else if (payload.newStage === 'READY') {
          toast.success('Food is ready! Waiter is bringing it to your seat.');
        } else if (payload.newStage === 'SERVED') {
          toast.success('Dish served! Bon Appétit.');
        }
      }
    };

    // 86 Out of stock toggle
    const handleMenuAvailability = (payload: { itemId: number; isAvailable: boolean }) => {
      setMenuItems((prev) =>
        prev.map((m) => (m.id === payload.itemId ? { ...m, isAvailable: payload.isAvailable } : m))
      );
    };

    // Payment settled
    const handlePaymentSuccess = (payload: any) => {
      if (payload.seatId === seatId) {
        audioSynth.playPaymentSuccess();
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setPaymentSuccess(payload);
        setIsPaymentOpen(false);
      }
    };

    socket.on(SOCKET_EVENTS.ORDER_PLACED, handleOrderPlaced);
    socket.on(SOCKET_EVENTS.ITEM_STAGE_UPDATED, handleItemStageUpdated);
    socket.on(SOCKET_EVENTS.MENU_ITEM_AVAILABILITY_CHANGED, handleMenuAvailability);
    socket.on(SOCKET_EVENTS.PAYMENT_SUCCESS, handlePaymentSuccess);

    return () => {
      socket.off(SOCKET_EVENTS.ORDER_PLACED, handleOrderPlaced);
      socket.off(SOCKET_EVENTS.ITEM_STAGE_UPDATED, handleItemStageUpdated);
      socket.off(SOCKET_EVENTS.MENU_ITEM_AVAILABILITY_CHANGED, handleMenuAvailability);
      socket.off(SOCKET_EVENTS.PAYMENT_SUCCESS, handlePaymentSuccess);
      socket.emit(SOCKET_EVENTS.LEAVE_SEAT, { seatId });
    };
  }, [seatId]);

  // Cart operations
  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const current = prev[item.id];
      const qty = current ? current.quantity + 1 : 1;
      return {
        ...prev,
        [item.id]: { item, quantity: qty, notes: current?.notes || '' },
      };
    });
  };

  const removeFromCart = (itemId: number) => {
    setCart((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      if (current.quantity <= 1) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return {
        ...prev,
        [itemId]: { ...current, quantity: current.quantity - 1 },
      };
    });
  };

  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce((acc, curr) => acc + curr.item.price * curr.quantity, 0);
  const cartItemCount = cartItems.reduce((acc, curr) => acc + curr.quantity, 0);

  // Submit Order Direct to Kitchen
  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;
    try {
      setIsOrdering(true);
      const itemsPayload = cartItems.map((c) => ({
        menuItemId: c.item.id,
        quantity: c.quantity,
        notes: c.notes || undefined,
      }));

      await fetchApi('/api/orders', {
        method: 'POST',
        headers: {
          'x-seat-session-token': session?.sessionToken || '',
        },
        body: JSON.stringify({
          seatId,
          sessionToken: session?.sessionToken,
          items: itemsPayload,
          createdByRole: 'CUSTOMER',
        }),
      });

      setCart({});
      setIsCartOpen(false);
      toast.success('Order sent directly to the kitchen!');
      setActiveTab('TRACKER');
    } catch (err: any) {
      toast.error(err.message || 'Failed to place order.');
    } finally {
      setIsOrdering(false);
    }
  };

  // Call Waiter Quick Action
  const handleCallWaiter = (reason: 'ASSISTANCE' | 'WATER') => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.WAITER_CALLED, {
      seatId,
      seatNumber: seat?.seatNumber || `S${seatId}`,
      zone: seat?.zone || 'MAIN',
      reason,
      timestamp: new Date().toISOString(),
    });
    toast.info(reason === 'WATER' ? 'Water requested! Waiter notified.' : 'Waiter has been called to your seat.');
  };

  // Self Checkout / Pay Bill
  const handleProcessPayment = async (gateway: 'RAZORPAY' | 'STRIPE' | 'CASH') => {
    try {
      setIsPaying(true);
      const res = await fetchApi<any>('/api/payments/process', {
        method: 'POST',
        body: JSON.stringify({
          seatId,
          gateway,
          settledByRole: 'CUSTOMER_SELF',
        }),
      });
      audioSynth.playPaymentSuccess();
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      setPaymentSuccess(res.receipt);
      setIsPaymentOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Payment failed.');
    } finally {
      setIsPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm mt-4 tracking-wide">Connecting to Seat #{seatId}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white">Seat Access Denied</h2>
        <p className="text-slate-400 text-sm mt-2 max-w-sm leading-relaxed">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2.5 rounded-xl bg-slate-800 text-slate-200 text-sm font-semibold hover:bg-slate-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Payment Celebration Screen
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-extrabold text-white">Payment Successful!</h2>
        <p className="text-slate-400 text-sm mt-2">
          Thank you for dining at LUMIÈRE. Your seat #{seat?.seatNumber} has been cleared.
        </p>

        {/* Digital Receipt Card */}
        <div className="w-full max-w-sm mt-6 p-5 rounded-2xl bg-slate-900 border border-slate-800 text-left">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase">Digital Receipt</span>
            <span className="text-xs font-mono text-emerald-400">{paymentSuccess.transactionId}</span>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Seat Number:</span>
              <span className="text-slate-200 font-medium">#{paymentSuccess.seatNumber}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Subtotal:</span>
              <span className="text-slate-200 font-medium">₹{paymentSuccess.subtotal}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>GST (5%):</span>
              <span className="text-slate-200 font-medium">₹{paymentSuccess.taxAmount}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-800 text-base font-bold text-white">
              <span>Total Paid:</span>
              <span className="text-emerald-400">₹{paymentSuccess.finalAmount}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => window.location.href = '/'}
          className="mt-8 px-8 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm hover:bg-emerald-400"
        >
          Done / Return Home
        </button>
      </div>
    );
  }

  // Filtered menu items
  const filteredItems = menuItems.filter((item) => {
    const matchesCat = selectedCategory === 'ALL' || item.categoryId === selectedCategory;
    const matchesDiet = dietaryFilter === 'ALL' || item.dietaryType === dietaryFilter;
    return matchesCat && matchesDiet;
  });

  return (
    <div className="min-h-screen bg-slate-950 pb-28 text-white max-w-md mx-auto relative shadow-2xl">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-extrabold tracking-tight text-white">LUMIÈRE</h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
              Seat #{seat?.seatNumber}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">{seat?.zone?.replace('_', ' ')} • Dine-In</p>
        </div>

        {/* Quick Assistance Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCallWaiter('WATER')}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-sky-400 transition-colors"
            title="Request Water"
          >
            <Droplets className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleCallWaiter('ASSISTANCE')}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-amber-400 transition-colors"
            title="Call Waiter"
          >
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Navigation Switcher: Menu vs Live Tracker */}
      <div className="p-3 bg-slate-900/60 border-b border-slate-800/80">
        <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('MENU')}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'MENU' ? 'bg-emerald-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Menu & Order
          </button>
          <button
            onClick={() => setActiveTab('TRACKER')}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'TRACKER' ? 'bg-emerald-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Live Tracker</span>
            {tabSummary && tabSummary.allItems.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: MENU */}
      {activeTab === 'MENU' && (
        <div className="p-4 space-y-6">
          {/* Category Filter Horizontal Scroll */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-medium">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-white text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              All Items
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-white text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Dietary Filters */}
          <div className="flex items-center gap-2 text-[11px]">
            {['ALL', 'VEG', 'NON_VEG', 'VEGAN'].map((diet) => (
              <button
                key={diet}
                onClick={() => setDietaryFilter(diet)}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  dietaryFilter === diet
                    ? 'bg-slate-800 text-emerald-400 font-bold border border-emerald-500/40'
                    : 'bg-slate-900/60 text-slate-500 border border-slate-800/60'
                }`}
              >
                {diet === 'ALL' ? 'Everything' : diet.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Dish Cards */}
          <div className="space-y-4">
            {filteredItems.map((item) => {
              const inCartQty = cart[item.id]?.quantity || 0;
              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl bg-slate-900/80 border ${
                    item.isAvailable ? 'border-slate-800 hover:border-slate-700' : 'border-slate-900 opacity-60'
                  } transition-all flex gap-3.5`}
                >
                  {/* Photo */}
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-800 shrink-0">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {!item.isAvailable && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800">
                          Sold Out
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.dietaryType === 'VEG'
                              ? 'bg-emerald-400'
                              : item.dietaryType === 'NON_VEG'
                              ? 'bg-rose-400'
                              : 'bg-teal-400'
                          }`}
                        />
                        <h4 className="text-sm font-bold text-white line-clamp-1">{item.name}</h4>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-extrabold text-emerald-400">₹{item.price}</span>

                      {/* Add Button */}
                      {item.isAvailable ? (
                        inCartQty > 0 ? (
                          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg p-0.5">
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="p-1 text-slate-400 hover:text-white"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-bold text-white px-1">{inCartQty}</span>
                            <button
                              onClick={() => addToCart(item)}
                              className="p-1 text-emerald-400 hover:text-emerald-300"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(item)}
                            className="px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all"
                          >
                            Add +
                          </button>
                        )
                      ) : (
                        <span className="text-[11px] text-slate-500">Unavailable</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE 5-STAGE TRACKER */}
      {activeTab === 'TRACKER' && (
        <div className="p-4 space-y-6">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Live Seat Tab</span>
                <h3 className="text-xl font-bold text-white">Seat #{seat?.seatNumber}</h3>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Running Total</span>
                <p className="text-xl font-black text-emerald-400">₹{tabSummary?.total || 0}</p>
              </div>
            </div>

            {/* Quick Pay Bill Button */}
            {tabSummary && tabSummary.allItems.length > 0 && (
              <button
                onClick={() => setIsPaymentOpen(true)}
                className="w-full mt-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay Final Bill (₹{tabSummary.total})</span>
              </button>
            )}
          </div>

          {/* Granular Item-Level Tracking List */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Ordered Dishes & Live Status
            </h4>

            {(!tabSummary || tabSummary.allItems.length === 0) ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800/60">
                <ChefHat className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No orders placed yet.</p>
                <button
                  onClick={() => setActiveTab('MENU')}
                  className="mt-3 px-4 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold"
                >
                  Explore Menu
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {tabSummary.allItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <h5 className="text-sm font-bold text-white">
                        {item.quantity}x {item.nameSnapshot}
                      </h5>
                      <span className="text-xs text-slate-400 font-medium">₹{item.priceSnapshot * item.quantity}</span>
                      {item.notes && (
                        <p className="text-[10px] text-amber-400 mt-0.5">Note: {item.notes}</p>
                      )}
                    </div>

                    {/* Status Pill with Stage-Specific Color */}
                    <div>
                      {item.itemStage === 'QUEUED' && (
                        <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[11px] font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Placed</span>
                        </span>
                      )}
                      {item.itemStage === 'COOKING' && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold flex items-center gap-1 animate-pulse">
                          <ChefHat className="w-3 h-3" />
                          <span>Cooking</span>
                        </span>
                      )}
                      {item.itemStage === 'READY' && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Ready!</span>
                        </span>
                      )}
                      {item.itemStage === 'SERVED' && (
                        <span className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[11px] font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Served</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add More Items Button */}
          {tabSummary && tabSummary.allItems.length > 0 && (
            <button
              onClick={() => setActiveTab('MENU')}
              className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
            >
              + Add More Items to Seat Tab
            </button>
          )}
        </div>
      )}

      {/* Floating Bottom Cart Bar (Only when items in cart) */}
      {cartItemCount > 0 && activeTab === 'MENU' && (
        <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-40">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold flex items-center justify-between shadow-2xl shadow-emerald-500/30 hover:scale-[1.02] transition-transform"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center text-xs font-black">
                {cartItemCount}
              </span>
              <span className="text-sm">View Active Cart</span>
            </div>
            <div className="flex items-center gap-1 text-sm font-black">
              <span>₹{cartTotal}</span>
              <span>→</span>
            </div>
          </button>
        </div>
      )}

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-md bg-slate-900 rounded-t-3xl border-t border-slate-800 p-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                <span>Your Order Basket</span>
              </h3>
              <button onClick={() => setIsCartOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {cartItems.map(({ item, quantity, notes }) => (
                <div key={item.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-bold text-white">{item.name}</h5>
                      <span className="text-xs font-semibold text-emerald-400">₹{item.price * quantity}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                      <button onClick={() => removeFromCart(item.id)} className="p-1 text-slate-400">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold px-1.5">{quantity}</span>
                      <button onClick={() => addToCart(item)} className="p-1 text-emerald-400">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Special instruction notes */}
                  <input
                    type="text"
                    placeholder="Special requests (e.g. less salt)..."
                    value={notes}
                    onChange={(e) => {
                      const text = e.target.value;
                      setCart((prev) => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], notes: text },
                      }));
                    }}
                    className="w-full mt-2 bg-slate-900 text-xs px-2.5 py-1.5 rounded-lg border border-slate-800 text-slate-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800">
              <div className="flex justify-between text-sm font-bold text-white mb-3">
                <span>Subtotal:</span>
                <span className="text-emerald-400">₹{cartTotal}</span>
              </div>
              <button
                disabled={isOrdering}
                onClick={handlePlaceOrder}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isOrdering ? 'Sending directly to Kitchen...' : 'Send Order to Kitchen (₹' + cartTotal + ')'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentOpen && tabSummary && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <span>Seat #{seat?.seatNumber} Bill</span>
              </h3>
              <button onClick={() => setIsPaymentOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bill breakdown */}
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex justify-between">
                <span>Dishes Subtotal:</span>
                <span className="font-semibold text-white">₹{tabSummary.subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>GST (5%):</span>
                <span className="font-semibold text-white">₹{tabSummary.tax}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-800 text-base font-extrabold text-white">
                <span>Grand Total:</span>
                <span className="text-emerald-400">₹{tabSummary.total}</span>
              </div>
            </div>

            {/* Payment Options */}
            <div className="pt-2 space-y-2.5">
              <button
                disabled={isPaying}
                onClick={() => handleProcessPayment('RAZORPAY')}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>Pay via UPI / GPay / Razorpay (Instant)</span>
              </button>
              <button
                disabled={isPaying}
                onClick={() => handleProcessPayment('STRIPE')}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 border border-slate-700"
              >
                <span>Pay via Card / Stripe</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
