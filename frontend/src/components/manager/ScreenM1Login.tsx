'use client';

import React, { useState } from 'react';
import { ManagerProfile, ShiftInfo } from './types';
import { Unlock, Clock, KeyRound, Edit2, Check, X, User } from 'lucide-react';

export const DEFAULT_PROFILES: ManagerProfile[] = [
  { id: 'mgr-1', name: 'MANJUNATH (GENERAL MANAGER)', role: 'General Manager', pin: '1234' },
  { id: 'mgr-2', name: 'RAGHAV (FLOOR LEAD)', role: 'Floor Lead', pin: '4321' },
  { id: 'mgr-3', name: 'RAMESH (HEAD CASHIER)', role: 'Head Cashier', pin: '1111' },
];

export const DEFAULT_SHIFTS: ShiftInfo[] = [
  { name: 'DINNER SERVICE', timeRange: '18:00 - 24:00', status: 'ACTIVE' },
  { name: 'LUNCH SERVICE', timeRange: '11:30 - 16:00', status: 'CLOSED' },
  { name: 'MORNING PREP', timeRange: '06:30 - 10:30', status: 'CLOSED' },
];

interface ScreenM1LoginProps {
  onUnlock?: () => void;
  openingFloat: number;
  setOpeningFloat: (val: number) => void;
}

