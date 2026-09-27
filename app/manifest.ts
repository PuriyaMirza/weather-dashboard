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
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
