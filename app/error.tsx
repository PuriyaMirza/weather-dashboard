'use client';

import { useEffect } from 'react';
import { Icon } from '@/components/ui/icon';

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
    <main className="min-h-screen bg-surface px-4 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-2xl rounded-2xl bg-surface-container-low p-8 text-on-surface shadow-raised">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-error-container text-error">
          <Icon name="error" size={22} />
        </span>
        <h1 className="mt-4 font-display text-3xl leading-tight text-primary">Something went wrong</h1>
        <p className="mt-3 type-body-md text-on-surface-variant">
          The dashboard hit an unexpected problem. Your saved locations and layout are untouched.
        </p>
        {/* The digest is the only handle on a production error, whose message Next deliberately
            strips before it reaches the browser. Without it a bug report has nothing to match on. */}
        {error.digest && <p className="mt-3 type-label-sm uppercase text-secondary">Reference {error.digest}</p>}

        <button
          type="button"
          onClick={retry}
          className="mt-6 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-secondary-fixed px-5 type-label-lg text-on-secondary outline-none hover:bg-primary-fixed focus-visible:ring-2 focus-visible:ring-secondary-fixed focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low"
        >
          <Icon name="refresh" size={18} />
          Try again
        </button>
      </div>
    </main>
  );
}
