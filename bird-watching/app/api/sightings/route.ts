import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CACHE_CONTROL, UpstreamError, clientKey, jsonError, rateLimitHeaders, type UpstreamErrorKind } from '@/lib/api/http';
import { fetchParkSightings, type SightingsResponse } from '@/lib/ebird/sightings';
import { createRateLimiter } from '@/lib/rate-limit';

const rateLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

// The provider's message is a diagnostic for the server log; the reader gets a sentence.
const USER_MESSAGE: Record<UpstreamErrorKind, string> = {
  network: "Couldn't reach eBird. Check your connection and try again.",
  upstream: 'eBird is having trouble right now. Please try again in a moment.',
  malformed: "eBird sent back something we couldn't read. Please try again shortly.",
};

const querySchema = z.object({
  // eBird's geo endpoints accept 1–30 days back.
  days: z.coerce.number().int().min(1).max(30).default(7),
});

export async function GET(request: Request) {
  const limit = rateLimiter.check(clientKey(request));
  if (!limit.allowed) return jsonError('Too many requests. Please retry shortly.', 429, rateLimitHeaders(limit));

  const query = querySchema.safeParse({ days: new URL(request.url).searchParams.get('days') ?? undefined });
  if (!query.success) return jsonError('days must be a whole number from 1 to 30.', 400, rateLimitHeaders(limit));

  // Read per request, not at module load, so a key added in the host's settings applies without
  // a rebuild. Never sent to the browser.
  const apiKey = process.env.EBIRD_API_KEY;
  if (!apiKey) return jsonError("Live sightings aren't set up yet: the server has no eBird API key.", 503, rateLimitHeaders(limit));

  try {
    const sightings = await fetchParkSightings(apiKey, query.data.days);
    const body: SightingsResponse = { fetchedAt: new Date().toISOString(), days: query.data.days, sightings };
    return NextResponse.json(body, { headers: { 'Cache-Control': CACHE_CONTROL.sightings, ...rateLimitHeaders(limit) } });
  } catch (error) {
    if (error instanceof UpstreamError) {
      console.error('[sightings] eBird failed:', error.kind, error.message);
      // A rejected key is our misconfiguration, not eBird's outage — say so in the log.
      if (error.status === 401 || error.status === 403) console.error('[sightings] check EBIRD_API_KEY');
      return jsonError(USER_MESSAGE[error.kind], error.kind === 'network' ? 504 : 502, rateLimitHeaders(limit));
    }
    throw error;
  }
}
