/**
 * Reading Validator
 *
 * Iterates every ReadingRef in every lectionary and verifies that the
 * book/chapter/verse exists in all 3 Bible translations.
 *
 * Apocryphal books are skipped (we only show their references as labels).
 *
 * Fails the build on any missing reference in canonical books.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BOOK_METADATA } from './shared/book-names';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'public', 'data');

// ─── Types matching the lectionary JSON shapes ──────────────────────────

interface ReadingRef {
  book: string;
  startChapter: number;
  startVerse?: number;
  endChapter: number;
  endVerse?: number;
}

interface BibleBook {
  id: string;
  name: string;
  chapters: { chapter: number; verses: { verse: number }[] }[];
}

// ─── Apocryphal books (we skip validation for these) ────────────────────

const APOCRYPHAL_BOOKS = new Set([
  'Ecclesiasticus', 'Wisdom', 'Tobit', 'Baruch',
  '1 Maccabees', '2 Maccabees', 'Prayer of Manasses',
  'Song of Three Children', 'Judith', 'Susanna',
  'Bel and the Dragon', '2 Esdras', '1 Esdras',
]);

// ─── Load Bible data ────────────────────────────────────────────────────

const translations = ['kjv', 'asv', 'lsv', 'web-usa', 'web-brit', 'web-updated'];

/** Map of translation → bookName → BibleBook */
const bibleData = new Map<string, Map<string, BibleBook>>();

function loadBibles() {
  for (const trans of translations) {
    const transDir = path.join(DATA_DIR, 'bible', trans);
    const books = new Map<string, BibleBook>();

    for (const file of fs.readdirSync(transDir)) {
      if (!file.endsWith('.json')) continue;
      const book: BibleBook = JSON.parse(fs.readFileSync(path.join(transDir, file), 'utf-8'));
      books.set(book.name, book);
    }

    bibleData.set(trans, books);
  }
}

// ─── Validation ─────────────────────────────────────────────────────────

let errors = 0;
let warnings = 0;
let totalRefs = 0;

function validateRef(ref: ReadingRef, source: string) {
  totalRefs++;

  // Skip apocryphal books
  if (APOCRYPHAL_BOOKS.has(ref.book)) return;

  // Check book exists in canonical metadata
  const meta = BOOK_METADATA.find(b => b.name === ref.book);
  if (!meta) {
    console.error(`  ERROR [${source}]: Unknown book "${ref.book}"`);
    errors++;
    return;
  }

  for (const trans of translations) {
    const books = bibleData.get(trans)!;
    const book = books.get(ref.book);

    if (!book) {
      console.error(`  ERROR [${source}] [${trans}]: Book "${ref.book}" not found in translation`);
      errors++;
      continue;
    }

    // Check start chapter
    const startChap = book.chapters.find(c => c.chapter === ref.startChapter);
    if (!startChap) {
      console.error(`  ERROR [${source}] [${trans}]: ${ref.book} chapter ${ref.startChapter} not found`);
      errors++;
      continue;
    }

    // Check start verse if specified
    if (ref.startVerse != null) {
      const maxVerse = Math.max(...startChap.verses.map(v => v.verse));
      if (ref.startVerse > maxVerse) {
        console.error(`  ERROR [${source}] [${trans}]: ${ref.book} ${ref.startChapter}:${ref.startVerse} — max verse is ${maxVerse}`);
        errors++;
      }
    }

    // Check end chapter
    if (ref.endChapter !== ref.startChapter) {
      const endChap = book.chapters.find(c => c.chapter === ref.endChapter);
      if (!endChap) {
        console.error(`  ERROR [${source}] [${trans}]: ${ref.book} chapter ${ref.endChapter} not found`);
        errors++;
        continue;
      }

    }
    // End verse overflow is acceptable — means "read to end of chapter".
    // The app's Bible loader will clamp to the actual last verse.
  }
}

function validateRefs(refs: ReadingRef[], source: string) {
  for (const ref of refs) {
    validateRef(ref, source);
  }
}

// ─── Validate 1662 Original ────────────────────────────────────────────

function validate1662Original() {
  const data: Record<string, {
    morning: { first: ReadingRef[]; second: ReadingRef[] };
    evening: { first: ReadingRef[]; second: ReadingRef[] };
  }> = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'lectionary', '1662-original.json'), 'utf-8'));

  for (const [date, day] of Object.entries(data)) {
    validateRefs(day.morning.first, `1662-orig ${date} mp1`);
    validateRefs(day.morning.second, `1662-orig ${date} mp2`);
    validateRefs(day.evening.first, `1662-orig ${date} ep1`);
    validateRefs(day.evening.second, `1662-orig ${date} ep2`);
  }
}

// ─── Validate 1662 Revised ─────────────────────────────────────────────

