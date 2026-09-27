'use client';

/**
 * Replaces the root layout when it is the thing that failed, so it must supply its own document.
 *
 * Next's docs are explicit that global-error does NOT receive the app's global styles, which means
 * the design tokens are unavailable here and `bg-surface` / `text-on-surface` would resolve to
 * nothing. Everything below is therefore inline, with the Forest values copied as literals, and
 * deliberately plain: this renders when the application shell itself is broken, so it should
 * depend on as little as possible — including web fonts, hence the system stack.
 */
const FOREST = {
  surface: '#001711',
  surfaceContainerLow: '#042019',
  primary: '#ffffff',
  secondary: '#a8cfbf',
  secondaryFixed: '#c4ebda',
  onSurfaceVariant: '#c2c8c4',
  onSecondary: '#12362b',
} as const;

const SYSTEM_SANS =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          boxSizing: 'border-box',
          background: FOREST.surface,
          color: FOREST.primary,
          fontFamily: SYSTEM_SANS,
        }}
      >
        <div
          style={{
            maxWidth: '32rem',
            padding: '2rem',
            borderRadius: '1rem',
            background: FOREST.surfaceContainerLow,
            boxShadow: '0 8px 24px rgb(0 17 13 / 0.5)',
          }}
        >
          <h1 style={{ margin: 0, fontSize: '1.75rem', lineHeight: 1.2, fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ marginTop: '0.75rem', fontSize: '0.9375rem', lineHeight: 1.6, color: FOREST.onSurfaceVariant }}>
            The dashboard failed to start. Your saved locations and layout are untouched.
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: '0.75rem',
                fontSize: '0.6875rem',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: FOREST.secondary,
              }}
            >
              Reference {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={retry}
            style={{
              marginTop: '1.5rem',
              minHeight: '2.75rem',
              padding: '0 1.25rem',
              border: 'none',
              borderRadius: '9999px',
              background: FOREST.secondaryFixed,
              color: FOREST.onSecondary,
              font: 'inherit',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
