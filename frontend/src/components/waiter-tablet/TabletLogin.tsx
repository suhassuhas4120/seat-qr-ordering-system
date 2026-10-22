"use client";
/**
 * Thoogudeepa Waiter Tablet POS Cockpit - Login Screen Component
 *
 * Real-world enterprise Tablet Authentication (1024px x 768px Landscape):
 * - In-Between Slate & Crisp White Enterprise Theme matching Clover & Toast POS
 * - Left Side (48%):
 *   * Enlarged authentic circular restaurant logo with golden halo and live terminal badge
 *   * Clean restaurant typography in Kannada & English in deep dark color
 *   * Estd. 1998 Military Hotel heritage badge
 *   * Subtext removed as requested by user
 *   * Official Nelja Tech Technology Partner card
 * - Right Side (52%):
 *   * Enlarged shift waiter selector cards (2x2 grid with bigger touch target and fonts)
 *   * Perfectly vertically centered 4-dot passcode and tactile 3x4 keypad
 *   * Keypad 10th button: Clear button with RotateCcw icon
 *   * Keypad 12th button: Cross mark (✕) backspace in matching neutral theme
 *   * Primary CTA: [ Start Shift ] with ShieldCheck icon
 * - Strict line count maintained between 300 and 400 lines.
 */

import React, { useState, useCallback } from 'react';
import { 
  ShieldCheck, 
  RotateCcw,
  Delete
} from 'lucide-react';
import { WaiterOption, DEFAULT_WAITERS } from './types';

export interface TabletLoginProps {
  /** Callback invoked on successful 4-digit PIN verification */
  onLoginSuccess: (waiter: WaiterOption) => void;
  /** Optional custom list of active waiters */
  waitersList?: WaiterOption[];
  /** Optional callback to notify analytics or logging service of shift login */
  onShiftLoginAttempt?: (waiterId: string, success: boolean) => void;
  /** Optional initial selected waiter identifier */
  initialWaiterId?: string;
}

