'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  QrCode, 
  ChevronDown, 
  Smartphone, 
  ChefHat, 
  Tablet, 
  LayoutDashboard, 
  Printer, 
  Menu, 
  X, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { DemoBookingModal } from './DemoBookingModal';

export function Navbar() {
  const pathname = usePathname();
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isPortalDropdownOpen, setIsPortalDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Solutions', href: '/solutions' },
    { label: 'Features', href: '/features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  const demoPortals = [
    {
      title: 'Customer Dynamic QR',
      description: 'Seat 14 collaborative dining, live dish progress & UPI pay',
      href: '/seat/14',
      icon: <Smartphone className="w-4 h-4 text-emerald-400" />,
      badge: 'Interactive',
    },
    {
      title: 'Kitchen Display (KDS)',
      description: 'Live order bump bar, item timers & stage transitions',
      href: '/kds',
      icon: <ChefHat className="w-4 h-4 text-amber-400" />,
      badge: 'Live Sync',
    },
    {
      title: 'Captain Waiter POS',
      description: '100-seat live floor matrix, cash collection & alerts',
      href: '/waiter',
      icon: <Tablet className="w-4 h-4 text-blue-400" />,
      badge: 'Staff App',
    },
    {
      title: 'Manager Master Portal',
      description: '8-module command center, revenue, stocks & petty till',
      href: '/manager',
      icon: <LayoutDashboard className="w-4 h-4 text-rose-400" />,
      badge: 'Command',
    },
    {
      title: 'Dynamic QR Batch Print',
      description: 'High-density QR matrix for 100 seats and takeaway',
      href: '/qrs',
      icon: <Printer className="w-4 h-4 text-indigo-400" />,
      badge: 'Print Ready',
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <QrCode className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                  Nelja <span className="text-emerald-400">UrQR</span>
                </span>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase -mt-0.5">
                Food &amp; Hospitality Tech
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                    isActive
                      ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            {/* Live Demos Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPortalDropdownOpen(!isPortalDropdownOpen)}
                onBlur={() => setTimeout(() => setIsPortalDropdownOpen(false), 200)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900 transition flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Live Portals</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isPortalDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150 z-50">
                  <div className="px-3 py-2 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-800/80 mb-1">
                    Direct Working Sandbox Demos
                  </div>
                  {demoPortals.map((portal) => (
                    <Link
                      key={portal.title}
                      href={portal.href}
                      target="_blank"
                      className="p-2.5 rounded-xl hover:bg-slate-800/80 flex items-start gap-3 transition group text-left"
                    >
                      <div className="p-2 rounded-lg bg-slate-800 border border-slate-700/60 mt-0.5 group-hover:scale-105 transition-transform">
                        {portal.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                            {portal.title}
                          </span>
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {portal.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {portal.description}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Action Button */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 px-5 py-2.5 rounded-xl text-xs font-black transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Book a Demo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile menu trigger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="bg-emerald-500 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold"
            >
              Demo
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 pt-3 pb-6 space-y-3">
            <div className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-900"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-3 block mb-2">
                Launch Live Portals
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/seat/14"
                  target="_blank"
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-emerald-300 flex items-center gap-2"
                >
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Customer QR</span>
                </Link>
                <Link
                  href="/kds"
                  target="_blank"
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-amber-300 flex items-center gap-2"
                >
                  <ChefHat className="w-4 h-4 text-amber-400" />
                  <span>Kitchen KDS</span>
                </Link>
                <Link
                  href="/waiter"
                  target="_blank"
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-blue-300 flex items-center gap-2"
                >
                  <Tablet className="w-4 h-4 text-blue-400" />
                  <span>Waiter POS</span>
                </Link>
                <Link
                  href="/manager"
                  target="_blank"
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-rose-300 flex items-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4 text-rose-400" />
                  <span>Manager (8-in-1)</span>
                </Link>
              </div>
            </div>

            <div className="pt-3">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsDemoModalOpen(true);
                }}
                className="w-full bg-emerald-500 text-slate-950 font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <span>Book 1-on-1 Consultation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </header>

      <DemoBookingModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </>
  );
}
