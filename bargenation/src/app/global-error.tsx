'use client';

/**
 * The boundary of last resort.
 *
 * `error.tsx` renders inside the root layout, so it cannot catch an error
 * thrown BY that layout — fonts, the header, the sample-data bar. This one
 * replaces the whole document, which is why it has to bring its own <html>
 * and its own styling: the stylesheet lives in the layout that just failed.
 *
 * Everything here is inline and self-contained on purpose. A fallback that
 * depends on the thing that broke is not a fallback.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          background: '#ffffff',
          color: '#111112',
          fontFamily: 'Georgia, "Times New Roman", serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}
      >
        <main style={{ maxWidth: '32rem' }}>
          <p
            style={{
              margin: 0,
              fontSize: '11px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              fontFamily: 'system-ui, sans-serif',
              color: '#6e6e73',
            }}
          >
            Bargenation
          </p>
          <h1 style={{ fontSize: '2rem', lineHeight: 1.1, margin: '0.75rem 0 0', fontWeight: 400 }}>
            The site failed to load.
          </h1>
          <p
            style={{
              margin: '1.25rem 0 0',
              lineHeight: 1.6,
              fontFamily: 'system-ui, sans-serif',
              fontSize: '0.9375rem',
              color: '#4a4a4f',
            }}
          >
            Not part of it — all of it. Nothing you did caused this, and nothing you had saved has
            been changed.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '2rem',
              minHeight: '44px',
              padding: '0 1.25rem',
              border: '1px solid #111112',
              background: 'transparent',
              color: '#111112',
              fontFamily: 'system-ui, sans-serif',
              fontSize: '0.8125rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p
              style={{
                marginTop: '2rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid #e2e2e4',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '0.75rem',
                color: '#6e6e73',
              }}
            >
              Reference {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
