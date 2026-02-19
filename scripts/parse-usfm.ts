/**
 * Unified USFM Parser: Convert USFM files to normalized BibleBook JSON.
 *
 * Supports 6 translation variants:
 *   npx tsx scripts/parse-usfm.ts --variant web-usa
 *   npx tsx scripts/parse-usfm.ts --variant web-brit
 *   npx tsx scripts/parse-usfm.ts --variant web-updated
 *   npx tsx scripts/parse-usfm.ts --variant kjv
 *   npx tsx scripts/parse-usfm.ts --variant asv
 *   npx tsx scripts/parse-usfm.ts --variant lsv
 *
 * Handles USFM markers:
 *   \c, \v, \p, \q1, \q2, \qc, \d, \b
 *   \w...\w*, \+w...\+w*, \f...\f*, \x...\x*, \qs...\qs*
 *   \nd...\nd*, \+nd...\+nd*, \wj...\wj*, \add...\add*
 *   \tl...\tl*, \bd...\bd*, \it...\it*
 *   || (LSV poetry delimiter — split into separate poetry lines)
 *
 * Strips Strong's concordance numbers, footnotes, cross-references,
 * and formatting markers. Keeps enclosed text.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BOOK_METADATA, findBookByUsfmCode } from './shared/book-names';

const DATA_DIR = '/Users/jack-braga/Documents/Projects/dailyOffice';

interface VariantConfig {
  dir: string;
  suffix: string;
  outDir: string;
  /** If true, split || into poetry lines (LSV) */
  splitPipePoetry?: boolean;
}

const VARIANTS: Record<string, VariantConfig> = {
  // Legacy aliases for backwards compat
  'usa':          { dir: 'engwebp_usfm',   suffix: 'engwebp',  outDir: 'web-usa' },
  'brit':         { dir: 'engwebpb_usfm',   suffix: 'engwebpb', outDir: 'web-brit' },
  // Canonical names
  'web-usa':      { dir: 'engwebp_usfm',   suffix: 'engwebp',  outDir: 'web-usa' },
  'web-brit':     { dir: 'engwebpb_usfm',   suffix: 'engwebpb', outDir: 'web-brit' },
  'web-updated':  { dir: 'engwebu_usfm',    suffix: 'engwebu',  outDir: 'web-updated' },
  'kjv':          { dir: 'eng-kjv_usfm',    suffix: 'eng-kjv',  outDir: 'kjv' },
  'asv':          { dir: 'eng-asv_usfm',    suffix: 'eng-asv',  outDir: 'asv' },
  'lsv':          { dir: 'englsv_usfm',     suffix: 'englsv',   outDir: 'lsv', splitPipePoetry: true },
};

interface Verse {
  verse: number;
  text: string;
  poetry?: number;
}

interface Chapter {
  chapter: number;
  superscription?: string;
  verses: Verse[];
}

interface Book {
  id: string;
  name: string;
  shortName: string;
  chapters: Chapter[];
}

// ============================================================
// USFM Text Cleaning
// ============================================================

/** Strip Strong's number markers: \w word|strong="H1234"\w* → word */
/** Also handles nested form: \+w word|strong="H1234"\+w* → word */
function stripStrongs(line: string): string {
  return line
    .replace(/\\\+w\s*([^|]*?)\|strong="[^"]*"\\\+w\*/g, '$1')  // nested \+w...\+w*
    .replace(/\\w\s+([^|]*?)\|strong="[^"]*"\\w\*/g, '$1');      // standard \w...\w*
}

/** Strip footnotes: \f ... \f* → empty */
function stripFootnotes(line: string): string {
  return line.replace(/\\f\s.*?\\f\*/g, '');
}

/** Strip cross-references: \x ... \x* → empty */
function stripCrossRefs(line: string): string {
  return line.replace(/\\x\s.*?\\x\*/g, '');
}

/** Strip remaining inline markers we don't need (keep enclosed text).
 *  IMPORTANT: Closing markers (\xyz*) must be stripped BEFORE opening markers
 *  (\xyz\s*), because the opening regex uses \s* which can greedily match the
 *  bare marker without its *, leaving an orphaned asterisk. */
