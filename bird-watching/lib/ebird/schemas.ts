import { z } from 'zod';

/*
  eBird API 2.0 response shapes (https://documenter.getpostman.com/view/664302/S1ENwy59).
  Only the fields this app reads are declared; Zod's default object mode drops the rest.

  Imports nothing but zod, so scripts/ can load it under Node's type stripping.
*/

/** One row of GET /v2/ref/taxonomy/ebird?fmt=json. */
export const ebirdTaxonSchema = z.object({
  sciName: z.string(),
  comName: z.string(),
  speciesCode: z.string(),
  /** "species", "issf", "spuh", "slash", "hybrid", "intergrade", "domestic", "form". */
  category: z.string(),
  taxonOrder: z.number(),
  bandingCodes: z.array(z.string()).default([]),
  familyComName: z.string().optional(),
  familySciName: z.string().optional(),
});

/** One row of GET /v2/ref/hotspot/geo?fmt=json. */
export const ebirdHotspotSchema = z.object({
  locId: z.string(),
  locName: z.string(),
  lat: z.number(),
  lng: z.number(),
  numSpeciesAllTime: z.number().optional(),
});

/** GET /v2/product/spplist/{locId} — a bare array of species codes. */
export const ebirdSpeciesListSchema = z.array(z.string());

export const hotspotFileSchema = z.object({
  generatedAt: z.string(),
  hotspots: z.array(ebirdHotspotSchema),
});

export type EbirdTaxon = z.infer<typeof ebirdTaxonSchema>;
export type EbirdHotspot = z.infer<typeof ebirdHotspotSchema>;
