// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTaxonIndex, resetTaxonomyCache, resolveIdentification } from '@/lib/identify/resolve';
import type { ClaudeOutput } from '@/lib/identify/schema';

afterEach(() => resetTaxonomyCache());

const output = (overrides: Partial<ClaudeOutput> = {}): ClaudeOutput => ({
  candidates: [{ commonName: 'Osprey', scientificName: 'Pandion haliaetus', confidence: 'high', fieldMarks: 'Dark eye stripe, white underparts, fish in talons' }],
  date: '2026-10-09',
  time: '07:40',
  place: { name: 'Jamaica Bay', parkArea: null, stateCode: 'ny', countryCode: 'us' },
  count: 1,
  ...overrides,
});

function fakeFetch() {
  return vi.fn(async (url: RequestInfo | URL) => {
    const href = String(url);
    if (href.includes('api.ebird.org')) {
      return Response.json([
        { speciesCode: 'osprey', comName: 'Osprey', sciName: 'Pandion haliaetus' },
        { speciesCode: 'swaspa', comName: 'Swamp Sparrow', sciName: 'Melospiza georgiana' },
      ]);
    }
    if (href.includes('geocoding-api.open-meteo.com')) {
      return Response.json({ results: [{ name: 'Jamaica Bay', latitude: 40.61, longitude: -73.83, admin1: 'New York', country_code: 'US' }] });
    }
    return new Response('not found', { status: 404 });
  });
}

describe('buildTaxonIndex', () => {
  const lookup = buildTaxonIndex([{ code: 'osprey', commonName: 'Osprey', scientificName: 'Pandion haliaetus' }]);
  it('matches on scientific name, ignoring case and subspecies', () => {
    expect(lookup('Western Osprey', 'pandion  haliaetus carolinensis')?.code).toBe('osprey');
  });
  it('falls back to the common name', () => {
    expect(lookup('osprey', 'Pandion wrongus')?.code).toBe('osprey');
  });
  it('returns nothing rather than guessing', () => {
    expect(lookup('Dodo', 'Raphus cucullatus')).toBeUndefined();
  });
});

describe('resolveIdentification', () => {
  it('attaches eBird codes and a map point for a place outside the park', async () => {
    const fetchImpl = fakeFetch();
    const result = await resolveIdentification(output(), { ebirdApiKey: 'k', fetchImpl });
    expect(result.candidates[0]).toMatchObject({ speciesCode: 'osprey', commonName: 'Osprey' });
    expect(result.place).toMatchObject({ stateCode: 'NY', countryCode: 'US', latitude: 40.61, longitude: -73.83, mapLabel: 'Jamaica Bay, New York, US' });
    expect(String(fetchImpl.mock.calls.find(([u]) => String(u).includes('geocoding'))?.[0])).toContain('countryCode=US');
  });

  it('does not geocode a Central Park area', async () => {
    const fetchImpl = fakeFetch();
    const result = await resolveIdentification(
      output({ place: { name: 'the Ramble', parkArea: 'The Ramble', stateCode: 'NY', countryCode: 'US' } }),
      { ebirdApiKey: 'k', fetchImpl },
    );
    expect(result.place.latitude).toBeNull();
    expect(fetchImpl.mock.calls.some(([u]) => String(u).includes('geocoding'))).toBe(false);
  });

  it('still resolves guide species when eBird is down, and leaves unknown ones uncoded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchImpl = vi.fn(async () => new Response('down', { status: 500 }));
    const result = await resolveIdentification(
      output({
        candidates: [
          { commonName: 'Blue Jay', scientificName: 'Cyanocitta cristata', confidence: 'high', fieldMarks: 'Blue crest, black necklace' },
          { commonName: 'Swamp Sparrow', scientificName: 'Melospiza georgiana', confidence: 'medium', fieldMarks: 'Rufous wings, gray face' },
        ],
      }),
      { ebirdApiKey: 'k', fetchImpl },
    );
    expect(result.candidates.map((c) => c.speciesCode)).toEqual(['blujay', null]);
    expect(result.place.mapLabel).toBeNull();
  });

  it('drops malformed dates, times and counts instead of passing them on', async () => {
    const result = await resolveIdentification(output({ date: 'yesterday', time: '25:99', count: 0 }), { ebirdApiKey: undefined, fetchImpl: fakeFetch() });
    expect(result).toMatchObject({ date: null, time: null, count: null });
  });

  it('keeps at most three candidates', async () => {
    const c = output().candidates[0];
    const result = await resolveIdentification(output({ candidates: [c, c, c, c] }), { ebirdApiKey: undefined, fetchImpl: fakeFetch() });
    expect(result.candidates).toHaveLength(3);
  });
});
