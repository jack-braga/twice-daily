/**
 * M'Cheyne Reading Plan Parser
 *
 * Reads the scraped mcheyne-complete.json (365 days) and normalizes
 * all reading references into ReadingRef objects.
 *
 * M'Cheyne divides readings into:
 *   - "Family" (2 readings) → mapped to morning session
 *   - "Secret" (2 readings) → mapped to evening session
 *
 * Output: public/data/lectionary/mcheyne.json
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseReadingRef, type ReadingRef } from './shared/reading-ref-parser';

const SOURCE_FILE = path.resolve(import.meta.dirname, 'data', 'mcheyne-complete.json');
const OUTPUT_DIR = path.resolve(import.meta.dirname, '..', 'public', 'data', 'lectionary');

interface SourceDay {
  day: number;
  family: string[];
  secret: string[];
}

interface McheyneDay {
  day: number;
  morning: ReadingRef[];
  evening: ReadingRef[];
}

let parseErrors = 0;

function parseWithContinuation(rawRef: string, target: ReadingRef[], dayNum: number, session: string) {
  // Handle "&" combined chapters: "Jeremiah 36&45" → "Jeremiah 36" + "Jeremiah 45"
  if (rawRef.includes('&')) {
    const parts = rawRef.split(/\s*&\s*/);
    let lastBook = '';
    for (const part of parts) {
      const trimmed = part.trim();
      // If it's just a number, inherit the book
      const refStr = /^\d+$/.test(trimmed) && lastBook ? `${lastBook} ${trimmed}` : trimmed;
      try {
        const refs = parseReadingRef(refStr);
        target.push(...refs);
        if (refs.length > 0) lastBook = refs[0]!.book;
      } catch {
        console.warn(`  WARN: Day ${dayNum} ${session}: "${refStr}"`);
        parseErrors++;
      }
    }
    return;
  }

  try {
    target.push(...parseReadingRef(rawRef));
  } catch {
    console.warn(`  WARN: Day ${dayNum} ${session}: "${rawRef}"`);
    parseErrors++;
  }
}

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const source: SourceDay[] = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf-8'));
  const output: McheyneDay[] = [];

  for (const day of source) {
    const morning: ReadingRef[] = [];
    const evening: ReadingRef[] = [];

    for (const rawRef of day.family) {
      parseWithContinuation(rawRef, morning, day.day, 'family');
    }

    for (const rawRef of day.secret) {
      parseWithContinuation(rawRef, evening, day.day, 'secret');
    }

    output.push({ day: day.day, morning, evening });
  }

  const outputFile = path.join(OUTPUT_DIR, 'mcheyne.json');
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 0));

  console.log(`M'Cheyne: ${output.length} days, ${parseErrors} parse errors`);
}

main();
