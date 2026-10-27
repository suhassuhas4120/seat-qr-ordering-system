'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, Sparkles, Building2, Phone, Mail, User, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface DemoBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSector?: string;
}

export function DemoBookingModal({ isOpen, onClose, defaultSector }: DemoBookingModalProps) {
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [sector, setSector] = useState(defaultSector || 'Restaurant');
  const [outlets, setOutlets] = useState('1');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !businessName || !phone) {
      toast.error('Please fill in your name, business name, and phone number.');
      return;
    }

    const leadData = {
      id: `lead-${Date.now()}`,
      name,
      businessName,
      phone,
      email,
      city,
      sector,
      outlets,
      submittedAt: new Date().toISOString(),
    };

    try {
      const existingRaw = localStorage.getItem('nelja_urqr_demo_leads');
      const leads = existingRaw ? JSON.parse(existingRaw) : [];
      leads.unshift(leadData);
      localStorage.setItem('nelja_urqr_demo_leads', JSON.stringify(leads));
    } catch {}

    setSubmitted(true);
    toast.success('Demo request scheduled! Our product specialist will call you shortly.');
  };

  const handleReset = () => {
    setSubmitted(false);
    setName('');
    setBusinessName('');
    setPhone('');
    setEmail('');
    setCity('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl text-white overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={handleReset}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Nelja UrQR Live Walkthrough</span>
            </div>
            <h3 className="text-2xl font-black tracking-tight text-white">
              Book a Personalized Product Demo
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              See how Nelja UrQR accelerates table turnover, eliminates order errors, and boosts revenue across your outlets.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Your Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vikram Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Business Name *</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Royal Grand Hotel / Cafe Bliss"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Phone Number *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="vikram@brand.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Business Type</label>
                  <select
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 transition font-medium"
                  >
                    <option value="Restaurant">Restaurant (Dine-in)</option>
                    <option value="Hotel">Hotel &amp; Resort</option>
                    <option value="Cafe">Cafe &amp; Coffee Shop</option>
                    <option value="Bakery">Bakery &amp; Patisserie</option>
                    <option value="Food Chain">QSR &amp; Food Chain</option>
                    <option value="Bar & Pub">Bar &amp; Brewery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">City</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Bengaluru"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">No. of Outlets</label>
                  <select
                    value={outlets}
                    onChange={(e) => setOutlets(e.target.value)}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 transition font-medium"
                  >
                    <option value="1">1 Outlet</option>
                    <option value="2-5">2 - 5 Outlets</option>
                    <option value="6-20">6 - 20 Outlets</option>
                    <option value="20+">20+ Outlets / Franchise</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black py-3 rounded-xl transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  <span>Confirm Live Demo Booking</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
                <p className="text-center text-[10px] text-slate-500 mt-2">
                  No credit card required. Free onboarding &amp; custom menu digitisation included.
                </p>
              </div>
            </form>
          </div>
        ) : (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-2xl font-black text-white">
              Thank You, {name}!
            </h4>
            <p className="text-slate-300 text-xs max-w-sm mx-auto leading-relaxed">
              We have received your request for <strong className="text-white">{businessName}</strong>. Our Nelja UrQR solution architect will contact you within 2 business hours.
            </p>
            <div className="pt-4">
              <button
                onClick={handleReset}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-2 rounded-xl text-xs transition"
              >
                Close Window
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
