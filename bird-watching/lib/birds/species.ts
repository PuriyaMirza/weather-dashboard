import speciesJson from '@/data/species.json';
import { speciesFileSchema, type Species, type SpeciesFile } from './schema';

/*
  Server-side access to the field guide's data. Validated once at module load, so a malformed
  data/species.json fails the build rather than rendering a half-empty page. Client components
  receive plain arrays from server components instead of importing this module, which keeps the
  JSON and Zod out of the browser bundle.
*/

const data: SpeciesFile = speciesFileSchema.parse(speciesJson);
const byCode = new Map(data.species.map((s) => [s.code, s]));

export function getSpeciesSource(): SpeciesFile['source'] {
  return data.source;
}

/** Every species, in taxonomic order. */
export function getAllSpecies(): Species[] {
  return data.species;
}

export function getSpecies(code: string): Species | undefined {
  return byCode.get(code);
}

export function getFamilies(): string[] {
  return [...new Set(data.species.map((s) => s.family))];
}

/**
 * Editorial pick for the home page: birds present all year and easy to find on any walk, so a
 * first-timer can tick some off in any season. Codes missing from the data are skipped.
 */
const YEAR_ROUND_REGULARS = [
  'amerob',
  'norcar',
  'blujay',
  'tuftit',
  'whbnut',
  'rebwoo',
  'dowwoo',
  'carwre',
  'mallar3',
  'rethaw',
  'moudov',
  'amecro',
];

export function getYearRoundRegulars(): Species[] {
  return YEAR_ROUND_REGULARS.map((code) => byCode.get(code)).filter((s): s is Species => s !== undefined);
}
