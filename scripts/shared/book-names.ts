/**
 * Canonical book metadata registry.
 * Maps between KJV filenames, USFM codes, display names, abbreviations, and slug IDs.
 * Covers all 66 books of the Protestant canon.
 */

export interface BookMeta {
  id: string;              // slug: "genesis", "1-samuel"
  name: string;            // display: "Genesis", "1 Samuel"
  shortName: string;       // "Gen", "1 Sam"
  kjvFileName: string;     // KJV repo filename without .json: "Genesis", "1Samuel"
  usfmCode: string;        // USFM 3-letter code: "GEN", "1SA"
  usfmFileNum: string;     // USFM file number prefix: "02", "10"
  testament: 'OT' | 'NT';
  order: number;           // 1-66 canonical order
  abbreviations: string[]; // common abbreviations found in lectionaries
}

export const BOOK_METADATA: BookMeta[] = [
  // Old Testament
  { id: 'genesis', name: 'Genesis', shortName: 'Gen', kjvFileName: 'Genesis', usfmCode: 'GEN', usfmFileNum: '02', testament: 'OT', order: 1, abbreviations: ['Gen', 'Gen.', 'Ge'] },
  { id: 'exodus', name: 'Exodus', shortName: 'Exod', kjvFileName: 'Exodus', usfmCode: 'EXO', usfmFileNum: '03', testament: 'OT', order: 2, abbreviations: ['Exod', 'Exod.', 'Ex', 'Ex.', 'Exo'] },
  { id: 'leviticus', name: 'Leviticus', shortName: 'Lev', kjvFileName: 'Leviticus', usfmCode: 'LEV', usfmFileNum: '04', testament: 'OT', order: 3, abbreviations: ['Lev', 'Lev.', 'Le'] },
  { id: 'numbers', name: 'Numbers', shortName: 'Num', kjvFileName: 'Numbers', usfmCode: 'NUM', usfmFileNum: '05', testament: 'OT', order: 4, abbreviations: ['Num', 'Num.', 'Numb', 'Numb.', 'Nu'] },
  { id: 'deuteronomy', name: 'Deuteronomy', shortName: 'Deut', kjvFileName: 'Deuteronomy', usfmCode: 'DEU', usfmFileNum: '06', testament: 'OT', order: 5, abbreviations: ['Deut', 'Deut.', 'Deu', 'Dt', 'Deuter', 'Deuter.'] },
  { id: 'joshua', name: 'Joshua', shortName: 'Josh', kjvFileName: 'Joshua', usfmCode: 'JOS', usfmFileNum: '07', testament: 'OT', order: 6, abbreviations: ['Josh', 'Josh.', 'Jos'] },
  { id: 'judges', name: 'Judges', shortName: 'Judg', kjvFileName: 'Judges', usfmCode: 'JDG', usfmFileNum: '08', testament: 'OT', order: 7, abbreviations: ['Judg', 'Judg.', 'Jdg', 'Jg'] },
  { id: 'ruth', name: 'Ruth', shortName: 'Ruth', kjvFileName: 'Ruth', usfmCode: 'RUT', usfmFileNum: '09', testament: 'OT', order: 8, abbreviations: ['Ruth', 'Ru'] },
  { id: '1-samuel', name: '1 Samuel', shortName: '1 Sam', kjvFileName: '1Samuel', usfmCode: '1SA', usfmFileNum: '10', testament: 'OT', order: 9, abbreviations: ['1 Sam', '1 Sam.', '1 Sa', 'I Sam', 'I Sam.', '1Sam'] },
  { id: '2-samuel', name: '2 Samuel', shortName: '2 Sam', kjvFileName: '2Samuel', usfmCode: '2SA', usfmFileNum: '11', testament: 'OT', order: 10, abbreviations: ['2 Sam', '2 Sam.', '2 Sa', 'II Sam', 'II Sam.', '2Sam'] },
  { id: '1-kings', name: '1 Kings', shortName: '1 Kgs', kjvFileName: '1Kings', usfmCode: '1KI', usfmFileNum: '12', testament: 'OT', order: 11, abbreviations: ['1 Kings', '1 Kgs', '1 Kgs.', 'I Kings', 'I Kgs', '1Kings', '1 Ki'] },
  { id: '2-kings', name: '2 Kings', shortName: '2 Kgs', kjvFileName: '2Kings', usfmCode: '2KI', usfmFileNum: '13', testament: 'OT', order: 12, abbreviations: ['2 Kings', '2 Kgs', '2 Kgs.', 'II Kings', 'II Kgs', '2Kings', '2 Ki'] },
  { id: '1-chronicles', name: '1 Chronicles', shortName: '1 Chr', kjvFileName: '1Chronicles', usfmCode: '1CH', usfmFileNum: '14', testament: 'OT', order: 13, abbreviations: ['1 Chr', '1 Chr.', '1 Chron', '1 Chron.', 'I Chr', 'I Chron', '1Chr', '1Chron'] },
  { id: '2-chronicles', name: '2 Chronicles', shortName: '2 Chr', kjvFileName: '2Chronicles', usfmCode: '2CH', usfmFileNum: '15', testament: 'OT', order: 14, abbreviations: ['2 Chr', '2 Chr.', '2 Chron', '2 Chron.', 'II Chr', 'II Chron', '2Chr', '2Chron'] },
  { id: 'ezra', name: 'Ezra', shortName: 'Ezra', kjvFileName: 'Ezra', usfmCode: 'EZR', usfmFileNum: '16', testament: 'OT', order: 15, abbreviations: ['Ezra', 'Ezr'] },
  { id: 'nehemiah', name: 'Nehemiah', shortName: 'Neh', kjvFileName: 'Nehemiah', usfmCode: 'NEH', usfmFileNum: '17', testament: 'OT', order: 16, abbreviations: ['Neh', 'Neh.', 'Ne'] },
  { id: 'esther', name: 'Esther', shortName: 'Esth', kjvFileName: 'Esther', usfmCode: 'EST', usfmFileNum: '18', testament: 'OT', order: 17, abbreviations: ['Esth', 'Esth.', 'Est', 'Es'] },
  { id: 'job', name: 'Job', shortName: 'Job', kjvFileName: 'Job', usfmCode: 'JOB', usfmFileNum: '19', testament: 'OT', order: 18, abbreviations: ['Job', 'Jb'] },
  { id: 'psalms', name: 'Psalms', shortName: 'Ps', kjvFileName: 'Psalms', usfmCode: 'PSA', usfmFileNum: '20', testament: 'OT', order: 19, abbreviations: ['Ps', 'Ps.', 'Psa', 'Psa.', 'Psalm', 'Psalms'] },
  { id: 'proverbs', name: 'Proverbs', shortName: 'Prov', kjvFileName: 'Proverbs', usfmCode: 'PRO', usfmFileNum: '21', testament: 'OT', order: 20, abbreviations: ['Prov', 'Prov.', 'Pro', 'Pr'] },
  { id: 'ecclesiastes', name: 'Ecclesiastes', shortName: 'Eccles', kjvFileName: 'Ecclesiastes', usfmCode: 'ECC', usfmFileNum: '22', testament: 'OT', order: 21, abbreviations: ['Eccles', 'Eccles.', 'Eccl', 'Eccl.', 'Ecc', 'Ec'] },
  { id: 'song-of-solomon', name: 'Song of Solomon', shortName: 'Song', kjvFileName: 'SongofSolomon', usfmCode: 'SNG', usfmFileNum: '23', testament: 'OT', order: 22, abbreviations: ['Song', 'Song.', 'Cant', 'Cant.', 'Song of Sol', 'Song of Sol.', 'S of S', 'SS', 'Sol', 'Canticles'] },
  { id: 'isaiah', name: 'Isaiah', shortName: 'Isa', kjvFileName: 'Isaiah', usfmCode: 'ISA', usfmFileNum: '24', testament: 'OT', order: 23, abbreviations: ['Isa', 'Isa.', 'Is'] },
  { id: 'jeremiah', name: 'Jeremiah', shortName: 'Jer', kjvFileName: 'Jeremiah', usfmCode: 'JER', usfmFileNum: '25', testament: 'OT', order: 24, abbreviations: ['Jer', 'Jer.', 'Je'] },
  { id: 'lamentations', name: 'Lamentations', shortName: 'Lam', kjvFileName: 'Lamentations', usfmCode: 'LAM', usfmFileNum: '26', testament: 'OT', order: 25, abbreviations: ['Lam', 'Lam.', 'La'] },
  { id: 'ezekiel', name: 'Ezekiel', shortName: 'Ezek', kjvFileName: 'Ezekiel', usfmCode: 'EZK', usfmFileNum: '27', testament: 'OT', order: 26, abbreviations: ['Ezek', 'Ezek.', 'Eze', 'Ez'] },
  { id: 'daniel', name: 'Daniel', shortName: 'Dan', kjvFileName: 'Daniel', usfmCode: 'DAN', usfmFileNum: '28', testament: 'OT', order: 27, abbreviations: ['Dan', 'Dan.', 'Da'] },
  { id: 'hosea', name: 'Hosea', shortName: 'Hos', kjvFileName: 'Hosea', usfmCode: 'HOS', usfmFileNum: '29', testament: 'OT', order: 28, abbreviations: ['Hos', 'Hos.', 'Ho'] },
  { id: 'joel', name: 'Joel', shortName: 'Joel', kjvFileName: 'Joel', usfmCode: 'JOL', usfmFileNum: '30', testament: 'OT', order: 29, abbreviations: ['Joel', 'Jl'] },
  { id: 'amos', name: 'Amos', shortName: 'Amos', kjvFileName: 'Amos', usfmCode: 'AMO', usfmFileNum: '31', testament: 'OT', order: 30, abbreviations: ['Amos', 'Am'] },
  { id: 'obadiah', name: 'Obadiah', shortName: 'Obad', kjvFileName: 'Obadiah', usfmCode: 'OBA', usfmFileNum: '32', testament: 'OT', order: 31, abbreviations: ['Obad', 'Obad.', 'Ob'] },
  { id: 'jonah', name: 'Jonah', shortName: 'Jonah', kjvFileName: 'Jonah', usfmCode: 'JON', usfmFileNum: '33', testament: 'OT', order: 32, abbreviations: ['Jonah', 'Jon', 'Jon.'] },
  { id: 'micah', name: 'Micah', shortName: 'Mic', kjvFileName: 'Micah', usfmCode: 'MIC', usfmFileNum: '34', testament: 'OT', order: 33, abbreviations: ['Mic', 'Mic.', 'Mi'] },
  { id: 'nahum', name: 'Nahum', shortName: 'Nah', kjvFileName: 'Nahum', usfmCode: 'NAM', usfmFileNum: '35', testament: 'OT', order: 34, abbreviations: ['Nah', 'Nah.', 'Na'] },
  { id: 'habakkuk', name: 'Habakkuk', shortName: 'Hab', kjvFileName: 'Habakkuk', usfmCode: 'HAB', usfmFileNum: '36', testament: 'OT', order: 35, abbreviations: ['Hab', 'Hab.'] },
  { id: 'zephaniah', name: 'Zephaniah', shortName: 'Zeph', kjvFileName: 'Zephaniah', usfmCode: 'ZEP', usfmFileNum: '37', testament: 'OT', order: 36, abbreviations: ['Zeph', 'Zeph.', 'Zep'] },
  { id: 'haggai', name: 'Haggai', shortName: 'Hag', kjvFileName: 'Haggai', usfmCode: 'HAG', usfmFileNum: '38', testament: 'OT', order: 37, abbreviations: ['Hag', 'Hag.'] },
  { id: 'zechariah', name: 'Zechariah', shortName: 'Zech', kjvFileName: 'Zechariah', usfmCode: 'ZEC', usfmFileNum: '39', testament: 'OT', order: 38, abbreviations: ['Zech', 'Zech.', 'Zec'] },
  { id: 'malachi', name: 'Malachi', shortName: 'Mal', kjvFileName: 'Malachi', usfmCode: 'MAL', usfmFileNum: '40', testament: 'OT', order: 39, abbreviations: ['Mal', 'Mal.'] },

  // New Testament
  { id: 'matthew', name: 'Matthew', shortName: 'Matt', kjvFileName: 'Matthew', usfmCode: 'MAT', usfmFileNum: '41', testament: 'NT', order: 40, abbreviations: ['Matt', 'Matt.', 'Mat', 'Mat.', 'Mt'] },
  { id: 'mark', name: 'Mark', shortName: 'Mark', kjvFileName: 'Mark', usfmCode: 'MRK', usfmFileNum: '42', testament: 'NT', order: 41, abbreviations: ['Mark', 'Mk', 'Mr'] },
  { id: 'luke', name: 'Luke', shortName: 'Luke', kjvFileName: 'Luke', usfmCode: 'LUK', usfmFileNum: '43', testament: 'NT', order: 42, abbreviations: ['Luke', 'Lk', 'Lu'] },
  { id: 'john', name: 'John', shortName: 'John', kjvFileName: 'John', usfmCode: 'JHN', usfmFileNum: '44', testament: 'NT', order: 43, abbreviations: ['John', 'Jn', 'Joh'] },
  { id: 'acts', name: 'Acts', shortName: 'Acts', kjvFileName: 'Acts', usfmCode: 'ACT', usfmFileNum: '45', testament: 'NT', order: 44, abbreviations: ['Acts', 'Ac'] },
  { id: 'romans', name: 'Romans', shortName: 'Rom', kjvFileName: 'Romans', usfmCode: 'ROM', usfmFileNum: '46', testament: 'NT', order: 45, abbreviations: ['Rom', 'Rom.', 'Ro'] },
  { id: '1-corinthians', name: '1 Corinthians', shortName: '1 Cor', kjvFileName: '1Corinthians', usfmCode: '1CO', usfmFileNum: '47', testament: 'NT', order: 46, abbreviations: ['1 Cor', '1 Cor.', 'I Cor', 'I Cor.', '1Cor'] },
  { id: '2-corinthians', name: '2 Corinthians', shortName: '2 Cor', kjvFileName: '2Corinthians', usfmCode: '2CO', usfmFileNum: '48', testament: 'NT', order: 47, abbreviations: ['2 Cor', '2 Cor.', 'II Cor', 'II Cor.', '2Cor'] },
  { id: 'galatians', name: 'Galatians', shortName: 'Gal', kjvFileName: 'Galatians', usfmCode: 'GAL', usfmFileNum: '49', testament: 'NT', order: 48, abbreviations: ['Gal', 'Gal.', 'Ga'] },
  { id: 'ephesians', name: 'Ephesians', shortName: 'Eph', kjvFileName: 'Ephesians', usfmCode: 'EPH', usfmFileNum: '50', testament: 'NT', order: 49, abbreviations: ['Eph', 'Eph.', 'Ephes'] },
  { id: 'philippians', name: 'Philippians', shortName: 'Phil', kjvFileName: 'Philippians', usfmCode: 'PHP', usfmFileNum: '51', testament: 'NT', order: 50, abbreviations: ['Phil', 'Phil.', 'Php'] },
  { id: 'colossians', name: 'Colossians', shortName: 'Col', kjvFileName: 'Colossians', usfmCode: 'COL', usfmFileNum: '52', testament: 'NT', order: 51, abbreviations: ['Col', 'Col.'] },
  { id: '1-thessalonians', name: '1 Thessalonians', shortName: '1 Thess', kjvFileName: '1Thessalonians', usfmCode: '1TH', usfmFileNum: '53', testament: 'NT', order: 52, abbreviations: ['1 Thess', '1 Thess.', '1 Th', 'I Thess', 'I Thess.', '1Thess'] },
  { id: '2-thessalonians', name: '2 Thessalonians', shortName: '2 Thess', kjvFileName: '2Thessalonians', usfmCode: '2TH', usfmFileNum: '54', testament: 'NT', order: 53, abbreviations: ['2 Thess', '2 Thess.', '2 Th', 'II Thess', 'II Thess.', '2Thess'] },
  { id: '1-timothy', name: '1 Timothy', shortName: '1 Tim', kjvFileName: '1Timothy', usfmCode: '1TI', usfmFileNum: '55', testament: 'NT', order: 54, abbreviations: ['1 Tim', '1 Tim.', 'I Tim', 'I Tim.', '1Tim'] },
  { id: '2-timothy', name: '2 Timothy', shortName: '2 Tim', kjvFileName: '2Timothy', usfmCode: '2TI', usfmFileNum: '56', testament: 'NT', order: 55, abbreviations: ['2 Tim', '2 Tim.', 'II Tim', 'II Tim.', '2Tim'] },
  { id: 'titus', name: 'Titus', shortName: 'Titus', kjvFileName: 'Titus', usfmCode: 'TIT', usfmFileNum: '57', testament: 'NT', order: 56, abbreviations: ['Titus', 'Tit', 'Tit.'] },
  { id: 'philemon', name: 'Philemon', shortName: 'Phlm', kjvFileName: 'Philemon', usfmCode: 'PHM', usfmFileNum: '58', testament: 'NT', order: 57, abbreviations: ['Phlm', 'Phlm.', 'Philem', 'Philem.', 'Phm'] },
  { id: 'hebrews', name: 'Hebrews', shortName: 'Heb', kjvFileName: 'Hebrews', usfmCode: 'HEB', usfmFileNum: '59', testament: 'NT', order: 58, abbreviations: ['Heb', 'Heb.', 'He'] },
  { id: 'james', name: 'James', shortName: 'Jas', kjvFileName: 'James', usfmCode: 'JAS', usfmFileNum: '60', testament: 'NT', order: 59, abbreviations: ['Jas', 'Jas.', 'James', 'Jm'] },
  { id: '1-peter', name: '1 Peter', shortName: '1 Pet', kjvFileName: '1Peter', usfmCode: '1PE', usfmFileNum: '61', testament: 'NT', order: 60, abbreviations: ['1 Pet', '1 Pet.', 'I Pet', 'I Pet.', '1Pet', '1 Pe'] },
  { id: '2-peter', name: '2 Peter', shortName: '2 Pet', kjvFileName: '2Peter', usfmCode: '2PE', usfmFileNum: '62', testament: 'NT', order: 61, abbreviations: ['2 Pet', '2 Pet.', 'II Pet', 'II Pet.', '2Pet', '2 Pe'] },
  { id: '1-john', name: '1 John', shortName: '1 John', kjvFileName: '1John', usfmCode: '1JN', usfmFileNum: '63', testament: 'NT', order: 62, abbreviations: ['1 John', '1 Jn', 'I John', 'I Jn', '1John', '1Jn'] },
  { id: '2-john', name: '2 John', shortName: '2 John', kjvFileName: '2John', usfmCode: '2JN', usfmFileNum: '64', testament: 'NT', order: 63, abbreviations: ['2 John', '2 Jn', 'II John', 'II Jn', '2John', '2Jn'] },
  { id: '3-john', name: '3 John', shortName: '3 John', kjvFileName: '3John', usfmCode: '3JN', usfmFileNum: '65', testament: 'NT', order: 64, abbreviations: ['3 John', '3 Jn', 'III John', 'III Jn', '3John', '3Jn'] },
  { id: 'jude', name: 'Jude', shortName: 'Jude', kjvFileName: 'Jude', usfmCode: 'JUD', usfmFileNum: '66', testament: 'NT', order: 65, abbreviations: ['Jude', 'Jd'] },
  { id: 'revelation', name: 'Revelation', shortName: 'Rev', kjvFileName: 'Revelation', usfmCode: 'REV', usfmFileNum: '96', testament: 'NT', order: 66, abbreviations: ['Rev', 'Rev.', 'Re', 'Revelation', 'Apoc'] },

  // Apocryphal/Deuterocanonical books — referenced by the 1662 BCP lectionary
  // We can parse these references but don't have the text in our Protestant canon translations.
  // These are flagged during validation.
  { id: 'wisdom', name: 'Wisdom', shortName: 'Wis', kjvFileName: '', usfmCode: 'WIS', usfmFileNum: '', testament: 'OT', order: 100, abbreviations: ['Wisdom', 'Wis', 'Wis.', 'Wisd'] },
  { id: 'ecclesiasticus', name: 'Ecclesiasticus', shortName: 'Ecclus', kjvFileName: '', usfmCode: 'SIR', usfmFileNum: '', testament: 'OT', order: 101, abbreviations: ['Ecclus', 'Ecclus.', 'Ecclesiasticus', 'Sirach', 'Sir', 'Sir.', 'Ecclus.'] },
  { id: 'baruch', name: 'Baruch', shortName: 'Bar', kjvFileName: '', usfmCode: 'BAR', usfmFileNum: '', testament: 'OT', order: 102, abbreviations: ['Baruch', 'Bar', 'Bar.'] },
  { id: 'tobit', name: 'Tobit', shortName: 'Tob', kjvFileName: '', usfmCode: 'TOB', usfmFileNum: '', testament: 'OT', order: 103, abbreviations: ['Tobit', 'Tob', 'Tob.'] },
  { id: '1-maccabees', name: '1 Maccabees', shortName: '1 Macc', kjvFileName: '', usfmCode: '1MA', usfmFileNum: '', testament: 'OT', order: 104, abbreviations: ['1 Macc', '1 Macc.', 'I Macc', 'I Macc.', '1Macc', '1 Mac', '1 Mac.'] },
  { id: '2-maccabees', name: '2 Maccabees', shortName: '2 Macc', kjvFileName: '', usfmCode: '2MA', usfmFileNum: '', testament: 'OT', order: 105, abbreviations: ['2 Macc', '2 Macc.', 'II Macc', 'II Macc.', '2Macc', '2 Mac', '2 Mac.'] },
  { id: 'prayer-of-manasses', name: 'Prayer of Manasses', shortName: 'Pr Man', kjvFileName: '', usfmCode: 'MAN', usfmFileNum: '', testament: 'OT', order: 106, abbreviations: ['Prayer of Manasses', 'Pr Man', 'Pr. Man.', 'Prayer of Manasseh'] },
  { id: 'song-of-three-children', name: 'Song of Three Children', shortName: 'Song 3 Ch', kjvFileName: '', usfmCode: 'S3Y', usfmFileNum: '', testament: 'OT', order: 107, abbreviations: ['Song of Three Children', 'Song of the Three Children', 'Song of ThreeChildren', 'Song Three Children'] },
];