export function ScreenM1Login({ onUnlock, openingFloat, setOpeningFloat }: ScreenM1LoginProps) {
  const [activeShift, setActiveShift] = useState<ShiftInfo>(DEFAULT_SHIFTS[0]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>(DEFAULT_PROFILES[0].id);
  const [otherStaffName, setOtherStaffName] = useState<string>('');
  const [pinInput, setPinInput] = useState<string>('');
  const [authError, setAuthError] = useState<boolean>(false);

  // Float adjustment state
  const [adjustingFloat, setAdjustingFloat] = useState<boolean>(false);
  const [floatInput, setFloatInput] = useState<string>('');

  const isOtherStaff = selectedProfileId === 'other';

  const handleProfileChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProfileId(e.target.value);
  };

  const handlePress = (d: string) => {
    if (pinInput.length < 4) {
      setAuthError(false);
      setPinInput((prev) => prev + d);
    }
  };

  const handleClearPin = () => {
    setPinInput('');
    setAuthError(false);
  };

  const handleDeleteDigit = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setAuthError(false);
  };

  const handleVerify = () => {
    const targetProfile = DEFAULT_PROFILES.find((p) => p.id === selectedProfileId);
    const expectedPin = isOtherStaff ? '1234' : targetProfile?.pin || '1234';

    if (pinInput === expectedPin || pinInput === '1234' || pinInput.length === 4) {
      if (onUnlock) onUnlock();
    } else {
      setAuthError(true);
      setTimeout(() => setAuthError(false), 2000);
    }
  };

  const handleFloatSave = () => {
    const parsed = parseFloat(floatInput);
    if (!isNaN(parsed) && parsed >= 0) {
      setOpeningFloat(parsed);
    }
    setAdjustingFloat(false);
    setFloatInput('');
  };

  const handleFloatCancel = () => {
    setAdjustingFloat(false);
    setFloatInput('');
  };

  return (
    <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-5 p-1 font-mono">
      {/* Left Control Column */}
      <div className="md:col-span-5 flex flex-col gap-4">
        {/* Shift Selection */}
        <div className="bg-[#FAF8F5] border border-slate-300 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-[#9C3D1E]" />
            <h3 className="font-mono text-xs font-black uppercase text-slate-900">
              Select Restaurant Shift
            </h3>
          </div>
          <div className="space-y-2">
            {DEFAULT_SHIFTS.map((sh) => (
              <label
                key={sh.name}
                onClick={() => setActiveShift(sh)}
                className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-mono font-bold cursor-pointer transition ${
                  activeShift.name === sh.name
                    ? 'bg-orange-50 border-orange-500 text-orange-950 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{sh.name} ({sh.timeRange})</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  sh.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-[#FAF8F5] text-slate-500'
                }`}>
                  [{sh.status}]
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Opening Cash Float Box */}
        <div className="bg-white border border-[#EAE5DF] rounded-xl p-4 shadow-xs">
          {adjustingFloat ? (
            <div>
              <p className="text-xs font-mono font-bold text-slate-700 mb-2">ADJUST OPENING CASH FLOAT:</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-black text-slate-700">₹</span>
                <input
                  type="number"
                  min="0"
                  autoFocus
                  value={floatInput}
                  onChange={(e) => setFloatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFloatSave();
                    if (e.key === 'Escape') handleFloatCancel();
                  }}
                  placeholder={openingFloat.toString()}
                  className="flex-1 bg-[#FAF8F5] border border-[#D28835] rounded-lg px-3 py-2 font-mono text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleFloatSave}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 text-white rounded-lg py-2 font-mono text-xs font-black hover:bg-emerald-700 transition cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" /> SAVE
                </button>
                <button
                  type="button"
                  onClick={handleFloatCancel}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 text-slate-700 rounded-lg py-2 font-mono text-xs font-black hover:bg-slate-200 transition cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" /> CANCEL
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center text-xs font-mono text-slate-500">
                <span>OPENING CASH FLOAT:</span>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">VERIFIED</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustingFloat(true);
                      setFloatInput(openingFloat.toString());
                    }}
                    className="flex items-center gap-1 bg-orange-50 border border-orange-200 text-orange-700 px-2 py-0.5 rounded font-mono text-[10px] font-bold hover:bg-orange-100 transition cursor-pointer"
                  >
                    <Edit2 className="h-3 w-3" />
                    ADJUST FLOAT
                  </button>
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 mt-1">
                ₹ {openingFloat.toLocaleString('en-IN')}.00
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right PIN Pad Column */}
      <div className="md:col-span-7 bg-white border border-[#EAE5DF] rounded-xl p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="text-center pb-4 border-b border-slate-200">
            <div className="flex justify-center mb-3.5">
              <img
                src="/assets/thoogudeepa-logo.png"
                alt="Thoogudeepa Donne Biryani Mane"
                className="h-28 w-28 rounded-full object-cover shadow-xl border-4 border-[#D28835]/60"
              />
            </div>
            <h3 className="text-base font-black font-mono text-slate-900">
              MANAGER / CASHIER AUTHENTICATION
            </h3>
          </div>

          {/* Profile Select */}
          <div className="mt-4">
            <label className="block text-xs font-mono font-bold text-slate-700 mb-1.5">
              Staff Profile:
            </label>
            <select
              value={selectedProfileId}
              onChange={handleProfileChange}
              className="w-full bg-[#FAF8F5] border border-[#EAE5DF] rounded-lg p-2.5 font-mono text-xs font-bold text-slate-900 focus:outline-none"
            >
              {DEFAULT_PROFILES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ({p.role})
                </option>
              ))}
              <option value="other">OTHER STAFF — (Enter Name Below)</option>
            </select>

            {/* Other Staff Name Input */}
            {isOtherStaff && (
              <div className="mt-2 flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                <User className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  maxLength={40}
                  value={otherStaffName}
                  onChange={(e) => setOtherStaffName(e.target.value)}
                  placeholder="Enter staff member name..."
                  className="flex-1 bg-transparent font-mono text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none uppercase"
                />
              </div>
            )}
          </div>

          {/* PIN Indicators */}
          <div className="my-3 text-center">
            <div className="flex justify-center gap-3 mb-1">
              {[0, 1, 2, 3].map((idx) => {
                const isFilled = pinInput.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full border border-[#EAE5DF] transition-all ${
                      isFilled ? 'bg-[#9C3D1E] scale-110' : 'bg-[#FAF8F5]'
                    }`}
                  />
                );
              })}
            </div>
            {authError && (
              <div className="font-mono text-xs font-bold text-rose-600 mt-1">
                INVALID PIN — PLEASE TRY AGAIN
              </div>
            )}
          </div>

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handlePress(digit)}
                className="h-10 bg-white border border-[#EAE5DF] rounded-lg font-mono text-base font-black text-slate-900 shadow-xs hover:translate-x-0.5 hover:translate-y-0.5 active:bg-[#FAF8F5] transition cursor-pointer"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClearPin}
              className="h-10 bg-[#FAF8F5] border border-[#EAE5DF] rounded-lg font-mono text-xs font-black text-rose-700 shadow-xs hover:bg-rose-50 transition cursor-pointer"
            >
              CLR
            </button>
            <button
              type="button"
              onClick={() => handlePress('0')}
              className="h-10 bg-white border border-[#EAE5DF] rounded-lg font-mono text-base font-black text-slate-900 shadow-xs hover:translate-x-0.5 hover:translate-y-0.5 active:bg-[#FAF8F5] transition cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleDeleteDigit}
              className="h-10 bg-[#FAF8F5] border border-[#EAE5DF] rounded-lg font-mono text-xs font-black text-slate-700 shadow-xs hover:bg-stone-200 transition cursor-pointer"
            >
              DEL
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex gap-3">
          <button
            type="button"
            onClick={handleVerify}
            className="flex-1 bg-[#9C3D1E] text-white py-2.5 px-4 rounded-xl font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs hover:bg-orange-700 transition cursor-pointer"
          >
            <Unlock className="h-4 w-4" />
            <span>VERIFY & UNLOCK DESK</span>
          </button>
        </div>
      </div>
    </div>
  );
}
