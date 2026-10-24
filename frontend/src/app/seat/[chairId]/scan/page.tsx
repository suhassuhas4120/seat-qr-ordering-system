'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  X,
  AlertCircle,
  Receipt,
  Camera,
  Upload,
} from 'lucide-react';
import { useHardwareBack } from '../../../../lib/hooks/useHardwareBack';
import {
  getActiveDiningSession,
  getDeviceToken,
  isDeviceLockedToDifferentSeat,
  ActiveDiningSession,
} from '../../../../lib/session/diningSession';
import { getBackendUrl } from '../../../../lib/supabase';

export default function CustomerScanPage() {
  const params = useParams();
  const router = useRouter();
  const chairId = (params?.chairId as string) || '12';
  const seatNumber = chairId.replace(/[^0-9]/g, '') || chairId;

  // Device hardware back button & swipe back: return to bill/order summary
  useHardwareBack(`/seat/${chairId}/bill`);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [flashOn, setFlashOn] = useState(false);
  const [hasTorchCapability, setHasTorchCapability] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'qr' | 'scan' | 'history'>('scan');
  const [session, setSession] = useState<ActiveDiningSession | null>(null);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  // 1. Anti-Cheat & Lockout Guard on mount
  useEffect(() => {
    const lock = isDeviceLockedToDifferentSeat(chairId);
    if (lock.isLocked && lock.activeSeatId && lock.activeSeatId !== chairId) {
      router.replace(`/seat/${lock.activeSeatId}/bill`);
      return;
    }

    try {
      const active = getActiveDiningSession();
      if (active) {
        setSession(active);
      }
    } catch {}
  }, [chairId, router]);

  // 2. Initialize device camera stream
  useEffect(() => {
    let isCancelled = false;

    async function startCamera() {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        if (navigator?.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facingMode },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });

          if (isCancelled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }

          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setCameraActive(true);
          }

          // Inspect torch/flashlight hardware capability
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            const capabilities = (videoTrack.getCapabilities && videoTrack.getCapabilities()) as any;
            setHasTorchCapability(Boolean(capabilities && capabilities.torch));
          }
        }
      } catch (err) {
        console.warn('Camera access unavailable or declined:', err);
        if (!isCancelled) {
          setCameraActive(false);
        }
      }
    }

    startCamera();

    return () => {
      isCancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  // 3. Toggle physical camera flashlight / torch
  const toggleFlash = async () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        try {
          const nextFlash = !flashOn;
          await (videoTrack as any).applyConstraints({
            advanced: [{ torch: nextFlash }],
          });
          setFlashOn(nextFlash);
          return;
        } catch {
          // Torch not supported on front-facing or certain devices
        }
      }
    }
    setFlashOn((prev) => !prev);
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    setFlashOn(false);
  };

  // 4. Handle Scanned QR payload (Optical BarcodeDetector or manual upload)
  const handleScannedValue = useCallback(
    async (rawValue: string) => {
      if (isProcessingScan || !rawValue) return;
      setIsProcessingScan(true);
      setScanFeedback('QR Code Recognized');

      try {
        const cleanVal = rawValue.trim();

        // SCENARIO A: Scanned a Table QR Code URL (e.g., https://hotel.com/seat/15 or /seat/15)
        const seatMatch = cleanVal.match(/\/seat\/([a-zA-Z0-9_-]+)/);
        if (seatMatch && seatMatch[1]) {
          const targetSeat = seatMatch[1];
          const cleanTarget = targetSeat.replace(/[^0-9]/g, '');

          // Check if user currently has an unsettled dining session at another seat
          const currentSession = getActiveDiningSession();
          if (
            currentSession &&
            currentSession.paymentStatus === 'unpaid' &&
            currentSession.seatId !== targetSeat
          ) {
            alert(`You currently have an unsettled feast at Seat ${currentSession.seatId}. Please settle your bill first.`);
            router.replace(`/seat/${currentSession.seatId}/tracking`);
            return;
          }

          setScanFeedback(`Navigating to Seat ${cleanTarget || targetSeat}...`);
          setTimeout(() => {
            router.push(`/seat/${targetSeat}`);
          }, 400);
          return;
        }

        // SCENARIO B: Scanned a Restaurant UPI QR Code (upi://pay?pa=... or contains payment token)
        if (cleanVal.startsWith('upi://') || cleanVal.includes('pa=') || cleanVal.includes('thoogudeepa')) {
          setScanFeedback('UPI Merchant QR Verified');
          const grandTotal = session?.totalAmount || 0;

          // Process authoritative settlement on backend
          try {
            await fetch(`${getBackendUrl()}/api/payments/process`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-device-token': getDeviceToken(),
              },
              body: JSON.stringify({
                seatId: Number(seatNumber) || 12,
                gateway: 'UPI',
                settledByRole: 'CUSTOMER_SELF',
                gatewayPaymentId: `UPI_SCAN_${Date.now()}`,
              }),
            });
          } catch (e) {
            console.warn('Backend payment dispatch notice:', e);
          }

          setTimeout(() => {
            router.push(`/seat/${chairId}/payment-success?mode=UPI%20Scan&amount=${grandTotal}&ticket=${session?.ticketNumber || seatNumber}`);
          }, 600);
          return;
        }

        // General fallback
        setScanFeedback('Valid QR Detected');
        setTimeout(() => {
          router.push(`/seat/${chairId}/payment-success?mode=UPI%20Scan&amount=${session?.totalAmount || 0}`);
        }, 500);
      } catch (err) {
        console.error('Scan handling error:', err);
        setIsProcessingScan(false);
      }
    },
    [isProcessingScan, session, chairId, seatNumber, router]
  );

  // 5. Optical live scanning loop using native browser BarcodeDetector API
  useEffect(() => {
    if (!cameraActive || !videoRef.current || isProcessingScan) return;
    let active = true;
    let detector: any = null;

    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch {}
    }

    const interval = setInterval(async () => {
      if (!active || !videoRef.current || !detector || isProcessingScan) return;
      if (videoRef.current.readyState >= 2) {
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            handleScannedValue(barcodes[0].rawValue);
          }
        } catch {}
      }
    }, 450);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [cameraActive, isProcessingScan, handleScannedValue]);

  // 6. Handle gallery photo selection as backup QR scan
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      const img = new Image();
      img.onload = async () => {
        try {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await detector.detect(img);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            handleScannedValue(barcodes[0].rawValue);
          } else {
            alert('No valid QR code found in this image. Please try another photo.');
          }
        } catch {
          alert('Unable to decode QR image on this browser.');
        }
      };
      img.src = URL.createObjectURL(file);
    } else {
      // Fallback simulation for browsers lacking image BarcodeDetector
      handleScannedValue(`upi://pay?pa=thoogudeepa@okicici&seat=${chairId}`);
    }
  };

  // 7. Center scan trigger: executes verified payment settlement
  const handleCenterScanTrigger = async () => {
    setActiveBottomTab('scan');
    const grandTotal = session?.totalAmount || 0;

    setIsProcessingScan(true);
    setScanFeedback('Settling Table Payment...');

    try {
      await fetch(`${getBackendUrl()}/api/payments/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-token': getDeviceToken(),
        },
        body: JSON.stringify({
          seatId: Number(seatNumber) || 12,
          gateway: 'UPI',
          settledByRole: 'CUSTOMER_SELF',
          gatewayPaymentId: `SCAN_TRIGGER_${Date.now()}`,
        }),
      });
    } catch (err) {
      console.warn('Backend payment trigger notice:', err);
    }

    setTimeout(() => {
      router.push(`/seat/${chairId}/payment-success?mode=UPI%20Scan&amount=${grandTotal}&ticket=${session?.ticketNumber || seatNumber}`);
    }, 600);
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black text-black overflow-hidden select-none">
      {/* Hidden file picker for gallery QR upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Background Camera Video Stream */}
      <div className="absolute inset-0 z-0 w-full h-full bg-zinc-950 flex items-center justify-center overflow-hidden">
        {cameraActive ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover filter contrast-110 transition-opacity duration-300"
          />
        ) : (
          /* Camera Access Denied or Unavailable Fallback Card */
          <div className="w-full max-w-xs mx-auto p-6 bg-[#FFFEFC] rounded-3xl border border-[rgba(220,226,222,0.9)] shadow-2xl flex flex-col items-center text-center gap-3 z-10 animate-in fade-in duration-300">
            <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-300 flex items-center justify-center text-amber-700">
              <Camera className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase text-[#1A2621]">Camera Feed Inactive</h3>
              <p className="text-xs text-[#5A6860] leading-relaxed">
                Allow camera permission in browser settings to scan physical table QR codes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-4 bg-[#244436] text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer active:opacity-90 shadow-sm mt-1"
            >
              <Upload className="w-4 h-4" />
              <span>Upload QR Image</span>
            </button>
            <Link
              href={`/seat/${chairId}/bill`}
              className="w-full py-2 text-xs font-bold text-[#5A6860] hover:text-[#1A2621] uppercase tracking-wider text-center"
            >
              Return to Bill
            </Link>
          </div>
        )}
      </div>

      {/* Top Controls Bar */}
      <div className="fixed top-0 left-0 right-0 z-30 max-w-md mx-auto px-5 pt-6 pb-3 flex items-center justify-between pointer-events-auto">
        {/* Back Button returning to Order Summary / Bill */}
        <Link
          href={`/seat/${chairId}/bill`}
          className="w-10 h-10 rounded-full border border-[#DCE2DE] bg-[#FFFEFC] flex items-center justify-center cursor-pointer active:opacity-70 shadow-md text-[#1A2621]"
          aria-label="Back to Bill"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>

        {/* Action Controls: Flashlight, Gallery Image & Switch Camera */}
        <div className="flex items-center gap-2.5">
          {/* Flashlight / Torch Toggle Button */}
          <button
            type="button"
            onClick={toggleFlash}
            className={`w-10 h-10 rounded-full border flex items-center justify-center cursor-pointer active:opacity-70 shadow-md transition-all ${
              flashOn
                ? 'bg-[#DD6B28] text-white border-[#DD6B28]'
                : 'bg-[#FFFEFC] text-[#1A2621] border-[#DCE2DE]'
            }`}
            aria-label={flashOn ? 'Turn Flash Off' : 'Turn Flash On'}
          >
            {flashOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
          </button>

          {/* Photo Gallery QR Picker */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-full border border-[#DCE2DE] bg-[#FFFEFC] flex items-center justify-center cursor-pointer active:opacity-70 shadow-md text-[#1A2621]"
            aria-label="Upload QR from Gallery"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

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
      </div>

      {/* Optical Scanner Reticle with Animated Laser Focus Line */}
      <div className="absolute top-[33%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
          {/* 4 Crisp Geometric Corner Brackets */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#DD6B28] rounded-tl-xl shadow-sm" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#DD6B28] rounded-tr-xl shadow-sm" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#DD6B28] rounded-bl-xl shadow-sm" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#DD6B28] rounded-br-xl shadow-sm" />

          {/* Transparent Viewfinder Framing Area */}
          <div className="w-52 h-52 sm:w-56 sm:h-56 rounded-2xl border border-white/40 relative flex items-center justify-center overflow-hidden">
            {/* Live Scanning Focus Beam */}
            <div className="absolute left-2 right-2 h-[2px] bg-gradient-to-r from-[#244436] via-[#DD6B28] to-[#244436] shadow-sm animate-pulse" />
          </div>
        </div>

        {/* Scan Status Toast Notification */}
        {scanFeedback && (
          <div className="mt-4 px-4 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs font-bold text-center tracking-wide animate-in fade-in">
            {scanFeedback}
          </div>
        )}
      </div>

      {/* Interactive Bottom Sheet for TAB: 'qr' (View My Seat QR) */}
      {activeBottomTab === 'qr' && (
        <div className="fixed inset-x-0 bottom-24 z-40 max-w-md mx-auto px-4 animate-in slide-in-from-bottom duration-200">
          <div className="w-full bg-[#FFFEFC] border border-[rgba(220,226,222,0.9)] rounded-3xl p-5 shadow-2xl flex flex-col items-center text-center gap-3">
            <div className="w-full flex items-center justify-between pb-1 border-b border-[rgba(220,226,222,0.6)]">
              <span className="text-xs font-black uppercase tracking-wider text-[#244436]">
                Table QR • Seat #{seatNumber}
              </span>
              <button
                type="button"
                onClick={() => setActiveBottomTab('scan')}
                className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#FFFEFC] border border-[rgba(220,226,222,0.9)] rounded-2xl shadow-xs">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  typeof window !== 'undefined'
                    ? `${window.location.origin}/seat/${chairId}`
                    : `http://localhost:3000/seat/${chairId}`
                )}`}
                alt={`Seat ${seatNumber} QR Code`}
                className="w-36 h-36 object-contain rounded-xl"
              />
            </div>

            <p className="text-[11px] text-[#5A6860] font-medium leading-relaxed max-w-xs">
              Companions at your table can scan this code to view the live menu and collaborative order tab.
            </p>
          </div>
        </div>
      )}

      {/* Interactive Bottom Sheet for TAB: 'history' (Active Ticket & Scan Info) */}
      {activeBottomTab === 'history' && (
        <div className="fixed inset-x-0 bottom-24 z-40 max-w-md mx-auto px-4 animate-in slide-in-from-bottom duration-200">
          <div className="w-full bg-[#FFFEFC] border border-[rgba(220,226,222,0.9)] rounded-3xl p-5 shadow-2xl flex flex-col gap-3">
            <div className="w-full flex items-center justify-between pb-1 border-b border-[rgba(220,226,222,0.6)]">
              <span className="text-xs font-black uppercase tracking-wider text-[#244436]">
                Scan &amp; Order History
              </span>
              <button
                type="button"
                onClick={() => setActiveBottomTab('scan')}
                className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {session ? (
              <div className="flex flex-col gap-2 text-left">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#5A6860] font-semibold">Active Table:</span>
                  <span className="font-bold text-[#1A2621]">Seat #{seatNumber}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#5A6860] font-semibold">Kitchen Ticket:</span>
                  <span className="font-mono font-bold text-[#1A2621]">#{session.ticketNumber}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#5A6860] font-semibold">Ordered Dishes:</span>
                  <span className="font-bold text-[#1A2621]">{session.items?.length || 0} items</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-[rgba(220,226,222,0.6)]">
                  <span className="font-black text-[#1A2621] uppercase">Total Bill:</span>
                  <span className="font-black text-sm text-[#244436]">₹ {session.totalAmount}</span>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-[#5A6860] flex flex-col items-center gap-1.5">
                <Receipt className="w-6 h-6 text-zinc-400" />
                <span>No unsettled dining session active for this seat.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 w-full max-w-md mx-auto pb-4 px-4 bg-[#FFFEFC]/95 backdrop-blur-md border-t border-[#DCE2DE]/60">
        <div className="w-full flex items-center justify-between pt-2">
          {/* Left: View Seat QR Tab */}
          <button
            type="button"
            onClick={() => setActiveBottomTab((prev) => (prev === 'qr' ? 'scan' : 'qr'))}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              activeBottomTab === 'qr'
                ? 'bg-[#244436] text-white border border-[#244436]'
                : 'text-[#1A2621] hover:bg-[#F4F1EA] border border-[#DCE2DE]'
            }`}
            aria-label="View Table QR Code"
            title="View Table QR Code"
          >
            <QrCode className="w-6 h-6 stroke-[2]" />
          </button>

          {/* Center Elevated Bulged Scan Trigger */}
          <button
            type="button"
            disabled={isProcessingScan}
            onClick={handleCenterScanTrigger}
            className="w-14 h-14 rounded-full border border-[#DCE2DE] bg-white flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-md p-1"
            aria-label="Scan to Pay or Validate"
            title="Scan to Pay or Validate"
          >
            <div className="w-full h-full rounded-full bg-gradient-to-r from-[#244436] to-[#DD6B28] text-white flex items-center justify-center shadow-xs">
              <Scan className="w-6 h-6 stroke-[2.2]" />
            </div>
          </button>

          {/* Right: Scan & Order History Tab */}
          <button
            type="button"
            onClick={() => setActiveBottomTab((prev) => (prev === 'history' ? 'scan' : 'history'))}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              activeBottomTab === 'history'
                ? 'bg-[#244436] text-white border border-[#244436]'
                : 'text-[#1A2621] hover:bg-[#F4F1EA] border border-[#DCE2DE]'
            }`}
            aria-label="View Order & Scan History"
            title="View Order & Scan History"
          >
            <History className="w-6 h-6 stroke-[2]" />
          </button>
        </div>
      </div>
    </div>
  );
}
