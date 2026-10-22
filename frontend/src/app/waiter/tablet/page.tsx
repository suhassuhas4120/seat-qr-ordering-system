'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const TabletCockpitMaster = dynamic(
  () => import('@/components/waiter-tablet/TabletCockpitMaster'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm font-medium">
        Loading Tablet Cockpit...
      </div>
    ),
  }
);

export default function WaiterTabletPage() {
  return <TabletCockpitMaster />;
}
