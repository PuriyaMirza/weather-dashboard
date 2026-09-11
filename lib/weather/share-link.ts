import { validatePreferences, type PersistedPreferences } from '@/store/dashboard-store';

/**
 * Preferences encoded into a URL, so a dashboard can move between browsers without an account.
 *
 * This is the whole answer to "how do saved preferences survive?" in an app that deliberately has
 * no accounts and no database (PRD constraint 6). `localStorage` keeps a setup on one browser; a
 * link carries it to another, or to a bookmark that outlives clearing site data. Nothing is stored
 * anywhere but in the link itself.
 *
 * Two properties matter more than compactness:
 *
 * 1. **A link is untrusted input.** Anyone can send anyone a URL, so a payload gets exactly the
 *    validation stored state gets — `validatePreferences` — and a malformed one yields null rather
 *    than a broken dashboard.
 * 2. **A link outlives the code that wrote it.** Module ids are written out in full rather than as
 *    indexes into `ALL_CARD_IDS`; an index would silently decode to the wrong module the first time
 *    that array was reordered, months after the link was sent.
 */

export const SHARE_PARAM = 'p';

/** Bumped when the wire shape changes, so an old link is refused rather than half-read. */
const SHARE_VERSION = 1;

/**
 * Refuses absurd input before doing any work. Real payloads run a few hundred characters; anything
 * approaching this is not a dashboard someone configured.
 */
const MAX_PARAM_LENGTH = 4000;

/** Short keys because they are repeated in every link; values stay legible for the same reason. */
interface WirePreferences {
  v: number;
  l?: unknown;
  s?: unknown[];
  u?: string;
  t?: string;
  c?: [string, string][];
  a?: string[];
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function fromBase64Url(value: string): string {
  const standard = value.replaceAll('-', '+').replaceAll('_', '/');
  // atob rejects an unpadded string in some engines, so the padding stripped above is restored.
  const padded = standard.padEnd(Math.ceil(standard.length / 4) * 4, '=');
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

/** Serializes preferences into the value of the `?p=` parameter. */
export function encodePreferences(preferences: PersistedPreferences): string {
  const wire: WirePreferences = {
    v: SHARE_VERSION,
    l: preferences.location,
    s: preferences.savedLocations,
    u: preferences.unitSystem,
    t: preferences.theme,
    c: preferences.cards.map((card) => [card.id, card.size]),
    a: preferences.activities,
  };

  return toBase64Url(JSON.stringify(wire));
}

/**
 * Reads a `?p=` value back into preferences, or null if it is unusable for any reason.
 *
 * Null covers every failure alike — not base64, not JSON, wrong version, nonsense inside — because
 * the caller's response is the same in each case: ignore it and carry on with whatever was already
 * saved. Nothing here throws.
 */
export function decodePreferences(value: string | null | undefined): PersistedPreferences | null {
  if (!value || value.length > MAX_PARAM_LENGTH) return null;

  try {
    const parsed: unknown = JSON.parse(fromBase64Url(value));
    if (typeof parsed !== 'object' || parsed === null) return null;

    const wire = parsed as WirePreferences;
    if (wire.v !== SHARE_VERSION) return null;

    // Rebuilt into the persisted shape and then validated exactly like stored state. Every field is
    // still suspect at this point — this only undoes the key shortening.
    return validatePreferences({
      location: wire.l,
      savedLocations: wire.s,
      unitSystem: wire.u,
      theme: wire.t,
      cards: Array.isArray(wire.c)
        ? wire.c.filter(Array.isArray).map(([id, size]) => ({ id, size }))
        : [],
      activities: wire.a,
      hasOnboarded: true,
    });
  } catch {
    return null;
  }
}

/** Builds the full shareable URL for the current page. */
export function buildShareUrl(baseUrl: string, preferences: PersistedPreferences): string {
  const url = new URL(baseUrl);
  url.searchParams.set(SHARE_PARAM, encodePreferences(preferences));
  return url.toString();
}
