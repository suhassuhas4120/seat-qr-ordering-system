// ==============================================================================
// THOOGUDEEPA V2: HTML5 SCREEN WAKE LOCK GUARDIAN
// Keeps Samsung Galaxy Tab A9 and kitchen displays illuminated throughout shifts
// ==============================================================================

type WakeLockSentinelType = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: string, listener: () => void) => void;
};

let wakeLockSentinel: WakeLockSentinelType | null = null;
let isGuardianActive = false;

async function acquireLock(): Promise<void> {
  if (typeof window === 'undefined') return;

  const nav = navigator as unknown as {
    wakeLock?: {
      request: (type: 'screen') => Promise<WakeLockSentinelType>;
    };
  };

  if (!nav.wakeLock) return;

  try {
    wakeLockSentinel = await nav.wakeLock.request('screen');
    wakeLockSentinel.addEventListener('release', () => {
      wakeLockSentinel = null;
      // Auto re-acquire if guardian is still marked active and page is visible
      if (isGuardianActive && document.visibilityState === 'visible') {
        acquireLock();
      }
    });
  } catch (err) {
    console.warn('Wake Lock request notice:', err);
  }
}

export const screenWakeLock = {
  activate(): void {
    if (typeof window === 'undefined') return;
    isGuardianActive = true;

    acquireLock();

    // Re-arm wake lock whenever user returns to the tab
    const handleVisibility = () => {
      if (isGuardianActive && document.visibilityState === 'visible' && !wakeLockSentinel) {
        acquireLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
  },

  deactivate(): void {
    isGuardianActive = false;
    if (wakeLockSentinel && !wakeLockSentinel.released) {
      wakeLockSentinel.release().catch(() => {});
      wakeLockSentinel = null;
    }
  },
};
