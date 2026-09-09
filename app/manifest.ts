import type { MetadataRoute } from 'next';

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
    background_color: '#000000',
    theme_color: '#000000',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
