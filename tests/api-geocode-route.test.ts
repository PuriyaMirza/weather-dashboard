import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/geocode/route';
import geocodingResults from './fixtures/open-meteo/geocoding-results.json';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

// The route's rate limiter is module-level state shared across tests, so each test uses its own
// client IP to get its own budget.
function requestFor(url: string, ip: string): Request {
  return new Request(url, { headers: { 'x-forwarded-for': ip } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GET /api/geocode', () => {
  it('returns matching locations for a valid query', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(geocodingResults)));

    const response = await GET(requestFor('http://localhost/api/geocode?name=Portland', '10.1.0.1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.results).toHaveLength(2);
    expect(body.results[0].name).toBe('Portland');
  });

  it('caps the number of results requested from upstream', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(geocodingResults));
    vi.stubGlobal('fetch', fetchMock);

    await GET(requestFor('http://localhost/api/geocode?name=Portland', '10.1.0.2'));

    const upstreamUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(upstreamUrl.searchParams.get('count')).toBe('5');
  });

  it('sets a long CDN cache header on successful responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(geocodingResults)));

    const response = await GET(requestFor('http://localhost/api/geocode?name=Portland', '10.1.0.3'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=86400');
  });

  it('returns 400 when name is missing', async () => {
    const response = await GET(requestFor('http://localhost/api/geocode', '10.1.0.4'));
    expect(response.status).toBe(400);
    expect(await response.json()).toHaveProperty('error');
  });

  it('returns 400 when name is too short', async () => {
    const response = await GET(requestFor('http://localhost/api/geocode?name=P', '10.1.0.5'));
    expect(response.status).toBe(400);
  });

  it('returns 400 when name is absurdly long', async () => {
    const response = await GET(requestFor(`http://localhost/api/geocode?name=${'x'.repeat(500)}`, '10.1.0.6'));
    expect(response.status).toBe(400);
  });

  it('never caches error responses', async () => {
    const response = await GET(requestFor('http://localhost/api/geocode?name=P', '10.1.0.7'));
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns 502 when the upstream geocoding request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({ error: true, reason: 'boom' }, 400)));

    const response = await GET(requestFor('http://localhost/api/geocode?name=Portland', '10.1.0.8'));
    expect(response.status).toBe(502);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns a 502 with the standard error shape when the network itself fails', async () => {
    // Regression: a transport-level rejection used to escape the route as a raw TypeError.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')));

    const response = await GET(requestFor('http://localhost/api/geocode?name=Portland', '10.1.0.10'));

    expect(response.status).toBe(502);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toHaveProperty('error');
  });

  it('returns 429 with Retry-After once the per-client limit is exceeded', async () => {
    const ip = '10.1.0.9';
    const url = 'http://localhost/api/geocode?name=P';

    // Rate limiting runs before query validation, so these invalid requests still consume budget.
    for (let i = 0; i < 30; i += 1) {
      const response = await GET(requestFor(url, ip));
      expect(response.status).toBe(400);
    }

    const limited = await GET(requestFor(url, ip));
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('Retry-After'))).toBeGreaterThan(0);
  });
});
