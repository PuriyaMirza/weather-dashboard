import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { speciesContentFileSchema, speciesFileSchema } from '@/lib/birds/schema';

const read = (path: string) => JSON.parse(readFileSync(join(process.cwd(), path), 'utf8'));
const content = speciesContentFileSchema.parse(read('data/species-content.json'));
const file = speciesFileSchema.parse(read('data/species.json'));

describe('hand-written species content', () => {
  it('has unique species and banding codes', () => {
    expect(new Set(content.map((c) => c.code)).size).toBe(content.length);
    expect(new Set(content.map((c) => c.bandingCode)).size).toBe(content.length);
  });

  it('lists lengths smallest-first', () => {
    for (const c of content) expect(c.lengthIn[0], c.code).toBeLessThanOrEqual(c.lengthIn[1]);
  });

  it('never lists a bird as its own look-alike', () => {
    for (const c of content) for (const l of c.lookAlikes) expect(l.code, c.code).not.toBe(c.code);
  });
});

describe('data/species.json', () => {
  it('contains every hand-written species, with its content intact', () => {
    const byCode = new Map(file.species.map((s) => [s.code, s]));
    for (const c of content) {
      const s = byCode.get(c.code);
      expect(s, c.code).toBeDefined();
      expect(s?.startHere).toBe(true);
      expect(s?.idTips).toEqual(c.idTips);
    }
  });

  it('is in taxonomic order', () => {
    const orders = file.species.map((s) => s.taxonOrder);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });
});
