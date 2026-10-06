// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET as getForecast } from '@/app/api/forecast/route';
import { GET as getRareHighlight } from '@/app/api/rare-highlight/route';
import { GET as getSightings } from '@/app/api/sightings/route';
import { forecastResponse } from './forecast-fixture';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const request = (path: string, ip: string) => new Request(`http://localhost${path}`, { headers: { 'x-forwarded-for': ip } });

describe('GET /api/sightings', () => {
  it('says plainly when no eBird key is configured', async () => {
    vi.stubEnv('EBIRD_API_KEY', '');
    const response = await getSightings(request('/api/sightings', '10.0.0.1'));
    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatch(/no eBird API key/);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('rejects an out-of-range day count', async () => {
    const response = await getSightings(request('/api/sightings?days=99', '10.0.0.2'));
    expect(response.status).toBe(400);
  });

  it('returns park sightings, cached at the CDN, without exposing the key', async () => {
    vi.stubEnv('EBIRD_API_KEY', 'test-key');
    const row = {
      speciesCode: 'norcar', comName: 'Northern Cardinal', sciName: 'Cardinalis cardinalis', locId: 'L1',
      locName: 'Central Park--The Ramble', obsDt: '2026-10-05 07:30', howMany: 2, lat: 40.78, lng: -73.97,
      obsValid: true, obsReviewed: false, locationPrivate: false, subId: 'S1',
    };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([row]), { status: 200 })));
    const response = await getSightings(request('/api/sightings?days=3', '10.0.0.3'));
    const text = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=900');
    expect(text).not.toContain('test-key');
    expect(JSON.parse(text)).toMatchObject({ days: 3, sightings: [{ speciesCode: 'norcar', area: 'The Ramble', count: 2 }] });
  });

  it('turns an eBird outage into a readable 502', async () => {
    vi.stubEnv('EBIRD_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('oops', { status: 500 })));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await getSightings(request('/api/sightings', '10.0.0.4'));
    expect(response.status).toBe(502);
    expect((await response.json()).error).toMatch(/eBird is having trouble/);
  });
});

describe('GET /api/rare-highlight', () => {
  it('says plainly when no eBird key is configured', async () => {
    vi.stubEnv('EBIRD_API_KEY', '');
    const response = await getRareHighlight(request('/api/rare-highlight', '10.0.1.1'));
    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatch(/no eBird API key/);
  });

  it('returns no highlight, not an error, when nothing rare was reported', async () => {
    vi.stubEnv('EBIRD_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('[]', { status: 200 })));
    const response = await getRareHighlight(request('/api/rare-highlight', '10.0.1.2'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=900');
    expect((await response.json()).highlight).toBeNull();
  });

  it('turns an eBird outage into a readable 502', async () => {
    vi.stubEnv('EBIRD_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('oops', { status: 500 })));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await getRareHighlight(request('/api/rare-highlight', '10.0.1.3'));
    expect(response.status).toBe(502);
  });
});

describe('GET /api/forecast', () => {
  it('returns the birding forecast', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-05T14:00:00Z'), toFake: ['Date'] });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(forecastResponse(['2026-10-04', '2026-10-05', '2026-10-06'])))));
    const response = await getForecast(request('/api/forecast', '10.0.0.5'));
    vi.useRealTimers();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.days[0].date).toBe('2026-10-05');
    expect(body.days[0].outlook.level).toBe('low');
  });

  it('turns a network failure into a 504', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('fetch failed'))));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await getForecast(request('/api/forecast', '10.0.0.6'));
    expect(response.status).toBe(504);
  });
});
