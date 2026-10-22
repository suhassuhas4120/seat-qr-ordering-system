"use client";
/**
 * Thoogudeepa Waiter Tablet POS Cockpit - Alert Slide-Over Sheet Component
 *
 * Real-world enterprise Notification Drawer:
 * - Balanced In-Between Theme: Soft slate canvas (#F8FAFC), crisp white cards (#FFFFFF),
 *   subtle borders (#E2E8F0), slate-900 typography, and vibrant accents
 * - Slides in smoothly from the RIGHT SIDE (NOT from top to bottom)
 * - SEPARATE SCREENS FOR CALLS AND KITCHEN (STRICTLY NO SHARED TABS / PILLS!)
 *   * When Calls is triggered: Renders dedicated Customer Service Calls Sheet
 *   * When Kitchen is triggered: Renders dedicated Kitchen Ready Orders Sheet
 * - Dedicated Empty State with proper icon and descriptive text when alerts are cleared:
 *   * PhoneOff icon + "All Calls Attended"
 *   * CheckCheck icon + "Kitchen Pass Clear"
 * - Customer Calls Screen:
 *   * Direct [ Attended ] action button with single Check icon
 *   * Direct [ Collect Bill ] button with single CreditCard icon routing to right pane
 * - Kitchen Ready Screen:
 *   * Pass counter notifications for freshly cooked Donne Biryani
 *   * Direct [ Served ] action button with single Check icon
 * - Standardized badge tokens (uniform 24px height, 10px bold uppercase font)
 * - Strict line count maintained between 300 and 400 lines (never exceeds 400).
 */

import React, { useMemo } from 'react';
import { 
  X, 
  Check,
  CheckCheck,
  Clock,
  PhoneCall,
  PhoneOff,
  ChefHat,
  Droplet,
  Receipt,
  CreditCard,
  UtensilsCrossed,
  MessageSquare
} from 'lucide-react';
import { ServiceAlert } from './types';

/**
 * Props for the TabletAlertSheet Component
 *
 * Configures the right-sliding drawer for restaurant floor communications:
 * - Customer Service Calls: Water refill requests and bill collection prompts
 * - Kitchen Ready Pass: Freshly prepared dishes awaiting immediate seat delivery
 * - Strictly separate drawer contexts (no shared pills or confused workflows)
 * - Single-item resolution: Each dish or seat alert is resolved independently
 * - Zero unnecessary subtext or operational fluff
 */
export interface TabletAlertSheetProps {
  /** Controls visibility of the right slide-over drawer */
  isOpen: boolean;
  /** Active selected category tab ('customer' | 'kitchen') */
  activeTab: 'customer' | 'kitchen';
  /** Array of active service alerts */
  alerts: ServiceAlert[];
  /** Callback to close the slide-over drawer */
  onClose: () => void;
  /** Callback to switch between customer and kitchen tabs (if needed) */
  onSwitchTab?: (tab: 'customer' | 'kitchen') => void;
  /** Callback to resolve / acknowledge an individual alert */
  onResolveAlert: (alertId: string) => void;
  /** Callback to navigate directly to right-pane bill settlement */
  onGoToCollectBill: (seatNumber: string, guestName: string, amount: number) => void;
  /** Callback to mark kitchen dish served to seat */
  onServeKitchenDish?: (alertId: string, dishName: string, alert?: any) => void;
  /** Optional callback to mark all alerts as resolved */
  onClearAllAlerts?: () => void;
  /** Optional callback to sound a tactile audio beep on alert resolution */
  onAcknowledgeFeedback?: (type: 'customer' | 'kitchen') => void;
}

