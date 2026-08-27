/**
 * One stylesheet for the printed documents, using the §6.2 tokens so the PDFs
 * and the workbook look like the same product.
 */
import { TOKENS } from '../config.js';

const hex = (token) => `#${token.slice(2)}`;

export const CSS = `
  @page { size: A4; margin: 20mm 18mm 18mm 18mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; color: ${hex(TOKENS.INK)}; background: #fff;
    font-family: Aptos, Arial, Helvetica, sans-serif; font-size: 10.5pt; line-height: 1.55;
  }
  h1, h2, h3, .display { font-family: Georgia, 'Times New Roman', serif; font-weight: 700; color: ${hex(TOKENS.PLUM)}; }
  h1 { font-size: 26pt; line-height: 1.15; margin: 0 0 4pt; letter-spacing: -0.01em; }
  h2 { font-size: 15pt; margin: 22pt 0 6pt; padding-bottom: 4pt; border-bottom: 1px solid ${hex(TOKENS.GOLD)}; }
  h3 { font-size: 11.5pt; margin: 14pt 0 2pt; }
  p { margin: 0 0 8pt; }
  a { color: ${hex(TOKENS.PLUM_2)}; }
  .eyebrow { font-size: 8.5pt; letter-spacing: 0.16em; text-transform: uppercase; color: ${hex(TOKENS.GOLD)}; margin-bottom: 10pt; }
  .lede { font-family: Georgia, serif; font-size: 13pt; font-style: italic; color: ${hex(TOKENS.PLUM_2)}; margin: 0 0 18pt; }
  .cover {
    background: ${hex(TOKENS.BLUSH)}; color: ${hex(TOKENS.INK)};
    padding: 30pt 30pt 22pt; margin: -6pt 0 20pt;
    border-top: 1.5pt solid ${hex(TOKENS.GOLD)};
    border-bottom: 1.5pt solid ${hex(TOKENS.GOLD)};
    position: relative;
  }
  .cover h1 { color: ${hex(TOKENS.PLUM)}; }
  .cover .lede { color: ${hex(TOKENS.PLUM_2)}; margin-bottom: 0; }
  .cover .eyebrow { color: ${hex(TOKENS.GOLD)}; }
  .cover .art { position: absolute; right: 26pt; bottom: 16pt; opacity: 0.95; }
  .rule-art { text-align: center; margin: 18pt 0 4pt; }
  .rule-art svg { display: inline-block; }
  .gold { color: ${hex(TOKENS.GOLD)}; }
  tr:nth-child(even) td { background: ${hex(TOKENS.BAND)}; }
  th:first-child { border-left: 2pt solid ${hex(TOKENS.GOLD)}; }
  h2::after { content: ''; }
  ol, ul { margin: 0 0 10pt; padding-left: 16pt; }
  li { margin-bottom: 5pt; }
  .step { display: flex; gap: 12pt; margin-bottom: 12pt; break-inside: avoid; }
  .step .n { font-family: Georgia, serif; font-size: 20pt; font-weight: 700; color: ${hex(TOKENS.GOLD)}; line-height: 1; width: 22pt; flex: none; }
  .step h3 { margin: 0 0 2pt; }
  .step p { margin: 0; }
  table { width: 100%; border-collapse: collapse; margin: 6pt 0 14pt; font-size: 9.5pt; }
  th { text-align: left; background: ${hex(TOKENS.PLUM)}; color: #fff; padding: 5pt 7pt; font-weight: 700; }
  td { padding: 5pt 7pt; border-bottom: 1px solid ${hex(TOKENS.RULE)}; vertical-align: top; }
  .swatch { display: inline-block; width: 24pt; height: 11pt; border: 1px solid ${hex(TOKENS.RULE)}; vertical-align: -1pt; }
  .note { background: ${hex(TOKENS.BLUSH)}; border-left: 3px solid ${hex(TOKENS.GOLD)}; padding: 9pt 12pt; margin: 12pt 0; }
  .warn { background: ${hex(TOKENS.SOFT_ROSE)}; border-left: 3px solid ${hex(TOKENS.ROSE)}; padding: 9pt 12pt; margin: 12pt 0; }
  .muted { color: ${hex(TOKENS.MUTED)}; font-size: 9pt; }
  .foot { margin-top: 26pt; padding-top: 8pt; border-top: 1px solid ${hex(TOKENS.RULE)}; color: ${hex(TOKENS.MUTED)}; font-size: 8.5pt; }
  .break { break-before: page; }
  .cols { column-count: 2; column-gap: 20pt; }
  .keep { break-inside: avoid; }
`;

export function document_({ title, body }) {
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8">
<title>${title}</title><style>${CSS}</style></head><body>${body}</body></html>`;
}
