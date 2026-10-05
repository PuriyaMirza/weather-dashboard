import { NextResponse } from 'next/server';
import type { RateLimitResult } from '@/lib/rate-limit';

/**
 * Cache-Control for successful responses, aimed at the CDN (s-maxage) so a burst of park visitors
 * collapses into one upstream call, and a user's own browser never pins stale data.
 */
export const CACHE_CONTROL = {
  // eBird reports trickle in through the morning; 15 minutes is fresh enough to chase a rarity.
  sightings: 'public, max-age=0, s-maxage=900, stale-while-revalidate=300',
  // Open-Meteo refreshes hourly forecasts on roughly that cadence.
  forecast: 'public, max-age=0, s-maxage=1800, stale-while-revalidate=600',
  none: 'no-store',
} as const;

/** Every error response uses this shape: { error: string }. */
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

/** Best-effort client identity for rate limiting (see the weather app's lib/api/http.ts). */
export function clientKey(request: Request): string {
  const first = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return first && first.length > 0 ? first : 'unknown';
}

/** Why an upstream call failed, in terms a route can turn into a sentence a person can act on. */
export type UpstreamErrorKind = 'network' | 'upstream' | 'malformed';

export class UpstreamError extends Error {
  readonly kind: UpstreamErrorKind;
  readonly status?: number;

  constructor(message: string, kind: UpstreamErrorKind, status?: number) {
    super(message);
    this.name = 'UpstreamError';
    this.kind = kind;
    this.status = status;
  }
}

/**
 * Fetches JSON and validates it, mapping every failure to an UpstreamError so routes never leak
 * a raw TypeError or a Zod report to the browser.
 */
export async function fetchJson<T>(
  url: string,
  parse: (json: unknown) => { success: true; data: T } | { success: false; error: { message: string } },
  init: RequestInit,
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  let response: Response;
  try {
    response = await fetchImpl(url, init);
  } catch (error) {
    throw new UpstreamError(`Could not reach ${new URL(url).host}: ${error instanceof Error ? error.message : 'network error'}`, 'network');
  }
  if (!response.ok) throw new UpstreamError(`${new URL(url).host} answered ${response.status}`, 'upstream', response.status);
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new UpstreamError(`${new URL(url).host} sent invalid JSON`, 'malformed', response.status);
  }
  const parsed = parse(json);
  if (!parsed.success) throw new UpstreamError(`${new URL(url).host} response failed validation: ${parsed.error.message}`, 'malformed');
  return parsed.data;
}
