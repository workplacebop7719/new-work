/**
 * Minimalist wildflower line drawings.
 *
 * Single-weight strokes, no fill, no shading — the botanical-sketch idea rather
 * than a decorated one. Everything here is generated from geometry rather than
 * hand-authored path data, so a sprig can be restyled (colour, weight, scale)
 * without redrawing it, and the same art can go into the workbook as a raster
 * and into the PDFs as vector.
 *
 * §2.2 rules out clip-art clutter and ornament. These are used sparingly: the
 * cover, the top of START HERE, and the covers of the printed guides. Not on a
 * tracker, and never over data.
 */

const round = (n) => Math.round(n * 100) / 100;

/** A five- or six-petal open flower, seen face on. */
export function bloom({ x, y, r = 9, petals = 5, rotate = 0 }) {
  const parts = [];
  for (let i = 0; i < petals; i += 1) {
    const angle = rotate + (i * 360) / petals;
    parts.push(`<ellipse cx="0" cy="${round(-r * 0.62)}" rx="${round(r * 0.3)}" ry="${round(r * 0.5)}" transform="rotate(${round(angle)})"/>`);
  }
  parts.push(`<circle cx="0" cy="0" r="${round(r * 0.18)}"/>`);
  return `<g transform="translate(${round(x)} ${round(y)})">${parts.join('')}</g>`;
}

/** A closed bell, hanging from its stem — a harebell or a campanula. */
export function bell({ x, y, r = 7, rotate = 0 }) {
  const w = r * 0.72;
  const h = r * 1.15;
  const d = [
    `M ${round(-w)} 0`,
    `C ${round(-w)} ${round(h * 0.72)} ${round(-w * 0.55)} ${round(h)} 0 ${round(h)}`,
    `C ${round(w * 0.55)} ${round(h)} ${round(w)} ${round(h * 0.72)} ${round(w)} 0`,
    `C ${round(w * 0.5)} ${round(-h * 0.34)} ${round(-w * 0.5)} ${round(-h * 0.34)} ${round(-w)} 0`,
    'Z',
  ].join(' ');
  return `<g transform="translate(${round(x)} ${round(y)}) rotate(${round(rotate)})"><path d="${d}"/></g>`;
}

/** A seed head: short stalks with a dot on each. */
export function seedHead({ x, y, r = 8, count = 7, rotate = -90 }) {
  const parts = [];
  for (let i = 0; i < count; i += 1) {
    const angle = rotate - 62 + (i * 124) / (count - 1);
    const rad = (angle * Math.PI) / 180;
    const ex = Math.cos(rad) * r;
    const ey = Math.sin(rad) * r;
    parts.push(`<line x1="0" y1="0" x2="${round(ex)}" y2="${round(ey)}"/>`);
    parts.push(`<circle cx="${round(ex)}" cy="${round(ey)}" r="${round(r * 0.13)}"/>`);
  }
  return `<g transform="translate(${round(x)} ${round(y)})">${parts.join('')}</g>`;
}

/** A single leaf, a pointed oval with a mid-vein. */
export function leaf({ x, y, length = 16, width = 6, rotate = 0 }) {
  const l = length;
  const w = width;
  const d = `M 0 0 C ${round(w)} ${round(-l * 0.35)} ${round(w)} ${round(-l * 0.72)} 0 ${round(-l)} `
    + `C ${round(-w)} ${round(-l * 0.72)} ${round(-w)} ${round(-l * 0.35)} 0 0 Z`;
  return `<g transform="translate(${round(x)} ${round(y)}) rotate(${round(rotate)})">`
    + `<path d="${d}"/><line x1="0" y1="0" x2="0" y2="${round(-l)}"/></g>`;
}

/** A stem, drawn as a gentle curve from bottom to top. */
export function stem({ x, y, height, bend = 6 }) {
  const top = y - height;
  return `<path d="M ${round(x)} ${round(y)} C ${round(x + bend)} ${round(y - height * 0.4)} `
    + `${round(x - bend)} ${round(y - height * 0.7)} ${round(x)} ${round(top)}"/>`;
}

/**
 * A tall sprig for the cover: three stems of different heights, each ending in
 * a different flower, with leaves low down. Asymmetric on purpose — a hand
 * drawing rather than a diagram.
 */
