'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  Calculator, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  Zap, 
  TrendingUp, 
  Building2, 
  Store,
  DollarSign
} from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { DemoBookingModal } from '@/components/marketing/DemoBookingModal';

export default function PricingPage() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  // ROI Calculator states
  const [seatsCount, setSeatsCount] = useState<number>(35);
  const [avgTicket, setAvgTicket] = useState<number>(650);
  const [tableTurnsPerDay, setTableTurnsPerDay] = useState<number>(3.5);

  // ROI Calculations
  // Monthly orders = seatsCount * tableTurnsPerDay * 30
  const monthlyOrders = Math.round(seatsCount * tableTurnsPerDay * 30);
  const monthlyRevenue = monthlyOrders * avgTicket;
  
  // Traditional payment gateway cut avoided (at ~2.5% MDR)
  const savedMdrFees = Math.round(monthlyRevenue * 0.025);
  
  // Extra revenue gained by 30% faster table turn
  const extraRevenueTurnover = Math.round(monthlyRevenue * 0.15); // conservative 15% net boost
  
  // Estimated monthly value gained
  const totalMonthlyGain = savedMdrFees + extraRevenueTurnover;

  const faqs = [
    {
      q: 'Do customers need to download an app or enter an OTP to order?',
      a: 'No! That is the core breakthrough of Nelja UrQR. Customers simply scan the QR code with their default camera app (iOS or Android). The progressive web application opens instantly in under 1 second with zero app downloads and zero OTP barriers.'
    },
    {
      q: 'How does Zero-MDR Direct UPI payment save us money?',
      a: 'Traditional payment gateways and aggregator QR codes deduct 1.8% to 3.5% on every digital transaction. With Nelja UrQR, the QR code generates an NPCI-compliant UPI payment link directly tied to your restaurant bank account. 100% of the customer money hits your bank account with ₹0 intermediary cuts.'
    },
    {
      q: 'Can waiters still take physical cash payments for guests who prefer it?',
      a: 'Yes, absolutely. Diners can tap "Pay via Cash" or ask the captain. The waiter mobile screen (or tablet floor matrix) alerts the captain, who collects the cash and marks the seat settled in 1 tap, automatically updating the Manager Till in real time.'
    },
    {
      q: 'What hardware do we need to buy to get started?',
      a: 'Zero expensive proprietary hardware! Nelja UrQR runs on any hardware you already own: Android smartphones, iPhones, iPads, Samsung tablets, Windows laptops, or wall-mounted smart TVs for the kitchen KDS.'
    },
    {
      q: 'How quickly can our restaurant go live?',
      a: 'Most venues go live in less than 24 hours. Our onboarding team imports your current menu, sets up your table seat matrix, and delivers high-resolution printable QR standees ready for your tables.'
    },
    {
      q: 'What happens if our restaurant internet goes down during peak rush?',
      a: 'Nelja UrQR includes offline resilient state caching. Active orders and carts remain visible on staff screens. When connectivity resumes, all transactions reconcile automatically without order drops or double billing.'
    }
  ];

  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <Navbar />

      {/* Header Banner */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 border-b border-slate-900 overflow-hidden text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-emerald-600/10 via-teal-600/10 to-indigo-600/10 blur-[130px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <span className="text-xs font-black uppercase tracking-widest text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            Transparent Pricing
          </span>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mt-6 max-w-4xl mx-auto leading-tight">
            Invest in Speed. Save Lakhs in Gateways.
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Zero per-transaction commissions. Zero hardware lock-in. Pick the plan that fits your venue size.
          </p>

          {/* Monthly / Annual Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 p-1.5 rounded-2xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                billingCycle === 'annual'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-950/20 text-slate-950 font-black uppercase">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards Grid */}
      <section className="py-20 md:py-28 relative border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Plan 1: Starter Cafe & Bakery */}
            <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Single Location
                </span>
                <h3 className="text-xl font-black text-white mt-2">
                  Cafe &amp; Bakery Starter
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Ideal for coffee shops, artisan bakeries, and boutique quick-service counters.
                </p>

                <div className="mt-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white">
                      ₹{billingCycle === 'annual' ? '1,599' : '1,999'}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">/ month</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Billed {billingCycle}</p>
                </div>

                <div className="mt-8 space-y-3 pt-6 border-t border-slate-800">
                  <div className="flex items-center gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Up to 25 Seats / Counter Standees</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Customer Dynamic QR PWA</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>1 Kitchen Display (KDS) Screen</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>1-Tap 86 Out-of-Stock Kill Switch</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Zero-MDR Direct UPI Payments</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800">
                <button
                  onClick={() => setIsDemoModalOpen(true)}
                  className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Select Starter Plan</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Plan 2: Growth Restaurant (Highlighted) */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/30 border-2 border-emerald-500/50 flex flex-col justify-between relative shadow-2xl shadow-emerald-500/10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-md">
                Most Popular
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Full Service
                </span>
                <h3 className="text-xl font-black text-white mt-2">
                  Growth Restaurant &amp; Bar
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  For busy casual dining, fine dining, rooftop restaurants, and large multi-zone venues.
                </p>

                <div className="mt-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white">
                      ₹{billingCycle === 'annual' ? '3,199' : '3,999'}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">/ month</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Billed {billingCycle}</p>
                </div>

                <div className="mt-8 space-y-3 pt-6 border-t border-slate-800">
                  <div className="flex items-center gap-2.5 text-xs text-slate-200 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Up to 100 Seats Across 5 Zones</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-200 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Full 8-Module Manager ERP</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-200 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Captain Floor Matrix &amp; Handheld App</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-200 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Unlimited Kitchen &amp; Bar KDS Screens</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-200 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>ESC/POS 80mm &amp; 58mm Thermal Printing</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-200 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Staff Tip Pool &amp; Petty Cash Voucher Till</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800">
                <button
                  onClick={() => setIsDemoModalOpen(true)}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Start 14-Day Free Pilot</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Plan 3: Enterprise Chains & Hotels */}
            <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                  Multi-Unit &amp; Hotels
                </span>
                <h3 className="text-xl font-black text-white mt-2">
                  Enterprise Chain &amp; Hotel
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  For hotel properties, resorts, cloud kitchen networks, and 5+ outlet franchises.
                </p>

                <div className="mt-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white">Custom</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Volume-based tier discounts</p>
                </div>

                <div className="mt-8 space-y-3 pt-6 border-t border-slate-800">
                  <div className="flex items-center gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Unlimited Seats &amp; Hotel Rooms</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Centralized Multi-Store Catalog &amp; Menu Sync</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Hotel Room Folio / PMS API Integration</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Dedicated Technical Account Manager</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Custom SLA &amp; On-Site Training</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800">
                <button
                  onClick={() => setIsDemoModalOpen(true)}
                  className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Talk to Enterprise Sales</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive ROI Calculator */}
      <section className="py-20 md:py-28 bg-slate-900/50 relative border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              Value Calculator
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-4">
              Calculate Your Monthly ROI
            </h2>
            <p className="text-slate-400 text-sm mt-3">
              Adjust your venue's capacity and average ticket to see how much you save in gateway fees and gain in faster table turns.
            </p>
          </div>

          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* Sliders Input */}
              <div className="lg:col-span-6 space-y-8">
                {/* Slider 1: Seats */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-2">
                    <span className="text-slate-300">Active Tables / Seats Capacity:</span>
                    <span className="text-emerald-400 font-black text-base">{seatsCount} Seats</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={seatsCount}
                    onChange={(e) => setSeatsCount(Number(e.target.value))}
                    className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>10 Seats</span>
                    <span>50 Seats</span>
                    <span>100 Seats</span>
                  </div>
                </div>

                {/* Slider 2: Average Ticket */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-2">
                    <span className="text-slate-300">Average Bill Amount per Seat:</span>
                    <span className="text-emerald-400 font-black text-base">₹{avgTicket}</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="2500"
                    step="50"
                    value={avgTicket}
                    onChange={(e) => setAvgTicket(Number(e.target.value))}
                    className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>₹200</span>
                    <span>₹1,250</span>
                    <span>₹2,500</span>
                  </div>
                </div>

                {/* Slider 3: Daily Turnover */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-2">
                    <span className="text-slate-300">Daily Table Turnover Turns:</span>
                    <span className="text-emerald-400 font-black text-base">{tableTurnsPerDay}x / Day</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    step="0.5"
                    value={tableTurnsPerDay}
                    onChange={(e) => setTableTurnsPerDay(Number(e.target.value))}
                    className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>1x (Slow)</span>
                    <span>4x (Average)</span>
                    <span>8x (High Rush)</span>
                  </div>
                </div>
              </div>

              {/* Calculated Results Box */}
              <div className="lg:col-span-6 bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Total Estimated Monthly Value Gained
                  </span>
                  <div className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight mt-2 flex items-center gap-1">
                    <span>+₹</span>
                    <span>{totalMonthlyGain.toLocaleString('en-IN')}</span>
                    <span className="text-xs text-slate-400 font-normal">/ month</span>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Zero-MDR UPI Commission Saved (vs 2.5%):</span>
                    <strong className="text-white font-bold">₹{savedMdrFees.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Extra Turnover Revenue Gained:</span>
                    <strong className="text-emerald-300 font-bold">₹{extraRevenueTurnover.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Estimated Monthly Diners Served:</span>
                    <strong className="text-white font-bold">{monthlyOrders.toLocaleString('en-IN')} guests</strong>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80">
                  <button
                    onClick={() => setIsDemoModalOpen(true)}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Claim Your ROI with a 14-Day Pilot</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-20 md:py-28 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-400 text-sm mt-3">
              Clear answers to the most common questions restaurant owners and food chains ask us.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden transition"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/50 transition"
                  >
                    <span className="text-sm font-bold text-white">
                      {faq.q}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />

      <DemoBookingModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </div>
  );
}
