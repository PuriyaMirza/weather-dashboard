// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

const identifyWithClaude = vi.fn();
vi.mock('@/lib/identify/claude', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/identify/claude')>()),
  identifyWithClaude: (...args: unknown[]) => identifyWithClaude(...args),
}));

const { POST } = await import('@/app/api/identify/route');
const { IdentifyRefusal } = await import('@/lib/identify/claude');

afterEach(() => {
  vi.unstubAllEnvs();
  identifyWithClaude.mockReset();
});

const IMAGE = 'A'.repeat(200);
const post = (body: unknown, ip: string) =>
  new Request('http://localhost/api/identify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
const valid = { image: IMAGE, note: 'this morning at the Ramble', now: '2026-10-10T08:15' };

describe('POST /api/identify', () => {
  it('rejects a body that is not a photo', async () => {
    const response = await POST(post({ image: 'not base64!', note: '', now: 'soon' }, '10.1.0.1'));
    expect(response.status).toBe(400);
    expect(identifyWithClaude).not.toHaveBeenCalled();
  });

  it('says plainly when no Anthropic key is configured', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    const response = await POST(post(valid, '10.1.0.2'));
    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatch(/no Anthropic API key/);
  });

  it('returns resolved candidates, uncached, without exposing the key', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'secret-key');
    vi.stubEnv('EBIRD_API_KEY', '');
    identifyWithClaude.mockResolvedValue({
      candidates: [{ commonName: 'Blue Jay', scientificName: 'Cyanocitta cristata', confidence: 'high', fieldMarks: 'Blue crest' }],
      date: null,
      time: '07:30',
      place: { name: 'The Ramble', parkArea: 'The Ramble', stateCode: 'NY', countryCode: 'US' },
      count: null,
    });
    const response = await POST(post(valid, '10.1.0.3'));
    const text = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(text).not.toContain('secret-key');
    expect(JSON.parse(text)).toMatchObject({ candidates: [{ speciesCode: 'blujay' }], time: '07:30', place: { parkArea: 'The Ramble' } });
  });

  it('passes the names to exclude through for a "show me more options" call', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'secret-key');
    identifyWithClaude.mockResolvedValue({
      candidates: [], date: null, time: null, place: { name: null, parkArea: null, stateCode: null, countryCode: null }, count: null,
    });
    const response = await POST(post({ ...valid, exclude: ['Pandion haliaetus'] }, '10.1.0.6'));
    expect(response.status).toBe(200);
    expect(identifyWithClaude.mock.calls[0][1]).toMatchObject({ exclude: ['Pandion haliaetus'] });
  });

  it('turns a decline into a readable 422', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'secret-key');
    identifyWithClaude.mockRejectedValue(new IdentifyRefusal('declined'));
    const response = await POST(post(valid, '10.1.0.4'));
    expect(response.status).toBe(422);
  });

  it('limits how many photos one client can send per minute', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    const statuses = [];
    for (let i = 0; i < 11; i++) statuses.push((await POST(post(valid, '10.1.0.5'))).status);
    expect(statuses.at(-1)).toBe(429);
  });
});
