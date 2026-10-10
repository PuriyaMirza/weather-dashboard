import { z } from 'zod';
import abundanceJson from '@/data/abundance.json';
import { WEEKS_PER_YEAR } from './season';

/*
  Server-side loader for the weekly eBird frequencies (see scripts/build-abundance.ts). Validated at
  module load so a bad regeneration fails the build. Pass the result to client components as props.
*/

const abundanceSchema = z.object({
  source: z.string(),
  generatedAt: z.string(),
  weeks: z.literal(WEEKS_PER_YEAR),
  sampleSize: z.array(z.number()).length(WEEKS_PER_YEAR),
  species: z.record(z.string(), z.array(z.number().min(0).max(1)).length(WEEKS_PER_YEAR)),
});

const data = abundanceSchema.parse(abundanceJson);

/** Weekly share of checklists reporting each guide species, keyed by species code. */
export function getWeeklyFrequencies(): Record<string, number[]> {
  return data.species;
}
