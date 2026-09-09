import { describe, expect, it, vi } from 'vitest';
import { UPSTREAM_TIMEOUT_MS, withTimeout } from '@/lib/weather/providers/request-timeout';
import { OpenMeteoError, fetchOpenMeteoForecast } from '@/lib/weather/providers/open-meteo';
import { fetchOpenMeteoAirQuality } from '@/lib/weather/providers/open-meteo-air-quality';
import { fetchOpenMeteoGeocoding } from '@/lib/weather/providers/open-meteo-geocoding';

const COORDINATES = { latitude: 45.5152, longitude: -122.6784, timezone: 'auto' };

/**
 * A fetch that never settles on its own — it resolves only if the caller's signal aborts. This is
 * what a hung upstream actually looks like: not an error, just silence. Without a deadline the
 * route handler waits, the browser waits, and the hosting platform eventually returns its own HTML
 * error page — breaking the { error: string } JSON contract the client parses.
 */
function neverResponds(): typeof fetch {
  return ((_url: string, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
    })) as unknown as typeof fetch;
}

describe('withTimeout', () => {
  it('carries a signal that is not yet aborted', () => {
    const init = withTimeout();
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.signal?.aborted).toBe(false);
  });

  /**
   * AbortSignal.timeout starts counting the moment it is constructed. A shared module-level signal
   * would begin expiring at import time and abort every request after the first few seconds of the
   * process's life — so each call must get its own.
   */
  it('creates a fresh signal per call rather than sharing one', () => {
    expect(withTimeout().signal).not.toBe(withTimeout().signal);
  });

  it('is long enough for a normal response and shorter than a typical platform limit', () => {
    expect(UPSTREAM_TIMEOUT_MS).toBeGreaterThanOrEqual(3_000);
    expect(UPSTREAM_TIMEOUT_MS).toBeLessThanOrEqual(10_000);
  });
});

describe('a hung upstream', () => {
  // Real time, but bounded: the fake clock cannot drive AbortSignal.timeout, which runs on its own
  // internal timer. Each provider is given a short deadline instead by aborting the same way.
  it.each([
    ['forecast', () => fetchOpenMeteoForecast(COORDINATES, hangingWithShortDeadline())],
    ['air quality', () => fetchOpenMeteoAirQuality(COORDINATES, hangingWithShortDeadline())],
    ['geocoding', () => fetchOpenMeteoGeocoding({ name: 'Portland' }, hangingWithShortDeadline())],
  ])('is abandoned rather than awaited forever (%s)', async (_label, call) => {
    await expect(call()).rejects.toThrow(/could not reach/i);
  });

  it('is reported as a network failure, so the route answers 504 with our own JSON', async () => {
    await expect(fetchOpenMeteoForecast(COORDINATES, hangingWithShortDeadline())).rejects.toSatisfy(
      (error: unknown) => error instanceof OpenMeteoError && error.kind === 'network',
    );
  });
});

/**
 * Stands in for the real deadline. The provider supplies an 8-second signal; overriding the init
 * here keeps the test fast while exercising the identical abort path.
 */
function hangingWithShortDeadline(): typeof fetch {
  const hang = neverResponds();
  return ((url: string) => hang(url, { signal: AbortSignal.timeout(25) })) as unknown as typeof fetch;
}

describe('the providers actually pass a deadline', () => {
  it.each([
    ['forecast', fetchOpenMeteoForecast, COORDINATES],
    ['air quality', fetchOpenMeteoAirQuality, COORDINATES],
    ['geocoding', fetchOpenMeteoGeocoding, { name: 'Portland' }],
  ])('%s sends an abort signal with its request', async (_label, call, params) => {
    const spy = vi.fn().mockResolvedValue(new Response('{}', { status: 500 }));

    // The 500 makes it reject; all we care about is what was handed to fetch.
    await expect(
      (call as (p: unknown, f: typeof fetch) => Promise<unknown>)(params, spy as unknown as typeof fetch),
    ).rejects.toThrow();

    const init = spy.mock.calls[0][1] as RequestInit | undefined;
    expect(init?.signal, 'the provider must pass a timeout signal').toBeInstanceOf(AbortSignal);
  });
});
