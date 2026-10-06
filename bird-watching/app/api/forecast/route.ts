import { NextResponse } from 'next/server';
import { CACHE_CONTROL, UpstreamError, clientKey, jsonError, rateLimitHeaders, type UpstreamErrorKind } from '@/lib/api/http';
import { parkToday, toBirdingForecast } from '@/lib/forecast/birding-outlook';
import { fetchParkForecast } from '@/lib/forecast/open-meteo';
import { createRateLimiter } from '@/lib/rate-limit';

const rateLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

const USER_MESSAGE: Record<UpstreamErrorKind, string> = {
  network: "Couldn't reach the weather service. Check your connection and try again.",
  upstream: 'The weather service is having trouble right now. Please try again in a moment.',
  malformed: "The weather service sent back something we couldn't read. Please try again shortly.",
};

/** The birding forecast for Central Park. Takes no parameters: the park doesn't move. */
export async function GET(request: Request) {
  const limit = rateLimiter.check(clientKey(request));
  if (!limit.allowed) return jsonError('Too many requests. Please retry shortly.', 429, rateLimitHeaders(limit));
  try {
    const now = new Date();
    const forecast = toBirdingForecast(await fetchParkForecast(), now.toISOString(), parkToday(now));
    return NextResponse.json(forecast, { headers: { 'Cache-Control': CACHE_CONTROL.forecast, ...rateLimitHeaders(limit) } });
  } catch (error) {
    if (error instanceof UpstreamError) {
      console.error('[forecast] Open-Meteo failed:', error.kind, error.message);
      return jsonError(USER_MESSAGE[error.kind], error.kind === 'network' ? 504 : 502, rateLimitHeaders(limit));
    }
    throw error;
  }
}
