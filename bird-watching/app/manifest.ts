import type { MetadataRoute } from 'next';

/**
 * Served at /manifest.webmanifest via Next's file convention, so the app can be added to a phone's
 * home screen and open full-screen in the park. Colours match --surface (see globals.css).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Central Park Birding',
    short_name: 'Birding',
    description: 'A field companion for birding Central Park: guide, sightings, forecast, and your own log.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f2f3e4',
    theme_color: '#f2f3e4',
    // PNGs alongside the SVG: iOS and some Android launchers ignore SVG manifest icons. The
    // maskable one is full-bleed with the bird inside the safe zone, so launchers can crop it.
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
