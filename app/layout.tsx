import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { themeInitScript } from '@/lib/theme';
import { DASHBOARD_STORAGE_KEY } from '@/store/dashboard-store';
import './globals.css';

// next/font, so the font is self-hosted and there is no render-blocking request to Google.
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Weather Dashboard',
  description:
    'A customizable weather dashboard. Choose which cards you see, for any location, with live data from Open-Meteo.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    // suppressHydrationWarning: the inline script below sets data-theme before React hydrates, so
    // the server-rendered <html> and the client's deliberately differ on this one attribute.
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Runs before first paint. Without it, dark-mode users get a white flash on every load,
            because the preference store is deliberately rehydrated after mount. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript(DASHBOARD_STORAGE_KEY) }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
