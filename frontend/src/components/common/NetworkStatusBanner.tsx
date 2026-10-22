'use client';

import React, { useEffect, useState } from 'react';
import { offlineQueue, NetworkState } from '@/lib/offlineQueue';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

export function NetworkStatusBanner() {
  const [network, setNetwork] = useState<NetworkState>({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncedAt: null,
    lastError: null,
  });

  const [showSyncSuccess, setShowSyncSuccess] = useState(false);

  useEffect(() => {
    let prevPending = 0;

    const unsubscribe = offlineQueue.subscribe((state) => {
      // Trigger temporary green banner when pending items drop to 0 after syncing
      if (prevPending > 0 && state.pendingCount === 0 && state.isOnline) {
        setShowSyncSuccess(true);
        setTimeout(() => setShowSyncSuccess(false), 3500);
      }
      prevPending = state.pendingCount;
      setNetwork(state);
    });

    return () => unsubscribe();
  }, []);

  // Normal online state with no pending items -> render nothing
  if (network.isOnline && !network.isSyncing && network.pendingCount === 0 && !showSyncSuccess) {
    return null;
  }

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999] px-4 pointer-events-none w-full max-w-md animate-in fade-in slide-in-from-top-3 duration-200">
      <div className="shadow-2xl rounded-full px-4 py-2 border backdrop-blur-md flex items-center justify-between text-xs font-semibold gap-3 transition-all">
        {/* State 1: Offline */}
        {!network.isOnline && (
          <div className="flex items-center gap-2 text-amber-300 bg-amber-950/80 border-amber-600/50 w-full py-1 px-3 rounded-full border">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <div className="flex-1 truncate">
              <span>Offline Mode</span>
              {network.pendingCount > 0 && (
                <span className="opacity-80 ml-1">({network.pendingCount} queued)</span>
              )}
            </div>
            <span className="text-[10px] bg-amber-900/80 px-2 py-0.5 rounded-full border border-amber-700/50">
              Auto-Sync On
            </span>
          </div>
        )}

        {/* State 2: Syncing */}
        {network.isOnline && network.isSyncing && (
          <div className="flex items-center gap-2 text-sky-200 bg-sky-950/80 border-sky-600/50 w-full py-1 px-3 rounded-full border">
            <RefreshCw className="w-4 h-4 text-sky-400 shrink-0 animate-spin" />
            <div className="flex-1 truncate">
              <span>Syncing with kitchen...</span>
              <span className="opacity-80 ml-1">({network.pendingCount} remaining)</span>
            </div>
          </div>
        )}

        {/* State 3: Just Synced */}
        {network.isOnline && !network.isSyncing && showSyncSuccess && (
          <div className="flex items-center gap-2 text-emerald-300 bg-emerald-950/80 border-emerald-600/50 w-full py-1 px-3 rounded-full border">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="flex-1 truncate">
              <span>All orders & bumps synced to kitchen</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono">100% OK</span>
          </div>
        )}
      </div>
    </div>
  );
}
