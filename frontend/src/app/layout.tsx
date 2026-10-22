import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'LUMIÈRE - Real-Time Dining & Ordering System',
  description: '100-Seat Collaborative Real-Time Restaurant Management System',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500 selection:text-black">
        {children}
        <Toaster position="top-right" richColors theme="dark" closeButton />
      </body>
    </html>
  );
}
