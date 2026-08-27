/**
 * A minimal reader for calculated values.
 *
 * ExcelJS is the writer here, not the reader: it drops a cached result of zero,
 * which would make "nothing" and "zero" indistinguishable in exactly the checks
 * that matter (§12.2 blank workbook, zero budget). This reads the cached values
 * straight out of the package instead, so a 0 is a 0 and a blank is a blank.
 */
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';

const decode = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/&amp;/g, '&');

function sharedStrings(xml) {
  if (!xml) return [];
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => decode(t[1])).join(''));
}

function parseSheet(xml, strings) {
  const cells = new Map();
  for (const m of xml.matchAll(/<c ([^>]*?)\/>|<c ([^>]*?)>([\s\S]*?)<\/c>/g)) {
    const attrs = m[1] ?? m[2];
    const body = m[3] ?? '';
    const ref = /r="([A-Z]+\d+)"/.exec(attrs)?.[1];
    if (!ref) continue;
    const type = /t="([^"]+)"/.exec(attrs)?.[1] ?? 'n';
    const inline = /<is>([\s\S]*?)<\/is>/.exec(body);
    const raw = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
    let value;
    if (inline) {
      value = [...inline[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => decode(t[1])).join('');
    } else if (raw === undefined) {
      value = null;
    } else if (type === 's') {
      value = strings[Number(raw)] ?? '';
    } else if (type === 'e') {
      value = { error: decode(raw) };
    } else if (type === 'b') {
      value = raw === '1';
    } else if (type === 'str' || type === 'inlineStr') {
      value = decode(raw);
    } else {
      value = Number(raw);
    }
    cells.set(ref, value);
  }
  return cells;
}

/** Reads every sheet's calculated values into `Map<sheetName, Map<ref, value>>`. */
export async function readValues(path) {
  const zip = await JSZip.loadAsync(await readFile(path));
  const workbook = await zip.file('xl/workbook.xml').async('string');
  const rels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
  const strings = sharedStrings(zip.file('xl/sharedStrings.xml')
    ? await zip.file('xl/sharedStrings.xml').async('string') : null);

  const relTargets = new Map([...rels.matchAll(/<Relationship ([^>]*)\/>/g)].map((m) => [
    /Id="([^"]+)"/.exec(m[1])[1],
    /Target="([^"]+)"/.exec(m[1])[1],
  ]));

  const sheets = new Map();
  for (const m of workbook.matchAll(/<sheet ([^>]*)\/>/g)) {
    const name = decode(/name="([^"]*)"/.exec(m[1])[1]);
    const rid = /r:id="([^"]+)"/.exec(m[1])[1];
    const target = relTargets.get(rid).replace(/^\/?xl\//, '');
    const xml = await zip.file(`xl/${target}`).async('string');
    sheets.set(name, parseSheet(xml, strings));
  }
  return sheets;
}
