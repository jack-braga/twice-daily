/**
 * Runtime book registry for the 66-book Protestant canon.
 * Derived from scripts/shared/book-names.ts BOOK_METADATA.
 * Chapter counts are static and never change.
 */

export interface RuntimeBook {
  id: string;           // slug: "genesis", "1-samuel"
  name: string;         // display: "Genesis", "1 Samuel"
  shortName: string;    // "Gen", "1 Sam"
  testament: 'OT' | 'NT';
  order: number;        // 1–66 canonical order
  chapters: number;     // total chapter count
}

export const CANON_BOOKS: RuntimeBook[] = [
  // Old Testament
  { id: 'genesis', name: 'Genesis', shortName: 'Gen', testament: 'OT', order: 1, chapters: 50 },
  { id: 'exodus', name: 'Exodus', shortName: 'Exod', testament: 'OT', order: 2, chapters: 40 },
  { id: 'leviticus', name: 'Leviticus', shortName: 'Lev', testament: 'OT', order: 3, chapters: 27 },
  { id: 'numbers', name: 'Numbers', shortName: 'Num', testament: 'OT', order: 4, chapters: 36 },
  { id: 'deuteronomy', name: 'Deuteronomy', shortName: 'Deut', testament: 'OT', order: 5, chapters: 34 },
  { id: 'joshua', name: 'Joshua', shortName: 'Josh', testament: 'OT', order: 6, chapters: 24 },
  { id: 'judges', name: 'Judges', shortName: 'Judg', testament: 'OT', order: 7, chapters: 21 },
  { id: 'ruth', name: 'Ruth', shortName: 'Ruth', testament: 'OT', order: 8, chapters: 4 },
  { id: '1-samuel', name: '1 Samuel', shortName: '1 Sam', testament: 'OT', order: 9, chapters: 31 },
  { id: '2-samuel', name: '2 Samuel', shortName: '2 Sam', testament: 'OT', order: 10, chapters: 24 },
  { id: '1-kings', name: '1 Kings', shortName: '1 Kgs', testament: 'OT', order: 11, chapters: 22 },
  { id: '2-kings', name: '2 Kings', shortName: '2 Kgs', testament: 'OT', order: 12, chapters: 25 },
  { id: '1-chronicles', name: '1 Chronicles', shortName: '1 Chr', testament: 'OT', order: 13, chapters: 29 },
  { id: '2-chronicles', name: '2 Chronicles', shortName: '2 Chr', testament: 'OT', order: 14, chapters: 36 },
  { id: 'ezra', name: 'Ezra', shortName: 'Ezra', testament: 'OT', order: 15, chapters: 10 },
  { id: 'nehemiah', name: 'Nehemiah', shortName: 'Neh', testament: 'OT', order: 16, chapters: 13 },
  { id: 'esther', name: 'Esther', shortName: 'Esth', testament: 'OT', order: 17, chapters: 10 },
  { id: 'job', name: 'Job', shortName: 'Job', testament: 'OT', order: 18, chapters: 42 },
  { id: 'psalms', name: 'Psalms', shortName: 'Ps', testament: 'OT', order: 19, chapters: 150 },
  { id: 'proverbs', name: 'Proverbs', shortName: 'Prov', testament: 'OT', order: 20, chapters: 31 },
  { id: 'ecclesiastes', name: 'Ecclesiastes', shortName: 'Eccles', testament: 'OT', order: 21, chapters: 12 },
  { id: 'song-of-solomon', name: 'Song of Solomon', shortName: 'Song', testament: 'OT', order: 22, chapters: 8 },
  { id: 'isaiah', name: 'Isaiah', shortName: 'Isa', testament: 'OT', order: 23, chapters: 66 },
  { id: 'jeremiah', name: 'Jeremiah', shortName: 'Jer', testament: 'OT', order: 24, chapters: 52 },
  { id: 'lamentations', name: 'Lamentations', shortName: 'Lam', testament: 'OT', order: 25, chapters: 5 },
  { id: 'ezekiel', name: 'Ezekiel', shortName: 'Ezek', testament: 'OT', order: 26, chapters: 48 },
  { id: 'daniel', name: 'Daniel', shortName: 'Dan', testament: 'OT', order: 27, chapters: 12 },
  { id: 'hosea', name: 'Hosea', shortName: 'Hos', testament: 'OT', order: 28, chapters: 14 },
  { id: 'joel', name: 'Joel', shortName: 'Joel', testament: 'OT', order: 29, chapters: 3 },
  { id: 'amos', name: 'Amos', shortName: 'Amos', testament: 'OT', order: 30, chapters: 9 },
  { id: 'obadiah', name: 'Obadiah', shortName: 'Obad', testament: 'OT', order: 31, chapters: 1 },
  { id: 'jonah', name: 'Jonah', shortName: 'Jonah', testament: 'OT', order: 32, chapters: 4 },
  { id: 'micah', name: 'Micah', shortName: 'Mic', testament: 'OT', order: 33, chapters: 7 },
  { id: 'nahum', name: 'Nahum', shortName: 'Nah', testament: 'OT', order: 34, chapters: 3 },
  { id: 'habakkuk', name: 'Habakkuk', shortName: 'Hab', testament: 'OT', order: 35, chapters: 3 },
  { id: 'zephaniah', name: 'Zephaniah', shortName: 'Zeph', testament: 'OT', order: 36, chapters: 3 },
  { id: 'haggai', name: 'Haggai', shortName: 'Hag', testament: 'OT', order: 37, chapters: 2 },
  { id: 'zechariah', name: 'Zechariah', shortName: 'Zech', testament: 'OT', order: 38, chapters: 14 },
  { id: 'malachi', name: 'Malachi', shortName: 'Mal', testament: 'OT', order: 39, chapters: 4 },

  // New Testament
  { id: 'matthew', name: 'Matthew', shortName: 'Matt', testament: 'NT', order: 40, chapters: 28 },
  { id: 'mark', name: 'Mark', shortName: 'Mark', testament: 'NT', order: 41, chapters: 16 },
  { id: 'luke', name: 'Luke', shortName: 'Luke', testament: 'NT', order: 42, chapters: 24 },
  { id: 'john', name: 'John', shortName: 'John', testament: 'NT', order: 43, chapters: 21 },
  { id: 'acts', name: 'Acts', shortName: 'Acts', testament: 'NT', order: 44, chapters: 28 },
  { id: 'romans', name: 'Romans', shortName: 'Rom', testament: 'NT', order: 45, chapters: 16 },
  { id: '1-corinthians', name: '1 Corinthians', shortName: '1 Cor', testament: 'NT', order: 46, chapters: 16 },
  { id: '2-corinthians', name: '2 Corinthians', shortName: '2 Cor', testament: 'NT', order: 47, chapters: 13 },
  { id: 'galatians', name: 'Galatians', shortName: 'Gal', testament: 'NT', order: 48, chapters: 6 },
  { id: 'ephesians', name: 'Ephesians', shortName: 'Eph', testament: 'NT', order: 49, chapters: 6 },
  { id: 'philippians', name: 'Philippians', shortName: 'Phil', testament: 'NT', order: 50, chapters: 4 },
  { id: 'colossians', name: 'Colossians', shortName: 'Col', testament: 'NT', order: 51, chapters: 4 },
  { id: '1-thessalonians', name: '1 Thessalonians', shortName: '1 Thess', testament: 'NT', order: 52, chapters: 5 },
  { id: '2-thessalonians', name: '2 Thessalonians', shortName: '2 Thess', testament: 'NT', order: 53, chapters: 3 },
  { id: '1-timothy', name: '1 Timothy', shortName: '1 Tim', testament: 'NT', order: 54, chapters: 6 },
  { id: '2-timothy', name: '2 Timothy', shortName: '2 Tim', testament: 'NT', order: 55, chapters: 4 },
  { id: 'titus', name: 'Titus', shortName: 'Titus', testament: 'NT', order: 56, chapters: 3 },
  { id: 'philemon', name: 'Philemon', shortName: 'Phlm', testament: 'NT', order: 57, chapters: 1 },
  { id: 'hebrews', name: 'Hebrews', shortName: 'Heb', testament: 'NT', order: 58, chapters: 13 },
  { id: 'james', name: 'James', shortName: 'Jas', testament: 'NT', order: 59, chapters: 5 },
  { id: '1-peter', name: '1 Peter', shortName: '1 Pet', testament: 'NT', order: 60, chapters: 5 },
  { id: '2-peter', name: '2 Peter', shortName: '2 Pet', testament: 'NT', order: 61, chapters: 3 },
  { id: '1-john', name: '1 John', shortName: '1 John', testament: 'NT', order: 62, chapters: 5 },
  { id: '2-john', name: '2 John', shortName: '2 John', testament: 'NT', order: 63, chapters: 1 },
  { id: '3-john', name: '3 John', shortName: '3 John', testament: 'NT', order: 64, chapters: 1 },
  { id: 'jude', name: 'Jude', shortName: 'Jude', testament: 'NT', order: 65, chapters: 1 },
  { id: 'revelation', name: 'Revelation', shortName: 'Rev', testament: 'NT', order: 66, chapters: 22 },
];

/** Find a book by display name (e.g. "Genesis", "1 Samuel") */
export function findCanonBook(name: string): RuntimeBook | undefined {
  return CANON_BOOKS.find(b => b.name === name);
}
