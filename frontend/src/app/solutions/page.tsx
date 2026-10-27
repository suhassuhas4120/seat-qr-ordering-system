'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  UtensilsCrossed, 
  Coffee, 
  Cake, 
  Store, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  Zap, 
  ChefHat, 
  Smartphone, 
  Tablet, 
  LayoutDashboard, 
  Printer, 
  ArrowUpRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { DemoBookingModal } from '@/components/marketing/DemoBookingModal';

export default function SolutionsPage() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  const solutions = [
    {
      id: 'hotels',
      title: 'Hotels, Resorts & Luxury Stay Properties',
      tagline: 'Frictionless In-Room Dining, Poolside Lounges, and Multi-Kitchen Routing',
      icon: <Building2 className="w-8 h-8 text-blue-400" />,
      themeColor: 'blue',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      heroStat: '42%',
      heroStatDesc: 'Average lift in room service order value from high-res dynamic menus',
      problemTitle: 'The Hospitality Friction',
      problems: [
        'Room guests repeatedly dial engaged PBX room service lines during peak hours.',
        'Paper room dining menus are frequently outdated, vandalized, or missing allergen alerts.',
        'Orders from pool cabanas, rooftop bars, and suites get routed to the wrong kitchen line.',
        'Manual room folio posting causes end-of-stay checkout billing disputes.'
      ],
      solutionTitle: 'The Nelja UrQR In-Room Advantage',
      solutionsList: [
        'Room-specific encrypted QR code standees that cannot be tampered with or used outside property.',
        'Intelligent multi-kitchen dispatch: drinks route to Bar KDS, patisserie to Bakery, mains to Main Kitchen.',
        'Zero app download required: foreign tourists and staycationers order in their native language in seconds.',
        'Guests choose direct zero-MDR UPI payment or instant room folio charge with manager PIN sign-off.'
      ],
      demoLink: '/seat/14',
      demoLabel: 'Test In-Room Guest QR Screen',
    },
    {
      id: 'restaurants',
      title: 'Fine Dining & High-Turnover Casual Restaurants',
      tagline: 'Dynamic Seat Billing, Collaborative Group Ordering, and Live Kitchen Bump Bar',
      icon: <UtensilsCrossed className="w-8 h-8 text-emerald-400" />,
      themeColor: 'emerald',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      heroStat: '35%',
      heroStatDesc: 'Reduction in table dwell time during peak lunch & dinner rushes',
      problemTitle: 'The Restaurant Bottleneck',
      problems: [
        'Diners wave desperately at busy waiters just to request another round of drinks or the final bill.',
        'Captains mishear customer verbal modifications during noisy dinner rushes.',
        'Splitting bills among large groups takes 15 minutes of manual cashier calculations.',
        'Physical paper KOTs get lost, stained with sauce, or dropped by kitchen runners.'
      ],
      solutionTitle: 'The Nelja UrQR Floor Engine',
      solutionsList: [
        'Seat-level dynamic QR codes: each diner orders independently or adds to a shared table tab.',
        'Live 3-stage visual cooking tracker: guests see exactly when their dish enters prep and gets served.',
        'Instant Captain Assistance Call button alerts staff handhelds with the exact seat number.',
        'Zero-error KDS bump bar with batch counts, item timers, and clear dietary color coding.'
      ],
      demoLink: '/waiter',
      demoLabel: 'Test 100-Seat Floor Matrix',
    },
    {
      id: 'cafes',
      title: 'Cafes, Coffee Bars & Specialty Roasteries',
      tagline: 'Rapid Table & Counter Ordering, Barista Bump Bar, and Instant Drink Modifiers',
      icon: <Coffee className="w-8 h-8 text-amber-400" />,
      themeColor: 'amber',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      heroStat: '2.5x',
      heroStatDesc: 'Higher morning rush beverage throughput without additional cashier counters',
      problemTitle: 'The Coffee Counter Bottleneck',
      problems: [
        'Morning rush lines spill out of the door while one cashier enters milk and sweetener choices.',
        'Customers occupying tables must stand in line again just to order a second espresso or pastry.',
        'Baristas shout customer names over loud grinding noises, causing confusion and cold drinks.',
        'High cashier turnover leads to missed upsells (syrups, plant-based milks, snacks).'
      ],
      solutionTitle: 'The Nelja UrQR Specialty Cafe Workflow',
      solutionsList: [
        'Instant modifier engine prompts for oat/almond milk, temperature, sweetness, and extra shots.',
        'Barista KDS bump screen displays incoming beverage specs in clear, high-contrast cards.',
        'Automated ready notification alerts the customer phone screen for seamless pickup.',
        'Seat 0 express takeaway QR desk allows quick street counter ordering with zero table wait.'
      ],
      demoLink: '/kds',
      demoLabel: 'Test Barista Bump Screen',
    },
    {
      id: 'bakeries',
      title: 'Bakeries, Patisseries & Sweet Confectioneries',
      tagline: 'Live Batch Availability, 86-Stock Kill Switch, and Express Parcel Ticketing',
      icon: <Cake className="w-8 h-8 text-rose-400" />,
      themeColor: 'rose',
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      heroStat: '0%',
      heroStatDesc: 'Out-of-stock billing disputes at the packaging counter',
      problemTitle: 'The Artisan Bakery Dilemma',
      problems: [
        'Fresh batches of croissants and artisanal sourdough sell out unpredictably throughout the day.',
        'Customers queue, pay at the counter, only to discover the display shelf is empty.',
        'Seasonal and daily special pricing requires reprinting physical paper menus constantly.',
        'Takeaway parcels and dine-in dessert plates get mixed up during festival packaging rushes.'
      ],
      solutionTitle: 'The Nelja UrQR Artisan Bakery Workflow',
      solutionsList: [
        '1-Tap "86 Item" kill switch lets kitchen staff mark sold-out pastries instantly across all guest screens.',
        'Morning vs afternoon menu switches automate display of freshly baked sourdough versus evening savories.',
        'Rich high-definition crumb, crust, and allergen photography drives impulse dessert cravings.',
        'Seat 0 dedicated express parcel ticketing with thermal label printing support.'
      ],
      demoLink: '/manager',
      demoLabel: 'Test Bakery Stock Kill Switch',
    },
    {
      id: 'chains',
      title: 'QSR Brands & Multi-Outlet Food Chains',
      tagline: 'Centralized Cloud Menu Sync, Speed-of-Service SLAs, and Shift Cash Controls',
      icon: <Store className="w-8 h-8 text-purple-400" />,
      themeColor: 'purple',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      heroStat: '100%',
      heroStatDesc: 'Centralized visibility over cash till and digital settlements across outlets',
      problemTitle: 'The Multi-Unit Franchise Chaos',
      problems: [
        'Updating menu prices or combo promotions across 20+ franchise locations takes weeks.',
        'Franchise managers face billing leakage from unrecorded cash transactions and till shortages.',
        'Kitchen prep bottlenecks vary wildly by branch without head office visibility.',
        'Prohibitive annual software licensing fees and expensive hardware lock-ins eat store margins.'
      ],
      solutionTitle: 'The Nelja UrQR Enterprise Suite',
      solutionsList: [
        'Centralized cloud master catalog: push price updates or combo deals to 100+ stores in one click.',
        'Shift-based opening float verification and physical petty cash denomination counter.',
        'Real-time Speed-of-Service (SOS) kitchen SLA analytics highlight slowest kitchen prep stations.',
        'Runs in any standard browser: no expensive proprietary hardware to purchase or maintain.'
      ],
      demoLink: '/manager',
      demoLabel: 'Test Multi-Unit Manager ERP',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <Navbar />

      {/* Header Banner */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 border-b border-slate-900 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-r from-emerald-600/10 via-blue-600/10 to-purple-600/10 blur-[130px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <span className="text-xs font-black uppercase tracking-widest text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            Enterprise Solutions Portfolio
          </span>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mt-6 max-w-4xl mx-auto leading-tight">
            Tailored Real-Time Technology for Every Food &amp; Hospitality Operation
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Discover how Nelja UrQR adapts to the unique workflows, guest expectations, and back-of-house operations of your exact business model.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {solutions.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 transition"
              >
                {s.title.split('&')[0]}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions Deep Dive Sections */}
      <div className="divide-y divide-slate-900">
        {solutions.map((item, index) => (
          <section
            key={item.id}
            id={item.id}
            className={`py-20 md:py-28 relative scroll-mt-20 ${
              index % 2 === 1 ? 'bg-slate-900/30' : 'bg-transparent'
            }`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Section Header */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-12 border-b border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
                    {item.icon}
                  </div>
                  <div>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${item.badgeColor}`}>
                      Vertical Solution
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-1">
                      {item.title}
                    </h2>
                    <p className="text-xs sm:text-sm font-semibold text-slate-400 mt-1">
                      {item.tagline}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4">
                  <div>
                    <div className="text-3xl font-black text-white tracking-tight">
                      {item.heroStat}
                    </div>
                    <div className="text-[11px] text-slate-400 max-w-[200px] leading-tight mt-0.5">
                      {item.heroStatDesc}
                    </div>
                  </div>
                  <TrendingUp className="w-6 h-6 text-emerald-400 shrink-0" />
                </div>
              </div>

              {/* Problem vs Nelja Solution Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
                {/* Traditional Bottlenecks */}
                <div className="p-6 sm:p-8 rounded-3xl bg-rose-950/10 border border-rose-500/20 space-y-4">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-sm uppercase tracking-wider">
                    <AlertCircle className="w-4 h-4" />
                    <span>{item.problemTitle}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Legacy manual processes that hurt profitability, guest retention, and staff morale:
                  </p>
                  <ul className="space-y-3 pt-2">
                    {item.problems.map((prob, pidx) => (
                      <li key={pidx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 shrink-0" />
                        <span>{prob}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Nelja Solution Architecture */}
                <div className="p-6 sm:p-8 rounded-3xl bg-emerald-950/10 border border-emerald-500/20 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{item.solutionTitle}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    How Nelja UrQR eliminates the bottleneck with sub-50ms synchronized technology:
                  </p>
                  <ul className="space-y-3 pt-2">
                    {item.solutionsList.map((sol, sidx) => (
                      <li key={sidx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{sol}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Banner for this Vertical */}
              <div className="mt-8 p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                  <p className="text-xs sm:text-sm text-slate-300 font-medium">
                    Experience this workflow right now in our live sandbox environment.
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Link
                    href={item.demoLink}
                    target="_blank"
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition border border-slate-700 flex items-center justify-center gap-2"
                  >
                    <span>{item.demoLabel}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    onClick={() => setIsDemoModalOpen(true)}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20"
                  >
                    <span>Book Strategy Call</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Global Consultation Footer CTA */}
      <section className="py-20 bg-gradient-to-b from-slate-900 to-slate-950 border-t border-slate-900 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Have a Unique Hospitality Workflow?
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mt-4 max-w-2xl mx-auto">
            Our engineering team configures Nelja UrQR for custom hotel ERPs, multi-tenant cloud kitchens, and drive-thru operations. Talk to our systems architects.
          </p>
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition shadow-xl shadow-emerald-500/25 flex items-center gap-2 cursor-pointer"
            >
              <span>Schedule Architecture Review</span>
              <ArrowRight className="w-4 h-4" />
            </button>
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
