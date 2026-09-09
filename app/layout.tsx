import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Instrument_Serif, Inter } from 'next/font/google';
import { themeInitScript } from '@/lib/theme';
import { DASHBOARD_STORAGE_KEY } from '@/store/dashboard-store';
import './globals.css';

// next/font, so faces are self-hosted and there is no render-blocking request to Google.
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-sans' });

// The editorial display face. Used for readings and headings only — the numbers are the point of
// a weather dashboard, so they get the voice.
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Weather Dashboard',
  description:
    'A customizable weather dashboard. Choose which readings you see, arrange them how you like, for any location, with live data from Open-Meteo.',
  applicationName: 'Weather Dashboard',
  openGraph: {
    title: 'Weather Dashboard',
    description: 'Choose which readings you see, arrange them how you like, for any location.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Weather Dashboard',
    description: 'Choose which readings you see, arrange them how you like, for any location.',
  },
};

export const viewport: Viewport = {
  // Matches the canvas token in each palette, so the browser chrome doesn't sit on a seam.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f3f0' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    // suppressHydrationWarning: the inline script below sets data-theme before React hydrates, so
    // the server-rendered <html> and the client's deliberately differ on this one attribute.
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable}`} suppressHydrationWarning>
      <head>
        {/* Runs before first paint. Without it, dark-mode users get a white flash on every load,
            because the preference store is deliberately rehydrated after mount. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript(DASHBOARD_STORAGE_KEY) }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
