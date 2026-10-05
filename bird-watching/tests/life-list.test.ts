import { describe, expect, it } from 'vitest';
import { buildSpeciesList } from '@/lib/log/life-list';
import { observation, outing } from './log-fixtures';

describe('buildSpeciesList', () => {
  const spring = outing({ startTime: '2025-05-10T07:00', area: 'The Ramble' });
  const fall = outing({ startTime: '2026-09-20T08:00', area: 'North Woods' });
  const observations = [
    observation(fall.id),
    observation(spring.id),
    observation(fall.id, { speciesCode: 'blujay', commonName: 'Blue Jay' }),
    observation(fall.id, { speciesCode: null, commonName: 'Monk Parakeet' }),
  ];

  it('lists each species once with its earliest sighting', () => {
    const list = buildSpeciesList([spring, fall], observations);
    const robin = list.find((e) => e.speciesCode === 'amerob');
    expect(list).toHaveLength(3);
    expect(robin).toMatchObject({ firstSeen: '2025-05-10T07:00', firstArea: 'The Ramble', outings: 2 });
  });

  it('orders newest additions first', () => {
    expect(buildSpeciesList([spring, fall], observations).at(-1)?.speciesCode).toBe('amerob');
  });

  it('limits a year list to that calendar year', () => {
    const list = buildSpeciesList([spring, fall], observations, 2026);
    expect(list.map((e) => e.commonName).sort()).toEqual(['American Robin', 'Blue Jay', 'Monk Parakeet']);
    expect(list.find((e) => e.speciesCode === 'amerob')?.firstSeen).toBe('2026-09-20T08:00');
    expect(buildSpeciesList([spring, fall], observations, 2024)).toEqual([]);
  });

  it('ignores sightings whose outing is gone', () => {
    expect(buildSpeciesList([spring], observations)).toHaveLength(1);
  });
});
