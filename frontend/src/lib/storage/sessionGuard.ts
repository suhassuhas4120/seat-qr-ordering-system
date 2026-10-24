/**
 * Scoped Session Storage Guard
 * Survives mobile browser background sleep during UPI (GPay/PhonePe/Paytm) app switching.
 * Strictly avoids storing cross-device state.
 */

const memoryFallback = new Map<string, string>();

function safeGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = sessionStorage.getItem(key);
    if (val !== null) return val;
    return localStorage.getItem(key);
  } catch {
    return memoryFallback.get(key) || null;
  }
}

function safeSet(key: string, val: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, val);
    localStorage.setItem(key, val);
  } catch {
    memoryFallback.set(key, val);
  }
}

function safeRemove(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  } catch {
    memoryFallback.delete(key);
  }
}

export const sessionGuard = {
  // 1. Dining Session Token (Cryptographic stay identity)
  saveSessionToken(chairId: string, token: string): void {
    const cleanId = chairId.replace(/[^0-9]/g, '') || chairId;
    safeSet(`thoogudeepa_session_token_${cleanId}`, token);
  },

  getSessionToken(chairId: string): string | null {
    const cleanId = chairId.replace(/[^0-9]/g, '') || chairId;
    return safeGet(`thoogudeepa_session_token_${cleanId}`);
  },

  // 2. Waiter Call State (Floor captain assistance request)
  saveWaiterCallState(chairId: string, called: boolean): void {
    const cleanId = chairId.replace(/[^0-9]/g, '') || chairId;
    if (called) {
      safeSet(`thoogudeepa_waiter_called_${cleanId}`, 'true');
    } else {
      safeRemove(`thoogudeepa_waiter_called_${cleanId}`);
    }
  },

  getWaiterCallState(chairId: string): boolean {
    const cleanId = chairId.replace(/[^0-9]/g, '') || chairId;
    return safeGet(`thoogudeepa_waiter_called_${cleanId}`) === 'true';
  },

  // 3. Tip Selection
  saveTipPreference(chairId: string, tip: string): void {
    const cleanId = chairId.replace(/[^0-9]/g, '') || chairId;
    safeSet(`thoogudeepa_selected_tip_${cleanId}`, tip);
  },

  getTipPreference(chairId: string): string {
    const cleanId = chairId.replace(/[^0-9]/g, '') || chairId;
    return safeGet(`thoogudeepa_selected_tip_${cleanId}`) || 'None';
  },

  // 4. Clean purge when bill is settled
  clearSeatSession(chairId: string): void {
    const cleanId = chairId.replace(/[^0-9]/g, '') || chairId;
    safeRemove(`thoogudeepa_session_token_${cleanId}`);
    safeRemove(`thoogudeepa_waiter_called_${cleanId}`);
    safeRemove(`thoogudeepa_selected_tip_${cleanId}`);
    safeRemove(`thoogudeepa_waiter_mode_${cleanId}`);
  },
};
