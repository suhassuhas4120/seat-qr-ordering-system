'use client';

import React from 'react';
import Link from 'next/link';
import { QrCode, Mail, Phone, MapPin, Sparkles, Shield, ArrowUpRight } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-400 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20">
                <QrCode className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-xl font-black tracking-tight text-white">
                Nelja <span className="text-emerald-400">UrQR</span>
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              The collaborative dining operating system built specifically for hotels, restaurants, cafes, bakeries, and high-volume food chains. Eliminating wait times, billing leaks, and hardware lock-in with sub-50ms realtime tech.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero-MDR UPI</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Sub-50ms Sockets</span>
              </div>
            </div>
          </div>

          {/* Industry Solutions */}
          <div>
            <h4 className="text-xs font-black uppercase text-white tracking-wider mb-4">
              Industry Solutions
            </h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <Link href="/solutions#hotels" className="hover:text-emerald-400 transition flex items-center gap-1">
                  <span>Hotels &amp; Resorts</span>
                  <ArrowUpRight className="w-3 h-3 opacity-60" />
                </Link>
              </li>
              <li>
                <Link href="/solutions#restaurants" className="hover:text-emerald-400 transition flex items-center gap-1">
                  <span>Fine &amp; Casual Dining</span>
                  <ArrowUpRight className="w-3 h-3 opacity-60" />
                </Link>
              </li>
              <li>
                <Link href="/solutions#cafes" className="hover:text-emerald-400 transition flex items-center gap-1">
                  <span>Cafes &amp; Coffee Shops</span>
                  <ArrowUpRight className="w-3 h-3 opacity-60" />
                </Link>
              </li>
              <li>
                <Link href="/solutions#bakeries" className="hover:text-emerald-400 transition flex items-center gap-1">
                  <span>Bakeries &amp; Patisseries</span>
                  <ArrowUpRight className="w-3 h-3 opacity-60" />
                </Link>
              </li>
              <li>
                <Link href="/solutions#chains" className="hover:text-emerald-400 transition flex items-center gap-1">
                  <span>QSRs &amp; Multi-Chains</span>
                  <ArrowUpRight className="w-3 h-3 opacity-60" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Product Engine */}
          <div>
            <h4 className="text-xs font-black uppercase text-white tracking-wider mb-4">
              Product Suite
            </h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <Link href="/seat/14" target="_blank" className="hover:text-emerald-400 transition flex items-center gap-1">
                  <span>Dynamic QR PWA</span>
                  <ArrowUpRight className="w-3 h-3 opacity-60" />
                </Link>
              </li>
              <li>
                <Link href="/kds" target="_blank" className="hover:text-emerald-400 transition flex items-center gap-1">
                  <span>Kitchen Bump KDS</span>
                  <ArrowUpRight className="w-3 h-3 opacity-60" />
                </Link>
              </li>
              <li>
                <Link href="/waiter" target="_blank" className="hover:text-emerald-400 transition flex items-center gap-1">
                  <span>Captain Floor Tablet</span>
                  <ArrowUpRight className="w-3 h-3 opacity-60" />
                </Link>
              </li>
              <li>
                <Link href="/manager" target="_blank" className="hover:text-emerald-400 transition flex items-center gap-1">
                  <span>Manager Master Portal (8-in-1)</span>
                  <ArrowUpRight className="w-3 h-3 opacity-60" />
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-emerald-400 transition">
                  Technical Architecture
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-emerald-400 transition">
                  Pricing &amp; ROI Calculator
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div>
            <h4 className="text-xs font-black uppercase text-white tracking-wider mb-4">
              Get in Touch
            </h4>
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Nelja UrQR Technologies, Indiranagar, Bengaluru, India</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <a href="tel:+919845012345" className="hover:text-white transition">
                  +91 98450 12345
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <a href="mailto:contact@neljaurqr.com" className="hover:text-white transition">
                  contact@neljaurqr.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-12 pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Nelja UrQR Technologies Pvt. Ltd. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="text-slate-400">Next-Gen Food &amp; Hospitality Engine</span>
            <span>Made with passion in India</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
