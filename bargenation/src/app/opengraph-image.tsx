import { ImageResponse } from 'next/og';

/**
 * What a shared link looks like.
 *
 * Without this, a link to Bargenation posted anywhere renders as a bare URL
 * with no picture — which reads as a site nobody has finished, and is a poor
 * first impression for a product whose whole argument is care.
 *
 * Deliberately typographic rather than a screenshot: a screenshot of a deal
 * would show a price, and every price here is currently fictional. A card that
 * says what the product is cannot go stale or mislead.
 */
export const alt = 'Bargenation — before you buy it, check Bargenation';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#ffffff',
          padding: '72px',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 22,
            letterSpacing: '0.34em',
            textTransform: 'uppercase',
            color: '#111112',
            fontFamily: 'Georgia, serif',
          }}
        >
          Bargenation
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 76, lineHeight: 1.05, color: '#111112' }}>
            Before you buy it,
          </div>
          <div style={{ display: 'flex', fontSize: 76, lineHeight: 1.05, color: '#111112' }}>
            check Bargenation.
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 28,
              fontSize: 26,
              color: '#4a4a4f',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            We record what things actually cost, then tell you whether today’s price is worth it.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', width: 120, height: 8, background: '#fc78dc' }} />
          <div
            style={{
              display: 'flex',
              fontSize: 20,
              color: '#6e6e73',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            Sometimes the answer is no.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
