/**
 * 1922 Revised Lectionary Parser
 *
 * Parses the 10 HTML pages scraped from eskimo.com that contain the
 * 1922 Revised Tables of Lessons for the Church of England.
 *
 * Regular pages (advent–trinity4): 5-column table (Day, MP1, MP2, EP1, EP2)
 * Fixed holy days (fixed.html): 4-column table (Day, 1st Evensong, Mattins, 2nd Evensong)
 *
 * The BibleGateway URL "search=" parameter is used as the primary source
 * for reading references. Apocryphal references link to eskimo.com's
 * apocrypha pages and are parsed from anchor text instead.
 *
 * Output: public/data/lectionary/1662-revised.json
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseReadingRef, type ReadingRef } from './shared/reading-ref-parser';
import { findBook } from './shared/book-names';

const RAW_DIR = path.resolve(import.meta.dirname, 'data', '1922-raw');
const OUTPUT_DIR = path.resolve(import.meta.dirname, '..', 'public', 'data', 'lectionary');

const REGULAR_PAGES = [
  'advent.html', 'xmas.html', 'epiphany.html', 'lent.html', 'easter.html',
  'trinity1.html', 'trinity2.html', 'trinity3.html', 'trinity4.html',
];

interface LectionaryReading {
  primary: ReadingRef[];
  alternative?: ReadingRef[];
}

interface RegularDayEntry {
  key: string;
  dayLabel: string;
  morning: { first: LectionaryReading; second: LectionaryReading };
  evening: { first: LectionaryReading; second: LectionaryReading };
}

interface FixedDayEntry {
  key: string;
  name: string;
  date: string;
  firstEvensong: { first: ReadingRef[]; second: ReadingRef[] };
  mattins: { first: ReadingRef[]; second: ReadingRef[] };
  secondEvensong: { first: ReadingRef[]; second: ReadingRef[] };
}

/**
 * Normalize a reference string before parsing.
 */
function normalizeRef(ref: string): string {
  let r = ref.trim();

  // Fix missing space between book and chapter: "Philippians1" → "Philippians 1"
  r = r.replace(/^([A-Za-z]{2,})(\d)/, (_, book: string, digit: string) => {
    if (findBook(book)) return `${book} ${digit}`;
    return `${book}${digit}`;
  });

  // Fix abbreviation glued to chapter: "Ecclus.2:10" → "Ecclus. 2:10"
  r = r.replace(/^([A-Za-z]+)\.(\d)/, '$1. $2');

  // Fix "Acts:27" → "Acts 27"
  r = r.replace(/^([A-Za-z]+):(\d)/, '$1 $2');

  // Fix periods in chapter:verse refs: "11.13" → "11:13"
  r = r.replace(/(\d+)\.(\d+)/g, '$1:$2');

  // Fix trailing colons: "2 Corinthians 5:" → "2 Corinthians 5"
  r = r.replace(/:\s*$/, '');

  // Fix semicolons used for non-contiguous: "2:1; 12" → "2:1, 12"
  r = r.replace(/;\s*/g, ', ');

  return r;
}

/**
 * Extract reading reference from a BibleGateway URL search parameter.
 */
// Known typos in the eskimo.com source HTML
const SOURCE_CORRECTIONS: Record<string, string> = {
  'Ephesians 9:10': 'Ephesians 6:10',       // lent3-saturday ep2 — digit typo
  'Acts 12:1-214': 'Acts 12:1-24',           // easter2-thursday ep2 — digit transposition
  'Joshua 5:1-20': 'Joshua 5',              // trinity1 ep1 — endVerse exceeds chapter (15 vv)
};

