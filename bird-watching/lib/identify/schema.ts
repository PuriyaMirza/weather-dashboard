import { z } from 'zod';
import { PARK_AREAS } from '@/lib/log/park-areas';

/*
  The photo-identify contract. `claudeOutputSchema` is what the model must return (kept small:
  every field is output tokens); `identifyResponseSchema` is what the browser sees after the server
  has resolved eBird codes and map coordinates. Neither carries a third-party shape.
*/

export const CONFIDENCE = ['high', 'medium', 'low'] as const;

export const claudeOutputSchema = z.object({
  candidates: z.array(
    z.object({
      commonName: z.string(),
      scientificName: z.string(),
      confidence: z.enum(CONFIDENCE),
      fieldMarks: z.string(),
    }),
  ),
  /** "YYYY-MM-DD" from the note, or null when it gives no date. */
  date: z.string().nullable(),
  /** "HH:mm" (24h) from the note, or null when it gives no time. */
  time: z.string().nullable(),
  place: z.object({
    name: z.string().nullable(),
    parkArea: z.enum(PARK_AREAS).nullable(),
    stateCode: z.string().nullable(),
    countryCode: z.string().nullable(),
  }),
  count: z.number().int().nullable(),
});

export type ClaudeOutput = z.infer<typeof claudeOutputSchema>;

/** A base64 JPEG; the client crops and downsizes before sending, so this is generous. */
const MAX_IMAGE_CHARS = 2_000_000;

export const identifyRequestSchema = z.object({
  image: z.string().min(100).max(MAX_IMAGE_CHARS).regex(/^[A-Za-z0-9+/=]+$/),
  note: z.string().max(300),
  /** The phone's local wall clock, so "this morning" resolves in the birder's timezone. */
  now: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
});

export type IdentifyRequest = z.infer<typeof identifyRequestSchema>;

/** A credited reference photo of a suggested species (from the field guide's Wikipedia source). */
export const candidatePhotoSchema = z.object({
  src: z.string(),
  width: z.number(),
  height: z.number(),
  artist: z.string(),
  license: z.string(),
  licenseUrl: z.string().nullable(),
  sourceUrl: z.string(),
});

export type CandidatePhoto = z.infer<typeof candidatePhotoSchema>;

export const identifyResponseSchema = z.object({
  candidates: z.array(
    z.object({
      speciesCode: z.string().nullable(),
      commonName: z.string(),
      scientificName: z.string(),
      confidence: z.enum(CONFIDENCE),
      fieldMarks: z.string(),
      photo: candidatePhotoSchema.nullable(),
    }),
  ),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  time: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  place: z.object({
    name: z.string().nullable(),
    parkArea: z.enum(PARK_AREAS).nullable(),
    stateCode: z.string().nullable(),
    countryCode: z.string().nullable(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    /** What the geocoder matched, shown so the birder can reject a wrong map point. */
    mapLabel: z.string().nullable(),
  }),
  count: z.number().int().min(1).nullable(),
});

export type IdentifyResponse = z.infer<typeof identifyResponseSchema>;
export type IdentifyCandidate = IdentifyResponse['candidates'][number];
