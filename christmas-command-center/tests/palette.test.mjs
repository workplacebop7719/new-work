/**
 * Palette tests — §6.2 calls the tokens "contrast-tested", so they are.
 *
 * Two things are checked. Every combination of text on fill that the workbook
 * actually uses clears WCAG AA at 4.5:1. And no two fills that carry different
 * meanings are so alike that a reader could confuse them — for which either a
 * luminance difference or a clear hue difference counts, because §6.2 also
 * requires that every state be readable as a word regardless of its colour.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { TOKENS } from '../src/config.js';
import { STATE_STYLE, STATE_WORDS } from '../src/lib/render-tracker.js';

const channel = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };

function luminance(token) {
  const n = parseInt(token.slice(2), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Distance in RGB, as a rough stand-in for "these look different". */
function chromaDistance(a, b) {
  const na = parseInt(a.slice(2), 16);
  const nb = parseInt(b.slice(2), 16);
  const d = (shift) => (((na >> shift) & 255) - ((nb >> shift) & 255)) ** 2;
  return Math.sqrt(d(16) + d(8) + d(0));
}

/** Every text-on-fill pairing the sheets actually produce. */
const PAIRS = [
  ['INK', 'BLUSH', 'body text in an input cell'],
  ['INK', 'PAPER', 'body text on white'],
  ['INK', 'SOFT_AMBER', 'text in an example row'],
  ['INK', 'GOLD_PALE', 'text on the gold wash'],
  ['PLUM', 'MIST', 'text in a calculated cell'],
  ['PLUM', 'PAPER', 'headings'],
  ['PLUM', 'BLUSH', 'a sheet title on its band'],
  ['PAPER', 'PLUM', 'header-row text'],
  ['GOLD_LIGHT', 'PLUM', 'navigation links on the strip'],
  ['ROSE', 'PAPER', 'dashboard figures and alerts'],
  ['ROSE', 'SOFT_ROSE', 'OVER BUDGET on its own fill'],
  ['ROSE', 'BLUSH', 'an accent on the page band'],
  ['PLUM_2', 'MIST', 'ON TRACK on its own fill'],
  ['PLUM_2', 'PAPER', 'secondary text'],
  ['MUTED', 'PAPER', 'captions'],
  ['MUTED', 'BLUSH', 'captions on the band'],
  ['MUTED', 'BAND', 'the legend line'],
];

test('every text-on-fill pairing clears WCAG AA', () => {
  for (const [fg, bg, where] of PAIRS) {
    const ratio = contrast(TOKENS[fg], TOKENS[bg]);
    assert.ok(ratio >= 4.5,
      `${fg} on ${bg} is ${ratio.toFixed(2)}:1, below 4.5 — ${where}`);
  }
});

test('the conditional-format states clear AA on the fills they use', () => {
  for (const [state, style] of Object.entries(STATE_STYLE)) {
    const ratio = contrast(style.font, style.fill);
    assert.ok(ratio >= 4.5,
      `the "${state}" state is ${ratio.toFixed(2)}:1 — ${STATE_WORDS[state].slice(0, 2).join(', ')}…`);
  }
});

test('fills that mean different things can be told apart', () => {
  const fills = ['BLUSH', 'MIST', 'SOFT_AMBER', 'SOFT_ROSE', 'PAPER'];
  for (let i = 0; i < fills.length; i += 1) {
    for (let j = i + 1; j < fills.length; j += 1) {
      const [a, b] = [fills[i], fills[j]];
      const ratio = contrast(TOKENS[a], TOKENS[b]);
      const distance = chromaDistance(TOKENS[a], TOKENS[b]);
      assert.ok(ratio >= 1.06 || distance >= 14,
        `${a} and ${b} are too close: ${ratio.toFixed(3)}:1, distance ${distance.toFixed(1)}`);
    }
  }
});

test('no state is signalled by colour alone', () => {
  // §6.2: every conditional format matches on a word, so the meaning survives a
  // greyscale print, a colour-blind reader, and a fill the buyer has changed.
  for (const [state, words] of Object.entries(STATE_WORDS)) {
    assert.ok(words.length > 0, `the "${state}" state has no words`);
    for (const word of words) {
      assert.equal(word, word.toUpperCase(), `"${word}" should be set in capitals like the others`);
      assert.ok(word.trim().length >= 3, `"${word}" is too short to read as a label`);
    }
  }
});

test('the palette is pink and gold, not the edition it replaced', () => {
  // A guard against a half-finished re-skin: these are the two hues the product
  // is sold on, and a leftover green would be visible on every sheet.
  const red = (t) => (parseInt(t.slice(2), 16) >> 16) & 255;
  const green = (t) => (parseInt(t.slice(2), 16) >> 8) & 255;
  const blue = (t) => parseInt(t.slice(2), 16) & 255;
  for (const name of ['BLUSH', 'BAND', 'SOFT_ROSE']) {
    const token = TOKENS[name];
    assert.ok(red(token) > green(token) && red(token) > blue(token),
      `${name} should read as pink — red must lead`);
  }
  for (const name of ['GOLD', 'GOLD_LIGHT', 'GOLD_PALE']) {
    const token = TOKENS[name];
    assert.ok(red(token) > blue(token) && green(token) > blue(token),
      `${name} should read as gold — blue must trail`);
  }
});