function refFromUrl(url: string): string {
  const match = url.match(/search=([^&"]+)/);
  if (!match) return '';
  let ref = decodeURIComponent(match[1]!).replace(/\+/g, ' ');

  // Semicolons → commas for non-contiguous verses: "13:24-30;36-43" → "13:24-30, 36-43"
  ref = ref.replace(/%3B/gi, ', ');
  ref = ref.replace(/;/g, ', ');

  // Convert cross-chapter BG patterns BEFORE stripping 999:
  // "52:13-53:999" means "Isaiah 52:13 through end of chapter 53"
  // Convert to "&" form: "52:13 & 53" which the parser already handles
  ref = ref.replace(/(\d+):(\d+)-(\d+):999/g, '$1:$2 & $3');

  // Strip remaining "999" end markers globally (each part may have one)
  ref = ref.replace(/-999/g, '');
  ref = ref.replace(/:999/g, '');

  ref = normalizeRef(ref);

  // Apply known source corrections
  if (SOURCE_CORRECTIONS[ref]) {
    ref = SOURCE_CORRECTIONS[ref]!;
  }

  return ref;
}

/**
 * Try to parse a single reference string (no & or , splitting).
 * Uses contextBook for bare chapter:verse refs.
 */
function tryParseSingle(r: string, contextBook: string): { refs: ReadingRef[]; bookUsed: string } {
  r = r.trim();
  if (!r || r === '-') return { refs: [], bookUsed: contextBook };

  // Bare chapter:verse ref that needs a book prefix
  if (/^\d+([:-]\d+)*$/.test(r) && contextBook) {
    try {
      const parsed = parseReadingRef(`${contextBook} ${r}`);
      return { refs: parsed, bookUsed: contextBook };
    } catch {
      console.warn(`  WARN: Could not parse bare ref: "${r}" (book: ${contextBook})`);
      return { refs: [], bookUsed: contextBook };
    }
  }

  try {
    const parsed = parseReadingRef(r);
    const bookUsed = parsed.length > 0 ? parsed[0]!.book : contextBook;
    return { refs: parsed, bookUsed };
  } catch {
    console.warn(`  WARN: Could not parse ref: "${r}"`);
    return { refs: [], bookUsed: contextBook };
  }
}

/**
 * Parse a reference string that may contain "&" or "," separators.
 */
function tryParseRef(refStr: string, contextBook: string): { refs: ReadingRef[]; bookUsed: string } {
  let r = refStr.trim();
  if (!r || r === '-') return { refs: [], bookUsed: contextBook };

  // Handle "&" combined chapter continuations: "Isaiah 52:13 & 53"
  if (r.includes(' & ')) {
    const parts = r.split(' & ');
    const allRefs: ReadingRef[] = [];
    let currentBook = contextBook;
    for (const part of parts) {
      const result = tryParseSingle(part.trim(), currentBook);
      allRefs.push(...result.refs);
      currentBook = result.bookUsed;
    }
    return { refs: allRefs, bookUsed: currentBook };
  }

  // Handle comma-separated non-contiguous verses: "Genesis 19:1-3, 12-29"
  // Also handles "Daniel 7:9-10, 13-14" where bare numbers inherit chapter from previous ref
  if (r.includes(', ')) {
    const parts = r.split(', ');
    const allRefs: ReadingRef[] = [];
    let currentBook = contextBook;
    let lastChapter: number | undefined;
    let lastWasVerseLevel = false;

    for (const part of parts) {
      const trimmed = part.trim();

      // If this is a bare number/range (like "13-14" or "15") and the previous ref
      // was verse-level (like "7:9-10" or "2:5-11"), inherit the chapter
      if (/^\d+(-\d+)?$/.test(trimmed) && lastWasVerseLevel && lastChapter != null && currentBook) {
        const verseMatch = trimmed.match(/^(\d+)(?:-(\d+))?$/);
        if (verseMatch) {
          const startV = parseInt(verseMatch[1]!);
          const endV = verseMatch[2] ? parseInt(verseMatch[2]!) : undefined;
          allRefs.push({
            book: currentBook,
            startChapter: lastChapter,
            startVerse: startV,
            endChapter: lastChapter,
            endVerse: endV,
          });
          continue;
        }
      }

      const result = tryParseSingle(trimmed, currentBook);
      allRefs.push(...result.refs);
      currentBook = result.bookUsed;

      // Track the last ref's chapter and whether it was verse-level
      if (result.refs.length > 0) {
        const lastRef = result.refs[result.refs.length - 1]!;
        lastChapter = lastRef.startChapter;
        lastWasVerseLevel = lastRef.startVerse != null;
      }
    }
    return { refs: allRefs, bookUsed: currentBook };
  }

  return tryParseSingle(r, contextBook);
}

/**
 * Extract the reference from an anchor tag.
 */
function extractRefFromAnchor(href: string, rawText: string): string {
  // Replace BR tags with space, then strip remaining HTML tags (e.g., <WBR>)
  const text = rawText.replace(/<BR\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (href.includes('biblegateway.com')) {
    return refFromUrl(href);
  }
  // Apocryphal link — use anchor text, normalized
  return normalizeRef(text);
}

/**
 * Parse all anchors in a chunk of HTML, tracking book context.
 */
function parseAnchors(html: string, contextBook: string): { refs: ReadingRef[]; bookUsed: string } {
  const allRefs: ReadingRef[] = [];
  let currentBook = contextBook;

  const anchorRegex = /<A\s+HREF\s*=\s*"([^"]+)"[^>]*>([\s\S]*?)<\/A>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRegex.exec(html)) !== null) {
    const refStr = extractRefFromAnchor(m[1]!, m[2]!);
    if (refStr) {
      const result = tryParseRef(refStr, currentBook);
      allRefs.push(...result.refs);
      currentBook = result.bookUsed;
    }
  }

  return { refs: allRefs, bookUsed: currentBook };
}

/**
 * Parse a cell with "or" alternatives, tracking book context per column.
 */
function parseCell(cellHtml: string, columnBook: string): { reading: LectionaryReading; bookUsed: string } {
  const orParts = cellHtml.split(/<[Ii]>or<\/[Ii]>/);

  const primaryResult = parseAnchors(orParts[0]!, columnBook);
  let altRefs: ReadingRef[] | undefined;

  if (orParts.length > 1) {
    const altResult = parseAnchors(orParts[1]!, primaryResult.bookUsed);
    altRefs = altResult.refs.length > 0 ? altResult.refs : undefined;
  }

  return {
    reading: { primary: primaryResult.refs, alternative: altRefs },
    bookUsed: primaryResult.bookUsed,
  };
}

/**
 * Parse a fixed holy day cell with "1) ... 2) ..." format.
 */
function parseFixedCell(cellHtml: string): { first: ReadingRef[]; second: ReadingRef[] } {
  const parts = cellHtml.split(/2\)/);
  const firstResult = parts[0] ? parseAnchors(parts[0], '') : { refs: [], bookUsed: '' };
  const secondResult = parts[1] ? parseAnchors(parts[1], firstResult.bookUsed) : { refs: [], bookUsed: '' };
  return { first: firstResult.refs, second: secondResult.refs };
}