function stripInlineMarkers(line: string): string {
  return line
    // Selah
    .replace(/\\qs\*/g, '')
    .replace(/\\qs\s*/g, '')
    // Hebrew word
    .replace(/\\\+wh\*/g, '')
    .replace(/\\\+wh\s*/g, '')
    // Words of Jesus
    .replace(/\\wj\*/g, '')
    .replace(/\\wj\s*/g, '')
    // Name of Deity (both regular and nested)
    .replace(/\\\+nd\*/g, '')
    .replace(/\\\+nd\s*/g, '')
    .replace(/\\nd\*/g, '')
    .replace(/\\nd\s*/g, '')
    // Translator-added words
    .replace(/\\add\*/g, '')
    .replace(/\\add\s*/g, '')
    // Transliterated words
    .replace(/\\tl\*/g, '')
    .replace(/\\tl\s*/g, '')
    // Bold (LSV)
    .replace(/\\bd\*/g, '')
    .replace(/\\bd\s*/g, '')
    // Italic (LSV)
    .replace(/\\it\*/g, '')
    .replace(/\\it\s*/g, '')
    // Remaining \w without strong's
    .replace(/\\w\*/g, '')
    .replace(/\\w\s+/g, '')
    // Remaining \+w without strong's
    .replace(/\\\+w\*/g, '')
    .replace(/\\\+w\s+/g, '');
}

/** Strip square-bracket editorial insertions: [is] → is (LSV uses these) */
function stripBrackets(line: string): string {
  return line.replace(/\[([^\]]*)\]/g, '$1');
}

/** Clean up a line of verse text */
function cleanText(line: string): string {
  let text = line;
  text = stripStrongs(text);
  text = stripFootnotes(text);
  text = stripCrossRefs(text);
  text = stripInlineMarkers(text);
  text = stripBrackets(text);
  // Clean up multiple spaces and trim
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

// ============================================================
// USFM Parser
// ============================================================

/** Regex to skip header/metadata/section markers (entire line) */
const SKIP_LINE_RE =
  /^\\(ide|h|toc\d|mt\d|ms\d|cl|rem|sts|s\d|r|sr|mr|sp|pi\d?|nb|b|li\d?|pc|qa|qr)\s/;
const SKIP_LINE_BARE_RE =
  /^\\(ide|h|toc\d|mt\d|ms\d|cl|rem|sts|s\d|r|sr|mr|sp|pi\d?|nb|b|li\d?|pc|qa|qr)$/;

function parseUsfmFile(content: string, splitPipePoetry: boolean): { usfmCode: string; chapters: Chapter[] } | null {
  const lines = content.split('\n');
  let usfmCode = '';
  const chapters: Chapter[] = [];
  let currentChapter: Chapter | null = null;
  let currentVerse: Verse | null = null;
  let currentPoetry: number | undefined;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Book ID: \id GEN ...
    if (line.startsWith('\\id ')) {
      usfmCode = line.substring(4).split(/\s/)[0]!.trim();
      continue;
    }

    // Skip header/metadata markers
    if (SKIP_LINE_RE.test(line) || SKIP_LINE_BARE_RE.test(line)) {
      continue;
    }

    // Chapter marker: \c N
    if (line.startsWith('\\c ')) {
      const chapterNum = parseInt(line.substring(3).trim(), 10);
      if (!isNaN(chapterNum)) {
        currentChapter = { chapter: chapterNum, verses: [] };
        chapters.push(currentChapter);
        currentVerse = null;
        currentPoetry = undefined;
      }
      continue;
    }

    // Psalm superscription: \d
    if (line.startsWith('\\d ') || line === '\\d') {
      if (currentChapter) {
        const superText = cleanText(line.substring(2));
        if (superText) {
          currentChapter.superscription = superText;
        }
      }
      continue;
    }

    // Paragraph: \p (resets poetry)
    if (line === '\\p' || line.startsWith('\\p ')) {
      currentPoetry = undefined;
      // If there's text after \p on the same line, it might contain a verse
      const afterP = line.startsWith('\\p ') ? line.substring(3) : '';
      if (afterP && afterP.startsWith('\\v ')) {
        // Process as verse below — fall through
      } else {
        continue;
      }
    }

    // Poetry markers: \q1, \q2, \qc
    // IMPORTANT: Only `continue` on bare markers (no text after).
    // When text follows without \v, it's a continuation of the previous verse
    // and must fall through to the continuation block below.
    {
      const qMatch = line.match(/^\\(q[12c])\s?(.*)/);
      const isBareQ = line === '\\q1' || line === '\\q2' || line === '\\qc';

      if (qMatch || isBareQ) {
        // Set poetry level
        currentPoetry = line.startsWith('\\q2') ? 2 : 1;

        const afterQ = qMatch ? qMatch[2]!.trim() : '';

        if (!afterQ) {
          // Bare marker (e.g. \q1 on its own line) — just set poetry mode, skip
          continue;
        }

        if (afterQ.startsWith('\\v ')) {
          // Has a verse marker — fall through to verse parsing below
        } else {
          // Has text but NO \v — this is a continuation of the previous verse.
          // Fall through to the continuation block at the bottom.
        }
      }
    }

    // Verse marker: \v N
    const verseMatch = line.match(/\\v\s+(\d+)\s+(.*)/);
    if (verseMatch) {
      if (!currentChapter) continue;
      const verseNum = parseInt(verseMatch[1]!, 10);
      const verseText = cleanText(verseMatch[2]!);

      currentVerse = {
        verse: verseNum,
        text: verseText,
        ...(currentPoetry != null ? { poetry: currentPoetry } : {}),
      };
      currentChapter.verses.push(currentVerse);
      continue;
    }

    // Continuation line: text that belongs to the current verse.
    // This includes:
    //   - Plain text continuation lines
    //   - \q1/\q2/\qc lines with text but no \v (poetry continuations)
    if (currentVerse && line.trim()) {
      let contText = line;

      // Strip leading poetry marker if present
      if (contText.startsWith('\\qc')) {
        currentPoetry = 1;
        contText = contText.substring(3);
      } else if (contText.startsWith('\\q1')) {
        currentPoetry = 1;
        contText = contText.substring(3);
      } else if (contText.startsWith('\\q2')) {
        currentPoetry = 2;
        contText = contText.substring(3);
      }

      const cleaned = cleanText(contText);
      if (cleaned) {
        currentVerse.text += ' ' + cleaned;
        currentVerse.text = currentVerse.text.trim();
      }
    }
  }

  if (!usfmCode) return null;

  // Post-processing: split || poetry delimiters (LSV)
  if (splitPipePoetry) {
    for (const chapter of chapters) {
      const expandedVerses: Verse[] = [];
      for (const verse of chapter.verses) {
        if (verse.text.includes('||')) {
          const segments = verse.text.split('||').map(s => s.trim()).filter(Boolean);
          // First segment keeps the original verse number
          expandedVerses.push({
            verse: verse.verse,
            text: segments[0] ?? verse.text,
            poetry: 1,
          });
          // Subsequent segments become continuation entries with same verse number
          // but are appended back to the verse text since our data model is one entry per verse.
          // Actually — the app renders one entry per verse number. Multiple entries with the
          // same verse number would be confusing. Better approach: keep as single verse but
          // mark as poetry.
          if (segments.length > 1) {
            expandedVerses[expandedVerses.length - 1]!.text =
              segments.join(' ');
            expandedVerses[expandedVerses.length - 1]!.poetry = 1;
          }
        } else {
          expandedVerses.push(verse);
        }
      }
      chapter.verses = expandedVerses;
    }
  }

  return { usfmCode, chapters };
}

