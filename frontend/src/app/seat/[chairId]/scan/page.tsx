'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Image as ImageIcon,
  Zap,
  ZapOff,
  SwitchCamera,
  History,
  QrCode,
  Scan,
} from 'lucide-react';
import { useHardwareBack } from '../../../../lib/hooks/useHardwareBack';

export default function CustomerScanPage() {
  const params = useParams();
  const router = useRouter();
  const chairId = (params?.chairId as string) || '12';

  // Device hardware back button & swipe back: return to bill/order summary
  useHardwareBack(`/seat/${chairId}/bill`);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [flashOn, setFlashOn] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'qr' | 'scan' | 'history'>('scan');

  // Initialize device camera with fallback
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        if (navigator?.mediaDevices?.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode },
            audio: false,
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setCameraActive(true);
          }
        }
      } catch (err) {
        console.warn('Camera access unavailable or declined:', err);
        setCameraActive(false);
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const toggleFlash = () => {
    setFlashOn((prev) => !prev);
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black text-black overflow-hidden select-none">
      {/* Background Camera Video Stream - Full Edge to Edge with zero side stretches */}
      <div className="absolute inset-0 z-0 w-full h-full bg-zinc-950 flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover filter grayscale contrast-125 transition-opacity duration-300 ${
            cameraActive ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>

      {/* Fixed Top Controls Bar - Anchored solidly at top-0 with zero vertical movement */}
      <div className="fixed top-0 left-0 right-0 z-30 max-w-md mx-auto px-5 pt-6 pb-3 flex items-center justify-between pointer-events-auto">
        {/* Back Button returning to Order Summary / Bill */}
        <Link
          href={`/seat/${chairId}/bill`}
          className="w-10 h-10 rounded-full border border-[#DCE2DE] bg-[#FFFEFC] flex items-center justify-center cursor-pointer active:opacity-70 shadow-md text-[#1A2621]"
          aria-label="Back to Bill"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>

        {/* Switch Camera Button (Front/Rear) */}
        <button
          type="button"
          onClick={toggleCameraFacing}
          className="w-10 h-10 rounded-full border border-[#DCE2DE] bg-[#FFFEFC] flex items-center justify-center cursor-pointer active:opacity-70 shadow-md text-[#1A2621]"
          aria-label="Flip Camera"
        >
          <SwitchCamera className="w-5 h-5" />
        </button>
      </div>

      {/* Scanner Reticle: Positioned higher up (top-[33%]) with zero vertical movement */}
      <div className="absolute top-[33%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
          {/* 4 Crisp Geometric Corner Brackets */}
          {/* Top-Left */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#DD6B28] rounded-tl-xl shadow-sm" />
          {/* Top-Right */}
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#DD6B28] rounded-tr-xl shadow-sm" />
          {/* Bottom-Left */}
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#DD6B28] rounded-bl-xl shadow-sm" />
          {/* Bottom-Right */}
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#DD6B28] rounded-br-xl shadow-sm" />

          {/* Transparent Viewfinder Framing Area */}
          <div className="w-52 h-52 sm:w-56 sm:h-56 rounded-2xl border border-white/40 relative flex items-center justify-center">
            {/* Stationary Central Scanning Focus Line */}
            <div className="absolute left-3 right-3 h-[2px] bg-gradient-to-r from-[#244436] via-[#DD6B28] to-[#244436] shadow-sm pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Fixed Bottom Bar - Solidly positioned with zero up/down movement */}
      <div className="fixed bottom-0 left-0 right-0 z-30 w-full max-w-md mx-auto pb-4 px-4 bg-[#FFFEFC]/95 backdrop-blur-md border-t border-[#DCE2DE]/60">
        <div className="w-full flex items-center justify-between pt-2">
          {/* Left: QR Code Icon Button */}
          <button
            type="button"
            onClick={() => setActiveBottomTab('qr')}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              activeBottomTab === 'qr'
                ? 'bg-[#244436] text-white border border-[#244436]'
                : 'text-[#1A2621] hover:bg-[#F4F1EA] border border-[#DCE2DE]'
            }`}
            aria-label="QR Code Details"
          >
            <QrCode className="w-6 h-6 stroke-[2]" />
          </button>

          {/* Center Elevated Bulged Scan Button with Outer Ring */}
          <button
            type="button"
            onClick={() => {
              setActiveBottomTab('scan');
              // Simulate scan completion linking to payment success
              router.push(`/seat/${chairId}/payment-success?mode=UPI%20Scan`);
            }}
            className="w-14 h-14 rounded-full border border-[#DCE2DE] bg-white flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-md p-1"
            aria-label="Trigger Scan"
          >
            <div className="w-full h-full rounded-full bg-gradient-to-r from-[#244436] to-[#DD6B28] text-white flex items-center justify-center shadow-xs">
              <Scan className="w-6 h-6 stroke-[2.2]" />
            </div>
          </button>

          {/* Right: History Icon Button */}
          <button
            type="button"
            onClick={() => setActiveBottomTab('history')}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              activeBottomTab === 'history'
                ? 'bg-[#244436] text-white border border-[#244436]'
                : 'text-[#1A2621] hover:bg-[#F4F1EA] border border-[#DCE2DE]'
            }`}
            aria-label="Scan History"
          >
            <History className="w-6 h-6 stroke-[2]" />
          </button>
        </div>
      </div>
    </div>
  );
}
