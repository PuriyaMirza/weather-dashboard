import type { NextConfig } from 'next';

/**
 * Baseline hardening on every response.
 *
 * The CSP carries only `frame-ancestors`: a script policy is deliberately left out, because the
 * pre-paint theme script in app/layout.tsx is inline and would need a hash kept in sync with it,
 * and nonces would force every page to render dynamically. Framing is the live risk here — an
 * embedded copy could steer a visitor into the geolocation prompt or into applying a share link.
 */
const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=(), payment=()' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
