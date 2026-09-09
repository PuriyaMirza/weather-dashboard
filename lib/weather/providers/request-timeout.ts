/**
 * How long any single upstream request may take before it is abandoned.
 *
 * Without a deadline a hung connection is not an error — it is silence. The route handler waits,
 * the browser waits, and eventually the hosting platform kills the function and returns its own
 * HTML error page. That breaks the `{ error: string }` contract every caller in this app relies
 * on: `use-weather-data.ts` parses the response as JSON, so an HTML timeout page degrades to a
 * generic message instead of the specific one the route would have sent.
 *
 * Eight seconds is comfortably longer than Open-Meteo's normal response (well under a second) and
 * comfortably shorter than a typical serverless limit, so we fail first and fail in our own shape.
 */
export const UPSTREAM_TIMEOUT_MS = 8_000;

/**
 * Request init carrying the deadline.
 *
 * A signal is created per call rather than shared: `AbortSignal.timeout` starts counting the
 * moment it is constructed, so a module-level constant would begin expiring at import time and
 * abort every request after the first few seconds of the process's life.
 */
export function withTimeout(): RequestInit {
  return { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) };
}
