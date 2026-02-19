/**
 * Parse reading reference strings from lectionaries into structured ReadingRef objects.
 *
 * Handles formats found across 1662 BCP, 1922 Revised, and M'Cheyne sources:
 *   "Gen 1"             → whole chapter
 *   "Gen 1-3"           → multiple whole chapters
 *   "Gen 1:1-25"        → verse range within a chapter
 *   "Gen 1:20-2:4"      → cross-chapter range
 *   "Gen 1:18"          → from verse to end of chapter
 *   "Ps 119:1-32"       → verse range
 *   "1 Thess. 4:13"     → abbreviated with dot
 *   "Genesis+1:1-20"    → spagosx format (+ instead of space)
 *   "Matt 1:18-25"      → standard
 */

import { findBook, type BookMeta } from './book-names';

export interface ReadingRef {
  book: string;          // Canonical display name: "Genesis", "1 Samuel"
  startChapter: number;
  startVerse?: number;   // undefined = from start of chapter
  endChapter: number;
  endVerse?: number;     // undefined = to end of chapter
}

/**
 * Parse a reading reference string into one or more ReadingRef objects.
 * Returns an array because cross-chapter ranges need special handling.
 */
export function parseReadingRef(raw: string): ReadingRef[] {
  const input = raw.trim()
    .replace(/\+/g, ' ');  // spagosx format uses + instead of space

  // Split book name from chapter:verse portion
  const { bookMeta, remainder } = splitBookAndRef(input);
  if (!bookMeta) {
    throw new Error(`Unknown book in reference: "${raw}"`);
  }

  const bookName = bookMeta.name;

  // No chapter/verse info — just a book name (rare but possible)
  if (!remainder) {
    return [{ book: bookName, startChapter: 1, endChapter: 1 }];
  }

  return parseChapterVerse(bookName, remainder);
}

/**
 * Split a reference string into the book name portion and the chapter:verse remainder.
 * Handles numbered books like "1 Samuel", "2 Kings", "3 John", etc.
 */
function splitBookAndRef(input: string): { bookMeta: BookMeta | undefined; remainder: string } {
  // Strategy: try progressively shorter prefixes until we find a known book name.
  // This handles "1 Samuel 3:1-10" (book = "1 Samuel", remainder = "3:1-10")
  // and "Genesis 1" (book = "Genesis", remainder = "1")

  const words = input.split(/\s+/);

  // Try from longest prefix down to 1 word
  for (let i = words.length; i >= 1; i--) {
    const candidate = words.slice(0, i).join(' ');
    const book = findBook(candidate);
    if (book) {
      const remainder = words.slice(i).join(' ').trim();
      return { bookMeta: book, remainder };
    }
  }

  return { bookMeta: undefined, remainder: '' };
}

/**
 * Parse the chapter:verse portion of a reference.
 */
function parseChapterVerse(bookName: string, ref: string): ReadingRef[] {
  // Remove any trailing period or whitespace
  ref = ref.replace(/\.$/, '').trim();

  // Case 1: "3:1-10" — single chapter with verse range
  const singleChapterRange = ref.match(/^(\d+):(\d+)-(\d+)$/);
  if (singleChapterRange) {
    const chapter = parseInt(singleChapterRange[1]!, 10);
    return [{
      book: bookName,
      startChapter: chapter,
      startVerse: parseInt(singleChapterRange[2]!, 10),
      endChapter: chapter,
      endVerse: parseInt(singleChapterRange[3]!, 10),
    }];
  }

  // Case 2: "1:20-2:4" — cross-chapter range
  const crossChapterRange = ref.match(/^(\d+):(\d+)-(\d+):(\d+)$/);
  if (crossChapterRange) {
    return [{
      book: bookName,
      startChapter: parseInt(crossChapterRange[1]!, 10),
      startVerse: parseInt(crossChapterRange[2]!, 10),
      endChapter: parseInt(crossChapterRange[3]!, 10),
      endVerse: parseInt(crossChapterRange[4]!, 10),
    }];
  }

  // Case 2b: "1:21-2:1-7" — malformed cross-chapter (extra :1), means 1:21-2:7
  const malformedCross = ref.match(/^(\d+):(\d+)-(\d+):\d+-(\d+)$/);
  if (malformedCross) {
    return [{
      book: bookName,
      startChapter: parseInt(malformedCross[1]!, 10),
      startVerse: parseInt(malformedCross[2]!, 10),
      endChapter: parseInt(malformedCross[3]!, 10),
      endVerse: parseInt(malformedCross[4]!, 10),
    }];
  }

  // Case 2c: "4-5:1" — chapter range where end has a verse
  const chapterToChapterVerse = ref.match(/^(\d+)-(\d+):(\d+)$/);
  if (chapterToChapterVerse) {
    return [{
      book: bookName,
      startChapter: parseInt(chapterToChapterVerse[1]!, 10),
      endChapter: parseInt(chapterToChapterVerse[2]!, 10),
      endVerse: parseInt(chapterToChapterVerse[3]!, 10),
    }];
  }

  // Case 3: "3:18" — single verse or from verse to end of chapter
  const singleVerse = ref.match(/^(\d+):(\d+)$/);
  if (singleVerse) {
    const chapter = parseInt(singleVerse[1]!, 10);
    return [{
      book: bookName,
      startChapter: chapter,
      startVerse: parseInt(singleVerse[2]!, 10),
      endChapter: chapter,
      // endVerse undefined = to end of chapter
    }];
  }

  // Case 4: "1-3" — chapter range (whole chapters)
  const chapterRange = ref.match(/^(\d+)-(\d+)$/);
  if (chapterRange) {
    return [{
      book: bookName,
      startChapter: parseInt(chapterRange[1]!, 10),
      endChapter: parseInt(chapterRange[2]!, 10),
    }];
  }

  // Case 5: "3" — single whole chapter
  const singleChapter = ref.match(/^(\d+)$/);
  if (singleChapter) {
    const chapter = parseInt(singleChapter[1]!, 10);
    return [{
      book: bookName,
      startChapter: chapter,
      endChapter: chapter,
    }];
  }

  throw new Error(`Cannot parse chapter/verse reference: "${ref}" (book: ${bookName})`);
}

/**
 * Format a ReadingRef back to a human-readable string.
 */
export function formatReadingRef(ref: ReadingRef): string {
  if (ref.startChapter === ref.endChapter) {
    if (ref.startVerse == null && ref.endVerse == null) {
      return `${ref.book} ${ref.startChapter}`;
    }
    if (ref.startVerse != null && ref.endVerse != null) {
      return `${ref.book} ${ref.startChapter}:${ref.startVerse}-${ref.endVerse}`;
    }
    if (ref.startVerse != null) {
      return `${ref.book} ${ref.startChapter}:${ref.startVerse}`;
    }
  }

  if (ref.startVerse == null && ref.endVerse == null) {
    return `${ref.book} ${ref.startChapter}-${ref.endChapter}`;
  }

  const start = ref.startVerse != null
    ? `${ref.startChapter}:${ref.startVerse}`
    : `${ref.startChapter}`;
  const end = ref.endVerse != null
    ? `${ref.endChapter}:${ref.endVerse}`
    : `${ref.endChapter}`;

  return `${ref.book} ${start}-${end}`;
}
