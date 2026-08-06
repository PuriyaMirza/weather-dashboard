import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/geocode/route';
import geocodingResults from './fixtures/open-meteo/geocoding-results.json';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GET /api/geocode', () => {
  it('returns matching locations for a valid query', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(geocodingResults)));

    const request = new Request('http://localhost/api/geocode?name=Portland');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results).toHaveLength(2);
    expect(body.results[0].name).toBe('Portland');
  });

  it('returns 400 when name is missing', async () => {
    const request = new Request('http://localhost/api/geocode');
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it('returns 400 when name is too short', async () => {
    const request = new Request('http://localhost/api/geocode?name=P');
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it('returns 502 when the upstream geocoding request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({ error: true, reason: 'boom' }, 400)));

    const request = new Request('http://localhost/api/geocode?name=Portland');
    const response = await GET(request);
    expect(response.status).toBe(502);
  });
});
