import { describe, expect, it } from 'vitest';
import { csvField, outingRows, toEbirdCsv } from '@/lib/log/ebird-csv';
import { observation, outing } from './log-fixtures';

describe('csvField', () => {
  it('quotes only when needed and doubles embedded quotes', () => {
    expect(csvField('plain')).toBe('plain');
    expect(csvField('a, b')).toBe('"a, b"');
    expect(csvField('said "hi"')).toBe('"said ""hi"""');
    expect(csvField(null)).toBe('');
  });
});

describe('outingRows', () => {
  it('produces the 19 eBird Record Format (Extended) columns in order', () => {
    const o = outing({ comments: 'Sunny, light NW wind' });
    const [row] = outingRows(o, [observation(o.id, { comments: 'Singing' })]);
    expect(row).toEqual([
      'American Robin', 'Turdus', 'migratorius', '3', 'Singing', 'Central Park--The Ramble',
      '40.78120', '-73.96650', '05/10/2026', '07:15', 'NY', 'US', 'traveling', '2', '120', 'Y', '1.5', '',
      'Sunny, light NW wind',
    ]);
  });

  it('writes X for uncounted birds and carries the breeding code in the comments', () => {
    const o = outing();
    const [row] = outingRows(o, [observation(o.id, { count: null, breedingCode: 'CF', comments: 'To nest by Bow Bridge' })]);
    expect(row[3]).toBe('X');
    expect(row[4]).toBe('Breeding code CF (Carrying food). To nest by Bow Bridge');
  });

  it('uses the shared location when there is one, and the plain park name for a general walk', () => {
    const o = outing({ area: 'Central Park (general)', latitude: 40.77911, longitude: -73.96962 });
    const [row] = outingRows(o, [observation(o.id)]);
    expect(row.slice(5, 8)).toEqual(['Central Park', '40.77911', '-73.96962']);
  });

  it('omits effort that does not apply to the protocol', () => {
    const stationary = outing({ protocol: 'stationary', distanceMi: 2 });
    expect(outingRows(stationary, [observation(stationary.id)])[0][16]).toBe('');
    const incidental = outing({ protocol: 'incidental', durationMin: 30, allReported: false });
    const row = outingRows(incidental, [observation(incidental.id)])[0];
    expect([row[14], row[15]]).toEqual(['', 'N']);
  });

  it('leaves genus and species blank for a hand-typed bird', () => {
    const o = outing();
    const [row] = outingRows(o, [observation(o.id, { speciesCode: null, scientificName: null, commonName: 'Monk Parakeet' })]);
    expect(row.slice(0, 3)).toEqual(['Monk Parakeet', '', '']);
  });
});

describe('toEbirdCsv', () => {
  it('has no header row, uses CRLF, and skips outings with no birds', () => {
    const a = outing();
    const empty = outing();
    const csv = toEbirdCsv([a, empty], [observation(a.id), observation(a.id, { commonName: 'Blue Jay', scientificName: 'Cyanocitta cristata' })]);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[0].startsWith('American Robin,')).toBe(true);
    expect(lines[2]).toBe('');
    expect(toEbirdCsv([empty], [])).toBe('');
  });
});