function extractRows(html: string): string[][] {
  const rows: string[][] = [];
  const trRegex = /<TR[^>]*>([\s\S]*?)<\/TR>/gi;
  let trMatch: RegExpExecArray | null;

  while ((trMatch = trRegex.exec(html)) !== null) {
    const rowContent = trMatch[1]!;
    if (/<TH/i.test(rowContent)) continue;
    if (/<TD[^>]*>\s*<HR>\s*<\/TD>/i.test(rowContent) && !/HREF/i.test(rowContent)) continue;

    const cells: string[] = [];
    const tdRegex = /<TD[^>]*>([\s\S]*?)<\/TD>/gi;
    let tdMatch: RegExpExecArray | null;
    while ((tdMatch = tdRegex.exec(rowContent)) !== null) {
      cells.push(tdMatch[1]!);
    }

    if (cells.length >= 4) rows.push(cells);
  }
  return rows;
}

function extractDayLabel(cellHtml: string): string {
  return cellHtml
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|&#160;|#160;/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractAnchorName(cellHtml: string): string | null {
  const match = cellHtml.match(/NAME\s*=\s*"([^"]+)"/i);
  return match ? match[1]! : null;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function parseRegularPage(filename: string): RegularDayEntry[] {
  const html = fs.readFileSync(path.join(RAW_DIR, filename), 'utf-8');
  const rows = extractRows(html);
  const entries: RegularDayEntry[] = [];

  let currentSectionKey = '';
  const colBooks = { mp1: '', mp2: '', ep1: '', ep2: '' };

  for (const cells of rows) {
    if (cells.length < 5) continue;

    const dayLabel = extractDayLabel(cells[0]!);
    const anchorName = extractAnchorName(cells[0]!);
    if (!dayLabel) continue;

    let key: string;
    if (anchorName) {
      currentSectionKey = slugify(anchorName);
      key = currentSectionKey;
    } else {
      key = `${currentSectionKey}-${slugify(dayLabel)}`;
    }

    const mp1 = parseCell(cells[1]!, colBooks.mp1);
    const mp2 = parseCell(cells[2]!, colBooks.mp2);
    const ep1 = parseCell(cells[3]!, colBooks.ep1);
    const ep2 = parseCell(cells[4]!, colBooks.ep2);

    colBooks.mp1 = mp1.bookUsed;
    colBooks.mp2 = mp2.bookUsed;
    colBooks.ep1 = ep1.bookUsed;
    colBooks.ep2 = ep2.bookUsed;

    entries.push({
      key, dayLabel,
      morning: { first: mp1.reading, second: mp2.reading },
      evening: { first: ep1.reading, second: ep2.reading },
    });
  }

  return entries;
}

