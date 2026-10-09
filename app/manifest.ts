import type { MetadataRoute } from 'next';
import { DEFAULT_THEME, THEMES } from '@/lib/theme';

/**
 * Served at /manifest.webmanifest via Next's file convention, so the dashboard can be installed
 * to a home screen — which is where a weather app actually gets used.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Weather Dashboard',
    short_name: 'Weather',
    description: 'Choose which readings you see, arrange them how you like, for any location.',
    start_url: '/',
    display: 'standalone',
    background_color: THEMES[DEFAULT_THEME].themeColor,
    theme_color: THEMES[DEFAULT_THEME].themeColor,
    // PNGs alongside the SVG: iOS and some Android launchers ignore SVG manifest icons. The
    // maskable one is full-bleed with the art inside the safe zone, so launchers can crop it to
    // any shape without clipping the mountains.
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
