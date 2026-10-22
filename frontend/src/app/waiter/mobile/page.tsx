'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const MobileCockpitMaster = dynamic(
  () => import('@/components/waiter-mobile/MobileCockpitMaster'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm font-medium">
        Loading Waiter Cockpit...
      </div>
    ),
  }
);

export default function WaiterMobilePage() {
  return <MobileCockpitMaster />;
}
