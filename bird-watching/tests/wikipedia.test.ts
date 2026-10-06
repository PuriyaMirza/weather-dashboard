// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { commonsFileName, getSpeciesPhoto, getSpeciesPhotos, isFreeLicense, plainText } from '@/lib/media/wikipedia';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// Shapes follow the REST summary and action=query&prop=imageinfo (formatversion=2) responses.
const summary = {
  originalimage: { source: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Turdus-migratorius-002.jpg' },
  content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/American_robin' } },
};

function imageInfo(meta: Record<string, string>) {
  return {
    query: {
      pages: [
        {
          imageinfo: [
            {
              thumburl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Turdus-migratorius-002.jpg/800px-Turdus-migratorius-002.jpg',
              thumbwidth: 800,
              thumbheight: 600,
              descriptionurl: 'https://commons.wikimedia.org/wiki/File:Turdus-migratorius-002.jpg',
              extmetadata: Object.fromEntries(Object.entries(meta).map(([k, v]) => [k, { value: v }])),
            },
          ],
        },
      ],
    },
  };
}

function stubFetch(...bodies: unknown[]) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(bodies.shift())));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('helpers', () => {
  it('takes the file name only from Commons originals', () => {
    expect(commonsFileName(summary.originalimage.source)).toBe('Turdus-migratorius-002.jpg');
    expect(commonsFileName('https://upload.wikimedia.org/wikipedia/commons/a/a1/Caf%C3%A9_bird.jpg')).toBe('Café_bird.jpg');
    expect(commonsFileName('https://upload.wikimedia.org/wikipedia/en/a/a1/Album.jpg')).toBeNull();
    expect(commonsFileName('https://example.com/wikipedia/commons/a/a1/X.jpg')).toBeNull();
  });

  it('accepts free licences only', () => {
    expect(isFreeLicense('CC BY-SA 4.0')).toBe(true);
    expect(isFreeLicense('CC BY 2.0')).toBe(true);
    expect(isFreeLicense('CC0')).toBe(true);
    expect(isFreeLicense('Public domain')).toBe(true);
    expect(isFreeLicense('Fair use')).toBe(false);
    expect(isFreeLicense('CC BY-SA 4.0', 'true')).toBe(false);
  });

  it('reduces the Commons artist HTML to plain text', () => {
    expect(plainText('<a href="//commons.wikimedia.org/wiki/User:X" title="User:X">Jane&nbsp;Doe</a> &amp; friends')).toBe(
      'Jane Doe & friends',
    );
  });
});

describe('getSpeciesPhoto', () => {
  it('returns the photo with its credit and identifies itself to Wikimedia', async () => {
    const fetchMock = stubFetch(
      summary,
      imageInfo({ Artist: '<a href="#">Dakota L.</a>', LicenseShortName: 'CC BY-SA 3.0', LicenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0' }),
    );
    expect(await getSpeciesPhoto('Turdus migratorius')).toEqual({
      src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Turdus-migratorius-002.jpg/800px-Turdus-migratorius-002.jpg',
      width: 800,
      height: 600,
      artist: 'Dakota L.',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Turdus-migratorius-002.jpg',
      articleUrl: 'https://en.wikipedia.org/wiki/American_robin',
    });
    const [firstUrl, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit & { next: { revalidate: number } }];
    expect(firstUrl).toContain('/page/summary/Turdus_migratorius');
    expect((init.headers as Record<string, string>)['User-Agent']).toMatch(/^CentralParkBirding\//);
    expect(init.next.revalidate).toBe(604800);
    expect((fetchMock.mock.calls[1] as unknown as [string])[0]).toContain('File%3ATurdus-migratorius-002.jpg');
  });

  it('shows no photo rather than an uncredited or non-free one', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    stubFetch(summary, imageInfo({ Artist: 'Someone', LicenseShortName: 'Fair use' }));
    expect(await getSpeciesPhoto('Turdus migratorius')).toBeNull();
    stubFetch(summary, imageInfo({ Artist: 'Someone' }));
    expect(await getSpeciesPhoto('Turdus migratorius')).toBeNull();
    stubFetch({ content_urls: summary.content_urls });
    expect(await getSpeciesPhoto('Turdus migratorius')).toBeNull();
  });

  it('returns null when Wikipedia is unreachable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('fetch failed'))));
    expect(await getSpeciesPhoto('Turdus migratorius')).toBeNull();
  });
});

describe('getSpeciesPhotos', () => {
  it('keys photos by species code and skips the ones without', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('Cardinalis')
          ? new Response('{}', { status: 404 })
          : new Response(JSON.stringify(url.includes('/summary/') ? summary : imageInfo({ Artist: 'A', LicenseShortName: 'CC0' }))),
      ),
    );
    const photos = await getSpeciesPhotos([
      { code: 'amerob', scientificName: 'Turdus migratorius' },
      { code: 'norcar', scientificName: 'Cardinalis cardinalis' },
    ]);
    expect(Object.keys(photos)).toEqual(['amerob']);
  });
});

describe('next.config image hosts', () => {
  it('allows every host Commons serves photo renditions from', async () => {
    const { default: config } = await import('@/next.config');
    const hosts = (config.images?.remotePatterns ?? []).map((p) => (p instanceof URL ? p.hostname : p.hostname));
    // Commons returns thumburl on thumb.wikimedia.org (seen live) and originals on upload.wikimedia.org.
    expect(hosts).toEqual(expect.arrayContaining(['upload.wikimedia.org', 'thumb.wikimedia.org']));
  });
});