// ============================================================
// Main
// ============================================================

function main() {
  const variant = process.argv.includes('--variant')
    ? process.argv[process.argv.indexOf('--variant') + 1]
    : undefined;

  if (!variant || !(variant in VARIANTS)) {
    const validVariants = [...new Set(Object.values(VARIANTS).map(v => v.outDir))].sort();
    console.error(`Usage: npx tsx scripts/parse-usfm.ts --variant [${validVariants.join('|')}]`);
    process.exit(1);
  }

  const config = VARIANTS[variant]!;
  const sourceDir = path.join(DATA_DIR, config.dir);
  const outputDir = path.resolve(import.meta.dirname, '..', 'public', 'data', 'bible', config.outDir);

  fs.mkdirSync(outputDir, { recursive: true });

  const files = fs.readdirSync(sourceDir)
    .filter(f => f.endsWith('.usfm'))
    .filter(f => !f.startsWith('00-'))   // skip front matter
    .filter(f => !f.startsWith('106-'))  // skip glossary
    .sort();

  let processed = 0;
  let skipped = 0;

  for (const file of files) {
    const content = fs.readFileSync(path.join(sourceDir, file), 'utf-8');
    const result = parseUsfmFile(content, config.splitPipePoetry ?? false);

    if (!result) {
      console.warn(`  SKIP: ${file} — no USFM ID found`);
      skipped++;
      continue;
    }

    const bookMeta = findBookByUsfmCode(result.usfmCode);
    if (!bookMeta || bookMeta.order >= 100) {
      // Skip apocryphal/deuterocanonical books not in our 66-book canon
      skipped++;
      continue;
    }

    const book: Book = {
      id: bookMeta.id,
      name: bookMeta.name,
      shortName: bookMeta.shortName,
      chapters: result.chapters,
    };

    const outputFile = path.join(outputDir, `${bookMeta.id}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(book));
    processed++;
  }

  console.log(`${config.outDir}: ${processed} books processed, ${skipped} skipped`);
}

main();
