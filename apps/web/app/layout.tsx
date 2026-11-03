import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { themeScript } from '../lib/theme.ts';
import { Providers } from './providers.tsx';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pulseboard',
  description: 'Marketing analytics pipeline and dashboard',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The head script may set data-theme before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-page font-sans text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
