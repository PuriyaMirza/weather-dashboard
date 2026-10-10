import { z } from 'zod';

/*
  The sighting log's data contract. Shaped for a future sync backend (Supabase) as much as for
  IndexedDB today: client-generated UUIDs so records can be created offline, updatedAt for
  last-write-wins merging, and soft deletes (deletedAt) so a deletion can propagate instead of a
  missing row reading as "never existed".
*/

export const PROTOCOLS = ['traveling', 'stationary', 'incidental'] as const;
export type Protocol = (typeof PROTOCOLS)[number];

const recordFields = {
  id: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
};

export const outingSchema = z.object({
  ...recordFields,
  /**
   * Where: a park area ("The Ramble", exported as "Central Park--The Ramble") or, for birds seen
   * elsewhere, a free place name ("Jamaica Bay").
   */
  area: z.string().min(1),
  /** State/province code for eBird export (e.g. "NY"); absent on older records, which mean NY. */
  stateCode: z.string().nullable().optional(),
  /** ISO country code (e.g. "US"); absent on older records, which mean US. */
  countryCode: z.string().nullable().optional(),
  /** From the phone's location, when the user chose to share it; else null (park centre on export). */
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  /** Local wall-clock start, "YYYY-MM-DDTHH:mm" — what a birder enters, no timezone maths. */
  startTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  durationMin: z.number().int().min(0).nullable(),
  distanceMi: z.number().min(0).nullable(),
  protocol: z.enum(PROTOCOLS),
  observers: z.number().int().min(1),
  /** eBird's "complete checklist": every bird you could identify was reported. */
  allReported: z.boolean(),
  comments: z.string(),
});

export const observationSchema = z.object({
  ...recordFields,
  outingId: z.string().uuid(),
  /** eBird species code; null for a species typed in by hand that isn't in the guide's list. */
  speciesCode: z.string().nullable(),
  commonName: z.string().min(1),
  scientificName: z.string().nullable(),
  /** Null means "present, not counted" — eBird's X. */
  count: z.number().int().min(1).nullable(),
  comments: z.string(),
  breedingCode: z.string().nullable(),
  /** Key into the on-device photo store, for sightings logged from a photo. */
  photoId: z.string().uuid().nullable().optional(),
});

export const backupSchema = z.object({
  app: z.literal('central-park-birding'),
  version: z.literal(1),
  exportedAt: z.string(),
  outings: z.array(outingSchema),
  observations: z.array(observationSchema),
});

export type Outing = z.infer<typeof outingSchema>;
export type Observation = z.infer<typeof observationSchema>;
export type Backup = z.infer<typeof backupSchema>;
