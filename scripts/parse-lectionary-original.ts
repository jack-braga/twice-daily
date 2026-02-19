/**
 * 1662 Original Lectionary Parser
 *
 * Reads the 12 monthly JSON files from the spagosx/1662-BCP-Lectionary repo
 * and outputs a normalized lectionary JSON file.
 *
 * The source data already includes Proper Lessons for fixed holy days inline
 * (e.g., Christmas Day readings appear at December 25's position).
 *
 * Output: public/data/lectionary/1662-original.json
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseReadingRef, type ReadingRef } from './shared/reading-ref-parser';
import { findBook } from './shared/book-names';

const SOURCE_DIR = '/Users/jack-braga/Documents/Projects/dailyOffice/1662-BCP-Lectionary/months';
const OUTPUT_DIR = path.resolve(import.meta.dirname, '..', 'public', 'data', 'lectionary');

interface SourceDay {
  morning: { first: string; second: string };
  evening: { first: string; second: string };
}

interface LectionaryEntry {
  morning: {
    first: ReadingRef[];
    second: ReadingRef[];
  };
  evening: {
    first: ReadingRef[];
    second: ReadingRef[];
  };
}

// Known typos in the spagosx source data
const SOURCE_CORRECTIONS: Record<string, string> = {
  'Exodus 115:1-22': 'Exodus 15:1-22',     // Feb 13 ep1 — digit transposition
  'Zechariah 38:1-15': 'Zechariah 3',       // Oct 18 ep1 — digit corruption
  'John 23:1-36': 'John 21',               // Dec 27 mp2 — St John's Day
  'Numbers 11:1-36': 'Numbers 11',          // Mar 5 mp1 — endVerse exceeds chapter (35 vv)
  'Ezekiel 9:1-17': 'Ezekiel 9',           // Aug 12 mp1 — endVerse exceeds chapter (11 vv)
};

/**
 * Parse a reading reference string from the spagosx format.
 * Handles the "+" separator and "&" for combined readings.
 * Returns an array of ReadingRef.
 */
function parseRef(raw: string): ReadingRef[] {
  let input = raw.trim().replace(/\+/g, ' ');

  // Apply known source data corrections
  if (SOURCE_CORRECTIONS[input]) {
    input = SOURCE_CORRECTIONS[input]!;
  }

  // Fix malformed references with extra colons: "Acts 21:17:1-37" → "Acts 21:17-37"
  input = input.replace(/(\d+:\d+):1-(\d+)$/, '$1-$2');

  // Fix spaces around hyphens: "Numbers 21:10 -32" → "Numbers 21:10-32"
  input = input.replace(/\s*-\s*/g, '-');

  // Fix abbreviations glued to chapter: "Ecclus.2:10" → "Ecclus. 2:10"
  input = input.replace(/^([A-Za-z]+)\.(\d)/, '$1. $2');

  // Normalize period-separated verse refs: "Wisdom 6.22" → "Wisdom 6:22"
  // Only do this for the chapter:verse part, not the book name
  input = input.replace(/(\d+)\.(\d+)/g, '$1:$2');

  // Skip empty strings
  if (!input) return [];

  // Handle "&" — some readings combine chapters: "Isaiah+52:13 & 53"
  // This means "Isaiah 52:13 to end, then Isaiah 53"
  if (input.includes(' & ')) {
    const parts = input.split(' & ');
    const allRefs: ReadingRef[] = [];
    for (const part of parts) {
      const trimmed = part.trim();
      // If part is just a chapter number/range (e.g., "53" or "2:1-11"),
      // it inherits the book from the previous part.
      // But NOT if it starts like "1 Peter" (numbered book name).
      if (/^\d+([:-]\d+)*$/.test(trimmed) && allRefs.length > 0) {
        const prevBook = allRefs[allRefs.length - 1]!.book;
        try {
          const refs = parseReadingRef(`${prevBook} ${trimmed}`);
          allRefs.push(...refs);
        } catch {
          console.warn(`  WARN: Could not parse "&" continuation: "${trimmed}" (book: ${prevBook})`);
        }
      } else {
        try {
          allRefs.push(...parseReadingRef(trimmed));
        } catch {
          console.warn(`  WARN: Could not parse reading: "${trimmed}"`);
        }
      }
    }
    return allRefs;
  }

  try {
    return parseReadingRef(input);
  } catch {
    console.warn(`  WARN: Could not parse reading: "${input}"`);
    return [];
  }
}

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Output: keyed by "MM-DD" string (01-indexed)
  const lectionary: Record<string, LectionaryEntry> = {};
  let totalEntries = 0;
  let parseErrors = 0;

  for (let month = 1; month <= 12; month++) {
    const sourceFile = path.join(SOURCE_DIR, `${month}.json`);
    const days: SourceDay[] = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));

    for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
      const day = days[dayIdx]!;
      const dayNum = dayIdx + 1;
      const key = `${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

      const mp1 = parseRef(day.morning.first);
      const mp2 = parseRef(day.morning.second);
      const ep1 = parseRef(day.evening.first);
      const ep2 = parseRef(day.evening.second);

      // Count as error only if source was non-empty but produced no refs
      // (some holy days intentionally omit a reading, e.g. SS Simon & Jude ep2)
      if (mp1.length === 0 && day.morning.first.trim()) parseErrors++;
      if (mp2.length === 0 && day.morning.second.trim()) parseErrors++;
      if (ep1.length === 0 && day.evening.first.trim()) parseErrors++;
      if (ep2.length === 0 && day.evening.second.trim()) parseErrors++;

      lectionary[key] = {
        morning: { first: mp1, second: mp2 },
        evening: { first: ep1, second: ep2 },
      };
      totalEntries++;
    }
  }

  const outputFile = path.join(OUTPUT_DIR, '1662-original.json');
  fs.writeFileSync(outputFile, JSON.stringify(lectionary, null, 0));

  console.log(`1662 Original: ${totalEntries} days, ${parseErrors} parse errors`);
}

main();
