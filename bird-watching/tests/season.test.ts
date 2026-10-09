import { describe, expect, it } from 'vitest';
import { getWeeklyFrequencies } from '@/lib/birds/abundance';
import { ebirdWeek, picksForWeek } from '@/lib/birds/season';
import { getAllSpecies } from '@/lib/birds/species';

describe('ebirdWeek', () => {
  it('uses four weeks per month, the last running to month end', () => {
    expect(ebirdWeek(new Date(2026, 0, 1))).toBe(0);
    expect(ebirdWeek(new Date(2026, 0, 8))).toBe(1);
    expect(ebirdWeek(new Date(2026, 0, 22))).toBe(3);
    expect(ebirdWeek(new Date(2026, 0, 31))).toBe(3);
    expect(ebirdWeek(new Date(2026, 9, 9))).toBe(37);
    expect(ebirdWeek(new Date(2026, 11, 31))).toBe(47);
  });
});

describe('picksForWeek', () => {
  const flat = (v: number) => Array<number>(48).fill(v);
  it('ranks likely birds by frequency and drops absent ones', () => {
    const { likely } = picksForWeek({ a: flat(0.2), b: flat(0.5), c: flat(0) }, 10);
    expect(likely.map((p) => p.code)).toEqual(['b', 'a']);
  });
  it('flags arrivals using an absolute rise, wrapping across the new year', () => {
    const rising = flat(0.01);
    rising[0] = 0.3;
    const tiny = flat(0.001);
    tiny[0] = 0.004;
    const { arriving } = picksForWeek({ rising, tiny }, 0);
    expect(arriving.map((p) => p.code)).toEqual(['rising']);
  });
});

describe('abundance data', () => {
  it('covers every guide species', () => {
    const freq = getWeeklyFrequencies();
    for (const s of getAllSpecies()) expect(freq[s.code], s.code).toBeDefined();
  });
});
