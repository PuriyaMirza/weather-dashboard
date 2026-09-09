'use client';

import { useEffect } from 'react';

/**
 * Route-level fallback: the last line of defence if something throws outside a module boundary.
 *
 * Per-module boundaries (components/weather/module-boundary.tsx) catch the common case and keep
 * the rest of the dashboard alive. This catches everything else — a throw in the header, the
 * location search, or the grid itself — and offers a real way forward instead of a blank page.
 *
 * The prop is `retry` in this version of Next, not the `reset` older versions used.
 */
export default function DashboardError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error('[dashboard] unhandled error:', error);
  }, [error]);

  return (
    <main className="min-h-screen bg-canvas px-4 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-2xl border border-line-strong bg-card p-8">
        <h1 className="font-display text-3xl leading-none text-ink-strong">Something went wrong</h1>
        <p className="mt-4 text-sm text-ink">
          The dashboard hit an unexpected problem. Your saved locations and layout are untouched.
        </p>
        {/* The digest is the only handle on a production error, whose message Next deliberately
            strips before it reaches the browser. Without it a bug report has nothing to match on. */}
        {error.digest && <p className="eyebrow mt-3 text-muted">Reference {error.digest}</p>}

        <button
          type="button"
          onClick={retry}
          className="eyebrow mt-6 border border-line-strong px-4 py-2 text-ink outline-none hover:bg-accent hover:text-accent-ink focus-visible:ring-2 focus-visible:ring-accent"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
