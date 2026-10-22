'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const MobileCockpitMaster = dynamic(
  () => import('@/components/waiter-mobile/MobileCockpitMaster'),
  { ssr: false }
);
const TabletCockpitMaster = dynamic(
  () => import('@/components/waiter-tablet/TabletCockpitMaster'),
  { ssr: false }
);

export default function WaiterIndexPage() {
  const [isTablet, setIsTablet] = useState<boolean | null>(null);

  useEffect(() => {
    const checkViewport = () => {
      setIsTablet(window.innerWidth >= 768);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  if (isTablet === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm font-medium">
        Loading Waiter Cockpit...
      </div>
    );
  }

  return isTablet ? <TabletCockpitMaster /> : <MobileCockpitMaster />;
}
