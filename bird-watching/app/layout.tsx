import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Manrope, Newsreader } from 'next/font/google';
import { BottomNav } from '@/components/shell/bottom-nav';
import { SiteHeader } from '@/components/shell/site-header';
import './globals.css';

const manrope = Manrope({ subsets: ['latin'], display: 'swap', variable: '--font-sans' });

// Display face for bird names and page titles.
const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: { default: 'Central Park Birding', template: '%s · Central Park Birding' },
  description:
    'A field companion for birding Central Park: a beginner-friendly guide to the birds you will meet, where to find them, and how to tell look-alikes apart.',
  applicationName: 'Central Park Birding',
};

export const viewport: Viewport = {
  // Matches --surface so the browser chrome doesn't sit on a seam.
  themeColor: '#f2f3e4',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} ${newsreader.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-secondary-fixed focus:px-4 focus:py-2 focus:text-on-secondary"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="mx-auto w-full max-w-2xl px-4 pb-[calc(var(--nav-height)+2rem)] pt-4">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
