'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Home, Heart, MapPin, ShoppingBag, User } from 'lucide-react';
import { useCart } from '../../lib/context/CartContext';
import { getActiveDiningSession } from '../../lib/session/diningSession';
import { realtimeBridge } from '../../lib/supabase';

interface BottomNavProps {
  chairId: string;
  activeTab?: 'home' | 'likes' | 'tracking' | 'cart' | 'profile';
  disabledTabs?: ('home' | 'likes' | 'tracking' | 'cart' | 'profile')[];
  showIndicatorArrowOnProfile?: boolean;
}

export default function CustomerBottomNav({
  chairId,
  activeTab,
  disabledTabs = [],
  showIndicatorArrowOnProfile = false,
}: BottomNavProps) {
  const { totalItemCount, likedItems } = useCart();
  const likedCount = Object.values(likedItems).filter(Boolean).length;
  const [selectedTab, setSelectedTab] = useState<'home' | 'likes' | 'tracking' | 'cart' | 'profile' | undefined>(
    activeTab
  );
  const [hasActiveOrder, setHasActiveOrder] = useState<boolean>(false);

  useEffect(() => {
    setSelectedTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    const checkActiveOrder = () => {
      try {
        const s = getActiveDiningSession();
        if (s && s.paymentStatus !== 'paid' && s.items && s.items.length > 0) {
          setHasActiveOrder(true);
        } else {
          setHasActiveOrder(false);
        }
      } catch {
        setHasActiveOrder(false);
      }
    };
    checkActiveOrder();
    const onVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        checkActiveOrder();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', checkActiveOrder);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }
    const unsub = realtimeBridge.subscribeKDS({
      onNewOrder: (data: any) => {
        const cleanChair = chairId.replace(/[^0-9]/g, '');
        const targetChair = (data?.order?.chair_id || '').replace(/[^0-9]/g, '');
        if (!targetChair || targetChair === cleanChair) {
          setHasActiveOrder(true);
        }
      },
      onSeatOccupancyChange: (data: any) => {
        const cleanChair = chairId.replace(/[^0-9]/g, '');
        const targetChair = (data?.chairId || '').replace(/[^0-9]/g, '');
        if (targetChair === cleanChair) {
          setHasActiveOrder(Boolean(data?.isOccupied));
        }
      },
      onBillSettled: (data: any) => {
        const cleanChair = chairId.replace(/[^0-9]/g, '');
        const targetChair = (data?.chairId || '').replace(/[^0-9]/g, '');
        if (targetChair === cleanChair) {
          setHasActiveOrder(false);
        }
      },
    });

    const interval = setInterval(checkActiveOrder, 30000);
    return () => {
      unsub();
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', checkActiveOrder);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
      clearInterval(interval);
    };
  }, [chairId]);

  const current = selectedTab ?? activeTab;

  const navItems = [
    {
      id: 'home' as const,
      label: 'Home',
      icon: Home,
      href: `/seat/${chairId}/menu`,
    },
    {
      id: 'likes' as const,
      label: 'Likes',
      icon: Heart,
      href: `/seat/${chairId}/likes`,
      badge: likedCount > 0,
    },
    {
      id: 'tracking' as const,
      label: 'Live Tracking',
      icon: MapPin,
      href: `/seat/${chairId}/tracking`,
      badge: hasActiveOrder,
    },
    {
      id: 'cart' as const,
      label: 'Cart',
      icon: ShoppingBag,
      href: `/seat/${chairId}/cart`,
      badge: totalItemCount > 0,
    },
    {
      id: 'profile' as const,
      label: 'Profile',
      icon: User,
      href: `/seat/${chairId}/profile`,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 w-full max-w-md mx-auto bg-[#FAF7F0]/95 backdrop-blur-md h-16 select-none border-t border-[#EAE3D5] shadow-[0_-4px_24px_rgba(40,55,45,0.06)]">
      <div className="relative w-full h-full grid grid-cols-5 items-center">
        {navItems.map((item) => {
          const isSelected = current === item.id;
          const isDisabled = disabledTabs.includes(item.id);
          const Icon = item.icon;

          const content = (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Horizontal baseline segment: rendered only on unselected tabs so the line below the selected icon is removed */}
              {!isSelected && (
                <div className="absolute left-0 right-0 bottom-[14px] h-[2px] bg-[#1E3A2F] pointer-events-none" />
              )}

              {/* Downward indicator arrow pointing at profile icon as shown in sketch */}
              {item.id === 'profile' && showIndicatorArrowOnProfile && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-20 animate-bounce">
                  <div className="w-[5px] h-5 bg-[#C85A32]" />
                  <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-[#C85A32] -mt-[1px]" />
                </div>
              )}

              {/* Arch line rising above ONLY the selected icon, with no line underneath */}
              {isSelected && (
                <svg
                  className="absolute bottom-[13px] inset-x-0 w-full h-[40px] pointer-events-none"
                  viewBox="0 0 78 44"
                  preserveAspectRatio="none"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <radialGradient id={`archFillGlow-${item.id}`} cx="50%" cy="50%" r="55%">
                      <stop offset="0%" stopColor="#C85A32" stopOpacity="0.38" />
                      <stop offset="65%" stopColor="#C85A32" stopOpacity="0.16" />
                      <stop offset="100%" stopColor="#C85A32" stopOpacity="0.02" />
                    </radialGradient>
                  </defs>
                  {/* Smooth fill contained precisely inside the curved arch geometry */}
                  <path
                    d="M 0,42 C 18,42 26,2 39,2 C 52,2 60,42 78,42 Z"
                    fill={`url(#archFillGlow-${item.id})`}
                  />
                  {/* Curved arch line in dark forest green */}
                  <path
                    d="M 0,42 C 18,42 26,2 39,2 C 52,2 60,42 78,42"
                    stroke="#1E3A2F"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              )}

              {/* Pure Icon: Sitting on the baseline; framed under the arch when selected */}
              <div
                className={`relative z-10 flex items-center justify-center transition-all duration-200 ${
                  isDisabled ? 'opacity-25 grayscale pointer-events-none' : ''
                } ${
                  isSelected
                    ? 'bottom-[6px] p-2 text-[#1E3A2F]'
                    : 'bottom-[4px] p-1.5 text-[#8C7A6B] hover:text-[#1E3A2F] active:scale-95'
                }`}
              >
                <Icon
                  className={`transition-all ${
                    isSelected ? 'w-5 h-5 stroke-[2.4]' : 'w-5 h-5 stroke-[1.8]'
                  }`}
                />

                {/* Live Indicator Dot for Cart / Likes / Tracking with warm orange accent */}
                {item.badge && !isSelected && !isDisabled && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-[#C85A32] border border-[#FFFEFC]" />
                )}
              </div>
            </div>
          );

          if (isDisabled) {
            return (
              <div
                key={item.id}
                className="w-full h-full flex items-center justify-center cursor-not-allowed select-none"
                aria-disabled="true"
              >
                {content}
              </div>
            );
          }

          if (item.href) {
            return (
              <Link
                key={item.id}
                href={item.href}
                prefetch={false}
                onClick={() => setSelectedTab(item.id)}
                className="w-full h-full flex items-center justify-center cursor-pointer"
                aria-label={item.label}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedTab(item.id)}
              className="w-full h-full flex items-center justify-center cursor-pointer"
              aria-label={item.label}
            >
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