export function sprigTall({ width = 120, height = 300 }) {
  const base = height - 6;
  const mid = width / 2;
  const parts = [
    stem({ x: mid, y: base, height: height * 0.86, bend: 7 }),
    bloom({ x: mid, y: base - height * 0.86, r: width * 0.1, petals: 6, rotate: 12 }),
    leaf({ x: mid, y: base - height * 0.32, length: width * 0.3, width: width * 0.1, rotate: 42 }),
    leaf({ x: mid, y: base - height * 0.52, length: width * 0.26, width: width * 0.09, rotate: -38 }),

    stem({ x: mid - width * 0.24, y: base, height: height * 0.6, bend: -6 }),
    bell({ x: mid - width * 0.24, y: base - height * 0.6, r: width * 0.09, rotate: -14 }),
    leaf({ x: mid - width * 0.24, y: base - height * 0.24, length: width * 0.24, width: width * 0.08, rotate: -50 }),

    stem({ x: mid + width * 0.26, y: base, height: height * 0.7, bend: 6 }),
    seedHead({ x: mid + width * 0.26, y: base - height * 0.7, r: width * 0.13, count: 7 }),
    leaf({ x: mid + width * 0.26, y: base - height * 0.3, length: width * 0.22, width: width * 0.08, rotate: 52 }),

    stem({ x: mid + width * 0.08, y: base, height: height * 0.42, bend: -4 }),
    bloom({ x: mid + width * 0.08, y: base - height * 0.42, r: width * 0.07, petals: 5, rotate: -20 }),
  ];
  return parts.join('');
}

/** A small sprig for a heading: one bloom, one bell, two leaves. */
export function sprigSmall({ width = 90, height = 40 }) {
  const base = height - 4;
  const parts = [
    stem({ x: width * 0.5, y: base, height: height * 0.78, bend: 4 }),
    bloom({ x: width * 0.5, y: base - height * 0.78, r: height * 0.2, petals: 5, rotate: 10 }),
    stem({ x: width * 0.28, y: base, height: height * 0.52, bend: -3 }),
    bell({ x: width * 0.28, y: base - height * 0.52, r: height * 0.16, rotate: -12 }),
    stem({ x: width * 0.72, y: base, height: height * 0.6, bend: 3 }),
    seedHead({ x: width * 0.72, y: base - height * 0.6, r: height * 0.2, count: 5 }),
    leaf({ x: width * 0.4, y: base - height * 0.14, length: height * 0.34, width: height * 0.12, rotate: -46 }),
    leaf({ x: width * 0.6, y: base - height * 0.14, length: height * 0.3, width: height * 0.11, rotate: 46 }),
  ];
  return parts.join('');
}

/** A wide, low spray to sit under a title as a rule with flowers in it. */
export function spray({ width = 320, height = 46 }) {
  const base = height - 4;
  const mid = width / 2;
  const parts = [`<line x1="0" y1="${round(base)}" x2="${round(width)}" y2="${round(base)}"/>`];
  const offsets = [-0.3, -0.14, 0, 0.15, 0.31];
  offsets.forEach((o, i) => {
    const x = mid + width * o;
    const h = height * (i % 2 === 0 ? 0.62 : 0.44);
    parts.push(stem({ x, y: base, height: h, bend: i % 2 === 0 ? 4 : -4 }));
    if (i % 3 === 0) parts.push(bloom({ x, y: base - h, r: height * 0.17, petals: 5, rotate: i * 15 }));
    else if (i % 3 === 1) parts.push(bell({ x, y: base - h, r: height * 0.14, rotate: -10 }));
    else parts.push(seedHead({ x, y: base - h, r: height * 0.16, count: 5 }));
  });
  parts.push(leaf({ x: mid - width * 0.22, y: base, length: height * 0.34, width: height * 0.11, rotate: -58 }));
  parts.push(leaf({ x: mid + width * 0.22, y: base, length: height * 0.32, width: height * 0.1, rotate: 58 }));
  return parts.join('');
}

/** Wraps drawing parts in an SVG document with one stroke style for all of it. */
export function svg({ width, height, body, stroke = '#B08D57', strokeWidth = 1.1 }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" `
    + `viewBox="0 0 ${width} ${height}" fill="none" stroke="${stroke}" `
    + `stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">`
    + `${body}</svg>`;
}

export const ART = {
  sprigTall: (o = {}) => ({ width: o.width ?? 120, height: o.height ?? 300, body: sprigTall(o) }),
  sprigSmall: (o = {}) => ({ width: o.width ?? 90, height: o.height ?? 40, body: sprigSmall(o) }),
  spray: (o = {}) => ({ width: o.width ?? 320, height: o.height ?? 46, body: spray(o) }),
};
