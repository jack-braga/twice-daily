/**
 * Bible Loader Service
 *
 * Fetches and caches Bible book JSON from /data/bible/{translation}/{bookId}.json.
 * Provides extractReading() to slice verses for a ReadingRef.
 */

import type { BibleBook, BibleVerse, ReadingRef, Translation } from '../engine/types';

// In-memory cache: translation → bookId → BibleBook
const cache = new Map<string, BibleBook>();

function cacheKey(translation: Translation, bookId: string): string {
  return `${translation}:${bookId}`;
}

/** Convert canonical book name to file slug: "1 Samuel" → "1-samuel" */
function bookNameToId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Load a Bible book JSON file.
 * Returns from cache if already loaded.
 */
export async function loadBook(translation: Translation, bookName: string): Promise<BibleBook | null> {
  const bookId = bookNameToId(bookName);
  const key = cacheKey(translation, bookId);

  const cached = cache.get(key);
  if (cached) return cached;

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/bible/${translation}/${bookId}.json`);
    if (!response.ok) return null;

    const book: BibleBook = await response.json();
    cache.set(key, book);
    return book;
  } catch {
    return null;
  }
}

/**
 * Extract verses for a ReadingRef from a loaded BibleBook.
 * Returns the verse array with proper start/end slicing.
 */
export function extractReading(book: BibleBook, ref: ReadingRef): BibleVerse[] {
  const verses: BibleVerse[] = [];

  for (let ch = ref.startChapter; ch <= ref.endChapter; ch++) {
    const chapter = book.chapters.find(c => c.chapter === ch);
    if (!chapter) continue;

    for (const v of chapter.verses) {
      // Apply start filter
      if (ch === ref.startChapter && ref.startVerse != null && v.verse < ref.startVerse) {
        continue;
      }
      // Apply end filter
      if (ch === ref.endChapter && ref.endVerse != null && v.verse > ref.endVerse) {
        continue;
      }
      verses.push(v);
    }
  }

  return verses;
}

/**
 * Load a book and extract verses for a reading ref in one call.
 */
export async function loadReading(
  translation: Translation,
  ref: ReadingRef,
): Promise<{ verses: BibleVerse[]; superscription?: string } | null> {
  const book = await loadBook(translation, ref.book);
  if (!book) return null;

  const verses = extractReading(book, ref);

  // Get superscription for Psalms (if this is a single-chapter psalm ref)
  let superscription: string | undefined;
  if (ref.book === 'Psalms' && ref.startChapter === ref.endChapter) {
    const chapter = book.chapters.find(c => c.chapter === ref.startChapter);
    superscription = chapter?.superscription;
  }

  return { verses, superscription };
}

/**
 * Format a ReadingRef as a human-readable string.
 */
export function formatRef(ref: ReadingRef): string {
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

/** Clear the in-memory cache (useful for testing). */
export function clearCache() {
  cache.clear();
}
