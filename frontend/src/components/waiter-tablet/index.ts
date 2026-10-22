/**
 * Thoogudeepa Waiter Tablet POS Cockpit - Component Library & Module Index
 *
 * Real-world enterprise Waiter Tablet Cockpit Component Suite:
 * - TabletLogin: Left-right balanced landscape login with authentic circular logo and PIN keypad
 * - TabletHeader: Global top navigation without clunky center tabs (calls, kitchen, profile actions)
 * - TabletFloorGrid: 100-seat architecture floor board with real-world color coding (amber, emerald, rose)
 * - TabletMenuCatalog: 60% split screen menu ordering panel with search, categories, and steppers
 * - TabletLiveTicket: 40% live order ticket with kitchen lifecycle status badges and KOT firing
 * - TabletBillSettlement: In-container tax invoice settlement with UPI QR and cash tender calculator
 * - TabletAlertSheet: Right slide-over service drawer for customer seat calls and kitchen pass counter
 * - TabletProfileShift: Waiter shift summary, tender breakdown, and handover reports (NO bell in header)
 * - TabletCockpitMaster: Root orchestrator managing navigation, state, alerts, and 1024x768 frame
 *
 * Strict Compliance:
 * - All components designed with clean enterprise borders (no harsh wireframe outlines)
 * - Authentic circular brand logo integrated with proper spacing and visualization
 * - Every component file strictly maintained within 300 to 400 lines (never exceeds 400).
 */

// ============================================================================
// 1. COMPONENT EXPORTS
// ============================================================================
export { TabletLogin } from './TabletLogin';
export type { TabletLoginProps } from './TabletLogin';

export { TabletHeader } from './TabletHeader';
export type { TabletHeaderProps } from './TabletHeader';

export { TabletFloorGrid } from './TabletFloorGrid';
export type { TabletFloorGridProps } from './TabletFloorGrid';

export { TabletMenuCatalog } from './TabletMenuCatalog';
export type { TabletMenuCatalogProps } from './TabletMenuCatalog';

export { TabletLiveTicket } from './TabletLiveTicket';
export type { TabletLiveTicketProps } from './TabletLiveTicket';

export { TabletBillSettlement } from './TabletBillSettlement';
export type { TabletBillSettlementProps } from './TabletBillSettlement';

export { TabletAlertSheet } from './TabletAlertSheet';
export type { TabletAlertSheetProps } from './TabletAlertSheet';

export { TabletProfileShift } from './TabletProfileShift';
export type { TabletProfileShiftProps } from './TabletProfileShift';

export { TabletCockpitMaster } from './TabletCockpitMaster';

// ============================================================================
// 2. DATA MODELS & TYPE EXPORTS
// ============================================================================
export type {
  ScreenId,
  SeatStatus,
  KitchenStatus,
  PaymentMode,
  AlertType,
  WaiterProfile,
  SeatItem,
  DishItem,
  TicketItem,
  ServiceAlert,
  ShiftActivity
} from './types';

export {
  INITIAL_WAITER_PROFILE,
  INITIAL_SEATS,
  MENU_DISHES,
  INITIAL_TICKET_ITEMS,
  INITIAL_ALERTS,
  SHIFT_LOGS
} from './types';

// ============================================================================
// 3. ENTERPRISE POS UTILITY FUNCTIONS & CALCULATORS
// ============================================================================

/**
 * Format currency in Indian Rupees format (e.g. ₹1,450)
 * @param amount Numeric value to format
 * @returns Formatted currency string with ₹ symbol
 */
export const formatIndianCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

/**
 * Calculate GST (5% split as 2.5% CGST and 2.5% SGST for restaurant dining)
 * @param grossAmount Gross billed amount
 * @returns Object containing base subtotal, CGST, SGST, and total GST
 */
export const calculateRestaurantTax = (grossAmount: number): {
  subtotal: number;
  cgst: number;
  sgst: number;
  totalGst: number;
  grandTotal: number;
} => {
  const subtotal = Math.round(grossAmount / 1.05);
  const totalGst = grossAmount - subtotal;
  const cgst = Math.round(totalGst / 2);
  const sgst = totalGst - cgst;

  return {
    subtotal,
    cgst,
    sgst,
    totalGst,
    grandTotal: grossAmount
  };
};

/**
 * Generate standard NPCI Unified Payments Interface (UPI) deep link and QR URL
 * @param params UPI payment details
 * @returns Deep link URI and QR code image URL
 */
export const generateRestaurantUpiLink = (params: {
  payeeVpa: string;
  payeeName: string;
  amount: number;
  seatNumber: string;
}): { deepLink: string; qrCodeUrl: string } => {
  const note = encodeURIComponent(`Seat ${params.seatNumber} Dining Bill`);
  const vpa = encodeURIComponent(params.payeeVpa);
  const name = encodeURIComponent(params.payeeName);
  const deepLink = `upi://pay?pa=${vpa}&pn=${name}&am=${params.amount}&cu=INR&tn=${note}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(deepLink)}`;

  return { deepLink, qrCodeUrl };
};

/**
 * Calculate change return for cash settlement
 * @param tenderedAmount Amount handed over by customer
 * @param payableAmount Total bill amount
 * @returns Non-negative change amount
 */
export const calculateCashChange = (tenderedAmount: number, payableAmount: number): number => {
  return Math.max(0, tenderedAmount - payableAmount);
};

