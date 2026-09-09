'use client';

/**
 * Replaces the root layout when it is the thing that failed, so it must supply its own document.
 *
 * Next's docs are explicit that global-error does NOT receive the app's global styles, which means
 * the design tokens are unavailable here and `bg-canvas` / `text-ink` would resolve to nothing.
 * Everything below is therefore inline, and deliberately plain: this renders when the application
 * shell itself is broken, so it should depend on as little as possible.
 */
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
          background: '#f4f3f0',
          color: '#16150f',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <div style={{ maxWidth: '32rem', border: '1px solid #16150f', padding: '2rem' }}>
          <h1 style={{ margin: 0, fontFamily: 'ui-serif, Georgia, serif', fontSize: '2rem', fontWeight: 400 }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
            The dashboard failed to start. Your saved locations and layout are untouched.
          </p>
          {error.digest && (
            <p style={{ marginTop: '0.75rem', fontSize: '0.6875rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5c5a51' }}>
              Reference {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={retry}
            style={{
              marginTop: '1.5rem',
              padding: '0.5rem 1rem',
              border: '1px solid #16150f',
              background: 'transparent',
              color: '#16150f',
              font: 'inherit',
              fontSize: '0.6875rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
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
