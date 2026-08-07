import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CACHE_CONTROL, clientKey, jsonError, rateLimitHeaders } from '@/lib/api/http';
import { OpenMeteoGeocodingError, fetchOpenMeteoGeocoding } from '@/lib/weather/providers/open-meteo-geocoding';
import { createRateLimiter } from '@/lib/rate-limit';

const rateLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

const MAX_RESULTS = 5;

const querySchema = z.object({
  name: z.string().trim().min(2, 'name must be at least 2 characters').max(120, 'name is too long'),
});

export async function GET(request: Request) {
  const limit = rateLimiter.check(clientKey(request));
  if (!limit.allowed) {
    return jsonError('Too many requests. Please retry shortly.', 429, rateLimitHeaders(limit));
  }

  const parsedQuery = querySchema.safeParse({ name: new URL(request.url).searchParams.get('name') ?? '' });

  if (!parsedQuery.success) {
    return jsonError(parsedQuery.error.issues[0]?.message ?? 'Invalid query', 400, rateLimitHeaders(limit));
  }

  try {
    const results = await fetchOpenMeteoGeocoding({ name: parsedQuery.data.name, count: MAX_RESULTS });
    return NextResponse.json(
      { results },
      { headers: { 'Cache-Control': CACHE_CONTROL.geocode, ...rateLimitHeaders(limit) } },
    );
  } catch (error) {
    if (error instanceof OpenMeteoGeocodingError) {
      return jsonError(error.message, 502, rateLimitHeaders(limit));
    }
    throw error;
  }
}
