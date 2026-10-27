'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  QrCode, 
  Sparkles, 
  HeartHandshake, 
  ShieldCheck, 
  Zap, 
  Users, 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  Target, 
  Eye, 
  Award,
  Flame,
  ChefHat
} from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { DemoBookingModal } from '@/components/marketing/DemoBookingModal';

export default function AboutPage() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  const values = [
    {
      icon: <Zap className="w-6 h-6 text-amber-400" />,
      title: 'Sub-50ms Obsession',
      desc: 'In hospitality, seconds dictate customer satisfaction. We obsess over milliseconds so your kitchen, waiters, and guests never wait for a spinner.'
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
      title: 'Zero Commission Exploitation',
      desc: 'We reject high 3-5% transaction cuts. Restaurants should keep their hard-earned profits. We build zero-MDR direct-to-bank UPI rails.'
    },
    {
      icon: <ChefHat className="w-6 h-6 text-rose-400" />,
      title: 'Kitchen-First Ergonomics',
      desc: 'Software must work in real, loud, sauce-splashed commercial kitchens. High contrast, large touch targets, and instant bump feedback.'
    },
    {
      icon: <HeartHandshake className="w-6 h-6 text-blue-400" />,
      title: 'Human Hospitality First',
      desc: 'Technology should amplify human warmth, not replace it. Waiters are freed from paper-shuffling so they can deliver attentive hospitality.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <Navbar />

      {/* Hero Banner */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 border-b border-slate-900 overflow-hidden text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[320px] bg-gradient-to-r from-emerald-600/10 via-teal-600/10 to-indigo-600/10 blur-[130px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <span className="text-xs font-black uppercase tracking-widest text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            About Nelja UrQR
          </span>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mt-6 max-w-4xl mx-auto leading-tight">
            We Are Redefining How the World Dines Out
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Born from a simple conviction: dining out should be joyful, seamless, and free of long waiting lines, billing errors, and predatory software fees.
          </p>
        </div>
      </section>

      {/* The Story Section */}
      <section className="py-20 md:py-28 relative border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                Our Genesis
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                From Chaotic Friday Night Dinner Rushes to an Engineered Operating System
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Nelja UrQR was founded by a team of hospitality operators and real-time distributed systems engineers in Bengaluru. We witnessed firsthand the painful reality of restaurant rush hours:
              </p>
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 text-xs sm:text-sm text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>Diners waving at overwhelmed waitstaff for 20 minutes just to pay a bill.</span>
                </div>
                <div className="flex items-start gap-3 text-xs sm:text-sm text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>Chefs screaming over missing, sauce-soaked paper KOT slips.</span>
                </div>
                <div className="flex items-start gap-3 text-xs sm:text-sm text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>Aggregator platforms charging 2-5% commission on the restaurant's own dine-in customers.</span>
                </div>
              </div>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed pt-2">
                We realized that dining didn't need another generic PDF menu viewer. It needed a <strong>collaborative real-time operating system</strong> where guests, chefs, captains, and managers communicate simultaneously with zero latency. That is Nelja UrQR.
              </p>
            </div>

            <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <QrCode className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">Nelja UrQR Technologies</h4>
                  <p className="text-xs text-slate-400">Bengaluru, Karnataka, India</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-4 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Industry:</span>
                  <strong className="text-white">Hotels, Restaurants, Cafes &amp; Bakeries</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Core Architecture:</span>
                  <strong className="text-white">Next.js 14 + Fastify WebSockets</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Transaction Fee:</span>
                  <strong className="text-emerald-400">₹0 (Zero-MDR Direct UPI)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Hardware Requirement:</span>
                  <strong className="text-white">Hardware Agnostic (Any Device)</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Principles */}
      <section className="py-20 md:py-28 bg-slate-900/40 relative border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-black uppercase tracking-widest text-amber-400 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              Our Core DNA
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-4">
              The Principles That Guide Every Line of Code
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="p-3 rounded-xl bg-slate-800 w-fit mb-4">
                    {v.icon}
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">
                    {v.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {v.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Partner With Nelja UrQR
          </h2>
          <p className="text-slate-400 text-sm mt-3 max-w-xl mx-auto">
            Whether you operate a 15-seat artisanal espresso bar or a 50-property hotel chain, we are ready to elevate your guest experience.
          </p>
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition shadow-xl shadow-emerald-500/25 flex items-center gap-2 cursor-pointer"
            >
              <span>Schedule Founders Call</span>
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
