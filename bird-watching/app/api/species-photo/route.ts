import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CACHE_CONTROL, clientKey, jsonError, rateLimitHeaders } from '@/lib/api/http';
import type { CandidatePhoto } from '@/lib/identify/schema';
import { getSpeciesPhoto } from '@/lib/media/wikipedia';
import { createRateLimiter } from '@/lib/rate-limit';

const rateLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

// A binomial only ("Pandion haliaetus"), so this can't be used to fetch arbitrary Wikipedia pages.
const querySchema = z.object({ sci: z.string().regex(/^[A-Z][a-z]+ [a-z]+(?:-[a-z]+)?$/).max(80) });

/**
 * A credited reference photo for one species, for the photo-ID suggestions. Kept out of
 * /api/identify so the ID never waits on Wikipedia, and cached hard at the CDN so each species
 * reaches Wikipedia about once a week (getSpeciesPhoto also throttles and backs off on 429).
 */
export async function GET(request: Request) {
  const limit = rateLimiter.check(clientKey(request));
  if (!limit.allowed) return jsonError('Too many requests. Please retry shortly.', 429, rateLimitHeaders(limit));

  const query = querySchema.safeParse({ sci: new URL(request.url).searchParams.get('sci') ?? '' });
  if (!query.success) return jsonError('sci must be a scientific name like "Pandion haliaetus".', 400, rateLimitHeaders(limit));

  const found = await getSpeciesPhoto(query.data.sci);
  const photo: CandidatePhoto | null = found && {
    src: found.src,
    width: found.width,
    height: found.height,
    artist: found.artist,
    license: found.license,
    licenseUrl: found.licenseUrl,
    sourceUrl: found.sourceUrl,
  };
  return NextResponse.json(
    { photo },
    { headers: { 'Cache-Control': photo ? CACHE_CONTROL.speciesPhoto : CACHE_CONTROL.speciesPhotoMissing, ...rateLimitHeaders(limit) } },
  );
}
