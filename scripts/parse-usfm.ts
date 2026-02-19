/**
 * USFM Parser: Convert WEB USFM files to normalized BibleBook JSON.
 *
 * Usage:
 *   npx tsx scripts/parse-usfm.ts --variant usa
 *   npx tsx scripts/parse-usfm.ts --variant brit
 *
 * Handles only the USFM markers we care about:
 *   \c, \v, \p, \q1, \q2, \d, \w...\w*, \f...\f*, \qs...\qs*
 * Strips Strong's concordance numbers and footnotes.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BOOK_METADATA, findBookByUsfmCode } from './shared/book-names';

const DATA_DIR = '/Users/jack-braga/Documents/Projects/dailyOffice';

const VARIANTS: Record<string, { dir: string; suffix: string }> = {
  usa: { dir: 'engwebp_usfm', suffix: 'engwebp' },
  brit: { dir: 'engwebpb_usfm', suffix: 'engwebpb' },
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

/** Strip remaining inline markers we don't need */
function stripInlineMarkers(line: string): string {
  return line
    .replace(/\\qs\s*/g, '')    // Selah opening — keep text
    .replace(/\\qs\*/g, '')     // Selah closing
    .replace(/\\+wh\s*/g, '')   // Hebrew word opening
    .replace(/\\+wh\*/g, '')    // Hebrew word closing
    .replace(/\\wj\s*/g, '')    // Words of Jesus opening
    .replace(/\\wj\*/g, '')     // Words of Jesus closing
    .replace(/\\nd\s*/g, '')    // Name of Deity opening
    .replace(/\\nd\*/g, '')     // Name of Deity closing
    .replace(/\\add\s*/g, '')   // Added words opening
    .replace(/\\add\*/g, '')    // Added words closing
    .replace(/\\w\s+/g, '')     // Remaining \w without strong's
    .replace(/\\w\*/g, '');     // Remaining \w* closers
}

/** Clean up a line of verse text */
function cleanText(line: string): string {
  let text = line;
  text = stripStrongs(text);
  text = stripFootnotes(text);
  text = stripCrossRefs(text);
  text = stripInlineMarkers(text);
  // Clean up multiple spaces and trim
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

// ============================================================
// USFM Parser
// ============================================================

function parseUsfmFile(content: string): { usfmCode: string; chapters: Chapter[] } | null {
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
    if (/^\\(ide|h|toc\d|mt\d|ms\d|cl|rem|sts|s\d|r|sr|mr|sp|pi\d?|nb|b)\s/.test(line) ||
        /^\\(ide|h|toc\d|mt\d|ms\d|cl|rem|sts|s\d|r|sr|mr|sp|pi\d?|nb|b)$/.test(line)) {
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

    // Poetry markers: \q1, \q2
    if (line.startsWith('\\q1') || line === '\\q1') {
      currentPoetry = 1;
      const afterQ = line.substring(3).trim();
      if (!afterQ || !afterQ.startsWith('\\v ')) continue;
    }
    if (line.startsWith('\\q2') || line === '\\q2') {
      currentPoetry = 2;
      const afterQ = line.substring(3).trim();
      if (!afterQ || !afterQ.startsWith('\\v ')) continue;
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

    // Continuation line (no marker, or just \q1/\q2 followed by text)
    // Append to current verse
    if (currentVerse && line.trim()) {
      // Check for poetry marker at start of continuation
      let contText = line;
      if (contText.startsWith('\\q1')) {
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
    console.error('Usage: npx tsx scripts/parse-usfm.ts --variant [usa|brit]');
    process.exit(1);
  }

  const config = VARIANTS[variant]!;
  const sourceDir = path.join(DATA_DIR, config.dir);
  const outputDir = path.resolve(import.meta.dirname, '..', 'public', 'data', 'bible',
    variant === 'usa' ? 'web-usa' : 'web-brit');

  fs.mkdirSync(outputDir, { recursive: true });

  const files = fs.readdirSync(sourceDir)
    .filter(f => f.endsWith('.usfm'))
    .filter(f => !f.startsWith('00-'))  // skip front matter
    .filter(f => !f.startsWith('106-')) // skip glossary
    .sort();

  let processed = 0;
  let skipped = 0;

  for (const file of files) {
    const content = fs.readFileSync(path.join(sourceDir, file), 'utf-8');
    const result = parseUsfmFile(content);

    if (!result) {
      console.warn(`  SKIP: ${file} — no USFM ID found`);
      skipped++;
      continue;
    }

    const bookMeta = findBookByUsfmCode(result.usfmCode);
    if (!bookMeta) {
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

  console.log(`WEB ${variant}: ${processed} books processed, ${skipped} skipped`);
}

main();
