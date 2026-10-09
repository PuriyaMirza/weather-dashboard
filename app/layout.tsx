import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Manrope, Newsreader } from 'next/font/google';
import { DEFAULT_THEME, THEMES, themeInitScript } from '@/lib/theme';
import { DASHBOARD_STORAGE_KEY } from '@/store/dashboard-store';
import './globals.css';

// next/font, so faces are self-hosted and there is no render-blocking request to Google. Both are
// variable fonts, so every weight the type scale uses ships in one file each.
const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

// The display face: large readings and the hero temperature.
const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Weather Dashboard',
  description:
    'A customizable weather dashboard. Choose which readings you see, arrange them how you like, for any location, with live data from Open-Meteo.',
  applicationName: 'Weather Dashboard',
  // Opens full-screen from the iOS home screen; the touch icon itself is app/apple-icon.png.
  appleWebApp: { capable: true, title: 'Weather', statusBarStyle: 'default' },
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
  // Matches the default theme's --surface, so the browser chrome doesn't sit on a seam.
  themeColor: THEMES[DEFAULT_THEME].themeColor,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    // suppressHydrationWarning: the inline script below may swap data-theme before React hydrates,
    // so the server-rendered <html> and the client's can deliberately differ on this one attribute.
    <html
      lang="en"
      data-theme={DEFAULT_THEME}
      className={`${manrope.variable} ${newsreader.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Runs before first paint. Without it, anyone on a non-default theme would see the default
            flash on every load, because the preference store is rehydrated after mount. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript(DASHBOARD_STORAGE_KEY) }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
