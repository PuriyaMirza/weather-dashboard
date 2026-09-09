import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CACHE_CONTROL, clientKey, jsonError, rateLimitHeaders } from '@/lib/api/http';
import { normalizeOpenMeteoAirQuality, normalizeOpenMeteoForecast } from '@/lib/weather/normalize-open-meteo';
import { OpenMeteoError, fetchOpenMeteoForecast, type OpenMeteoErrorKind } from '@/lib/weather/providers/open-meteo';
import { fetchOpenMeteoAirQuality } from '@/lib/weather/providers/open-meteo-air-quality';
import type { AirQualityMetrics } from '@/lib/weather/types';
import { createRateLimiter } from '@/lib/rate-limit';

const rateLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

/**
 * What the *user* is told, keyed by why the call failed.
 *
 * The provider's own message is a diagnostic — it can carry an upstream parser complaint or a
 * whole Zod report — and putting it on screen tells the reader nothing they can act on. ("Open-Meteo
 * response was not valid JSON (status 403)" was, briefly, real user-facing copy.) The diagnostic
 * goes to the server log instead; the reader gets a sentence and a Try again button.
 */
const USER_MESSAGE: Record<OpenMeteoErrorKind, string> = {
  network: "Couldn't reach the weather service. Check your connection and try again.",
  upstream: 'The weather service is having trouble right now. Please try again in a moment.',
  malformed: "The weather service sent back something we couldn't read. Please try again shortly.",
};

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

  const coordinates = {
    latitude: parsedQuery.data.latitude,
    longitude: parsedQuery.data.longitude,
    timezone: 'auto',
  };

  try {
    // Two upstream calls, one response. The "one shared request per forecast" rule is about cards
    // never fetching for themselves — which still holds, since the browser makes a single request
    // and every card is handed the same result.
    //
    // They are settled independently on purpose: air quality is supplementary, so its failure must
    // not take down a perfectly good forecast. The forecast is the only one allowed to fail hard.
    const [forecastResult, airQualityResult] = await Promise.allSettled([
      fetchOpenMeteoForecast(coordinates),
      fetchOpenMeteoAirQuality(coordinates),
    ]);

    if (forecastResult.status === 'rejected') throw forecastResult.reason;

    let airQuality: AirQualityMetrics | null = null;
    if (airQualityResult.status === 'fulfilled') {
      airQuality = normalizeOpenMeteoAirQuality(airQualityResult.value);
    } else {
      // Degrading to null is deliberate, but degrading *silently* means a permanently broken
      // air-quality upstream would look identical to a location that simply has no data.
      console.error('[weather] air quality unavailable, continuing without it:', airQualityResult.reason);
    }

    const data = normalizeOpenMeteoForecast(
      forecastResult.value,
      {
        name: parsedQuery.data.name,
        region: parsedQuery.data.region,
        country: parsedQuery.data.country,
      },
      airQuality,
    );
    return NextResponse.json(data, {
      headers: { 'Cache-Control': CACHE_CONTROL.weather, ...rateLimitHeaders(limit) },
    });
  } catch (error) {
    if (error instanceof OpenMeteoError) {
      console.error('[weather] forecast failed:', error.kind, error.message);
      // 504 when we never got an answer, 502 when we got one we couldn't use.
      const status = error.kind === 'network' ? 504 : 502;
      return jsonError(USER_MESSAGE[error.kind], status, rateLimitHeaders(limit));
    }
    throw error;
  }
}
