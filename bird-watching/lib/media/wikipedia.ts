import { z } from 'zod';

/*
  Lead photos from each bird's English Wikipedia article, with the credit and licence Wikimedia
  Commons records for the file. Fetched on the server at build/revalidate time — never from the
  browser — and cached for a week, so species pages stay static.

  A photo is only ever shown with its credit. Anything we can't credit properly — a fetch that
  fails, a file outside Commons, a licence we don't recognise as free — becomes null, and the page
  simply has no photo.
*/

const WIKIPEDIA = 'https://en.wikipedia.org';
const ONE_WEEK_S = 7 * 24 * 60 * 60;
const DISPLAY_WIDTH = 800;
// Wikimedia asks API clients to identify themselves: https://meta.wikimedia.org/wiki/User-Agent_policy
const USER_AGENT = 'CentralParkBirding/0.1 (https://github.com/PuriyaMirza/weather-dashboard)';
const TIMEOUT_MS = 8_000;

export interface SpeciesPhoto {
  /** A ~800px rendition on upload.wikimedia.org. */
  src: string;
  width: number;
  height: number;
  /** Photographer as plain text (Commons stores HTML). */
  artist: string;
  /** Short licence name, e.g. "CC BY-SA 4.0". */
  license: string;
  licenseUrl: string | null;
  /** The file's Commons description page — where the full credit lives. */
  sourceUrl: string;
  articleUrl: string;
}

const summarySchema = z.object({
  originalimage: z.object({ source: z.string().url() }).optional(),
  content_urls: z.object({ desktop: z.object({ page: z.string().url() }) }),
});

const metaValue = z.object({ value: z.string() }).optional();

const imageInfoSchema = z.object({
  query: z.object({
    pages: z.array(
      z.object({
        imageinfo: z
          .array(
            z.object({
              thumburl: z.string().url(),
              thumbwidth: z.number(),
              thumbheight: z.number(),
              descriptionurl: z.string().url(),
              extmetadata: z.object({
                Artist: metaValue,
                LicenseShortName: metaValue,
                LicenseUrl: metaValue,
                NonFree: metaValue,
              }),
            }),
          )
          .optional(),
      }),
    ),
  }),
});

// Originals: /wikipedia/commons/a/ab/File.jpg. Renditions: /wikipedia/commons/thumb/a/ab/File.jpg/3840px-File.jpg
// — which is what the REST summary hands back as "originalimage" for large lead photos (on
// thumb.wikimedia.org), so both must resolve to the file. The a/ab directories are the MD5 prefix.
const COMMONS_ORIGINAL = /^\/wikipedia\/commons\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+)$/;
const COMMONS_RENDITION = /^\/wikipedia\/commons\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+)\/[^/]+$/;
const COMMONS_HOSTS = new Set(['upload.wikimedia.org', 'thumb.wikimedia.org']);

/**
 * The Commons file name behind an image URL, original or rendition; null for anything else —
 * including local uploads (/wikipedia/en/…), which may be non-free. The licence is checked against
 * Commons afterwards, so accepting a rendition never skips that check.
 */
export function commonsFileName(imageUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !COMMONS_HOSTS.has(url.hostname)) return null;
  const name = (COMMONS_ORIGINAL.exec(url.pathname) ?? COMMONS_RENDITION.exec(url.pathname))?.[1];
  if (!name) return null;
  try {
    return decodeURIComponent(name);
  } catch {
    return null;
  }
}

const FREE_LICENSE = /^(cc0|cc[ -]by(-sa)?\b|public domain|pd\b|pd-|gfdl)/i;

export function isFreeLicense(shortName: string, nonFree?: string): boolean {
  return FREE_LICENSE.test(shortName.trim()) && nonFree?.toLowerCase() !== 'true';
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' };

/** Commons' Artist field is HTML (links, spans); credits are shown as plain text. */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, name: string) => ENTITIES[name])
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

/*
  Builds prerender every species page at once, across several workers, and Wikimedia answers a
  burst like that with 429s — which used to leave a few pages photo-less until the next weekly
  revalidate. So requests are throttled per process and a "slow down" answer is retried. Next only
  caches 200 responses, so a retry is a real new request, not a replay of the 429.
*/
const MAX_CONCURRENT = 2;
const MAX_ATTEMPTS = 4;
const MAX_RETRY_WAIT_S = 10;

let active = 0;
const queue: (() => void)[] = [];

async function throttled<T>(task: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((resolve) => queue.push(resolve));
  active++;
  try {
    return await task();
  } finally {
    active--;
    queue.shift()?.();
  }
}

