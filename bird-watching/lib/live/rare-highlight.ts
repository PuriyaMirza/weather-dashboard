import type { ParkSighting } from '@/lib/ebird/sightings';
import type { SpeciesPhoto } from '@/lib/media/wikipedia';

/** A recent rare bird in the park, with a credited photo of its species. */
export interface RareHighlight {
  sighting: ParkSighting;
  /** A representative photo of the species from Wikipedia — not a photo of this sighting. */
  photo: SpeciesPhoto;
}

export interface RareHighlightResponse {
  fetchedAt: string;
  /** Null when no recent rare bird has a photo we can credit; the hero is then left out. */
  highlight: RareHighlight | null;
}

/** How many candidates to try before giving up — each one costs two Wikipedia requests. */
const MAX_PHOTO_LOOKUPS = 3;

/**
 * Rare birds worth leading the page with: reviewer-confirmed reports first (a misidentified
 * bird shouldn't be the first thing a beginner sees), then newest first.
 *
 * Named forms like "House Sparrow (Gray-cheeked)" are left out: eBird flags the form as rare, but
 * the species photo would show the everyday bird, which misrepresents what was seen.
 */
export function rareCandidates(sightings: ParkSighting[]): ParkSighting[] {
  return sightings
    .filter((s) => s.notable && !s.commonName.includes('('))
    .sort((a, b) => Number(a.unconfirmed) - Number(b.unconfirmed) || b.observedAt.localeCompare(a.observedAt));
}

/** The first candidate whose species has a credited photo, or null — never an uncredited image. */
export async function pickRareHighlight(
  sightings: ParkSighting[],
  getPhoto: (scientificName: string) => Promise<SpeciesPhoto | null>,
): Promise<RareHighlight | null> {
  for (const sighting of rareCandidates(sightings).slice(0, MAX_PHOTO_LOOKUPS)) {
    const photo = await getPhoto(sighting.scientificName);
    if (photo) return { sighting, photo };
  }
  return null;
}
