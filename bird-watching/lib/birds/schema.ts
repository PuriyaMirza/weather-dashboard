import { z } from 'zod';

/*
  The species data contract. Two files share it:

  - data/species-content.json — hand-written field-guide prose for the "start here" birds.
  - data/species.json         — what the app reads: eBird taxonomy for every species recorded in
                                Central Park, merged with that content (scripts/build-species.ts).

  This module imports nothing but zod so the build script can load it directly under Node's type
  stripping, without the bundler's `@/` alias.
*/

export const FIELD_COLORS = ['black', 'white', 'gray', 'brown', 'red', 'orange', 'yellow', 'green', 'blue'] as const;

/** Park habitats as a visitor experiences them, not as an ecologist would classify them. */
export const HABITATS = ['woodland', 'water', 'lawns', 'thickets', 'feeders', 'overhead'] as const;

const lookAlikeSchema = z.object({
  /** Display name, always present so a look-alike outside the dataset still renders. */
  name: z.string().min(1),
  /** eBird species code, when the look-alike is a species we may link to. */
  code: z.string().min(1).nullable(),
  howToTell: z.string().min(1),
});

/** Hand-written guide content. Every field is required: a start-here bird without it is a bug. */
export const speciesContentSchema = z.object({
  code: z.string().regex(/^[a-z0-9]+$/),
  commonName: z.string().min(1),
  scientificName: z.string().regex(/^[A-Z][a-z]+ [a-z-]+$/),
  bandingCode: z.string().regex(/^[A-Z]{4}$/),
  family: z.string().min(1),
  familyScientific: z.string().regex(/^[A-Z][a-z]+idae$/),
  /** Total length range in inches, bill tip to tail tip. */
  lengthIn: z.tuple([z.number().positive(), z.number().positive()]),
  colors: z.array(z.enum(FIELD_COLORS)).min(1),
  habitats: z.array(z.enum(HABITATS)).min(1),
  summary: z.string().min(1),
  idTips: z.array(z.string().min(1)).min(2),
  lookAlikes: z.array(lookAlikeSchema),
  whereInPark: z.string().min(1),
  whenInPark: z.string().min(1),
  behavior: z.string().min(1),
  voice: z.string().min(1),
});

export const speciesContentFileSchema = z.array(speciesContentSchema);

/**
 * One species as the app sees it. Taxonomy is always present; guide fields are null for species
 * without hand-written content — the UI shows what it has and never fills a gap with a guess.
 */
export const speciesSchema = z.object({
  code: z.string().regex(/^[a-z0-9]+$/),
  commonName: z.string().min(1),
  scientificName: z.string().min(1),
  bandingCode: z.string().regex(/^[A-Z]{4}$/).nullable(),
  family: z.string().min(1),
  familyScientific: z.string().min(1),
  /** Sort key in taxonomic sequence. eBird's taxonOrder once built online; list order in a seed. */
  taxonOrder: z.number(),
  startHere: z.boolean(),
  lengthIn: z.tuple([z.number().positive(), z.number().positive()]).nullable(),
  colors: z.array(z.enum(FIELD_COLORS)),
  habitats: z.array(z.enum(HABITATS)),
  summary: z.string().nullable(),
  idTips: z.array(z.string()),
  lookAlikes: z.array(lookAlikeSchema),
  whereInPark: z.string().nullable(),
  whenInPark: z.string().nullable(),
  behavior: z.string().nullable(),
  voice: z.string().nullable(),
});

export const speciesFileSchema = z.object({
  /** "ebird" when taxonomy and the park list came from the eBird API; "seed" when built offline. */
  source: z.enum(['ebird', 'seed']),
  generatedAt: z.string(),
  species: z.array(speciesSchema),
});

export type SpeciesContent = z.infer<typeof speciesContentSchema>;
export type Species = z.infer<typeof speciesSchema>;
export type SpeciesFile = z.infer<typeof speciesFileSchema>;
export type FieldColor = (typeof FIELD_COLORS)[number];
export type Habitat = (typeof HABITATS)[number];
export type LookAlike = z.infer<typeof lookAlikeSchema>;
