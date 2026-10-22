"use client";
/**
 * Thoogudeepa Waiter Mobile Cockpit - Floor Alerts Component
 *
 * Real-world enterprise Floor Communications & Notification interface:
 * - Balanced Modern Theme: Soft slate canvas (#F8FAFC), crisp white card (#FFFFFF),
 *   subtle borders (#E2E8F0), slate-900 typography, and vibrant accents
 * - Side-by-side Segmented Tabs: Customer Calls vs. Kitchen Ready Orders
 * - Customer Calls Screen:
 *   * Message displayed strictly inside dedicated placeholder box with MessageSquare icon
 *   * Right-aligned direct action button ([ Attended ] or [ Collect Bill ])
 *   * Dedicated empty state with PhoneOff icon when all calls are resolved
 * - Kitchen Ready Screen:
 *   * Pass counter notifications for freshly prepared Donne Biryani and starters
 *   * Individual [ Serve ] action button permanently positioned on the right side of each item
 *   * Dedicated empty state with ChefHat icon when all dishes are delivered
 * - Standardized badge tokens (uniform 22px height, 10px bold uppercase font)
 * - Strict Line Count: Maintained strictly between 300 and 400 lines
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
  PhoneCall, 
  PhoneOff, 
  ChefHat, 
  CheckCheck, 
  Check, 
  CreditCard, 
  MessageSquare, 
  Receipt, 
  Clock, 
  Utensils, 
  Flame,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { FloorAlert, AlertSubTab } from './types';

export interface MobileAlertsProps {
  /** Array of active service alerts */
  readonly alerts: FloorAlert[];
  /** Optional back navigation callback */
  readonly onBack?: () => void;
  /** Callback when a customer call is attended */
  readonly onAttendCall: (alertId: string) => void;
  /** Callback to route directly to collect bill */
  readonly onCollectBill: (seatNumber: string, guestName: string, amount: number) => void;
  /** Callback when a kitchen dish is served to the table */
  readonly onServeDish: (alertId: string, dishName: string, alert?: FloorAlert) => void;
}