function parseFixedPage(): FixedDayEntry[] {
  const html = fs.readFileSync(path.join(RAW_DIR, 'fixed.html'), 'utf-8');
  const rows = extractRows(html);
  const entries: FixedDayEntry[] = [];

  for (const cells of rows) {
    if (cells.length < 4) continue;
    const dayCell = cells[0]!;
    const name = extractDayLabel(dayCell);
    const anchorName = extractAnchorName(dayCell);
    if (!name || !anchorName) continue;

    const dateMatch = dayCell.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d+)/i);
    const date = dateMatch ? `${dateMatch[1]!.toLowerCase()}-${dateMatch[2]!}` : '';

    entries.push({
      key: slugify(anchorName), name, date,
      firstEvensong: parseFixedCell(cells[1]!),
      mattins: parseFixedCell(cells[2]!),
      secondEvensong: parseFixedCell(cells[3]!),
    });
  }

  return entries;
}

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let totalRegular = 0;
  let totalFixed = 0;
  let parseErrors = 0;

  const regularEntries: RegularDayEntry[] = [];
  for (const page of REGULAR_PAGES) {
    const entries = parseRegularPage(page);
    regularEntries.push(...entries);
    totalRegular += entries.length;
  }

  const fixedEntries = parseFixedPage();
  totalFixed = fixedEntries.length;

  for (const entry of regularEntries) {
    if (entry.morning.first.primary.length === 0) parseErrors++;
    if (entry.morning.second.primary.length === 0) parseErrors++;
    if (entry.evening.first.primary.length === 0) parseErrors++;
    if (entry.evening.second.primary.length === 0) parseErrors++;
  }
  for (const entry of fixedEntries) {
    if (entry.firstEvensong.first.length === 0) parseErrors++;
    if (entry.firstEvensong.second.length === 0) parseErrors++;
    if (entry.mattins.first.length === 0) parseErrors++;
    if (entry.mattins.second.length === 0) parseErrors++;
    if (entry.secondEvensong.first.length === 0) parseErrors++;
    if (entry.secondEvensong.second.length === 0) parseErrors++;
  }

  const output = {
    _meta: { source: '1922 Revised Tables of Lessons', regularDays: totalRegular, fixedHolyDays: totalFixed },
    regular: {} as Record<string, unknown>,
    fixed: {} as Record<string, unknown>,
  };

  for (const entry of regularEntries) {
    output.regular[entry.key] = {
      dayLabel: entry.dayLabel,
      morning: { first: entry.morning.first, second: entry.morning.second },
      evening: { first: entry.evening.first, second: entry.evening.second },
    };
  }

  for (const entry of fixedEntries) {
    output.fixed[entry.key] = {
      name: entry.name, date: entry.date,
      firstEvensong: entry.firstEvensong, mattins: entry.mattins, secondEvensong: entry.secondEvensong,
    };
  }

  const outputFile = path.join(OUTPUT_DIR, '1662-revised.json');
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 0));

  console.log(`1922 Revised: ${totalRegular} regular days, ${totalFixed} fixed holy days, ${parseErrors} parse errors`);
}

main();
