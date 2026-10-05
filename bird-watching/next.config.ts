import path from 'node:path';
import type { NextConfig } from 'next';

/**
 * Baseline hardening on every response. Mirrors the weather app; geolocation stays allowed for
 * "you are here" on a future park map, camera/microphone stay off until a feature needs them.
 */
const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=(), payment=()' },
];

// A stale service worker would pin an old app shell indefinitely, so the worker file itself is
// never cached (see Next's PWA guide).
const SERVICE_WORKER_HEADERS = [
  { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
  { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
];

const nextConfig: NextConfig = {
  // This app sits inside the weather-dashboard repo, which has its own lockfile one level up.
  // Without an explicit root, Turbopack would pick the outer one and resolve modules from there.
  turbopack: {
    root: path.join(__dirname),
  },
  outputFileTracingRoot: path.join(__dirname),
  images: {
    // Species photos come from Wikimedia Commons only (see lib/media/wikipedia.ts).
    remotePatterns: [{ protocol: 'https', hostname: 'upload.wikimedia.org', pathname: '/wikipedia/commons/**' }],
  },
  async headers() {
    return [
      { source: '/(.*)', headers: SECURITY_HEADERS },
      { source: '/sw.js', headers: SERVICE_WORKER_HEADERS },
    ];
  },
};

export default nextConfig;
