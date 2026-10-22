"use client";
/**
 * Thoogudeepa Waiter Tablet POS Cockpit - Global Header Component
 *
 * Real-world enterprise Tablet Header (64px fixed height):
 * - Clean Modern Theme with soft slate canvas and crisp white background
 * - Left Section: Authentic circular brand logo, brand title, station badge, and active waiter info
 * - Center Section: Strictly cleaned up (time, sound, and online widgets removed as requested)
 * - Right Section: Streamlined high-priority service triggers:
 *   * [ Calls (count) ] (Single PhoneCall icon with urgent rose badge)
 *   * [ Kitchen (count) ] (Single ChefHat icon with kitchen ready badge)
 *   * [ Profile ] (Person icon button for shift summary navigation)
 * - Strict line count maintained between 140 and 220 lines.
 */

import React, { useEffect, useCallback } from 'react';
import { 
  User, 
  PhoneCall,
  ChefHat
} from 'lucide-react';
import { ScreenId } from './types';

export interface TabletHeaderProps {
  /** Currently active screen route in the tablet cockpit */
  currentScreen: ScreenId;
  /** Active waiter staff name (e.g. 'Ramesh Kumar') */
  waiterName?: string;
  /** Assigned seating zone range (e.g. 'Zone 1 (Seats 01-10)') */
  assignedZone?: string;
  /** Active pending customer calls count */
  customerCallsCount: number;
  /** Active orders ready on the kitchen pass counter */
  kitchenAlertsCount: number;
  /** Number of occupied seats currently active */
  occupiedCount?: number;
  /** Station ID indicator */
  stationId?: string;
  /** Primary navigation callback to switch between screens */
  onNavigate: (screen: ScreenId) => void;
  /** Callback to trigger the right slide-over alert drawer */
  onOpenAlertSheet: (tabType: 'customer' | 'kitchen') => void;
  /** Optional audio feedback trigger */
  onPlayChime?: (tone: 'call' | 'kitchen' | 'click') => void;
}

export const TabletHeader: React.FC<TabletHeaderProps> = ({
  currentScreen,
  waiterName = 'Ramesh Kumar',
  assignedZone = 'Zone 1 (Seats 01-10)',
  customerCallsCount,
  kitchenAlertsCount,
  occupiedCount = 4,
  stationId = 'Station 01',
  onNavigate,
  onOpenAlertSheet,
  onPlayChime
}) => {
  // Alert dispatchers
  const triggerCustomerCalls = useCallback(() => {
    if (onPlayChime) onPlayChime('call');
    onOpenAlertSheet('customer');
  }, [onPlayChime, onOpenAlertSheet]);

  const triggerKitchenAlerts = useCallback(() => {
    if (onPlayChime) onPlayChime('kitchen');
    onOpenAlertSheet('kitchen');
  }, [onPlayChime, onOpenAlertSheet]);

  // Keyboard accessibility shortcuts (Alt+C for Calls, Alt+K for Kitchen, Alt+P for Profile)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        triggerCustomerCalls();
      } else if (e.altKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        triggerKitchenAlerts();
      } else if (e.altKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        onNavigate('profile');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerCustomerCalls, triggerKitchenAlerts, onNavigate]);

  return (
    <header 
      id="tablet-global-header"
      className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 select-none z-30 relative shadow-xs"
      role="banner"
      aria-label="Thoogudeepa Tablet POS Global Header"
    >
      {/* ======================================================== */}
      {/* 1. LEFT SECTION: AUTHENTIC LOGO & WAITER IDENTITY        */}
      {/* ======================================================== */}
      <div className="flex items-center gap-3">
        {/* Authentic Circular Brand Logo */}
        <div 
          className="relative group cursor-pointer shrink-0" 
          onClick={() => onNavigate('seats')}
          title="Return to Floor Board Seats"
        >
          <img
            src="/logo.jpg"
            alt="Thoogudeepa Official Logo"
            className="w-11 h-11 rounded-full object-cover ring-2 ring-amber-400/50 shadow-xs transition-transform group-hover:scale-105"
            loading="eager"
          />
          <span 
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white"
            title="POS Station Connected"
          />
        </div>

        {/* Brand & Staff Information */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold tracking-tight text-slate-900 leading-none">
              ತೂಗುದೀಪ ದೊನ್ನೆ ಬಿರಿಯಾನಿ
            </span>
            {/* Standardized Uniform Badge Size: h-6 px-2.5 text-[10px] */}
            <span className="h-6 px-2.5 inline-flex items-center justify-center text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
              {stationId}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-xs font-bold text-slate-800 leading-none">
              {waiterName}
            </span>
            <span className="text-slate-300 text-xs leading-none">•</span>
            <span className="text-[11px] font-semibold text-slate-500 leading-none">
              {assignedZone}
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. RIGHT SECTION: CALLS, KITCHEN & PROFILE TRIGGERS      */}
      {/* ======================================================== */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* BUTTON 1: CUSTOMER CALLS (Single PhoneCall Icon + Count Pill) */}
        <button
          type="button"
          onClick={triggerCustomerCalls}
          id="btn-header-calls"
          className="h-10 px-3.5 border border-slate-300 hover:border-slate-400 rounded-xl text-sm font-extrabold bg-white hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-2 shadow-2xs text-slate-900 cursor-pointer"
          title="Open Customer Seat Service Calls"
          aria-label={`Customer Calls: ${customerCallsCount} pending`}
        >
          <PhoneCall className="w-4 h-4 text-rose-600" />
          <span className="text-slate-900 font-black">Calls</span>
          <span className="h-5 px-2 min-w-[22px] inline-flex items-center justify-center text-xs font-black rounded-full bg-rose-500 text-white shadow-2xs">
            {customerCallsCount}
          </span>
        </button>

        {/* BUTTON 2: KITCHEN ORDER READY (Single ChefHat Icon + Count Pill) */}
        <button
          type="button"
          onClick={triggerKitchenAlerts}
          id="btn-header-kitchen"
          className="h-10 px-3.5 border border-slate-300 hover:border-slate-400 rounded-xl text-sm font-extrabold bg-white hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-2 shadow-2xs text-slate-900 cursor-pointer"
          title="Open Kitchen Pass Counter Alerts"
          aria-label={`Kitchen Alerts: ${kitchenAlertsCount} orders ready`}
        >
          <ChefHat className="w-4 h-4 text-emerald-600" />
          <span className="text-slate-900 font-black">Kitchen</span>
          <span className="h-5 px-2 min-w-[22px] inline-flex items-center justify-center text-xs font-black rounded-full bg-emerald-600 text-white shadow-2xs">
            {kitchenAlertsCount}
          </span>
        </button>

        {/* PERSON ICON BUTTON: DIRECT NAVIGATION TO PROFILE */}
        <button
          type="button"
          onClick={() => onNavigate('profile')}
          id="btn-header-profile"
          className={`w-10 h-10 border rounded-xl flex items-center justify-center active:scale-95 transition-all ml-0.5 shadow-2xs relative group cursor-pointer ${
            currentScreen === 'profile'
              ? 'bg-slate-900 border-slate-900 text-white font-black'
              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400'
          }`}
          title="Waiter Profile & Shift Summary"
          aria-label="Navigate to Profile and Shift Summary"
        >
          <User className="w-4 h-4 transition-transform group-hover:scale-110" />
          <span className="sr-only">My Profile & Shift Summary</span>
        </button>
      </div>
    </header>
  );
};

export default TabletHeader;
