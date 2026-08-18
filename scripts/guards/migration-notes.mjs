/**
 * ENG-006 — "Never create a production migration without rollback/roll-forward
 * notes, backup impact and tested representative data."
 *
 * Enforced as a paired-file check rather than left to reviewer memory
 * (assumption A-22). The notes must actually contain the required sections.
 */
import { ROOT, read, rel, report, walk } from './lib.mjs';

const REQUIRED_SECTIONS = [/##\s*Rollback/i, /##\s*Roll-forward/i, /##\s*Backup impact/i];

const migrations = await walk(ROOT, (p) => /packages\/db\/migrations\/.*\.sql$/.test(p));
const failures = [];

for (const migration of migrations) {
  const notesPath = migration.replace(/\.sql$/, '.notes.md');
  let notes;
  try {
    notes = await read(notesPath);
  } catch {
    failures.push(`${rel(migration)} has no ${rel(notesPath).split('/').pop()} (ENG-006)`);
    continue;
  }
  for (const section of REQUIRED_SECTIONS) {
    if (!section.test(notes)) {
      failures.push(`${rel(notesPath)} is missing a section matching ${section} (ENG-006)`);
    }
  }
}

process.exit(report('every migration has rollback notes (ENG-006)', failures) ? 0 : 1);
