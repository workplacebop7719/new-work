import { ImageResponse } from 'next/og';

/**
 * The tab icon.
 *
 * Generated rather than shipped as a file so it cannot drift from the brand:
 * the pink is the locked founder colour and the mark is the wordmark's initial
 * in the display face's spirit. Black on pink, which is the only direction
 * that combination is allowed to run — pink as a fill with dark type on it,
 * never pink type.
 *
 * Without this, browsers request /favicon.ico, get a 404, and show a blank
 * page-shaped icon. A tab with no icon is how a site looks when nobody has
 * finished it.
 */
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fc78dc',
          color: '#111112',
          fontSize: 22,
          fontWeight: 600,
          fontFamily: 'Georgia, serif',
        }}
      >
        B
      </div>
    ),
    size,
  );
}
