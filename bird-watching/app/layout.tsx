import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Manrope, Newsreader } from 'next/font/google';
import { BottomNav } from '@/components/shell/bottom-nav';
import { ServiceWorkerRegistrar } from '@/components/shell/service-worker-registrar';
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
  // Opens full-screen from the iOS home screen; the touch icon itself is app/apple-icon.png.
  appleWebApp: { capable: true, title: 'Birding', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  // Matches --surface so the browser chrome doesn't sit on a seam.
  themeColor: '#f2f3e4',
  // No viewportFit here: 'cover' in a browser tab lets Chrome on iOS (address bar on top) draw the page
  // under its toolbar while env(safe-area-inset-top) stays 0, hiding the top of every page.
  // STANDALONE_VIEWPORT_SCRIPT opts in to 'cover' only for the home-screen app.
};

/**
 * Turns on viewport-fit=cover only when launched from the home screen, where nothing but the
 * home indicator overlaps the page and env(safe-area-inset-bottom) is needed for the bottom nav
 * (see --nav-bottom-gap). Inline in <head> so it applies before first paint; it keeps watching
 * <head> because Next inserts a second viewport meta after hydration, which would otherwise win.
 */
const STANDALONE_VIEWPORT_SCRIPT = `(function(){try{
if(!(navigator.standalone||matchMedia('(display-mode: standalone)').matches))return;
function fit(){document.querySelectorAll('meta[name="viewport"]').forEach(function(m){
if(m.content.indexOf('viewport-fit')<0)m.content+=', viewport-fit=cover';});}
fit();new MutationObserver(fit).observe(document.head,{childList:true,subtree:true,attributes:true,attributeFilter:['content']});
}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} ${newsreader.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: STANDALONE_VIEWPORT_SCRIPT }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-secondary-fixed focus:px-4 focus:py-2 focus:text-on-secondary"
        >
          Skip to content
        </a>
        {/* SiteHeader (components/shell/site-header.tsx) is hidden for now, kept to iterate on later. */}
        <main id="main" className="mx-auto w-full max-w-2xl px-4 pb-[calc(var(--nav-height)+var(--nav-bottom-gap)+2rem)] pt-[max(1.5rem,env(safe-area-inset-top))]">
          {children}
        </main>
        <BottomNav />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
