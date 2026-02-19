/**
 * KJV Reformatter: Convert KJV JSON files to the normalized BibleBook shape.
 *
 * Input:  /Users/jack-braga/Documents/Projects/dailyOffice/Bible-kjv-master/*.json
 * Output: public/data/bible/kjv/{book-id}.json
 *
 * Transformations:
 *  - Convert string chapter/verse numbers to integers
 *  - Add id (slug) and shortName from book metadata
 *  - Map KJV filenames to canonical IDs
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BOOK_METADATA, findBookByKjvFileName } from './shared/book-names';

const KJV_SOURCE_DIR = '/Users/jack-braga/Documents/Projects/dailyOffice/Bible-kjv-master';
const OUTPUT_DIR = path.resolve(import.meta.dirname, '..', 'public', 'data', 'bible', 'kjv');

interface KjvVerse {
  verse: string;
  text: string;
}

interface KjvChapter {
  chapter: string;
  verses: KjvVerse[];
}

interface KjvBook {
  book: string;
  chapters: KjvChapter[];
}

interface NormalizedVerse {
  verse: number;
  text: string;
}

interface NormalizedChapter {
  chapter: number;
  verses: NormalizedVerse[];
}

interface NormalizedBook {
  id: string;
  name: string;
  shortName: string;
  chapters: NormalizedChapter[];
}

function main() {
  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let processed = 0;
  let skipped = 0;

  for (const book of BOOK_METADATA) {
    const sourceFile = path.join(KJV_SOURCE_DIR, `${book.kjvFileName}.json`);

    if (!fs.existsSync(sourceFile)) {
      console.warn(`  SKIP: ${sourceFile} not found`);
      skipped++;
      continue;
    }

    const raw: KjvBook = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));

    const normalized: NormalizedBook = {
      id: book.id,
      name: book.name,
      shortName: book.shortName,
      chapters: raw.chapters.map(ch => ({
        chapter: parseInt(ch.chapter, 10),
        verses: ch.verses.map(v => ({
          verse: parseInt(v.verse, 10),
          text: v.text,
        })),
      })),
    };

    const outputFile = path.join(OUTPUT_DIR, `${book.id}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(normalized));
    processed++;
  }

  console.log(`KJV: ${processed} books processed, ${skipped} skipped`);
}

main();
