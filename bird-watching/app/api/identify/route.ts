import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { CACHE_CONTROL, clientKey, jsonError, rateLimitHeaders } from '@/lib/api/http';
import { IdentifyRefusal, identifyWithClaude } from '@/lib/identify/claude';
import { resolveIdentification } from '@/lib/identify/resolve';
import { identifyRequestSchema, type IdentifyResponse } from '@/lib/identify/schema';
import { createRateLimiter } from '@/lib/rate-limit';

// Every call costs money, so this is tighter than the read-only routes. Per instance only (see
// lib/rate-limit.ts) — the Anthropic Console's monthly spend limit is the real backstop.
const rateLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

export async function POST(request: Request) {
  const limit = rateLimiter.check(clientKey(request));
  const headers = rateLimitHeaders(limit);
  if (!limit.allowed) return jsonError('Too many photos at once. Please wait a minute and try again.', 429, headers);

  const body = identifyRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return jsonError("That photo couldn't be read. Try choosing it again.", 400, headers);

  // Read per request so a key added in the host's settings applies without a rebuild.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return jsonError("Photo ID isn't set up yet: the server has no Anthropic API key.", 503, headers);

  try {
    const output = await identifyWithClaude(new Anthropic({ apiKey }), body.data);
    const result: IdentifyResponse = await resolveIdentification(output, { ebirdApiKey: process.env.EBIRD_API_KEY });
    return NextResponse.json(result, { headers: { 'Cache-Control': CACHE_CONTROL.none, ...headers } });
  } catch (error) {
    if (error instanceof IdentifyRefusal) return jsonError("Claude couldn't identify this photo. Try another one, or add the bird by hand.", 422, headers);
    if (error instanceof Anthropic.AuthenticationError) {
      console.error('[identify] check ANTHROPIC_API_KEY');
      return jsonError("Photo ID isn't working right now: the server's Anthropic key was rejected.", 503, headers);
    }
    if (error instanceof Anthropic.RateLimitError) return jsonError('Photo ID is busy. Please try again in a minute.', 503, headers);
    if (error instanceof Anthropic.APIConnectionError) return jsonError("Couldn't reach Claude. Check your connection and try again.", 504, headers);
    if (error instanceof Anthropic.APIError) {
      console.error('[identify] Anthropic error:', error.status, error.message);
      return jsonError('Photo ID had a problem. Please try again shortly.', 502, headers);
    }
    console.error('[identify] failed:', error);
    return jsonError('Photo ID had a problem. Please try again shortly.', 502, headers);
  }
}