export const TabletAlertSheet: React.FC<TabletAlertSheetProps> = ({
  isOpen,
  activeTab,
  alerts,
  onClose,
  onResolveAlert,
  onGoToCollectBill,
  onServeKitchenDish
}) => {
  // Filter unresolved alerts for each dedicated view
  const customerAlerts = useMemo(() => {
    return alerts.filter(a => a.type === 'customer' && !a.isResolved);
  }, [alerts]);

  const kitchenAlerts = useMemo(() => {
    return alerts.filter(a => a.type === 'kitchen' && !a.isResolved);
  }, [alerts]);

  const unresolvedCustomerCount = customerAlerts.length;
  const unresolvedKitchenCount = kitchenAlerts.length;

  return (
    <>
      {/* Dimmed Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-2xs z-40 transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* ======================================================== */}
      {/* SLIDE-OVER SHEET: OPENS STRICTLY AT THE RIGHT SIDE */}
      {/* (Width: 420px, Slides in from Right X-axis, In-Between Theme) */}
      {/* ======================================================== */}
      <aside
        id="right-alert-sheet"
        className={`absolute top-0 right-0 bottom-0 w-[420px] max-w-[90%] bg-white border-l border-slate-200 z-50 flex flex-col justify-between p-5 shadow-2xl transition-transform duration-300 ease-in-out select-none ${
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={activeTab === 'customer' ? "Customer Calls Drawer" : "Kitchen Ready Drawer"}
      >
        <div className="flex flex-col h-[calc(100%-60px)]">
          {/* ======================================================== */}
          {/* DEDICATED HEADER FOR CUSTOMER CALLS (NO SUBTEXT!) */}
          {/* ======================================================== */}
          {activeTab === 'customer' && (
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 mb-3.5">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shadow-2xs shrink-0">
                  <PhoneCall className="w-5 h-5 text-rose-600 stroke-[2.3]" />
                </span>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 leading-none tracking-tight">
                    Customer Service Calls
                  </h3>
                  <span className="h-6 px-2.5 inline-flex items-center justify-center text-xs font-black uppercase tracking-wider rounded-full bg-rose-50 text-rose-700 border border-rose-300 shadow-2xs">
                    {unresolvedCustomerCount} Pending
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 active:scale-90 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
                title="Close Calls Drawer"
              >
                <X className="w-4.5 h-4.5 text-slate-700 stroke-[2.5]" />
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* DEDICATED HEADER FOR KITCHEN READY (NO SUBTEXT!) */}
          {/* ======================================================== */}
          {activeTab === 'kitchen' && (
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 mb-3.5">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-2xs shrink-0">
                  <ChefHat className="w-5 h-5 text-emerald-600 stroke-[2.3]" />
                </span>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 leading-none tracking-tight">
                    Kitchen Ready Orders
                  </h3>
                  <span className="h-6 px-2.5 inline-flex items-center justify-center text-xs font-black uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs">
                    {unresolvedKitchenCount} Ready
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 active:scale-90 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
                title="Close Kitchen Drawer"
              >
                <X className="w-4.5 h-4.5 text-slate-700 stroke-[2.5]" />
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* SCREEN 1: DEDICATED CUSTOMER CALLS LIST (RIGHT-ALIGNED BUTTONS) */}
          {/* ======================================================== */}
          {activeTab === 'customer' && (
            <div className="space-y-2.5 overflow-y-auto no-scrollbar flex-1 pr-0.5 py-1">
              {customerAlerts.length === 0 ? (
                /* Dedicated Empty State with Icon and Clean Title */
                <div className="py-16 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-3 mx-auto shadow-2xs">
                    <PhoneOff className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h4 className="text-base font-black text-slate-900">All Calls Attended</h4>
                  <p className="text-xs sm:text-sm text-slate-600 font-semibold mt-1 max-w-[260px] mx-auto">
                    There are no pending customer requests at your seats right now.
                  </p>
                </div>
              ) : (
                customerAlerts.map(alert => {
                  const isBillReq = alert.amount && alert.amount > 0;

                  return (
                    <div
                      key={alert.id}
                      className={`border rounded-2xl p-3.5 bg-white shadow-xs hover:border-slate-300 transition-all ${
                        isBillReq ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${isBillReq ? 'bg-rose-500 animate-pulse' : 'bg-sky-500'}`} />
                          <span className="text-sm font-black text-slate-900">{alert.seatNumber}</span>
                          {alert.guestName && (
                            <span className="text-xs font-bold text-slate-600">({alert.guestName})</span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 font-bold">{alert.timeAgo}</span>
                      </div>

                      {/* Customer Message inside Dedicated Placeholder Box with Right Action Button */}
                      <div className="flex items-center justify-between gap-2.5">
                        <div className={`flex-1 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 min-w-0 border ${
                          isBillReq ? 'bg-white border-rose-200 shadow-2xs' : 'bg-slate-50 border-slate-200'
                        }`}>
                          {isBillReq ? (
                            <Receipt className="w-4 h-4 text-rose-600 shrink-0 stroke-[2.3]" />
                          ) : (
                            <MessageSquare className="w-4 h-4 text-slate-500 shrink-0 stroke-[2.3]" />
                          )}
                          <span className={`text-xs sm:text-sm truncate leading-snug ${
                            isBillReq ? 'font-black text-rose-900' : 'font-extrabold text-slate-900'
                          }`}>
                            {alert.title}
                          </span>
                        </div>

                        {/* Right-Side Permanent Action Button */}
                        {isBillReq ? (
                          <button
                            type="button"
                            onClick={() => onGoToCollectBill(alert.seatNumber, alert.guestName, alert.amount || 840)}
                            className="h-10 px-4 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 shrink-0 shadow-xs transition-all cursor-pointer"
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>Collect Bill</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onResolveAlert(alert.id)}
                            className="h-10 px-4 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 shrink-0 shadow-xs transition-all cursor-pointer"
                          >
                            <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                            <span>Attended</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* SCREEN 2: DEDICATED KITCHEN ORDERS LIST (INDIVIDUAL SERVE BUTTONS) */}
          {/* ======================================================== */}
          {activeTab === 'kitchen' && (
            <div className="space-y-2.5 overflow-y-auto no-scrollbar flex-1 pr-0.5 py-1">
              {kitchenAlerts.length === 0 ? (
                /* Dedicated Empty State with Icon and Clean Title */
                <div className="py-16 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-3 mx-auto shadow-2xs">
                    <CheckCheck className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h4 className="text-base font-black text-slate-900">Kitchen Pass Clear</h4>
                  <p className="text-xs sm:text-sm text-slate-600 font-semibold mt-1 max-w-[260px] mx-auto">
                    All KOT orders dispatched to dining seats.
                  </p>
                </div>
              ) : (
                kitchenAlerts.map(alert => {
                  return (
                    <div
                      key={alert.id}
                      className="border border-slate-200 rounded-2xl p-3.5 bg-white shadow-xs flex items-center justify-between gap-3.5 transition-all hover:border-slate-300"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
                          <UtensilsCrossed className="w-5 h-5 text-emerald-600 stroke-[2.3]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900 truncate tracking-tight">{alert.title}</span>
                            <span className="h-6 px-2.5 inline-flex items-center justify-center text-xs font-black uppercase rounded-full bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs shrink-0">
                              {alert.seatNumber}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 font-bold block mt-1">{alert.timeAgo || 'Just now'}</span>
                        </div>
                      </div>

                      {/* Right-Side Permanent Serve Action Button for each individual item */}
                      <button
                        type="button"
                        onClick={() => {
                          if (onServeKitchenDish) {
                            onServeKitchenDish(alert.id, alert.title, alert);
                          } else {
                            onResolveAlert(alert.id);
                          }
                        }}
                        className="h-10 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 shrink-0 shadow-xs transition-all cursor-pointer"
                        title="Mark order served to seat"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Serve</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default TabletAlertSheet;

