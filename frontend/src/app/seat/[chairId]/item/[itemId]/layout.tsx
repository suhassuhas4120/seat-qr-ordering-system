import React from 'react';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function ItemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
