import { describe, expect, it, vi } from 'vitest';
import { UpstreamError } from '@/lib/api/http';
import type { EbirdObservation } from '@/lib/ebird/schemas';
import { fetchParkSightings, isInPark, parkArea, toParkSightings } from '@/lib/ebird/sightings';

function obs(overrides: Partial<EbirdObservation>): EbirdObservation {
  return {
    speciesCode: 'amerob', comName: 'American Robin', sciName: 'Turdus migratorius', locId: 'L1',
    locName: 'Central Park--The Ramble', obsDt: '2026-10-04 08:15', howMany: 4, lat: 40.778, lng: -73.969,
    obsValid: true, obsReviewed: false, locationPrivate: false, subId: 'S100', ...overrides,
  };
}

describe('park location names', () => {
  it('keeps the park and its sub-hotspots, drops neighbours', () => {
    expect(isInPark('Central Park')).toBe(true);
    expect(isInPark('Central Park--The Ramble')).toBe(true);
    expect(isInPark('Central Park West at 72nd St')).toBe(true);
    expect(isInPark('Riverside Park')).toBe(false);
    expect(isInPark('Fifth Ave & 79th St')).toBe(false);
  });

  it('names the area inside the park', () => {
    expect(parkArea('Central Park--North Woods')).toBe('North Woods');
    expect(parkArea('Central Park')).toBe('Central Park');
  });
});

describe('toParkSightings', () => {
  it('lists each species once, rare birds first, then newest first', () => {
    const result = toParkSightings(
      [
        obs({ speciesCode: 'amerob', obsDt: '2026-10-04 08:15' }),
        obs({ speciesCode: 'blujay', comName: 'Blue Jay', obsDt: '2026-10-04 09:00' }),
        obs({ speciesCode: 'conwar', comName: 'Connecticut Warbler', obsDt: '2026-10-03 07:00' }),
      ],
      [
        obs({ speciesCode: 'conwar', comName: 'Connecticut Warbler', obsDt: '2026-10-03 07:00', obsReviewed: false }),
        obs({ speciesCode: 'conwar', comName: 'Connecticut Warbler', obsDt: '2026-10-02 07:00', obsReviewed: true }),
      ],
    );
    expect(result.map((s) => s.speciesCode)).toEqual(['conwar', 'blujay', 'amerob']);
    expect(result[0]).toMatchObject({ notable: true, unconfirmed: true, area: 'The Ramble', checklistUrl: 'https://ebird.org/checklist/S100' });
    expect(result[1].notable).toBe(false);
  });

  it('drops reports outside the park and from private locations', () => {
    const result = toParkSightings(
      [obs({ locName: 'Riverside Park' }), obs({ speciesCode: 'norcar', locationPrivate: true })],
      [],
    );
    expect(result).toEqual([]);
  });

  it('keeps an uncounted bird as null rather than guessing', () => {
    expect(toParkSightings([obs({ howMany: undefined })], [])[0].count).toBeNull();
  });
});

describe('fetchParkSightings', () => {
  it('sends the key as a header and queries around the park', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([obs({})]), { status: 200 }));
    const result = await fetchParkSightings('secret-key', 3, fetchImpl as unknown as typeof fetch);
    expect(result).toHaveLength(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/data/obs/geo/recent?');
    expect(url).toContain('back=3');
    expect(url).not.toContain('secret-key');
    expect((init.headers as Record<string, string>)['X-eBirdApiToken']).toBe('secret-key');
    expect((fetchImpl.mock.calls[1] as unknown as [string])[0]).toContain('/recent/notable?');
  });

  it.each([
    ['network', () => Promise.reject(new TypeError('fetch failed'))],
    ['upstream', async () => new Response('{"errors":[]}', { status: 403 })],
    ['malformed', async () => new Response('[{"nope":1}]', { status: 200 })],
  ])('maps a %s failure to a typed error', async (kind, impl) => {
    const error = await fetchParkSightings('k', 7, vi.fn(impl) as unknown as typeof fetch).catch((e) => e);
    expect(error).toBeInstanceOf(UpstreamError);
    expect(error.kind).toBe(kind);
  });
});
