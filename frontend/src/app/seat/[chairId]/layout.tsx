import React from 'react';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function SeatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#FAF7F0] via-[#F7F2EA] to-[#F3ECE1] text-[#1A2621]">
      {children}
    </div>
  );
}
