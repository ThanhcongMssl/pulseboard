import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pulseboard',
  description: 'Marketing analytics pipeline and dashboard',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-page font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
