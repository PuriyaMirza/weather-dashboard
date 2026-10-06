import { describe, expect, it, vi } from 'vitest';
import type { ParkSighting } from '@/lib/ebird/sightings';
import { pickRareHighlight, rareCandidates } from '@/lib/live/rare-highlight';
import type { SpeciesPhoto } from '@/lib/media/wikipedia';

const sighting = (commonName: string, extra: Partial<ParkSighting> = {}): ParkSighting => ({
  speciesCode: commonName.toLowerCase().slice(0, 6),
  commonName,
  scientificName: `${commonName} sci`,
  area: 'The Ramble',
  observedAt: '2026-10-05 07:30',
  count: 1,
  notable: true,
  unconfirmed: false,
  checklistUrl: 'https://ebird.org/checklist/S1',
  ...extra,
});

const photo: SpeciesPhoto = {
  src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Bird.jpg/800px-Bird.jpg',
  width: 800,
  height: 600,
  artist: 'A. Photographer',
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Bird.jpg',
  articleUrl: 'https://en.wikipedia.org/wiki/Bird',
};

describe('rareCandidates', () => {
  it('keeps only rare species, confirmed reports first, then newest', () => {
    const result = rareCandidates([
      sighting('Northern Cardinal', { notable: false }),
      sighting('Old Confirmed', { observedAt: '2026-10-01 08:00' }),
      sighting('New Unconfirmed', { unconfirmed: true, observedAt: '2026-10-05 09:00' }),
      sighting('New Confirmed', { observedAt: '2026-10-04 08:00' }),
    ]);
    expect(result.map((s) => s.commonName)).toEqual(['New Confirmed', 'Old Confirmed', 'New Unconfirmed']);
  });

  it('leaves out named forms, whose species photo would show the everyday bird', () => {
    expect(rareCandidates([sighting('House Sparrow (Gray-cheeked)')])).toEqual([]);
  });
});

describe('pickRareHighlight', () => {
  it('skips a bird with no creditable photo and uses the next one', async () => {
    const getPhoto = vi.fn(async (name: string) => (name.startsWith('Second') ? photo : null));
    const result = await pickRareHighlight([sighting('First'), sighting('Second', { observedAt: '2026-10-04 07:00' })], getPhoto);
    expect(result?.sighting.commonName).toBe('Second');
    expect(result?.photo).toBe(photo);
  });

  it('returns null rather than a bird without a photo, and stops after three lookups', async () => {
    const getPhoto = vi.fn(async () => null);
    const birds = ['A', 'B', 'C', 'D'].map((n, i) => sighting(n, { observedAt: `2026-10-0${5 - i} 07:00` }));
    expect(await pickRareHighlight(birds, getPhoto)).toBeNull();
    expect(getPhoto).toHaveBeenCalledTimes(3);
  });

  it('returns null without looking anything up when nothing rare was seen', async () => {
    const getPhoto = vi.fn(async () => photo);
    expect(await pickRareHighlight([sighting('Blue Jay', { notable: false })], getPhoto)).toBeNull();
    expect(getPhoto).not.toHaveBeenCalled();
  });
});