/**
 * Validate 4-digit numeric security PIN for waiter terminal authentication
 * @param pin String input from numpad
 * @returns Boolean indicating whether PIN is valid 4 numeric digits
 */
export const validateWaiterPin = (pin: string): boolean => {
  return /^[0-9]{4}$/.test(pin);
};

/**
 * Audio Chime Synthesizer using Web Audio API
 * Generates non-intrusive sound alerts for noisy restaurant environments
 */
export const playPosChime = (type: 'order_punch' | 'customer_call' | 'kitchen_ready' | 'bill_settle') => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
      case 'order_punch':
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
        break;

      case 'customer_call':
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.setValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;

      case 'kitchen_ready':
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
        break;

      case 'bill_settle':
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(1174.66, now + 0.12);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
    }
  } catch {
    // Audio context may be muted or restricted by browser policies
  }
};

// ============================================================================
// 4. ARCHITECTURE CONFIGURATION CONSTANTS & DOCUMENTATION
// ============================================================================
export const RESTAURANT_BRAND_INFO = {
  nameKannada: 'ತೂಗುದೀಪ ದೊನ್ನೆ ಬಿರಿಯಾನಿ ಮನೆ',
  nameEnglish: 'Thoogudeepa Donne Biryani Military Hotel',
  tagline: 'Authentic Bangalore Donne Biryani & Military Cuisines',
  totalSeatsArchitecture: 100,
  defaultZone: 'Zone 1 (Seats 01 – 10)',
  currencyCode: 'INR',
  currencySymbol: '₹',
  gstRatePercentage: 5,
  upiVpa: 'thoogudeepa@icici'
} as const;

/**
 * Standard Waiter Zone Configurations
 * Used for partitioning 100 restaurant seats across station terminals
 */
export const WAITER_ZONE_PARTITIONS = [
  { zoneId: 'zone-1', label: 'Zone 1', seatRange: 'Seats 01 – 10', defaultWaiter: 'Ramesh' },
  { zoneId: 'zone-2', label: 'Zone 2', seatRange: 'Seats 11 – 20', defaultWaiter: 'Suresh' },
  { zoneId: 'zone-3', label: 'Zone 3', seatRange: 'Seats 21 – 30', defaultWaiter: 'Mahesh' },
  { zoneId: 'zone-4', label: 'Zone 4', seatRange: 'Seats 31 – 40', defaultWaiter: 'Ganesh' },
  { zoneId: 'zone-5', label: 'Zone 5', seatRange: 'Seats 41 – 50', defaultWaiter: 'Praveen' },
  { zoneId: 'zone-all', label: 'Full Floor', seatRange: 'Seats 01 – 100', defaultWaiter: 'Captain Anand' }
] as const;

/**
 * Real-world Seat Status Color Tokens
 * Standardizes visual styling across Floor Cards and Badges
 */
export const STATUS_COLOR_TOKENS = {
  occupied: {
    border: 'border-amber-400/80',
    background: 'bg-amber-50/30',
    text: 'text-amber-950',
    badge: 'bg-amber-500 text-white'
  },
  vacant: {
    border: 'border-emerald-300',
    background: 'bg-emerald-50/20',
    text: 'text-emerald-950',
    badge: 'bg-emerald-100 text-emerald-800'
  },
  billRequested: {
    border: 'border-rose-400',
    background: 'bg-rose-50/40',
    text: 'text-rose-950',
    badge: 'bg-rose-500 text-white animate-pulse'
  }
} as const;

/**
 * POS Component Registry for dynamic routing and testing
 */
export const POS_COMPONENT_REGISTRY = {
  Login: 'TabletLogin',
  Header: 'TabletHeader',
  FloorGrid: 'TabletFloorGrid',
  MenuCatalog: 'TabletMenuCatalog',
  LiveTicket: 'TabletLiveTicket',
  BillSettlement: 'TabletBillSettlement',
  AlertSheet: 'TabletAlertSheet',
  ProfileShift: 'TabletProfileShift',
  CockpitMaster: 'TabletCockpitMaster'
} as const;

/**
 * Keyboard Shortcut Mappings for High-Efficiency POS Operators
 */
export const POS_KEYBOARD_SHORTCUTS = [
  { keyCombo: 'Alt + C', action: 'Toggle Customer Seat Calls drawer' },
  { keyCombo: 'Alt + K', action: 'Toggle Kitchen Ready Orders drawer' },
  { keyCombo: 'Alt + P', action: 'Navigate to Waiter Profile & Shift Handover' },
  { keyCombo: 'Escape', action: 'Close slide-over drawers or clear active input' },
  { keyCombo: 'Enter', action: 'Confirm PIN authentication on Login' }
] as const;

/**
 * Recommended Bangalore Donne Biryani Combo Bundles
 */
export const POPULAR_DONNE_COMBOS = [
  {
    comboId: 'cb-1',
    name: 'Donne Biryani Special Box',
    items: ['1x Chicken Donne Biryani', '1x Chilli Chicken (Half)', '1x Fresh Lime Soda'],
    comboPrice: 490,
    savings: 50
  },
  {
    comboId: 'cb-2',
    name: 'Mutton Royal Feast',
    items: ['1x Mutton Donne Biryani', '1x Mutton Pepper Fry', '2x Parotta'],
    comboPrice: 620,
    savings: 70
  }
] as const;

import { TabletCockpitMaster } from './TabletCockpitMaster';
export default TabletCockpitMaster;
