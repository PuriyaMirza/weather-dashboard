// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

const getSpeciesPhoto = vi.fn();
vi.mock('@/lib/media/wikipedia', () => ({ getSpeciesPhoto: (sci: string) => getSpeciesPhoto(sci) }));

const { GET } = await import('@/app/api/species-photo/route');

afterEach(() => getSpeciesPhoto.mockReset());

const request = (query: string, ip: string) => new Request(`http://localhost/api/species-photo${query}`, { headers: { 'x-forwarded-for': ip } });

describe('GET /api/species-photo', () => {
  it('accepts only a scientific name, so it cannot fetch arbitrary Wikipedia pages', async () => {
    for (const sci of ['', 'Main_Page', 'pandion haliaetus', 'Pandion haliaetus/../x']) {
      const response = await GET(request(`?sci=${encodeURIComponent(sci)}`, '10.2.0.1'));
      expect(response.status).toBe(400);
    }
    expect(getSpeciesPhoto).not.toHaveBeenCalled();
  });

  it('returns the credited photo, cached a week at the CDN', async () => {
    getSpeciesPhoto.mockResolvedValue({
      src: 'https://upload.wikimedia.org/x.jpg', width: 800, height: 600, artist: 'A. Birder', license: 'CC BY 4.0',
      licenseUrl: null, sourceUrl: 'https://commons.wikimedia.org/wiki/File:X.jpg', articleUrl: 'https://en.wikipedia.org/wiki/Osprey',
    });
    const response = await GET(request('?sci=Pandion%20haliaetus', '10.2.0.2'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=604800');
    expect(getSpeciesPhoto).toHaveBeenCalledWith('Pandion haliaetus');
    expect((await response.json()).photo).toEqual({
      src: 'https://upload.wikimedia.org/x.jpg', width: 800, height: 600, artist: 'A. Birder', license: 'CC BY 4.0',
      licenseUrl: null, sourceUrl: 'https://commons.wikimedia.org/wiki/File:X.jpg',
    });
  });

  it('caches "no usable photo" too, so a miss is not re-asked of Wikipedia on every view', async () => {
    getSpeciesPhoto.mockResolvedValue(null);
    const response = await GET(request('?sci=Passer%20domesticus', '10.2.0.3'));
    expect(await response.json()).toEqual({ photo: null });
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=86400');
  });
});