/** How long to wait before retry number `attempt` (1-based): the server's Retry-After, else 1s, 2s, 4s… */
export function retryDelayMs(retryAfter: string | null, attempt: number): number {
  const seconds = Number(retryAfter);
  if (retryAfter && Number.isFinite(seconds) && seconds > 0) return Math.min(seconds, MAX_RETRY_WAIT_S) * 1000;
  return 1000 * 2 ** (attempt - 1);
}

async function getJson(url: string): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    const response = await throttled(() =>
      fetch(url, {
        headers: { 'User-Agent': USER_AGENT, 'Api-User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        next: { revalidate: ONE_WEEK_S },
      }),
    );
    const retryable = response.status === 429 || response.status === 503;
    if (retryable && attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs(response.headers.get('retry-after'), attempt)));
      continue;
    }
    if (!response.ok) throw new Error(`${url} → ${response.status}`);
    return response.json();
  }
}

/**
 * Looks the bird up by scientific name — Wikipedia redirects it to the article — so a common-name
 * change or a disambiguation page ("Robin") can't pick the wrong bird.
 */
export async function getSpeciesPhoto(scientificName: string): Promise<SpeciesPhoto | null> {
  // Every "no photo" says why in the log, so a species that never gets a photo can be traced to
  // its cause (no lead image, a non-Commons file, a licence we don't accept) without re-asking Wikipedia.
  const noPhoto = (reason: string) => {
    console.warn(`[photos] no photo for ${scientificName}: ${reason}`);
    return null;
  };
  try {
    const title = encodeURIComponent(scientificName.replace(/ /g, '_'));
    const summary = summarySchema.parse(await getJson(`${WIKIPEDIA}/api/rest_v1/page/summary/${title}?redirect=true`));
    if (!summary.originalimage) return noPhoto('the article has no lead image');
    const fileName = commonsFileName(summary.originalimage.source);
    if (!fileName) return noPhoto(`lead image is not a Commons file: ${summary.originalimage.source}`);

    const infoUrl = new URL(`${WIKIPEDIA}/w/api.php`);
    infoUrl.search = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      titles: `File:${fileName}`,
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiurlwidth: String(DISPLAY_WIDTH),
    }).toString();
    const info = imageInfoSchema.parse(await getJson(infoUrl.toString())).query.pages[0]?.imageinfo?.[0];
    if (!info) return noPhoto(`Commons has no image info for File:${fileName}`);

    const meta = info.extmetadata;
    const license = meta.LicenseShortName?.value;
    if (!license) return noPhoto(`File:${fileName} has no licence recorded`);
    if (!isFreeLicense(license, meta.NonFree?.value)) {
      return noPhoto(`File:${fileName} licence not accepted: "${license}"${meta.NonFree ? ` (NonFree=${meta.NonFree.value})` : ''}`);
    }
    const artist = meta.Artist ? plainText(meta.Artist.value) : '';

    return {
      src: info.thumburl,
      width: info.thumbwidth,
      height: info.thumbheight,
      artist: artist || 'Unknown photographer',
      license,
      licenseUrl: meta.LicenseUrl?.value ?? null,
      sourceUrl: info.descriptionurl,
      articleUrl: summary.content_urls.desktop.page,
    };
  } catch (error) {
    // Offline builds (and Wikipedia hiccups) land here; the page renders without a photo.
    console.warn(`[photos] no photo for ${scientificName}: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

/** Photos for many species, a few at a time; getJson's throttle keeps the request rate polite. */
export async function getSpeciesPhotos(
  species: { code: string; scientificName: string }[],
  concurrency = MAX_CONCURRENT,
): Promise<Record<string, SpeciesPhoto>> {
  const result: Record<string, SpeciesPhoto> = {};
  const queue = [...species];
  async function worker() {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const photo = await getSpeciesPhoto(next.scientificName);
      if (photo) result[next.code] = photo;
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  return result;
}

/** What a client photo popup needs: the photo and its credit, without the article link. */
export type PhotoForClient = Omit<SpeciesPhoto, 'articleUrl'>;

/**
 * Credited photos for every guide species, keyed by code, trimmed for the client. Pages whose
 * rows are only known in the browser (this week's picks, live sightings) pass this map down. The
 * lookups are the guide pages' own (fetch-cached a week), so it adds no Wikipedia requests.
 */
export async function getGuidePhotosForClient(
  species: { code: string; scientificName: string }[],
): Promise<Record<string, PhotoForClient>> {
  const photos = await getSpeciesPhotos(species);
  return Object.fromEntries(
    Object.entries(photos).map(([code, { src, width, height, artist, license, licenseUrl, sourceUrl }]) => [
      code,
      { src, width, height, artist, license, licenseUrl, sourceUrl },
    ]),
  );
}
