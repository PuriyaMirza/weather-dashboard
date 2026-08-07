import { describe, expect, it } from 'vitest';
import { createRateLimiter } from '@/lib/rate-limit';

function fixedClock(startMs = 1_000_000) {
  let current = startMs;
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
  };
}

describe('createRateLimiter', () => {
  it('allows requests up to the limit and reports remaining', () => {
    const clock = fixedClock();
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: clock.now });

    expect(limiter.check('a')).toMatchObject({ allowed: true, remaining: 2 });
    expect(limiter.check('a')).toMatchObject({ allowed: true, remaining: 1 });
    expect(limiter.check('a')).toMatchObject({ allowed: true, remaining: 0 });
  });

  it('blocks the request that exceeds the limit', () => {
    const clock = fixedClock();
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, now: clock.now });

    limiter.check('a');
    limiter.check('a');
    const blocked = limiter.check('a');

    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('tracks each key independently', () => {
    const clock = fixedClock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: clock.now });

    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(false);
    // A different key has its own budget.
    expect(limiter.check('b').allowed).toBe(true);
  });

  it('starts a fresh window once the previous one expires', () => {
    const clock = fixedClock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: clock.now });

    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(false);

    clock.advance(60_001);
    expect(limiter.check('a')).toMatchObject({ allowed: true, remaining: 0 });
  });

  it('does not reset the window early while it is still open', () => {
    const clock = fixedClock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: clock.now });

    limiter.check('a');
    clock.advance(59_000);
    expect(limiter.check('a').allowed).toBe(false);
  });

  it('reports retryAfterSeconds counting down within the window', () => {
    const clock = fixedClock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: clock.now });

    limiter.check('a');
    clock.advance(30_000);
    const blocked = limiter.check('a');
    expect(blocked.retryAfterSeconds).toBe(30);
  });
});
