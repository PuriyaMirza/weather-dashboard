import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/weather/route';
import validForecastResponse from './fixtures/open-meteo/valid-response.json';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GET /api/weather', () => {
  it('returns normalized weather data for valid coordinates', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(validForecastResponse)));

    const request = new Request('http://localhost/api/weather?latitude=45.5152&longitude=-122.6784&name=Portland&region=Oregon&country=United+States');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe('open-meteo');
    expect(body.location).toEqual({
      name: 'Portland',
      region: 'Oregon',
      country: 'United States',
      timezone: 'America/Los_Angeles',
      latitude: 45.5,
      longitude: -122.6784,
    });
    expect(body.current.temperatureF).toBe(72);
  });

  it('returns 400 when latitude/longitude are missing', async () => {
    const request = new Request('http://localhost/api/weather?name=Portland');
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it('returns 400 when latitude is out of range', async () => {
    const request = new Request('http://localhost/api/weather?latitude=999&longitude=-122.6784');
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it('returns 502 when the upstream forecast request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({ error: true, reason: 'boom' }, 400)));

    const request = new Request('http://localhost/api/weather?latitude=45.5152&longitude=-122.6784');
    const response = await GET(request);
    expect(response.status).toBe(502);
  });
});
