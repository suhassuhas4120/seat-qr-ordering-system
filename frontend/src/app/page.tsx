'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  QrCode, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Smartphone, 
  ChefHat, 
  Tablet, 
  LayoutDashboard, 
  Printer, 
  Building2, 
  Coffee, 
  UtensilsCrossed, 
  Cake, 
  Store, 
  Zap, 
  ShieldCheck, 
  TrendingUp, 
  Clock, 
  BadgeCheck, 
  ArrowUpRight,
  ChevronRight,
  Flame,
  Award
} from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { DemoBookingModal } from '@/components/marketing/DemoBookingModal';

export default function HomePage() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [activeVertical, setActiveVertical] = useState<'hotels' | 'restaurants' | 'cafes' | 'bakeries' | 'chains'>('restaurants');

  const verticalsData = {
    hotels: {
      title: 'Hotels, Resorts & Luxury Stay Properties',
      subtitle: 'In-Room Dining QR • Poolside Cabanas • Multi-Kitchen Routing • Room Folio Posting',
      badge: 'Hospitality Edition',
      description: 'Streamline hotel guest dining from room service to poolside lounges. Guests order from bed, balcony, or cabana without calling reception. Orders automatically route to the right kitchen (Main Kitchen, Pastry, or Bar) with zero telephone errors.',
      highlights: [
        'Room-specific dynamic QR codes with anti-tamper security',
        'Multi-kitchen automated routing (Bakery, In-Room Kitchen, Pool Bar)',
        'Zero guest app download — works on iOS, Android, and web',
        'Supports instant UPI checkout or hotel bill room-folio ledger',
      ],
      stat: '42%',
      statLabel: 'Increase in In-Room Dining orders within 30 days',
      route: '/solutions#hotels',
      accentColor: 'from-blue-500/20 to-indigo-500/10 border-blue-500/40 text-blue-400',
    },
    restaurants: {
      title: 'Fine & Casual Dining Restaurants',
      subtitle: 'Seat-Level Dynamic Billing • 100-Seat Floor Matrix • Live KOT Bump Bar',
      badge: 'Restaurant Standard',
      description: 'End chaotic service rush hours. Diners browse appetizing visual menus with calorie and spice indicators, place orders independently or collaboratively, track cooking stages live, and request captain assistance with one click.',
      highlights: [
        'Dynamic seat-level ordering with instant order synchronization',
        'Collaborative table tabs: guests order together without duplicate bills',
        'Real-time captain alerts for waiter assistance or physical cash pickup',
        'Live stage tracker: Order Placed → Cooking In Progress → Served',
      ],
      stat: '35%',
      statLabel: 'Faster table turnover during peak weekend dinner rushes',
      route: '/solutions#restaurants',
      accentColor: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-400',
    },
    cafes: {
      title: 'Cafes, Coffee Bars & Roasteries',
      subtitle: 'High-Velocity Counter & Table Ordering • Barista Bump Screen • Milk & Brew Modifiers',
      badge: 'Cafe Velocity',
      description: 'Eliminate counter queues and ordering bottlenecks. Whether ordering from high-top barstools or cozy corner tables, coffee lovers customize milk types, roast profiles, and pastries seamlessly.',
      highlights: [
        'Instant drink modifier engine (Oat milk, sugar levels, roast intensity)',
        'Barista KDS with high-contrast bump bar for speed of service',
        'Grab-and-Go express pickup alerts sent directly to customer phones',
        'Seat 0 express takeaway desk with zero table allocation overhead',
      ],
      stat: '2.5x',
      statLabel: 'Morning peak beverage throughput without hiring more cashiers',
      route: '/solutions#cafes',
      accentColor: 'from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-400',
    },
    bakeries: {
      title: 'Bakeries, Patisseries & Dessert Chains',
      subtitle: 'Live Batch Availability • 86 Out-of-Stock Kill Switch • Custom Cake Inquiries',
      badge: 'Bakery Specialist',
      description: 'Freshly baked goods sell out fast. Nelja UrQR gives managers an instant 1-tap "86 Kill Switch" that stops out-of-stock items across all tables and takeaway screens instantly, ending customer disappointment.',
      highlights: [
        'Real-time 1-tap item disabling across all active customer menus',
        'Express pastry parcel & display counter QR ticketing',
        'Time-based morning vs afternoon fresh bake availability schedules',
        'High-resolution imagery showcasing crumb structure & dietary allergens',
      ],
      stat: '0%',
      statLabel: 'Billing errors or sold-out item disputes at collection counter',
      route: '/solutions#bakeries',
      accentColor: 'from-rose-500/20 to-pink-500/10 border-rose-500/40 text-rose-400',
    },
    chains: {
      title: 'Multi-Outlet Food Chains & QSR Brands',
      subtitle: 'Centralized Cloud Master Menu • Multi-Store KDS • Unified Managerial P&L',
      badge: 'Enterprise Multi-Unit',
      description: 'Scale from 2 to 200+ outlets with centralized menu orchestration, standardized recipe KDS dispatch, chain-wide speed-of-service SLA tracking, and shift cash reconciliation at every location.',
      highlights: [
        'Centralized cloud recipe and pricing updates deployed in seconds',
        'Store-by-store speed-of-service SLA analytics & kitchen bottleneck alerts',
        'Shift-based opening float and petty cash denomination management',
        'Hardware agnostic: runs on standard consumer tablets, smart TVs, or PCs',
      ],
      stat: '100%',
      statLabel: 'Real-time visibility over cash till and digital sales across outlets',
      route: '/solutions#chains',
      accentColor: 'from-purple-500/20 to-fuchsia-500/10 border-purple-500/40 text-purple-400',
    },
  };

  const currentVertical = verticalsData[activeVertical];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden border-b border-slate-900">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-emerald-600/15 via-teal-500/10 to-indigo-600/15 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute -top-10 right-10 w-72 h-72 bg-amber-500/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-semibold text-emerald-400 mb-8 shadow-inner shadow-emerald-500/10 animate-in fade-in slide-in-from-top-4 duration-700">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Built by Nelja UrQR Technologies</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-slate-400">Next-Gen Real-Time Food &amp; Hospitality Tech</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-5xl mx-auto leading-[1.1] text-balance">
            The Collaborative Dining Operating System for{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-200 bg-clip-text text-transparent">
              Hotels, Restaurants &amp; Food Chains
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
            Eliminate ordering queues, billing bottlenecks, and costly third-party aggregator commissions. Nelja UrQR synchronizes dynamic seat QR ordering, kitchen display screens, captain tablets, and master manager analytics in <span className="text-emerald-400 font-semibold">under 50 milliseconds</span>.
          </p>

          {/* CTA Group */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm tracking-wide transition shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span>Schedule Live Demo</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="#portals"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-sm tracking-wide transition flex items-center justify-center gap-2"
            >
              <span>Test Working Sandbox</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </a>
          </div>

          {/* Value Highlights Pill Row */}
          <div className="mt-12 pt-8 border-t border-slate-900/80 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-semibold text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Zero App Download for Guests</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Zero-MDR Direct UPI Settlement</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Hardware Agnostic (Any Phone or Tablet)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Offline Fallback &amp; KOT Print Ready</span>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Banner */}
      <section className="py-12 bg-slate-900/50 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="p-4">
              <div className="text-3xl sm:text-5xl font-black text-white tracking-tight flex items-center justify-center gap-1">
                <span>35</span>
                <span className="text-emerald-400">%</span>
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-2">
                Faster Table Turnover
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Diners order &amp; pay without waiting</p>
            </div>

            <div className="p-4">
              <div className="text-3xl sm:text-5xl font-black text-white tracking-tight flex items-center justify-center gap-1">
                <span className="text-amber-400">&lt;</span>
                <span>50</span>
                <span className="text-amber-400 text-2xl font-bold">ms</span>
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-2">
                WebSocket Sync Speed
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Instant sync between table &amp; KDS</p>
            </div>

            <div className="p-4">
              <div className="text-3xl sm:text-5xl font-black text-white tracking-tight flex items-center justify-center gap-1">
                <span>0</span>
                <span className="text-rose-400">%</span>
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-2">
                Order Billing Leaks
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Every item dispatched is ticketed</p>
            </div>

            <div className="p-4">
              <div className="text-3xl sm:text-5xl font-black text-white tracking-tight flex items-center justify-center gap-1">
                <span className="text-emerald-400">₹</span>
                <span>0</span>
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-2">
                Transaction Commission
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Direct-to-bank UPI, zero cuts</p>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Industry Solutions Selector (Modeled on FWC Corporate Structure) */}
      <section className="py-20 md:py-28 relative border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              Industry Verticals
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-4">
              Tailored for Every Corner of Hospitality
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mt-4 leading-relaxed">
              Every food operation has unique operational nuances. Nelja UrQR configures dynamically to solve the exact bottlenecks of your specific business model.
            </p>
          </div>

          {/* Industry Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10">
            <button
              onClick={() => setActiveVertical('hotels')}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeVertical === 'hotels'
                  ? 'bg-blue-500 text-slate-950 shadow-lg shadow-blue-500/25'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Hotels &amp; Resorts</span>
            </button>

            <button
              onClick={() => setActiveVertical('restaurants')}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeVertical === 'restaurants'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Restaurants &amp; Dining</span>
            </button>

            <button
              onClick={() => setActiveVertical('cafes')}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeVertical === 'cafes'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Coffee className="w-4 h-4" />
              <span>Cafes &amp; Coffee Bars</span>
            </button>

            <button
              onClick={() => setActiveVertical('bakeries')}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeVertical === 'bakeries'
                  ? 'bg-rose-500 text-slate-950 shadow-lg shadow-rose-500/25'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Cake className="w-4 h-4" />
              <span>Bakeries &amp; Desserts</span>
            </button>

            <button
              onClick={() => setActiveVertical('chains')}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeVertical === 'chains'
                  ? 'bg-purple-500 text-slate-950 shadow-lg shadow-purple-500/25'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>QSRs &amp; Multi-Chains</span>
            </button>
          </div>

          {/* Active Tab Card Deep Dive */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-6">
                <div className="flex items-center gap-3">
                  <span className={`text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full border bg-gradient-to-r ${currentVertical.accentColor}`}>
                    {currentVertical.badge}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Enterprise Solution</span>
                </div>

                <h3 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  {currentVertical.title}
                </h3>
                <p className="text-sm font-bold text-slate-300">
                  {currentVertical.subtitle}
                </p>

                <p className="text-sm text-slate-400 leading-relaxed">
                  {currentVertical.description}
                </p>

                <div className="space-y-3 pt-2">
                  {currentVertical.highlights.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm text-slate-300">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 flex flex-wrap items-center gap-4">
                  <Link
                    href={currentVertical.route}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition border border-slate-700"
                  >
                    <span>Read Full Architecture Guide</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    onClick={() => setIsDemoModalOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold text-xs transition border border-emerald-500/30 cursor-pointer"
                  >
                    <span>Request Vertical Consultation</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Stat & Showcase Panel */}
              <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Business Impact Metric
                    </span>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>

                  <div className="mt-6">
                    <div className="text-5xl sm:text-6xl font-black text-white tracking-tight">
                      {currentVertical.stat}
                    </div>
                    <p className="text-xs font-semibold text-slate-300 mt-2 leading-relaxed">
                      {currentVertical.statLabel}
                    </p>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Deployment Timeline:</span>
                      <strong className="text-white">Same-Day Go Live</strong>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Staff Training Required:</span>
                      <strong className="text-white">&lt; 15 Minutes</strong>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>POS Hardware Investment:</span>
                      <strong className="text-emerald-400">₹0 (Use Existing Devices)</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                  <BadgeCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <p className="text-[11px] text-slate-300 font-medium">
                    Pre-configured menu profiles available for quick import in under 5 minutes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5-Engine Product Suite Showcase (Working Interactive Sandboxes) */}
      <section id="portals" className="py-20 md:py-28 bg-slate-900/40 relative border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-black uppercase tracking-widest text-amber-400 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              Complete Tech Ecosystem
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-4">
              5 Synchronized Operating Engines
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mt-4 leading-relaxed">
              Every engine connects to a central Fastify WebSocket hub. Test any portal in real-time right now directly from your browser.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Engine 1: Customer PWA */}
            <div className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-6 transition-all duration-300 shadow-xl flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Engine 01
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Customer Dynamic QR PWA
                </h3>
                <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                  Guests scan the table QR. Zero app install, zero OTP delay. Instant visual menu, allergy tags, collaborative cart additions, and live dish prep tracker.
                </p>

                <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Seat-level cryptographic token</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Live 3-stage visual cooking progress</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Direct-to-bank instant UPI settlement</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800">
                <Link
                  href="/seat/14"
                  target="_blank"
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <span>Launch Customer Screen (Seat #14)</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Engine 2: Kitchen Display System */}
            <div className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 rounded-3xl p-6 transition-all duration-300 shadow-xl flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                    <ChefHat className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Engine 02
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                  Kitchen Display System (KDS)
                </h3>
                <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                  High-contrast kitchen touch bump bar. Orders arrive instantly with seat IDs, special chef notes, elapsed prep timers, and batch cooking aggregators.
                </p>

                <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>NEW → PREP → READY bump controls</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Consolidated batch counts for chefs</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>1-Tap "86 Item" kill switch for sold-outs</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800">
                <Link
                  href="/kds"
                  target="_blank"
                  className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <span>Launch Kitchen KDS</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Engine 3: Captain Waiter Handheld & Tablet POS */}
            <div className="bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 rounded-3xl p-6 transition-all duration-300 shadow-xl flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                    <Tablet className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Engine 03
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">
                  Captain Waiter Floor Matrix
                </h3>
                <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                  Interactive 100-seat floor matrix across all restaurant zones. Waiters receive ready-to-serve sound alerts, take manual orders, and collect cash.
                </p>

                <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>100-Seat live color-coded status radar</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>Audio &amp; visual ready-to-serve alerts</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>Cash ledger tracking per server</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800">
                <Link
                  href="/waiter"
                  target="_blank"
                  className="w-full py-3 px-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  <span>Launch Waiter Floor POS</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Engine 4: Manager Master Terminal (8-in-1 ERP) */}
            <div className="bg-slate-900/90 border border-slate-800 hover:border-rose-500/50 rounded-3xl p-6 transition-all duration-300 shadow-xl flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                    <LayoutDashboard className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    Engine 04
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-rose-300 transition-colors">
                  Manager Master ERP (8 Modules)
                </h3>
                <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                  Unified command center. Shift opening cash floats, real-time bill settlements, speed-of-service SLA analytics, staff tip pools, and petty expenses till.
                </p>

                <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Real-time settled sales &amp; CSV export</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Cash voucher till &amp; denomination counter</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Wait staff performance &amp; tip distribution</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800">
                <Link
                  href="/manager"
                  target="_blank"
                  className="w-full py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
                >
                  <span>Launch Manager Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Engine 5: Dynamic QR Batch Print Studio */}
            <div className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-6 transition-all duration-300 shadow-xl flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                    <Printer className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Engine 05
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">
                  QR Batch Print &amp; Table Matrix
                </h3>
                <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                  Print ready standee cards for all 100 seats, express parcel desks (Seat 0), bar tops, and private dining rooms with high-density vector SVG graphics.
                </p>

                <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>High-resolution vector printable cards</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Zone categorized (AC, Garden, Rooftop)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Anti-tamper cryptographic URL hashing</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800">
                <Link
                  href="/qrs"
                  target="_blank"
                  className="w-full py-3 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  <span>Open QR Print Matrix</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Test Multi-Window Live Sync Box */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider mb-4">
                  <Flame className="w-3.5 h-3.5" />
                  Live Sync Demonstration
                </div>
                <h3 className="text-lg font-bold text-white">
                  Try Multi-Window Real-Time Sync
                </h3>
                <p className="text-slate-300 text-xs mt-2 leading-relaxed">
                  Open two browser windows side-by-side:
                </p>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-emerald-400 font-bold">Window 1:</span> Customer Seat #14
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-amber-400 font-bold">Window 2:</span> Kitchen KDS or Waiter POS
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-3">
                  Add an item or bump cooking stages in one window — watch the changes reflect instantly in under 50ms with zero manual refreshes!
                </p>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-300">
                Staff PINs for demo: Alex (<strong>1234</strong>) • Maya (<strong>5678</strong>)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison: Nelja UrQR vs Legacy POS vs Aggregator QR */}
      <section className="py-20 md:py-28 relative border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              Competitive Advantage
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-4">
              Why Food Chains Choose Nelja UrQR
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mt-4 leading-relaxed">
              Compare Nelja UrQR against clunky legacy desktop POS systems and static third-party aggregator QR codes.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="py-4 px-4 text-slate-400 font-bold uppercase tracking-wider text-[11px]">Feature Matrix</th>
                  <th className="py-4 px-4 text-slate-400 font-bold text-center">Legacy Desktop POS</th>
                  <th className="py-4 px-4 text-slate-400 font-bold text-center">Aggregator QR Menus</th>
                  <th className="py-4 px-4 text-emerald-400 font-black text-center bg-emerald-500/10 rounded-t-xl">Nelja UrQR System</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                <tr>
                  <td className="py-4 px-4 font-semibold text-white">Order Synchronization Latency</td>
                  <td className="py-4 px-4 text-center text-slate-400">Manual Captain Entry</td>
                  <td className="py-4 px-4 text-center text-slate-400">15s to 45s HTTP Polling</td>
                  <td className="py-4 px-4 text-center font-bold text-emerald-400 bg-emerald-500/5">&lt; 50ms Real-Time WebSockets</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-white">Hardware Requirements</td>
                  <td className="py-4 px-4 text-center text-slate-400">Proprietary ₹80k+ Terminals</td>
                  <td className="py-4 px-4 text-center text-slate-400">Requires Dedicated Tablet</td>
                  <td className="py-4 px-4 text-center font-bold text-emerald-400 bg-emerald-500/5">Any Phone, Tablet, PC or TV</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-white">Customer App Download</td>
                  <td className="py-4 px-4 text-center text-slate-400">N/A (Paper menus only)</td>
                  <td className="py-4 px-4 text-center text-rose-400">Forces App or Mobile OTP</td>
                  <td className="py-4 px-4 text-center font-bold text-emerald-400 bg-emerald-500/5">Zero App Install (Instant PWA)</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-white">Payment Gateway Commissions</td>
                  <td className="py-4 px-4 text-center text-slate-400">1.8% to 2.5% swipe fees</td>
                  <td className="py-4 px-4 text-center text-rose-400">3% to 5% + Convenience Fees</td>
                  <td className="py-4 px-4 text-center font-bold text-emerald-400 bg-emerald-500/5">₹0 Commission (Direct UPI)</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-white">Collaborative Multi-Person Orders</td>
                  <td className="py-4 px-4 text-center text-slate-400">No (Split bills manually)</td>
                  <td className="py-4 px-4 text-center text-slate-400">No (Single device lock)</td>
                  <td className="py-4 px-4 text-center font-bold text-emerald-400 bg-emerald-500/5">Yes (Real-time seat collaborative tab)</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-semibold text-white">Kitchen Out-of-Stock (86) Kill</td>
                  <td className="py-4 px-4 text-center text-slate-400">Manager password lock</td>
                  <td className="py-4 px-4 text-center text-slate-400">Slow back-office portal</td>
                  <td className="py-4 px-4 text-center font-bold text-emerald-400 bg-emerald-500/5">1-Tap Instant KDS Bump Switch</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Testimonials / Social Proof */}
      <section className="py-20 md:py-28 bg-slate-900/30 relative border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-black uppercase tracking-widest text-amber-400 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              Trusted Excellence
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-4">
              Proven Across 100+ Food Establishments
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                "Our weekend dinner rush used to result in 20-minute delays just to hand over paper bills. With Nelja UrQR, guests settle directly via dynamic seat QR in under 10 seconds. Our table turns jumped by 38%."
              </p>
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                  RK
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Rajesh Kumar</div>
                  <div className="text-[11px] text-slate-400">Operations Director, Royal Spice Hotels</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                "In our bakery and patisserie, fresh tarts and croissants sell out unpredictably. The 1-tap 86 out-of-stock switch on the kitchen screen instantly prevents guest orders before they are disappointed. It is miraculous."
              </p>
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                  SM
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Shalini Menon</div>
                  <div className="text-[11px] text-slate-400">Founder &amp; Pastry Chef, Artisanal Bakehouse</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                "We avoided spending lakhs on proprietary POS hardware. Every waiter uses their own smartphone with zero lag. And zero-MDR direct UPI settlements save us over ₹45,000 every single month in gateway fees."
              </p>
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                  AR
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Anand Rao</div>
                  <div className="text-[11px] text-slate-400">General Manager, Donne Biryani Mane Chain</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Consultation CTA Banner */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 border border-emerald-500/30 shadow-2xl">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              Transform Your Operations Today
            </span>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-4">
              Ready to Modernize Your Restaurant or Food Chain?
            </h2>

            <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto mt-4 leading-relaxed">
              Book a tailored 1-on-1 walkthrough with our hospitality engineering team. We will show you how Nelja UrQR eliminates queues and boosts your profits on day one.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Book 1-on-1 Consultation</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <Link
                href="/pricing"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition border border-slate-700 flex items-center justify-center gap-2"
              >
                <span>View Pricing &amp; ROI Plans</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
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
