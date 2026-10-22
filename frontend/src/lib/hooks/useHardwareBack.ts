'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Universal back navigation interceptor.
 * Handles:
 * 1. Android right-edge and left-edge gesture back-swipes
 * 2. Physical hardware back buttons
 * 3. Browser software back buttons
 * 4. Touch touchstart/touchmove gesture hooks for mobile viewport edges
 *
 * Ensures left-edge and right-edge swipes consistently execute predictable screen-to-screen navigation
 * without dropping out of the application.
 */
export function useHardwareBack(targetUrl?: string | null, customHandler?: () => void) {
  const router = useRouter();
  const handlerRef = useRef(customHandler);
  const targetUrlRef = useRef(targetUrl);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    handlerRef.current = customHandler;
    targetUrlRef.current = targetUrl;
  }, [customHandler, targetUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const executeNavigation = () => {
      if (handlerRef.current) {
        handlerRef.current();
      } else if (targetUrlRef.current) {
        router.push(targetUrlRef.current);
      }
    };

    // Keep history stack padded so edge-swipes never trigger browser default page unload
    window.history.pushState({ guard: 1 }, '', window.location.href);
    window.history.pushState({ guard: 2 }, '', window.location.href);

    const onPopState = () => {
      window.history.pushState({ guard: Date.now() }, '', window.location.href);
      executeNavigation();
    };

    // Edge gesture listeners for both left-edge and right-edge swipes
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length === 1) {
        const touch = e.touches[0];
        const screenWidth = window.innerWidth;
        // Check if swipe originated near left edge (< 40px) or right edge (> screenWidth - 40px)
        const isNearLeftEdge = touch.clientX <= 40;
        const isNearRightEdge = touch.clientX >= screenWidth - 40;

        if (isNearLeftEdge || isNearRightEdge) {
          touchStartRef.current = {
            x: touch.clientX,
            y: touch.clientY,
            time: Date.now(),
          };
        } else {
          touchStartRef.current = null;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current || !e.changedTouches || e.changedTouches.length === 0) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;

      const isHorizontalSwipe =
        Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && deltaTime < 450;

      // Left-to-right swipe from left edge (deltaX > 0) OR right-to-left swipe from right edge (deltaX < 0)
      if (isHorizontalSwipe) {
        const screenWidth = window.innerWidth;
        const startedAtLeft = touchStartRef.current.x <= 40 && deltaX > 0;
        const startedAtRight = touchStartRef.current.x >= screenWidth - 40 && deltaX < 0;

        if (startedAtLeft || startedAtRight) {
          e.preventDefault();
          executeNavigation();
        }
      }

      touchStartRef.current = null;
    };

    window.addEventListener('popstate', onPopState);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [router]);
}