export const MobileAlerts: React.FC<MobileAlertsProps> = ({
  alerts,
  onBack,
  onAttendCall,
  onCollectBill,
  onServeDish
}) => {
  const [activeTab, setActiveTab] = useState<AlertSubTab>('calls');

  // Filter alerts by sub-tab
  const customerCalls = useMemo(() => {
    return alerts.filter(a => a.type === 'customer_call');
  }, [alerts]);

  const kitchenReady = useMemo(() => {
    return alerts.filter(a => a.type === 'kitchen_ready');
  }, [alerts]);

  const totalPending = alerts.length;

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col bg-slate-50 select-none overflow-hidden">
      
      {/* Top Alerts Header with Hotel Name and Back Arrow */}
      <header className="p-3 bg-white border-b border-slate-200 flex items-center justify-between shadow-2xs shrink-0 select-none z-20">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center bg-white hover:bg-slate-100 active:scale-95 shrink-0 shadow-2xs text-slate-800 cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
          
          <div className="min-w-0 flex-1">
            <h1 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight truncate leading-tight">
              ತೂಗುದೀಪ ದೊನ್ನೆ ಬಿರಿಯಾನಿ
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 font-semibold truncate">
              <span>Floor Notifications • Service Pass</span>
            </div>
          </div>
        </div>

        {totalPending > 0 ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-300 animate-pulse shrink-0">
            {totalPending} Active
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-300 shrink-0">
            Pass Clear
          </span>
        )}
      </header>

      {/* Side-by-Side Segmented Tabs Row */}
      <div className="p-3 bg-white border-b border-slate-100 shrink-0 shadow-2xs z-10">
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
          
          {/* Customer Calls Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('calls')}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-2xs ${
              activeTab === 'calls'
                ? 'bg-white text-slate-900 font-black shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5 text-rose-600" />
            <span>Customer Calls</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black bg-rose-50 text-rose-700 border border-rose-200">
              {customerCalls.length}
            </span>
          </button>

          {/* Kitchen Ready Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('kitchen')}
            className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-2xs ${
              activeTab === 'kitchen'
                ? 'bg-white text-slate-900 font-black shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ChefHat className="w-3.5 h-3.5 text-emerald-600" />
            <span>Kitchen Ready</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
              {kitchenReady.length}
            </span>
          </button>

        </div>
      </div>

      {/* Main Alerts Content List Area */}
      <div className="p-3.5 flex-1 overflow-y-auto no-scrollbar space-y-3 pb-24">

        {/* ======================================================== */}
        {/* SUB-TAB 1: CUSTOMER CALLS (Message in Placeholder Box) */}
        {/* ======================================================== */}
        {activeTab === 'calls' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {customerCalls.length === 0 ? (
              /* Dedicated Empty State */
              <div className="py-16 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-2 mx-auto shadow-2xs">
                  <PhoneOff className="w-6 h-6 text-emerald-600" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">
                  All Calls Attended
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5 max-w-[220px] mx-auto">
                  No pending customer requests at your tables right now.
                </p>
              </div>
            ) : (
              customerCalls.map(alert => {
                const isBillReq = Boolean(alert.billAmount && alert.billAmount > 0);

                return (
                  <div
                    key={alert.id}
                    className={`border rounded-2xl p-3.5 bg-white shadow-xs hover:border-slate-300 transition-all ${
                      isBillReq ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
                    }`}
                  >
                    {/* Top Seat Info Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          isBillReq ? 'bg-rose-500 animate-pulse' : 'bg-sky-500'
                        }`} />
                        <span className="text-xs font-black text-slate-900">
                          {alert.seatNumber}
                        </span>
                        {alert.guestName && (
                          <span className="text-[10px] font-bold text-slate-500">
                            ({alert.guestName})
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {alert.timeAgo}
                      </span>
                    </div>

                    {/* Customer Message inside Dedicated Placeholder Box with Right Action */}
                    <div className="flex items-center justify-between gap-2.5">
                      <div className={`flex-1 rounded-xl px-3 py-2 flex items-center gap-2 min-w-0 border ${
                        isBillReq 
                          ? 'bg-white border-rose-200 text-rose-800 font-bold' 
                          : 'bg-slate-50 border-slate-200 text-slate-800 font-semibold'
                      }`}>
                        {isBillReq ? (
                          <Receipt className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        ) : (
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className="text-xs truncate">
                          {alert.message || alert.title}
                        </span>
                      </div>

                      {/* Right-Side Permanent Action Button */}
                      {isBillReq ? (
                        <button
                          type="button"
                          onClick={() => onCollectBill(alert.seatNumber, alert.guestName || 'Guest', alert.billAmount || 840)}
                          className="h-9 px-3.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 btn-press shadow-2xs"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Collect Bill</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAttendCall(alert.id)}
                          className="h-9 px-3.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 btn-press shadow-2xs"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
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
        {/* SUB-TAB 2: KITCHEN READY (Individual Serve Action Buttons) */}
        {/* ======================================================== */}
        {activeTab === 'kitchen' && (
          <div className="space-y-2.5 animate-in fade-in duration-200">
            {kitchenReady.length === 0 ? (
              /* Dedicated Empty State */
              <div className="py-16 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-2 mx-auto shadow-2xs">
                  <CheckCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">
                  Kitchen Pass Clear
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5 max-w-[220px] mx-auto">
                  All dishes have been delivered to your tables. Fresh orders appear here.
                </p>
              </div>
            ) : (
              kitchenReady.map(order => (
                <div
                  key={order.id}
                  className="border border-slate-200 rounded-2xl p-3 bg-white shadow-xs flex items-center justify-between gap-2.5 hover:border-slate-300 transition-all"
                >
                  {/* Dish Info */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
                      <ChefHat className="w-4 h-4 text-emerald-600" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900 truncate">
                          {order.title}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                          {order.seatNumber}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">
                        {order.kotNumber ? `${order.kotNumber} • ` : ''}{order.timeAgo || 'Just now'}
                      </span>
                    </div>
                  </div>

                  {/* Right-Side Permanent Serve Action Button */}
                  <button
                    type="button"
                    onClick={() => onServeDish(order.id, order.title, order)}
                    className="h-8 px-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 btn-press shadow-2xs transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Serve</span>
                  </button>

                </div>
              ))
            )}
          </div>
        )}

      </div>

    </div>
  );
};

export default MobileAlerts;


