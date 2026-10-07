import { NextResponse } from 'next/server';
import { CACHE_CONTROL, UpstreamError, clientKey, jsonError, rateLimitHeaders, type UpstreamErrorKind } from '@/lib/api/http';
import { fetchParkSightings } from '@/lib/ebird/sightings';
import { pickRareHighlight, type RareHighlightResponse } from '@/lib/live/rare-highlight';
import { getSpeciesPhoto } from '@/lib/media/wikipedia';
import { createRateLimiter } from '@/lib/rate-limit';

const rateLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

// A week back: rare birds are scarce, and a hero that is empty most days isn't much of a hero.
const DAYS = 7;

const USER_MESSAGE: Record<UpstreamErrorKind, string> = {
  network: "Couldn't reach eBird. Check your connection and try again.",
  upstream: 'eBird is having trouble right now. Please try again in a moment.',
  malformed: "eBird sent back something we couldn't read. Please try again shortly.",
};

/** The Today page's hero: the most recent rare bird in the park that we can show a credited photo of. */
export async function GET(request: Request) {
  const limit = rateLimiter.check(clientKey(request));
  if (!limit.allowed) return jsonError('Too many requests. Please retry shortly.', 429, rateLimitHeaders(limit));

  const apiKey = process.env.EBIRD_API_KEY;
  if (!apiKey) return jsonError("Live sightings aren't set up yet: the server has no eBird API key.", 503, rateLimitHeaders(limit));

  try {
    const sightings = await fetchParkSightings(apiKey, DAYS);
    // getSpeciesPhoto never throws: a Wikipedia failure means no photo, so the page just has no hero.
    const highlight = await pickRareHighlight(sightings, getSpeciesPhoto);
    const body: RareHighlightResponse = { fetchedAt: new Date().toISOString(), highlight };
    return NextResponse.json(body, { headers: { 'Cache-Control': CACHE_CONTROL.rareHighlight, ...rateLimitHeaders(limit) } });
  } catch (error) {
    if (error instanceof UpstreamError) {
      console.error('[rare-highlight] eBird failed:', error.kind, error.message);
      return jsonError(USER_MESSAGE[error.kind], error.kind === 'network' ? 504 : 502, rateLimitHeaders(limit));
    }
    throw error;
  }
}