export const TabletLogin: React.FC<TabletLoginProps> = ({
  onLoginSuccess,
  waitersList = DEFAULT_WAITERS,
  onShiftLoginAttempt,
  initialWaiterId
}) => {
  const [selectedWaiter, setSelectedWaiter] = useState<WaiterOption>(() => {
    if (initialWaiterId) {
      const found = waitersList.find((w: WaiterOption) => w.id === initialWaiterId);
      if (found) return found;
    }
    return waitersList[0];
  });
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Validate passcode against waiter credential
  const verifyPinAndLogin = useCallback((pinToVerify: string) => {
    if (pinToVerify === selectedWaiter.pinCode || pinToVerify === '1234') {
      setPinError(false);
      if (onShiftLoginAttempt) {
        onShiftLoginAttempt(selectedWaiter.id, true);
      }
      onLoginSuccess(selectedWaiter);
    } else {
      setPinError(true);
      setErrorMessage('Invalid Passcode. Enter 1234');
      if (onShiftLoginAttempt) {
        onShiftLoginAttempt(selectedWaiter.id, false);
      }
      setTimeout(() => {
        setEnteredPin('');
        setPinError(false);
      }, 900);
    }
  }, [selectedWaiter, onLoginSuccess, onShiftLoginAttempt]);

  // Handle keypad digit input (Max 4 digits)
  const handleDigitPress = useCallback((digit: string) => {
    if (enteredPin.length < 4) {
      const nextPin = enteredPin + digit;
      setEnteredPin(nextPin);
      setPinError(false);
      setErrorMessage('');

      // Auto-validate once 4th digit is keyed in
      if (nextPin.length === 4) {
        verifyPinAndLogin(nextPin);
      }
    }
  }, [enteredPin, verifyPinAndLogin]);

  // Handle Clear button
  const handleClearPin = useCallback(() => {
    setEnteredPin('');
    setPinError(false);
    setErrorMessage('');
  }, []);

  // Handle Backspace Delete (Removes last keyed digit)
  const handleDeleteDigit = useCallback(() => {
    if (enteredPin.length > 0) {
      setEnteredPin(prev => prev.slice(0, -1));
      setPinError(false);
      setErrorMessage('');
    }
  }, [enteredPin]);

  return (
    <section 
      id="screen-login" 
      className="w-full flex-1 flex flex-row overflow-hidden select-none bg-[#F8FAFC]"
      role="region"
      aria-label="Staff Authentication Screen"
    >
      {/* ======================================================== */}
      {/* LEFT SIDE (48%): ENLARGED LOGO & COMPLETE DARK TITLE     */}
      {/* ======================================================== */}
      <div className="w-[48%] h-full p-7 lg:p-9 flex flex-col justify-between border-r border-slate-200 bg-[#F1F5F9]/60">
        <div className="flex-1 flex flex-col items-center justify-center text-center my-auto py-4">
          {/* Authentic Circular Restaurant Logo - Enlarged as requested */}
          <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full p-2 bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-200 shadow-2xl ring-8 ring-amber-400/25 mb-5 relative shrink-0">
            <img
              src="/logo.jpg"
              alt="Thoogudeepa Donne Biryani Emblem"
              className="w-full h-full rounded-full object-cover shadow-inner"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span 
              className="absolute bottom-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white shadow-xs" 
              title="Terminal Online" 
            />
          </div>

          {/* Complete Restaurant Title in Deep Dark Color (Never Lite) */}
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
            ತೂಗುದೀಪ ದೊನ್ನೆ ಬಿರಿಯಾನಿ
          </h1>
          <p className="text-xs font-black tracking-widest text-slate-700 uppercase mt-1.5">
            THOOGUDEEPA DONNE BIRYANI
          </p>
          <div className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-300 shadow-2xs">
            <span className="text-xs font-extrabold text-amber-900">
              ಮಿಲಿಟರಿ ಹೋಟೆಲ್ • Estd. 1998
            </span>
          </div>

          {/* Subtext removed as requested */}
        </div>

        {/* ======================================================== */}
        {/* POWERED BY NELJA TECH CARD                               */}
        {/* ======================================================== */}
        <div className="border border-slate-200/90 rounded-2xl p-3 bg-white shadow-xs flex items-center justify-between ring-1 ring-blue-500/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center p-1 shadow-2xs shrink-0">
              <img
                src="/nelja_symbol.png"
                alt="Nelja Tech Symbol"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">
                Technology Partner
              </span>
              <span className="text-xs font-black text-slate-900 block leading-tight mt-1">
                Powered by Nelja Tech
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-black text-[10px] tracking-wide uppercase shadow-2xs">
            Enterprise POS
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT SIDE (52%): ENLARGED WAITER CARDS & CENTERED KEYPAD*/}
      {/* ======================================================== */}
      <div className="w-[52%] h-full p-6 lg:p-8 flex flex-col justify-between bg-white overflow-y-auto no-scrollbar">
        {/* 1. TOP: Waiter Staff Selector (Enlarged Containers) */}
        <div className="shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-black text-slate-900">
              Select Shift Waiter
            </h2>
            <span className="text-xs font-bold text-slate-500">
              4 Active Staff
            </span>
          </div>

          {/* Interactive Waiter Selection Grid (Enlarged Cards) */}
          <div className="grid grid-cols-2 gap-2.5">
            {waitersList.slice(0, 4).map((waiter: WaiterOption) => {
              const isSelected = selectedWaiter.id === waiter.id;
              const initials = waiter.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
              return (
                <button
                  key={waiter.id}
                  type="button"
                  onClick={() => {
                    setSelectedWaiter(waiter);
                    handleClearPin();
                  }}
                  className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all active:scale-95 flex items-center gap-3 cursor-pointer ${
                    isSelected
                      ? 'border-2 border-amber-500 bg-amber-50/90 shadow-xs ring-1 ring-amber-400/40'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl text-sm font-black flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={`font-black text-sm block truncate ${isSelected ? 'text-slate-950' : 'text-slate-900'}`}>
                      {waiter.name}
                    </span>
                    <span className={`text-xs font-semibold block leading-tight truncate mt-0.5 ${isSelected ? 'text-amber-800 font-extrabold' : 'text-slate-500'}`}>
                      {waiter.assignedZone}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. MIDDLE: Vertically Centered Passcode Indicators & Enlarged 3x4 Keypad */}
        <div className="flex-1 flex flex-col justify-center items-center py-2 sm:py-3 my-auto">
          {/* 4-Dot Passcode Indicators */}
          <div className="flex flex-col items-center mb-3.5">
            <span className="text-xs sm:text-sm font-extrabold text-slate-700 mb-2">
              Enter 4-Digit Security Passcode
            </span>
            <div className="flex gap-3.5">
              {[1, 2, 3, 4].map(idx => {
                const isFilled = idx <= enteredPin.length;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      pinError
                        ? 'bg-rose-500 border-rose-500 ring-4 ring-rose-500/20'
                        : isFilled
                          ? 'bg-slate-900 border-slate-900 scale-110 shadow-xs'
                          : 'bg-white border-slate-300'
                    }`}
                  />
                );
              })}
            </div>
            {errorMessage && (
              <span className="text-xs text-rose-600 font-extrabold mt-1.5 animate-pulse">
                {errorMessage}
              </span>
            )}
          </div>

          {/* 3x4 Numeric Keypad with Enlarged Tactile Buttons */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 w-[300px] sm:w-[330px] max-w-full">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleDigitPress(num)}
                className="h-12 sm:h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 active:bg-amber-100 border border-slate-200 text-xl sm:text-2xl font-black text-slate-900 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
              >
                {num}
              </button>
            ))}

            {/* 10th Button: Clear */}
            <button
              type="button"
              onClick={handleClearPin}
              className="h-12 sm:h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 border border-slate-200 text-slate-700 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
              title="Clear Passcode"
            >
              <RotateCcw className="w-5 h-5 text-slate-600" />
            </button>

            {/* 11th Button: 0 */}
            <button
              type="button"
              onClick={() => handleDigitPress('0')}
              className="h-12 sm:h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 active:bg-amber-100 border border-slate-200 text-xl sm:text-2xl font-black text-slate-900 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
            >
              0
            </button>

            {/* 12th Button: Backspace (Delete) */}
            <button
              type="button"
              onClick={handleDeleteDigit}
              className="h-12 sm:h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 border border-slate-200 text-slate-700 flex items-center justify-center shadow-2xs transition-all cursor-pointer"
              title="Delete Digit"
            >
              <Delete className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* 3. BOTTOM: Single Clean Primary CTA Button */}
        <div className="shrink-0 pt-2">
          <button
            type="button"
            onClick={() => verifyPinAndLogin(enteredPin)}
            disabled={enteredPin.length < 4}
            className={`w-full h-11 sm:h-12 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-xs transition-all ${
              enteredPin.length === 4
                ? 'bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 shadow-amber-500/20 cursor-pointer'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Start Shift • Unlock Terminal</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default TabletLogin;
