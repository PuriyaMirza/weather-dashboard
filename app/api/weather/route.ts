import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CACHE_CONTROL, clientKey, jsonError, rateLimitHeaders } from '@/lib/api/http';
import { normalizeOpenMeteoForecast } from '@/lib/weather/normalize-open-meteo';
import { OpenMeteoError, fetchOpenMeteoForecast } from '@/lib/weather/providers/open-meteo';
import { createRateLimiter } from '@/lib/rate-limit';

const rateLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

const querySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  name: z.string().trim().min(1).max(120).default('Selected location'),
  region: z.string().trim().max(120).default(''),
  country: z.string().trim().max(120).default(''),
});

export async function GET(request: Request) {
  const limit = rateLimiter.check(clientKey(request));
  if (!limit.allowed) {
    return jsonError('Too many requests. Please retry shortly.', 429, rateLimitHeaders(limit));
  }

  const { searchParams } = new URL(request.url);
  // Missing params must stay undefined: z.coerce.number() turns null into 0, which is a valid
  // coordinate and would silently resolve to "null island" instead of failing validation.
  const parsedQuery = querySchema.safeParse({
    latitude: searchParams.get('latitude') ?? undefined,
    longitude: searchParams.get('longitude') ?? undefined,
    name: searchParams.get('name') ?? undefined,
    region: searchParams.get('region') ?? undefined,
    country: searchParams.get('country') ?? undefined,
  });

  if (!parsedQuery.success) {
    return jsonError(parsedQuery.error.issues[0]?.message ?? 'Invalid query', 400, rateLimitHeaders(limit));
  }

  try {
    // One shared forecast request per lookup — this response is meant to be distributed to
    // every card on the dashboard, not re-fetched per card.
    const forecast = await fetchOpenMeteoForecast({
      latitude: parsedQuery.data.latitude,
      longitude: parsedQuery.data.longitude,
      timezone: 'auto',
    });
    const data = normalizeOpenMeteoForecast(forecast, {
      name: parsedQuery.data.name,
      region: parsedQuery.data.region,
      country: parsedQuery.data.country,
    });
    return NextResponse.json(data, {
      headers: { 'Cache-Control': CACHE_CONTROL.weather, ...rateLimitHeaders(limit) },
    });
  } catch (error) {
    if (error instanceof OpenMeteoError) {
      return jsonError(error.message, 502, rateLimitHeaders(limit));
    }
    throw error;
  }
}
