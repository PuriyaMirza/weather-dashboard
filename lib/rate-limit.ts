export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Epoch ms when the current window ends. */
  resetAt: number;
  /** Seconds until the caller may retry. 0 when allowed. */
  retryAfterSeconds: number;
}

export interface RateLimiterOptions {
  /** Maximum requests permitted per key per window. */
  limit: number;
  windowMs: number;
  /** Injectable clock so tests don't depend on wall-clock timing. */
  now?: () => number;
}

interface Window {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window rate limiter held in process memory.
 *
 * IMPORTANT: this is per-instance state. On serverless platforms each concurrent instance keeps
 * its own counters, so the effective global ceiling is roughly (limit x live instances), and
 * counters reset whenever an instance is recycled. It is a guardrail against a single client
 * hammering one instance — not a strict global quota. A shared store (Redis, Vercel KV) would be
 * required for that, which this local-first MVP intentionally does not have.
 */
export function createRateLimiter({ limit, windowMs, now = Date.now }: RateLimiterOptions) {
  const windows = new Map<string, Window>();

  function prune(currentTime: number) {
    for (const [key, window] of windows) {
      if (window.resetAt <= currentTime) windows.delete(key);
    }
  }

  return {
    check(key: string): RateLimitResult {
      const currentTime = now();
      // Bound memory growth: distinct keys accumulate, so drop expired windows periodically.
      if (windows.size > 1000) prune(currentTime);

      const existing = windows.get(key);
      const window =
        existing && existing.resetAt > currentTime ? existing : { count: 0, resetAt: currentTime + windowMs };

      window.count += 1;
      windows.set(key, window);

      const allowed = window.count <= limit;
      return {
        allowed,
        limit,
        remaining: Math.max(0, limit - window.count),
        resetAt: window.resetAt,
        retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((window.resetAt - currentTime) / 1000)),
      };
    },
  };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;
