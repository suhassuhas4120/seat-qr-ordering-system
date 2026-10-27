'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Cpu, 
  Zap, 
  ShieldCheck, 
  Layers, 
  Smartphone, 
  ChefHat, 
  Tablet, 
  LayoutDashboard, 
  Printer, 
  Wifi, 
  CheckCircle2, 
  ArrowRight, 
  Database, 
  Lock, 
  RefreshCw, 
  CreditCard, 
  Scale, 
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { DemoBookingModal } from '@/components/marketing/DemoBookingModal';

export default function FeaturesPage() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  const corePillars = [
    {
      title: 'Sub-50ms WebSocket State Engine',
      category: 'Real-Time Networking',
      icon: <Zap className="w-6 h-6 text-amber-400" />,
      description: 'Unlike legacy POS systems that poll every 15-45 seconds, Nelja UrQR maintains persistent, low-overhead WebSocket duplex connections between customer browser PWAs, kitchen bump bars, waiter tablets, and manager consoles.',
      specs: [
        'Fastify & Node.js event-driven high-throughput gateway',
        'Item-level state synchronization (NEW → PREP → READY → SERVED)',
        'Zero manual browser refreshes needed across all 100 seats',
        'Automatic exponential backoff reconnection on intermittent WiFi'
      ]
    },
    {
      title: 'Cryptographic Anti-Tamper Dynamic QR',
      category: 'Venue Security',
      icon: <Lock className="w-6 h-6 text-emerald-400" />,
      description: 'Prevents fraudulent ordering from outside the venue. Each seat QR code incorporates time-based cryptographic salts and epoch tokens that validate physical guest presence at the exact table.',
      specs: [
        'Seat-level physical presence validation algorithm',
        'Prevents off-premise URL sharing or bookmark pranks',
        'Dynamic epoch rotation with zero disruption to active dining carts',
        'Compatible with standard vector SVG standee printing'
      ]
    },
    {
      title: 'Zero-MDR Direct-to-Bank UPI Gateway',
      category: 'Financial Efficiency',
      icon: <CreditCard className="w-6 h-6 text-blue-400" />,
      description: 'Traditional aggregators and card swiping machines deduct 1.8% to 3.5% on every transaction. Nelja UrQR connects directly to your merchant VPA using dynamic NPCI UPI QR strings with zero intermediary cuts.',
      specs: [
        'Instant settlement directly into your business bank account',
        'Zero Merchant Discount Rate (0% MDR) on UPI transactions',
        'Supports Google Pay, PhonePe, Paytm, CRED, and BHIM',
        'Real-time transaction UTR reconciliation in Manager Screen #7'
      ]
    },
    {
      title: 'Hardware-Agnostic PWA Architecture',
      category: 'Infrastructure',
      icon: <Smartphone className="w-6 h-6 text-purple-400" />,
      description: 'Zero proprietary hardware lock-in. Nelja UrQR operates natively in any web browser across iOS, Android, iPadOS, macOS, Windows, and Smart TV browsers, eliminating capital expenditures.',
      specs: [
        'Zero customer app installation: loads in under 1 second',
        'Waiters can use standard Android or iOS pocket smartphones',
        'Kitchen display runs on any wall-mounted smart TV or tablet',
        'Manager ERP runs smoothly on laptops, tablets, or desktop terminals'
      ]
    },
    {
      title: '80mm & 58mm ESC/POS Thermal Printing',
      category: 'Hardware Integration',
      icon: <Printer className="w-6 h-6 text-indigo-400" />,
      description: 'Seamless integration with industry-standard thermal printers for physical KOT tickets, customer tax invoices, and parcel slips with automatic cut commands.',
      specs: [
        'Direct browser printing with pre-formatted 80mm and 58mm layouts',
        'Supports USB, Ethernet LAN, and Bluetooth thermal printers',
        'Configurable KOT routing by preparation station (Grill, Bar, Pastry)',
        'Includes tax breakdowns, GSTIN, seat number, and cashier identifier'
      ]
    },
    {
      title: 'Offline Resilient Local Queueing',
      category: 'Reliability',
      icon: <Wifi className="w-6 h-6 text-rose-400" />,
      description: 'If venue internet drops temporarily, customer carts and waiter orders queue locally in browser storage and replay automatically the millisecond connection resumes.',
      specs: [
        'IndexedDB local offline state persistence',
        'Non-blocking UI allows waiters to continue floor operations',
        'Visual offline indicator with one-click queue resync trigger',
        'Zero duplicate order collisions guaranteed by unique idempotency keys'
      ]
    }
  ];

  const managerModules = [
    { id: 'M01', name: 'Opening Cash Float & Shift Register', desc: 'Denomination verification and shift start lock' },
    { id: 'M02', name: '100-Seat Floor Matrix Radar', desc: 'Real-time occupied, billing, and vacant seat radar' },
    { id: 'M03', name: 'Live Bill Settlements & Cash Collection', desc: 'Split bills, cashier handovers, and UPI verification' },
    { id: 'M04', name: 'Speed of Service (SOS) SLA Radar', desc: 'Average ticket prep times and kitchen bottleneck alerts' },
    { id: 'M05', name: 'Staff Tip Pool & Shift Allocation', desc: 'Fair, transparent tip distribution based on hours logged' },
    { id: 'M06', name: 'Instant 86 Stock Kill Switch', desc: '1-Tap instant disabling of sold-out menu items' },
    { id: 'M07', name: 'Settled Sales & Revenue Audits', desc: 'Real-time revenue reports with instant CSV exports' },
    { id: 'M08', name: 'Petty Cash Expenses Till', desc: 'Track daily vendor payouts, ice, milk, and gas vouchers' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <Navbar />

      {/* Header Banner */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 border-b border-slate-900 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[320px] bg-gradient-to-r from-emerald-600/10 via-teal-600/10 to-blue-600/10 blur-[130px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <span className="text-xs font-black uppercase tracking-widest text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            Technology &amp; Architecture
          </span>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mt-6 max-w-4xl mx-auto leading-tight">
            Engineered for Sub-50ms Speed, Zero Downtime, and Maximum Margin
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Nelja UrQR was architected from the ground up to eliminate the latency, hardware fragility, and billing leaks that plague legacy hospitality software.
          </p>

          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
            >
              <span>Request Technical Whitepaper</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Architectural Pillars Grid */}
      <section className="py-20 md:py-28 relative border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              6 Core Architectural Pillars
            </h2>
            <p className="text-slate-400 text-sm mt-3">
              Explore the engineering innovations that set Nelja UrQR apart from legacy desktop systems.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {corePillars.map((pillar, idx) => (
              <div
                key={idx}
                className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700/60">
                      {pillar.icon}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-0.5 rounded bg-slate-800/80">
                      {pillar.category}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">
                    {pillar.title}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    {pillar.description}
                  </p>

                  <div className="space-y-2.5 pt-4 border-t border-slate-800">
                    {pillar.specs.map((spec, sidx) => (
                      <div key={sidx} className="flex items-start gap-2.5 text-xs text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{spec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Manager ERP 8 Modules Showcase */}
      <section className="py-20 md:py-28 bg-slate-900/40 relative border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-black uppercase tracking-widest text-rose-400 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
              Command Suite
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-4">
              8-in-1 Master Manager ERP Architecture
            </h2>
            <p className="text-slate-400 text-sm mt-3">
              Everything required to run a multi-million-rupee hospitality operation with zero financial leakage.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {managerModules.map((mod) => (
              <div
                key={mod.id}
                className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 transition group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-rose-400 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                    {mod.id}
                  </span>
                  <LayoutDashboard className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition" />
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-rose-300 transition">
                  {mod.name}
                </h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {mod.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/manager"
              target="_blank"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-rose-500/20"
            >
              <span>Launch Live Manager Terminal (All 8 Modules)</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Technology Stack Specifications */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  Built on Modern Foundations
                </span>
                <h3 className="text-2xl font-black text-white tracking-tight mt-2">
                  Technical Specifications
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Designed for enterprise reliability, high concurrent seat traffic, and zero memory leaks.
                </p>
              </div>

              <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs">
                <div>
                  <h5 className="font-bold text-white uppercase tracking-wider text-[11px] mb-2">Frontend Stack</h5>
                  <ul className="space-y-1.5 text-slate-400">
                    <li>Next.js 14 App Router</li>
                    <li>React 18 Concurrent Mode</li>
                    <li>Tailwind CSS Responsive</li>
                    <li>Lucide Vector Icons</li>
                    <li>Sonner Toast Notifications</li>
                  </ul>
                </div>

                <div>
                  <h5 className="font-bold text-white uppercase tracking-wider text-[11px] mb-2">Backend Hub</h5>
                  <ul className="space-y-1.5 text-slate-400">
                    <li>Node.js + TypeScript</li>
                    <li>Fastify 4.x Micro-framework</li>
                    <li>WebSocket State Broadcasting</li>
                    <li>Strict Schema Validation</li>
                    <li>CORS &amp; CSRF Protected</li>
                  </ul>
                </div>

                <div>
                  <h5 className="font-bold text-white uppercase tracking-wider text-[11px] mb-2">Reliability &amp; Scale</h5>
                  <ul className="space-y-1.5 text-slate-400">
                    <li>99.99% Uptime Architecture</li>
                    <li>Sub-50ms Global PTT</li>
                    <li>100-Seat Simultaneous Tabs</li>
                    <li>Zero Memory Leak Cycles</li>
                    <li>Instant CSV Audit Export</li>
                  </ul>
                </div>
              </div>
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
