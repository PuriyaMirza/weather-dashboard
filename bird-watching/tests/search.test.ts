import { describe, expect, it } from 'vitest';
import type { Species } from '@/lib/birds/schema';
import { EMPTY_FILTERS, filterSpecies, matchRank, normalize } from '@/lib/birds/search';

function bird(overrides: Partial<Species>): Species {
  return {
    code: 'x', commonName: 'X', scientificName: 'X x', bandingCode: null, family: 'F', familyScientific: 'Fidae',
    taxonOrder: 1, startHere: true, lengthIn: [5, 6], colors: [], habitats: [], summary: null, idTips: [],
    lookAlikes: [], whereInPark: null, whenInPark: null, behavior: null, voice: null, ...overrides,
  };
}

const robin = bird({ code: 'amerob', commonName: 'American Robin', scientificName: 'Turdus migratorius', bandingCode: 'AMRO', family: 'Thrushes and Allies', taxonOrder: 3, lengthIn: [7.9, 11], colors: ['orange', 'gray'], habitats: ['lawns'] });
const cooper = bird({ code: 'coohaw', commonName: "Cooper's Hawk", scientificName: 'Astur cooperii', bandingCode: 'COHA', taxonOrder: 1, lengthIn: [14, 20], colors: ['gray', 'orange'], habitats: ['woodland'] });
const goldfinch = bird({ code: 'amegfi', commonName: 'American Goldfinch', scientificName: 'Spinus tristis', bandingCode: 'AMGO', taxonOrder: 2, lengthIn: [4.3, 5.1], colors: ['yellow', 'black'], habitats: ['feeders'] });
const undescribed = bird({ code: 'rarbir', commonName: 'Rare Bird', taxonOrder: 4, lengthIn: null });
const all = [cooper, goldfinch, robin, undescribed];

describe('normalize', () => {
  it('ignores case, apostrophes, hyphens and accents', () => {
    expect(normalize("Cooper's")).toBe('coopers');
    expect(normalize('Black-and-white')).toBe('black and white');
    expect(normalize('Pérez')).toBe('perez');
  });
});

describe('matchRank', () => {
  it('ranks an exact banding code above everything else', () => {
    expect(matchRank(robin, 'amro')).toBe(0);
    expect(matchRank(robin, 'robin')).toBeGreaterThan(0);
  });

  it('matches word starts, scientific names and families', () => {
    expect(matchRank(robin, 'rob')).not.toBeNull();
    expect(matchRank(robin, 'turdus')).not.toBeNull();
    expect(matchRank(robin, 'thrush')).not.toBeNull();
    expect(matchRank(robin, 'hawk')).toBeNull();
  });

  it('finds names with apostrophes without typing them', () => {
    expect(matchRank(cooper, 'coopers')).not.toBeNull();
  });
});

describe('filterSpecies', () => {
  it('returns everything in taxonomic order with no filters', () => {
    expect(filterSpecies(all, EMPTY_FILTERS).map((s) => s.code)).toEqual(['coohaw', 'amegfi', 'amerob', 'rarbir']);
  });

  it('requires every selected colour', () => {
    const result = filterSpecies(all, { ...EMPTY_FILTERS, colors: ['orange', 'gray'] });
    expect(result.map((s) => s.code)).toEqual(['coohaw', 'amerob']);
    expect(filterSpecies(all, { ...EMPTY_FILTERS, colors: ['yellow', 'gray'] })).toEqual([]);
  });

  it('matches any selected size or habitat, and drops birds with no known size', () => {
    expect(filterSpecies(all, { ...EMPTY_FILTERS, sizes: ['tiny', 'robin'] }).map((s) => s.code)).toEqual(['amegfi', 'amerob']);
    expect(filterSpecies(all, { ...EMPTY_FILTERS, habitats: ['lawns', 'feeders'] }).map((s) => s.code)).toEqual(['amegfi', 'amerob']);
  });

  it('puts the best text match first', () => {
    expect(filterSpecies(all, { ...EMPTY_FILTERS, query: 'american' }).map((s) => s.code)).toEqual(['amegfi', 'amerob']);
    expect(filterSpecies(all, { ...EMPTY_FILTERS, query: 'AMRO' })[0].code).toBe('amerob');
  });
});
