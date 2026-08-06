import { NextResponse } from 'next/server';
import { z } from 'zod';
import { normalizeOpenMeteoForecast } from '@/lib/weather/normalize-open-meteo';
import { OpenMeteoError, fetchOpenMeteoForecast } from '@/lib/weather/providers/open-meteo';

const querySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  name: z.string().trim().min(1).default('Selected location'),
  region: z.string().trim().default(''),
  country: z.string().trim().default(''),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsedQuery = querySchema.safeParse({
    latitude: searchParams.get('latitude') ?? undefined,
    longitude: searchParams.get('longitude') ?? undefined,
    name: searchParams.get('name') ?? undefined,
    region: searchParams.get('region') ?? undefined,
    country: searchParams.get('country') ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json({ error: parsedQuery.error.issues[0]?.message ?? 'Invalid query' }, { status: 400 });
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
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof OpenMeteoError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    throw error;
  }
}
