import { NextResponse } from 'next/server';
import type { RateLimitResult } from '@/lib/rate-limit';

/**
 * Cache-Control values for successful responses. These target the CDN (s-maxage) rather than the
 * browser (max-age=0) so a deploy or purge can invalidate them centrally, and so a user's own
 * browser doesn't pin stale weather.
 */
export const CACHE_CONTROL = {
  // Open-Meteo's current-conditions block updates on a 15-minute interval; 10 minutes keeps the
  // dashboard fresh while collapsing bursts of traffic into one upstream call.
  weather: 'public, max-age=0, s-maxage=600, stale-while-revalidate=300',
  // A city's coordinates effectively never change, so this can be cached hard.
  geocode: 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
  // Errors must never be cached — a transient upstream blip shouldn't be pinned at the CDN.
  none: 'no-store',
} as const;

/** Every error response across the API uses this shape: { error: string }. */
export function jsonError(message: string, status: number, headers: Record<string, string> = {}) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': CACHE_CONTROL.none, ...headers } });
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'RateLimit-Limit': String(result.limit),
    'RateLimit-Remaining': String(result.remaining),
    'RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };
  if (!result.allowed) headers['Retry-After'] = String(result.retryAfterSeconds);
  return headers;
}

/**
 * Best-effort client identity for rate limiting. Vercel populates x-forwarded-for; when it is
 * absent (e.g. direct local requests) all such callers share one bucket, which is acceptable for
 * a guardrail but means an unidentified flood is throttled collectively.
 */
export function clientKey(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const first = forwardedFor?.split(',')[0]?.trim();
  return first && first.length > 0 ? first : 'unknown';
}
