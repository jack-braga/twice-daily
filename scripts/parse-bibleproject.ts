/**
 * BibleProject "One Story That Leads to Jesus" Reading Plan Parser
 *
 * Reads the manually transcribed bibleproject-raw.json (358 days) and normalizes
 * all reading references into ReadingRef objects.
 *
 * Each day has:
 *   - A main Bible reading (one or more chapters)
 *   - A Psalm (whole psalm or subsection like 119:1-32)
 *
 * Special cases:
 *   - "Songs of Songs" → canonical "Song of Solomon"
 *   - "2 & 3 John" chapters "1, 1" → two ReadingRefs [2 John 1, 3 John 1]
 *   - Psalm subsections "119:1-32" → parsed as "Psalms 119:1-32"
 *
 * Output: public/data/lectionary/bibleproject.json
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseReadingRef, type ReadingRef } from './shared/reading-ref-parser';

const SOURCE_FILE = path.resolve(import.meta.dirname, 'data', 'bibleproject-raw.json');
const OUTPUT_DIR = path.resolve(import.meta.dirname, '..', 'public', 'data', 'lectionary');

interface RawDay {
  day: number;
  section: string;
  book: string;
  chapters: string;
  psalm: string;
}

interface BibleProjectDay {
  day: number;
  section: string;
  reading: ReadingRef[];
  psalm: ReadingRef;
}

const BOOK_NAME_FIXES: Record<string, string> = {
  'Songs of Songs': 'Song of Solomon',
};

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const source: RawDay[] = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf-8'));
  const output: BibleProjectDay[] = [];
  let errors = 0;

  for (const raw of source) {
    const bookName = BOOK_NAME_FIXES[raw.book] ?? raw.book;

    // Parse reading
    let readingRefs: ReadingRef[];
    try {
      if (bookName.includes('&')) {
        // "2 & 3 John" with chapters "1, 1" → two separate refs
        const bookParts = bookName.split(/\s*&\s*/);
        const chapterParts = raw.chapters.split(/\s*,\s*/);
        let firstBook = bookParts[0]!.trim();
        const secondBook = bookParts[1]!.trim();
        // If firstBook is just a number like "2", inherit name from secondBook
        // "2" + "3 John" → firstBook = "2 John"
        if (/^\d+$/.test(firstBook)) {
          firstBook = `${firstBook} ${secondBook.replace(/^\d+\s*/, '')}`;
        }

        readingRefs = [
          ...parseReadingRef(`${firstBook} ${chapterParts[0]?.trim() ?? '1'}`),
          ...parseReadingRef(`${secondBook} ${chapterParts[1]?.trim() ?? '1'}`),
        ];
      } else {
        readingRefs = parseReadingRef(`${bookName} ${raw.chapters}`);
      }
    } catch (e) {
      console.error(`  ERROR Day ${raw.day} reading: "${bookName} ${raw.chapters}" — ${e}`);
      errors++;
      continue;
    }

    // Parse psalm
    let psalmRef: ReadingRef;
    try {
      const refs = parseReadingRef(`Psalms ${raw.psalm}`);
      psalmRef = refs[0]!;
    } catch (e) {
      console.error(`  ERROR Day ${raw.day} psalm: "Psalms ${raw.psalm}" — ${e}`);
      errors++;
      continue;
    }

    output.push({
      day: raw.day,
      section: raw.section,
      reading: readingRefs,
      psalm: psalmRef,
    });
  }

  const outputFile = path.join(OUTPUT_DIR, 'bibleproject.json');
  fs.writeFileSync(outputFile, JSON.stringify(output));

  console.log(`BibleProject: ${output.length} days, ${errors} errors`);
  if (errors > 0) process.exit(1);
}

main();
