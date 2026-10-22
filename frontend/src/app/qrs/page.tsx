'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { 
  Printer, 
  Download, 
  ExternalLink, 
  Search, 
  QrCode, 
  ChefHat, 
  Globe,
  Wifi,
  Laptop,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface SeatQR {
  seatNumber: number;
  seatId: string;
  url: string;
  qrDataUrl: string;
}

export default function SeatQRsPage() {
  const [hostPreset, setHostPreset] = useState<'current' | 'cloud' | 'wifi' | 'local' | 'custom'>('current');
  const [currentOrigin, setCurrentOrigin] = useState<string>('');
  const [customOrigin, setCustomOrigin] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [seatRange, setSeatRange] = useState<'all' | '1-25' | '26-50' | '51-75' | '76-100'>('1-25');
  const [cardLayout, setCardLayout] = useState<'stand' | 'compact'>('stand');
  const [generatedQRs, setGeneratedQRs] = useState<SeatQR[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentOrigin(window.location.origin);
    }
  }, []);

  const effectiveBaseUrl = useMemo(() => {
    if (hostPreset === 'current') return currentOrigin || 'https://amenities-mods-point-diving.trycloudflare.com';
    if (hostPreset === 'cloud') return 'https://thoogudeepa-v2.netlify.app';
    if (hostPreset === 'wifi') return 'http://192.168.0.4:3005';
    if (hostPreset === 'local') return 'http://localhost:3005';
    if (hostPreset === 'custom' && customOrigin.trim()) return customOrigin.trim().replace(/\/$/, '');
    return currentOrigin || 'http://localhost:3005';
  }, [hostPreset, currentOrigin, customOrigin]);

  // Generate 100 QR codes
  useEffect(() => {
    let isCancelled = false;

    async function generateAll() {
      setIsLoading(true);
      const qrs: SeatQR[] = [];

      for (let i = 1; i <= 100; i++) {
        const seatId = String(i).padStart(2, '0');
        const targetUrl = `${effectiveBaseUrl}/seat/${seatId}/`;
        try {
          const qrDataUrl = await QRCode.toDataURL(targetUrl, {
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 320,
            color: {
              dark: '#09090b',
              light: '#ffffff',
            },
          });
          qrs.push({
            seatNumber: i,
            seatId,
            url: targetUrl,
            qrDataUrl,
          });
        } catch (err) {
          console.error(`Error generating QR for seat ${i}:`, err);
        }
      }

      if (!isCancelled) {
        setGeneratedQRs(qrs);
        setIsLoading(false);
      }
    }

    generateAll();

    return () => {
      isCancelled = true;
    };
  }, [effectiveBaseUrl]);

  // Filter seats
  const filteredQRs = useMemo(() => {
    return generatedQRs.filter((item) => {
      // Range filter
      if (seatRange === '1-25' && (item.seatNumber < 1 || item.seatNumber > 25)) return false;
      if (seatRange === '26-50' && (item.seatNumber < 26 || item.seatNumber > 50)) return false;
      if (seatRange === '51-75' && (item.seatNumber < 51 || item.seatNumber > 75)) return false;
      if (seatRange === '76-100' && (item.seatNumber < 76 || item.seatNumber > 100)) return false;

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSeat = String(item.seatNumber).includes(q) || item.seatId.includes(q);
        return matchesSeat;
      }

      return true;
    });
  }, [generatedQRs, seatRange, searchQuery]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleDownloadSingle = (qr: SeatQR) => {
    const link = document.createElement('a');
    link.href = qr.qrDataUrl;
    link.download = `thoogudeepa-seat-${qr.seatId}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-zinc-900 font-sans">
      {/* Non-Printable Header & Toolbar */}
      <header className="print:hidden sticky top-0 z-40 bg-white border-b border-zinc-200 px-4 sm:px-6 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-950 text-white flex items-center justify-center font-black shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-zinc-950 uppercase">
                  100 SEAT TABLETOP QR GENERATOR
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider">
                  SEATS 01 – 100
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium">
                Customer camera scan auto-routes to each seat's digital ordering menu &amp; bill
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            <Link
              href="/kitchen"
              className="px-3 py-1.5 rounded-lg border border-zinc-300 hover:bg-zinc-100 text-zinc-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <ChefHat className="w-4 h-4" />
              <span>KITCHEN KDS</span>
            </Link>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-zinc-950 hover:bg-black text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>PRINT TABLE STANDS</span>
            </button>
          </div>
        </div>

        {/* Host Domain Preset Selector Bar */}
        <div className="max-w-7xl mx-auto mt-3 pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-black text-zinc-700 uppercase tracking-wider">
              Host Destination:
            </span>
            <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
              <button
                type="button"
                onClick={() => setHostPreset('current')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  hostPreset === 'current'
                    ? 'bg-zinc-950 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>Live Tunnel / Current</span>
              </button>
              <button
                type="button"
                onClick={() => setHostPreset('cloud')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  hostPreset === 'cloud'
                    ? 'bg-zinc-950 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>Netlify Cloud</span>
              </button>
              <button
                type="button"
                onClick={() => setHostPreset('wifi')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  hostPreset === 'wifi'
                    ? 'bg-zinc-950 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                <Wifi className="w-3.5 h-3.5 text-amber-500" />
                <span>Local Wi-Fi LAN</span>
              </button>
              <button
                type="button"
                onClick={() => setHostPreset('local')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  hostPreset === 'local'
                    ? 'bg-zinc-950 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                <Laptop className="w-3.5 h-3.5 text-zinc-400" />
                <span>Localhost</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setHostPreset('custom');
                  if (!customOrigin) setCustomOrigin(effectiveBaseUrl);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  hostPreset === 'custom'
                    ? 'bg-zinc-950 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                Custom
              </button>
            </div>

            {hostPreset === 'custom' && (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="https://your-custom-domain.com"
                  value={customOrigin}
                  onChange={(e) => setCustomOrigin(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-md border border-zinc-300 w-64 bg-white focus:outline-hidden focus:ring-1 focus:ring-zinc-900"
                />
              </div>
            )}
          </div>

          {/* Current URL Tag */}
          <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 truncate">
            <span className="font-bold text-zinc-700">Scan Destination:</span>
            <code className="bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded font-mono font-semibold text-zinc-800 text-[11px]">
              {effectiveBaseUrl}/seat/[seatId]
            </code>
          </div>
        </div>

        {/* Informational Guidance Notice */}
        {hostPreset === 'local' && (
          <div className="max-w-7xl mx-auto mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              <strong>Note:</strong> Scanning "localhost" on a phone camera fails because mobile devices cannot resolve your PC's localhost. Switch to <strong>Cloud Live</strong> or <strong>Local Wi-Fi LAN</strong> for phone camera scanning.
            </span>
          </div>
        )}

        {/* Controls Bar */}
        <div className="max-w-7xl mx-auto mt-3 pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
          {/* Range Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(
              [
                { label: 'ALL 100', value: 'all' },
                { label: 'SEATS 01-25', value: '1-25' },
                { label: 'SEATS 26-50', value: '26-50' },
                { label: 'SEATS 51-75', value: '51-75' },
                { label: 'SEATS 76-100', value: '76-100' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setSeatRange(tab.value)}
                className={`px-3 py-1 rounded-md text-xs font-black tracking-wide uppercase transition-colors cursor-pointer select-none ${
                  seatRange === tab.value
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Layout Switcher */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-44">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Find seat (e.g. 12)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs rounded-md border border-zinc-300 focus:outline-hidden focus:ring-1 focus:ring-zinc-900 bg-white"
              />
            </div>

            {/* Layout switch */}
            <div className="flex items-center border border-zinc-300 rounded-md overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setCardLayout('stand')}
                className={`px-2.5 py-1 text-xs font-bold cursor-pointer ${
                  cardLayout === 'stand' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                Table Stand
              </button>
              <button
                type="button"
                onClick={() => setCardLayout('compact')}
                className={`px-2.5 py-1 text-xs font-bold cursor-pointer ${
                  cardLayout === 'compact' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                Sticker
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 print:p-0 print:m-0 print:max-w-none">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-zinc-900 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-black uppercase tracking-wider text-zinc-600">
              Generating 100 High-Density Seat QR Codes...
            </span>
          </div>
        ) : (
          <div>
            {/* Summary Banner (Hidden on print) */}
            <div className="print:hidden mb-6 p-4 rounded-xl bg-white border border-zinc-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-zinc-900 uppercase">
                  Showing {filteredQRs.length} of 100 Tabletop QR Codes
                </h2>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">
                  Click any card's test button to preview customer menu or click "Print Table Stands" for cut-ready sheets.
                </p>
              </div>
              <div className="text-xs font-bold text-zinc-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Error Correction Level: High (smudge &amp; spill resistant)</span>
              </div>
            </div>

            {/* Cards Grid */}
            <div
              className={`grid gap-5 ${
                cardLayout === 'stand'
                  ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 print:grid-cols-2 print:gap-4'
                  : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 print:grid-cols-3 print:gap-3'
              }`}
            >
              {filteredQRs.map((qr) => (
                <div
                  key={qr.seatNumber}
                  className={`bg-white rounded-2xl border-2 border-zinc-900 p-4 shadow-sm flex flex-col items-center text-center justify-between relative overflow-hidden transition-all hover:shadow-md print:shadow-none print:border-zinc-800 print:break-inside-avoid ${
                    cardLayout === 'stand' ? 'min-h-[380px]' : 'min-h-[250px]'
                  }`}
                >
                  {/* Top Branding Header */}
                  <div className="w-full flex flex-col items-center border-b-2 border-zinc-900 pb-2.5">
                    <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">
                      THOOGUDEEPA
                    </span>
                    <h3 className="text-sm font-black text-zinc-950 uppercase tracking-tight">
                      AUTHENTIC MILITARY CUISINE
                    </h3>
                  </div>

                  {/* Seat Designation Banner */}
                  <div className="my-2 px-4 py-1.5 rounded-lg bg-zinc-950 text-white w-full flex items-center justify-center gap-1.5 shadow-2xs">
                    <span className="text-sm sm:text-base font-black tracking-wider uppercase">
                      SEAT {qr.seatId}
                    </span>
                  </div>

                  {/* High Density QR Display */}
                  <div className="p-2 rounded-xl bg-white border border-zinc-200 my-1 shadow-2xs flex items-center justify-center">
                    <img
                      src={qr.qrDataUrl}
                      alt={`Seat ${qr.seatId} QR Code`}
                      className={`block ${cardLayout === 'stand' ? 'w-44 h-44' : 'w-32 h-32'}`}
                    />
                  </div>

                  {/* Instructional Prompt */}
                  <div className="w-full pt-1.5 pb-2">
                    <p className="text-[11px] font-black text-zinc-900 uppercase tracking-wide">
                      SCAN TO VIEW MENU &amp; ORDER
                    </p>
                    <p className="text-[9px] text-zinc-500 font-medium">
                      Point phone camera • Instant live ordering
                    </p>
                  </div>

                  {/* Action Bar (Hidden when printing on cardstock) */}
                  <div className="print:hidden w-full pt-2 border-t border-zinc-100 flex items-center justify-between gap-1 text-[10px] mt-auto">
                    <button
                      type="button"
                      onClick={() => handleDownloadSingle(qr)}
                      className="px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Download PNG for stickers"
                    >
                      <Download className="w-3 h-3" />
                      <span>PNG</span>
                    </button>
                    <Link
                      href={`/seat/${qr.seatId}`}
                      prefetch={false}
                      target="_blank"
                      className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-black text-white font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                      title="Open seat ordering screen"
                    >
                      <span>TEST SEAT</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>

                  {/* Printable Table Guideline */}
                  <div className="hidden print:block w-full pt-1 border-t border-dashed border-zinc-300 text-[8px] text-zinc-400 font-mono">
                    thoogudeepa-v2 • seat-{qr.seatId} • tabletop fold line
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
