/*
  Builds data/abundance.json from an eBird bar chart download (Explore → Bar Charts → "Download
  Histogram Data", saved as data/ebird-barchart.tsv). The API has no historical frequency endpoint,
  so this file is the only source. Only species that are in the guide are kept, matched by common
  name; an unmatched guide species is a hard error rather than a silently empty row.

  Run: npm run data:abundance
*/
import { readFileSync, writeFileSync } from 'node:fs';

const WEEKS = 48;
const tsv = readFileSync(new URL('../data/ebird-barchart.tsv', import.meta.url), 'utf8').split('\n');
const guide = JSON.parse(readFileSync(new URL('../data/species.json', import.meta.url), 'utf8')) as {
  species: { code: string; commonName: string }[];
};

const sampleLine = tsv.find((l) => l.startsWith('Sample Size:'));
if (!sampleLine) throw new Error('No "Sample Size:" row — is this an eBird bar chart download?');
const sampleSize = sampleLine.split('\t').slice(1, 1 + WEEKS).map(Number);
if (sampleSize.length !== WEEKS) throw new Error(`Expected ${WEEKS} weeks, found ${sampleSize.length}`);

const byName = new Map<string, number[]>();
for (const line of tsv) {
  const cells = line.split('\t');
  if (cells.length < WEEKS + 1 || /^(Sample Size|Number of taxa|Frequency)/.test(cells[0])) continue;
  const values = cells.slice(1, 1 + WEEKS).map(Number);
  if (values.some(Number.isNaN)) continue;
  byName.set(cells[0], values);
}

const species: Record<string, number[]> = {};
const missing: string[] = [];
for (const s of guide.species) {
  const values = byName.get(s.commonName);
  if (values) species[s.code] = values.map((v) => Math.round(v * 10000) / 10000);
  else missing.push(s.commonName);
}
if (missing.length) throw new Error(`Guide species missing from the bar chart: ${missing.join(', ')}`);

writeFileSync(
  new URL('../data/abundance.json', import.meta.url),
  `${JSON.stringify({ source: 'ebird-barchart:US-NY-061', generatedAt: new Date().toISOString(), weeks: WEEKS, sampleSize, species })}\n`,
);
console.log(`abundance.json: ${Object.keys(species).length} species × ${WEEKS} weeks`);