// Build lookup indices
const byKjvFileName = new Map<string, BookMeta>();
const byUsfmCode = new Map<string, BookMeta>();
const byId = new Map<string, BookMeta>();
const byAbbreviation = new Map<string, BookMeta>();
const byFullName = new Map<string, BookMeta>();

for (const book of BOOK_METADATA) {
  byKjvFileName.set(book.kjvFileName.toLowerCase(), book);
  byUsfmCode.set(book.usfmCode.toUpperCase(), book);
  byId.set(book.id, book);
  byFullName.set(book.name.toLowerCase(), book);
  for (const abbr of book.abbreviations) {
    byAbbreviation.set(abbr.toLowerCase(), book);
  }
}

export function findBookByKjvFileName(name: string): BookMeta | undefined {
  return byKjvFileName.get(name.toLowerCase());
}

export function findBookByUsfmCode(code: string): BookMeta | undefined {
  return byUsfmCode.get(code.toUpperCase());
}

export function findBookById(id: string): BookMeta | undefined {
  return byId.get(id);
}

/**
 * Find a book by any name or abbreviation.
 * Tries: full name → abbreviation → KJV filename.
 * Case-insensitive.
 */
export function findBook(nameOrAbbr: string): BookMeta | undefined {
  const lower = nameOrAbbr.trim().toLowerCase();
  return byFullName.get(lower) ??
    byAbbreviation.get(lower) ??
    byKjvFileName.get(lower) ??
    byUsfmCode.get(lower.toUpperCase());
}
