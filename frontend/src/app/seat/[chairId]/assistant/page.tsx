'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Sparkles,
  Droplets,
  Scroll,
  Utensils,
  Sparkle,
  Disc,
  GlassWater,
  Flame,
  Bell,
  Clock,
  Pencil,
  Check,
  Send,
} from 'lucide-react';

import { useHardwareBack } from '../../../../lib/hooks/useHardwareBack';
import { realtimeBridge } from '../../../../lib/supabase';

interface QuickOption {
  id: string;
  iconName: string;
}

interface SubmittedRequest {
  id: string;
  timestamp: string;
  label?: string;
  status: 'Pending' | 'Resolved';
}

function AssistantPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();

  const chairId = (params?.chairId as string) || '12';
  const seatNumber = chairId.replace(/[^0-9]/g, '') || chairId;
  const fromParam = searchParams.get('from');

  const [activeRequests, setActiveRequests] = useState<SubmittedRequest[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [specialNote, setSpecialNote] = useState('');
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const handleBack = () => {
    if (fromParam) {
      router.push(fromParam);
    } else {
      router.back();
    }
  };

  // Device hardware back button & swipe back: return to the originating screen
  useHardwareBack(null, handleBack);

  // Load persisted requests for this seat from localStorage on mount
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(`thoogudeepa_assistant_requests_${seatNumber}`);
      if (stored) {
        const parsed: SubmittedRequest[] = JSON.parse(stored);
        const normalized = parsed.map((item) => ({
          ...item,
          status: (item.status as string) === 'Served' ? ('Resolved' as const) : item.status,
        }));
        setActiveRequests(normalized);
      }
    } catch {
      // Ignore parse errors
    }
    setIsHydrated(true);
  }, [seatNumber]);

  // Sync active requests to localStorage whenever updated
  React.useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        `thoogudeepa_assistant_requests_${seatNumber}`,
        JSON.stringify(activeRequests)
      );
    } catch {
      // Ignore storage errors
    }
  }, [activeRequests, seatNumber, isHydrated]);

  // Subscribe to real-time bridge updates for alert resolutions
  React.useEffect(() => {
    const unsub = realtimeBridge.subscribeKDS({
      onResolveAlert: (resolvedAlertId?: string) => {
        setActiveRequests((prev) => {
          let matched = false;
          const updated = prev.map((r) => {
            if (!matched && (r.id === resolvedAlertId || (!resolvedAlertId && r.status === 'Pending'))) {
              matched = true;
              return { ...r, status: 'Resolved' as const };
            }
            return r;
          });
          // If alertId didn't match directly by ID, resolve the oldest pending request
          if (!matched && prev.some((r) => r.status === 'Pending')) {
            const oldestPendingIndex = [...prev].reverse().findIndex((r) => r.status === 'Pending');
            if (oldestPendingIndex !== -1) {
              const actualIdx = prev.length - 1 - oldestPendingIndex;
              return prev.map((r, i) => (i === actualIdx ? { ...r, status: 'Resolved' as const } : r));
            }
          }
          return updated;
        });
      },
    });
    return () => unsub();
  }, []);

  const quickOptionLabels: Record<string, string> = {
    'opt-1': 'Water Refill',
    'opt-2': 'Extra Napkins',
    'opt-3': 'Fresh Cutlery',
    'opt-4': 'Table Cleaning',
    'opt-5': 'Extra Plates',
    'opt-6': 'Extra Glasses',
    'opt-7': 'Condiments / Spices',
    'opt-8': 'Service Bell Assistance',
  };

  const handleCallWaiter = () => {
    const serviceLabel = specialNote.trim() || (selectedService ? quickOptionLabels[selectedService] || 'Service Assistance' : 'Waiter Assistance Requested');
    const alertId = `call-${seatNumber}-${Date.now()}`;
    const newReq: SubmittedRequest = {
      id: alertId,
      timestamp: 'Just now',
      label: serviceLabel,
      status: 'Pending',
    };
    setActiveRequests((prev) => [newReq, ...prev]);
    setSelectedService(null);

    // Send real-time service alert to floor waitstaff
    realtimeBridge.sendServiceAlert({
      id: alertId,
      seatNumber: `Seat ${seatNumber.padStart(2, '0')}`,
      title: serviceLabel,
      message: specialNote.trim() ? `Note: ${specialNote.trim()}` : `Guest requested: ${serviceLabel}`,
      guestName: `Seat ${seatNumber} Guest`,
      type: 'customer_call',
      isUrgent: selectedService === 'opt-8' || Boolean(specialNote.trim())
    }).catch(console.error);
  };

  const quickGridOptions: QuickOption[] = [
    { id: 'opt-1', iconName: 'water' },
    { id: 'opt-2', iconName: 'napkin' },
    { id: 'opt-3', iconName: 'cutlery' },
    { id: 'opt-4', iconName: 'cleaning' },
    { id: 'opt-5', iconName: 'plate' },
    { id: 'opt-6', iconName: 'glass' },
    { id: 'opt-7', iconName: 'condiments' },
    { id: 'opt-8', iconName: 'bell' },
  ];

  const renderIcon = (name: string) => {
    switch (name) {
      case 'water':
        return <Droplets className="w-5 h-5 text-black" />;
      case 'napkin':
        return <Scroll className="w-5 h-5 text-black" />;
      case 'cutlery':
        return <Utensils className="w-5 h-5 text-black" />;
      case 'cleaning':
        return <Sparkle className="w-5 h-5 text-black" />;
      case 'plate':
        return <Disc className="w-5 h-5 text-black" />;
      case 'glass':
        return <GlassWater className="w-5 h-5 text-black" />;
      case 'condiments':
        return <Flame className="w-5 h-5 text-black" />;
      case 'bell':
      default:
        return <Bell className="w-5 h-5 text-black" />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#F9F8F5] via-[#F7F5F0] to-[#F3F1EC] text-[#1A2621] flex flex-col justify-between max-w-md mx-auto relative px-4 pt-4 pb-12">
      {/* Scrollable Upper & Middle Area */}
      <div className="w-full flex flex-col gap-4">
        {/* Top Header Row */}
        <header className="w-full flex items-center justify-between py-2 border-b border-[#DCE2DE]/60 pb-3">
          {/* Back Navigation Button */}
          <button
            type="button"
            onClick={handleBack}
            className="w-10 h-10 border border-[#DCE2DE] rounded-xl flex items-center justify-center cursor-pointer active:opacity-70 bg-[#FFFEFC] text-[#1A2621] shadow-xs"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Seat Tag Center */}
          <div className="flex items-center gap-1.5 border border-[#244436]/20 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#244436]/5 text-[#244436]">
            <span>Seat #{seatNumber}</span>
          </div>

          {/* Spacer to keep center balanced */}
          <div className="w-10 h-10" />
        </header>

        {/* Hero Banner / Card Top */}
        <div className="w-full border border-[#DCE2DE] rounded-3xl p-4 flex items-center justify-between bg-[#FFFEFC] shadow-[0_4px_20px_-4px_rgba(36,68,54,0.06)]">
          <div className="flex flex-col gap-1 flex-1">
            <h1 className="text-xl font-black tracking-tight text-[#1A2621]">Call Waiter</h1>
            <p className="text-xs text-[#5A6860] font-medium">Need something? We&apos;re here to help.</p>
          </div>
          {/* Circular Illustration Placeholder */}
          <div className="w-16 h-16 rounded-full border border-[#DCE2DE] flex items-center justify-center shrink-0 bg-[#F4F1EA]">
            <div className="w-8 h-8 rounded-full border border-[#244436]/20 flex items-center justify-center bg-white shadow-xs">
              <Sparkles className="w-4 h-4 text-[#244436]" />
            </div>
          </div>
        </div>

        {/* Section 1: 2x4 Quick Service Grid Card */}
        <div className="w-full border border-[#DCE2DE] rounded-3xl p-4 flex flex-col gap-3 bg-[#FFFEFC] shadow-[0_4px_20px_-4px_rgba(36,68,54,0.06)]">
          {/* Section Header with Quick Assistance Title */}
          <div className="w-full flex items-center justify-between pb-1 border-b border-[#DCE2DE]/60">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full border border-[#244436]/30 flex items-center justify-center bg-[#244436]/5">
                <Sparkles className="w-3 h-3 text-[#244436]" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-wider text-[#1A2621]">Quick Assistance</h2>
            </div>
            <span className="text-[10px] text-[#5A6860] font-bold uppercase tracking-wider">Tap to request</span>
          </div>

          {/* 2-Column Grid with 8 service items */}
          <div className="grid grid-cols-2 gap-2.5">
            {quickGridOptions.map((opt) => {
              const isSelected = selectedService === opt.id;
              const label = quickOptionLabels[opt.id] || 'Assistance';
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedService(opt.id)}
                  className={`w-full border rounded-2xl p-2.5 flex items-center text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#244436] bg-[#244436]/10 shadow-xs'
                      : 'border-[#DCE2DE] bg-white hover:border-[#244436]/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 w-full">
                    <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-[#244436] bg-[#244436] text-white' : 'border-[#DCE2DE] bg-[#F4F1EA] text-[#244436]'
                    }`}>
                      {renderIcon(opt.iconName)}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[11px] font-bold text-[#1A2621] truncate">{label}</span>
                      <span className="text-[9px] text-[#5A6860]">Request item</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Inline Information Strip */}
          <div className="w-full border border-[#DCE2DE] rounded-xl p-2.5 flex items-center gap-2.5 bg-[#F4F1EA]/60">
            <div className="w-6 h-6 rounded-full border border-[#244436]/30 flex items-center justify-center shrink-0 bg-white">
              <span className="text-[10px] font-black text-[#244436]">i</span>
            </div>
            <p className="text-[11px] text-[#5A6860] leading-tight">
              Waitstaff receives your prompt immediately on their tablet cockpit.
            </p>
          </div>
        </div>

        {/* Section 2: Recent Requests Container */}
        <div className="w-full border border-[#DCE2DE] rounded-3xl p-4 flex flex-col gap-3 bg-[#FFFEFC] shadow-[0_4px_20px_-4px_rgba(36,68,54,0.06)]">
          {/* Section Header with Your Requests Title */}
          <div className="w-full flex items-center justify-between pb-1 border-b border-[#DCE2DE]/60">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full border border-[#244436]/30 flex items-center justify-center bg-[#244436]/5">
                <Clock className="w-3 h-3 text-[#244436]" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-wider text-[#1A2621]">Your Requests</h2>
            </div>
            {/* Dynamic Counter pill */}
            {activeRequests.filter(r => r.status === 'Pending').length > 0 ? (
              <div className="border border-[#DD6B28]/30 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#DD6B28]/10 text-[#DD6B28] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#DD6B28] animate-pulse" />
                <span>{activeRequests.filter(r => r.status === 'Pending').length} Pending</span>
              </div>
            ) : (
              <div className="border border-[#244436]/30 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#244436]/10 text-[#244436] flex items-center gap-1">
                <Check className="w-3 h-3 text-[#244436]" />
                <span>No Pending</span>
              </div>
            )}
          </div>

          {/* Dynamic List of Active Requests */}
          <div className="w-full flex flex-col gap-2">
            {activeRequests.length === 0 ? (
              <div className="w-full py-3 text-center border border-dashed border-[#DCE2DE] rounded-2xl bg-white/50">
                <span className="text-[11px] text-[#5A6860] font-medium">No recent requests</span>
              </div>
            ) : (
              activeRequests.map((req, idx) => (
                <div
                  key={req.id || idx}
                  className="w-full border border-[#DCE2DE] rounded-2xl p-2.5 flex items-center justify-between bg-white shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                    <div className="w-9 h-9 rounded-full border border-[#DCE2DE] flex items-center justify-center shrink-0 bg-[#F4F1EA] text-[#244436]">
                      {req.status === 'Resolved' ? (
                        <Check className="w-4 h-4 text-[#244436]" />
                      ) : (
                        <Clock className="w-4 h-4 text-[#DD6B28]" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-[#1A2621] truncate">{req.label || 'Service Alert'}</span>
                      <span className="text-[10px] text-[#5A6860]">{req.timestamp}</span>
                    </div>
                  </div>

                  <div className="flex items-center shrink-0">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      req.status === 'Resolved'
                        ? 'bg-[#244436]/10 text-[#244436] border border-[#244436]/30'
                        : 'bg-[#DD6B28]/10 text-[#DD6B28] border border-[#DD6B28]/30'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Special Request Input Row */}
          <div className="w-full border border-[#DCE2DE] rounded-2xl p-2.5 flex items-center justify-between bg-white gap-2 shadow-xs">
            <div className="w-8 h-8 rounded-full border border-[#DCE2DE] flex items-center justify-center shrink-0 bg-[#F4F1EA]">
              <Pencil className="w-3.5 h-3.5 text-[#244436]" />
            </div>
            <input
              type="text"
              value={specialNote}
              onChange={(e) => setSpecialNote(e.target.value)}
              placeholder="Custom note for waitstaff..."
              className="flex-1 text-xs outline-none bg-transparent text-[#1A2621] placeholder-[#5A6860]/50"
            />
            {specialNote.trim().length > 0 && (
              <button
                type="button"
                onClick={() => {
                  handleCallWaiter();
                  setSpecialNote('');
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-gradient-to-r from-[#244436] to-[#DD6B28] text-white shrink-0 cursor-pointer active:opacity-85 shadow-xs"
                aria-label="Submit note"
              >
                <Send className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Primary Action Button at Bottom */}
      <div className="w-full pt-4 sticky bottom-3 bg-gradient-to-t from-[#F3F1EC] via-[#F3F1EC]/90 to-transparent backdrop-blur-xs">
        <button
          type="button"
          onClick={handleCallWaiter}
          className="w-full flex items-center justify-between bg-gradient-to-r from-[#244436] to-[#DD6B28] text-white py-3.5 px-5 rounded-2xl cursor-pointer active:opacity-90 transition-opacity shadow-[0_4px_16px_rgba(36,68,54,0.2)] hover:opacity-95"
        >
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <Bell className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1 flex items-center justify-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-white">
              Call Waiter
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F9F8F5]" />}>
      <AssistantPageContent />
    </Suspense>
  );
}
