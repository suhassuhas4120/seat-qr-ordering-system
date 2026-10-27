'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Send, 
  CheckCircle2, 
  Building2, 
  UtensilsCrossed, 
  Coffee, 
  Cake, 
  Store,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    venueName: '',
    fullName: '',
    phone: '',
    email: '',
    businessType: 'restaurant',
    seatsCount: '25-50',
    city: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.venueName || !formData.phone || !formData.fullName) {
      toast.error('Please enter your venue name, full name, and phone number');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      // Save lead to local storage
      const existing = JSON.parse(localStorage.getItem('nelja_leads') || '[]');
      existing.push({
        ...formData,
        submittedAt: new Date().toISOString(),
      });
      localStorage.setItem('nelja_leads', JSON.stringify(existing));

      setIsSubmitting(false);
      setIsSuccess(true);
      toast.success('Consultation request received! Our solution architect will call you shortly.');
    }, 700);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <Navbar />

      {/* Header Banner */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 border-b border-slate-900 overflow-hidden text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-emerald-600/10 via-teal-600/10 to-blue-600/10 blur-[130px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <span className="text-xs font-black uppercase tracking-widest text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            Get In Touch
          </span>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mt-6 max-w-4xl mx-auto leading-tight">
            Let's Modernize Your Dining Operation
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Speak directly with our solution architects. We will tailor a live demonstration for your specific hotel, restaurant, cafe, or bakery.
          </p>
        </div>
      </section>

      {/* Contact Content Grid */}
      <section className="py-20 md:py-28 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Direct Contact Info */}
            <div className="lg:col-span-5 space-y-8">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  Nelja UrQR Technologies
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Headquartered in Bengaluru with on-site deployment partners across major metro and tier-1 food hubs in India.
                </p>
              </div>

              <div className="space-y-6 text-xs">
                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <MapPin className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-white text-sm">Headquarters</h5>
                    <p className="text-slate-400 mt-1 leading-relaxed">
                      Nelja UrQR Technologies Pvt. Ltd.,<br />
                      100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <Phone className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-white text-sm">Phone &amp; WhatsApp</h5>
                    <p className="text-slate-400 mt-1">
                      Direct Hotline:{' '}
                      <a href="tel:+919845012345" className="text-emerald-400 font-bold hover:underline">
                        +91 98450 12345
                      </a>
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Available Mon - Sat, 9:00 AM - 9:00 PM IST
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <Mail className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-white text-sm">Email Inquiries</h5>
                    <p className="text-slate-400 mt-1">
                      Sales:{' '}
                      <a href="mailto:contact@neljaurqr.com" className="text-emerald-400 hover:underline">
                        contact@neljaurqr.com
                      </a>
                    </p>
                    <p className="text-slate-400">
                      Enterprise RFPs:{' '}
                      <a href="mailto:enterprise@neljaurqr.com" className="text-emerald-400 hover:underline">
                        enterprise@neljaurqr.com
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Live Portal Sandboxes */}
              <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Instant Self-Guided Preview
                </span>
                <p className="text-xs text-slate-300 mt-1">
                  Want to explore before booking a call?
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Link
                    href="/seat/14"
                    target="_blank"
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold transition"
                  >
                    Guest QR
                  </Link>
                  <Link
                    href="/kds"
                    target="_blank"
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold transition"
                  >
                    Kitchen KDS
                  </Link>
                  <Link
                    href="/waiter"
                    target="_blank"
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 font-bold transition"
                  >
                    Waiter POS
                  </Link>
                  <Link
                    href="/manager"
                    target="_blank"
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold transition"
                  >
                    Manager ERP
                  </Link>
                </div>
              </div>
            </div>

            {/* Lead Form */}
            <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
              {isSuccess ? (
                <div className="text-center py-16 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-white">
                    Thank You, {formData.fullName}!
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                    We have received your details for <strong>{formData.venueName}</strong>. A dedicated Nelja UrQR hospitality consultant will reach out via WhatsApp/Phone at <strong>{formData.phone}</strong> within 30 minutes.
                  </p>
                  <div className="pt-4">
                    <button
                      onClick={() => {
                        setIsSuccess(false);
                        setFormData({
                          venueName: '',
                          fullName: '',
                          phone: '',
                          email: '',
                          businessType: 'restaurant',
                          seatsCount: '25-50',
                          city: '',
                          message: ''
                        });
                      }}
                      className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
                    >
                      Submit Another Inquiry
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <h3 className="text-xl font-black text-white">
                      Request 1-on-1 Consultation
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Fill out this quick form and we'll prepare a custom operational plan.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">
                        Restaurant / Hotel Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Donne Biryani Mane"
                        value={formData.venueName}
                        onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">
                        Your Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. S. Kumar"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">
                        Phone / WhatsApp Number *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. +91 98450 XXXXX"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">
                        Business Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="e.g. manager@hotel.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">
                        Business Vertical
                      </label>
                      <select
                        value={formData.businessType}
                        onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="hotel">Hotels &amp; Luxury Resorts</option>
                        <option value="restaurant">Casual &amp; Fine Dining Restaurant</option>
                        <option value="cafe">Cafe &amp; Specialty Coffee Bar</option>
                        <option value="bakery">Bakery &amp; Patisserie</option>
                        <option value="chain">Multi-Outlet Food Chain / QSR</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">
                        Seating / Counter Capacity
                      </label>
                      <select
                        value={formData.seatsCount}
                        onChange={(e) => setFormData({ ...formData, seatsCount: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="1-25">1 to 25 Seats / Counters</option>
                        <option value="25-50">25 to 50 Seats</option>
                        <option value="50-100">50 to 100 Seats (Full Matrix)</option>
                        <option value="100+">100+ Seats / Multi-Store Chain</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      City / Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bengaluru, Hyderabad, Mumbai, Delhi NCR"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Specific Requirements or Current Challenges
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Looking to eliminate weekend checkout queues and implement zero-MDR UPI for 4 outlets..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Sending Request...</span>
                    ) : (
                      <>
                        <span>Submit Consultation Request</span>
                        <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
