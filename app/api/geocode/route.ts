import { NextResponse } from 'next/server';
import { z } from 'zod';
import { OpenMeteoGeocodingError, fetchOpenMeteoGeocoding } from '@/lib/weather/providers/open-meteo-geocoding';

const querySchema = z.object({
  name: z.string().trim().min(2, 'name must be at least 2 characters'),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsedQuery = querySchema.safeParse({ name: searchParams.get('name') ?? '' });

  if (!parsedQuery.success) {
    return NextResponse.json({ error: parsedQuery.error.issues[0]?.message ?? 'Invalid query' }, { status: 400 });
  }

  try {
    const results = await fetchOpenMeteoGeocoding({ name: parsedQuery.data.name, count: 5 });
    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof OpenMeteoGeocodingError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    throw error;
  }
}
