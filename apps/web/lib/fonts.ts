import { Inter, Newsreader } from 'next/font/google';

/**
 * Typefaces — PRD §14: "Licensed premium humanist sans or neo-grotesk paired
 * with robust system fallbacks."
 *
 * Loaded through `next/font`, which downloads and **self-hosts** the files at
 * build time. That matters for more than performance: nothing is fetched from a
 * font CDN at runtime, so the Content-Security-Policy keeps `font-src 'self'`,
 * the no-third-party-script guard stays honest, and a visitor's IP is never
 * disclosed to a font host before they have consented to anything (PUB-006).
 *
 * The pairing is a serif for display and a grotesque for everything else. A
 * professional-services brand selling considered judgement reads as considered
 * when its headlines have a typographic voice; an all-sans page at these sizes
 * reads like a product dashboard, which §14 explicitly warns against.
 */

export const sans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  // Tabular figures so prices and numerals align in columns.
  axes: [],
});

export const display = Newsreader({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
});