function validate1662Revised() {
  const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'lectionary', '1662-revised.json'), 'utf-8'));
  const regular = data.regular as Record<string, {
    dayLabel?: string;
    morning?: {
      first?: { primary?: ReadingRef[]; alternative?: ReadingRef[] };
      second?: { primary?: ReadingRef[]; alternative?: ReadingRef[] };
    };
    evening?: {
      first?: { primary?: ReadingRef[]; alternative?: ReadingRef[] };
      second?: { primary?: ReadingRef[]; alternative?: ReadingRef[] };
    };
  }>;
  const fixed = data.fixed as Record<string, {
    dayLabel?: string;
    firstEvensong?: {
      first?: { primary?: ReadingRef[]; alternative?: ReadingRef[] };
      second?: { primary?: ReadingRef[]; alternative?: ReadingRef[] };
    };
    morning?: {
      first?: { primary?: ReadingRef[]; alternative?: ReadingRef[] };
      second?: { primary?: ReadingRef[]; alternative?: ReadingRef[] };
    };
    secondEvensong?: {
      first?: { primary?: ReadingRef[]; alternative?: ReadingRef[] };
      second?: { primary?: ReadingRef[]; alternative?: ReadingRef[] };
    };
  }>;

  for (const [key, day] of Object.entries(regular)) {
    const prefix = `1662-rev ${key}`;
    if (day.morning?.first?.primary) validateRefs(day.morning.first.primary, `${prefix} mp1`);
    if (day.morning?.first?.alternative) validateRefs(day.morning.first.alternative, `${prefix} mp1-alt`);
    if (day.morning?.second?.primary) validateRefs(day.morning.second.primary, `${prefix} mp2`);
    if (day.morning?.second?.alternative) validateRefs(day.morning.second.alternative, `${prefix} mp2-alt`);
    if (day.evening?.first?.primary) validateRefs(day.evening.first.primary, `${prefix} ep1`);
    if (day.evening?.first?.alternative) validateRefs(day.evening.first.alternative, `${prefix} ep1-alt`);
    if (day.evening?.second?.primary) validateRefs(day.evening.second.primary, `${prefix} ep2`);
    if (day.evening?.second?.alternative) validateRefs(day.evening.second.alternative, `${prefix} ep2-alt`);
  }

  for (const [key, day] of Object.entries(fixed)) {
    const prefix = `1662-rev-fixed ${key}`;
    if (day.firstEvensong?.first?.primary) validateRefs(day.firstEvensong.first.primary, `${prefix} 1ep1`);
    if (day.firstEvensong?.second?.primary) validateRefs(day.firstEvensong.second.primary, `${prefix} 1ep2`);
    if (day.morning?.first?.primary) validateRefs(day.morning.first.primary, `${prefix} mp1`);
    if (day.morning?.second?.primary) validateRefs(day.morning.second.primary, `${prefix} mp2`);
    if (day.secondEvensong?.first?.primary) validateRefs(day.secondEvensong.first.primary, `${prefix} 2ep1`);
    if (day.secondEvensong?.second?.primary) validateRefs(day.secondEvensong.second.primary, `${prefix} 2ep2`);
  }
}

// ─── Validate M'Cheyne ─────────────────────────────────────────────────

function validateMcheyne() {
  const data: { day: number; morning: ReadingRef[]; evening: ReadingRef[] }[] =
    JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'lectionary', 'mcheyne.json'), 'utf-8'));

  for (const day of data) {
    validateRefs(day.morning, `mcheyne day${day.day} morning`);
    validateRefs(day.evening, `mcheyne day${day.day} evening`);
  }
}

// ─── Validate BibleProject ────────────────────────────────────────────

function validateBibleProject() {
  const data: { day: number; section: string; reading: ReadingRef[]; psalm: ReadingRef }[] =
    JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'lectionary', 'bibleproject.json'), 'utf-8'));

  for (const day of data) {
    validateRefs(day.reading, `bibleproject day${day.day} reading`);
    validateRef(day.psalm, `bibleproject day${day.day} psalm`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────

function main() {
  console.log('Loading Bible data...');
  loadBibles();

  for (const [trans, books] of bibleData) {
    console.log(`  ${trans}: ${books.size} books`);
  }

  console.log('\nValidating 1662 Original...');
  validate1662Original();

  console.log('Validating 1662 Revised...');
  validate1662Revised();

  console.log('Validating M\'Cheyne...');
  validateMcheyne();

  console.log('Validating BibleProject...');
  validateBibleProject();

  console.log(`\nValidation complete: ${totalRefs} refs checked, ${errors} errors, ${warnings} warnings`);

  if (errors > 0) {
    console.error('\nBUILD FAILED: Reading validation errors found');
    process.exit(1);
  }
}

main();
