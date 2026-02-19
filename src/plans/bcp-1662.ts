/**
 * BCP 1662 Plan (shared between Original and Revised lectionaries)
 *
 * Assembles the full Morning / Evening Prayer structure:
 *   1. Preparation (opening sentence, exhortation, confession, absolution)
 *   2. Psalms (Venite for morning + appointed psalms from 30-day cycle)
 *   3. First Lesson (OT from lectionary)
 *   4. Canticle 1 (Te Deum / Benedicite for morning; Magnificat / Cantate Domino for evening)
 *   5. Second Lesson (NT from lectionary)
 *   6. Canticle 2 (Benedictus / Jubilate for morning; Nunc Dimittis / Deus Misereatur for evening)
 *   7. The Creed
 *   8. The Prayers (Lord's Prayer, versicles, suffrages, collects, state prayers, grace)
 *
 * Special rules:
 *   - Lent: Te Deum → Benedicite
 *   - Day 19 morning: omit Venite (Ps 95 is in the ordinary psalms)
 *   - Easter Day: Easter Anthems replace Venite
 *   - Day 12 evening: Deus Misereatur omitted as alternative (Ps 67 is in ordinary course)
 *   - Day 19 evening: Cantate Domino omitted as alternative (Ps 98 is in ordinary course)
 */

import type { PlanAssembler, PlanConfig } from './types';
import type {
  SessionSection, Session, LiturgicalDay, Translation,
  SectionContent, ReadingRef, PlanId,
} from '../engine/types';
import { resolveReadings } from '../engine/lectionary-resolver';
import { loadReading, formatRef } from '../services/bible-loader';
import { getPsalmsForDay, shouldOmitVenite, PSALM_119_DIVISIONS } from '../engine/psalter';

// ─── Apocrypha ──────────────────────────────────────────────────────────

const APOCRYPHAL_BOOKS = new Set([
  'Ecclesiasticus', 'Wisdom', 'Tobit', 'Baruch',
  '1 Maccabees', '2 Maccabees', 'Prayer of Manasses',
  'Song of Three Children', 'Judith', 'Susanna',
  'Bel and the Dragon', '2 Esdras', '1 Esdras',
]);

// ─── Bible verse references for dynamic loading ─────────────────────────

/** Opening Sentences — 11 sentences, each with one or two Bible refs.
 *  The BCP says "some one or more of these Sentences of the Scriptures." */
const OPENING_SENTENCES: { refs: ReadingRef[] }[] = [
  { refs: [{ book: 'Ezekiel', startChapter: 18, startVerse: 27, endChapter: 18, endVerse: 27 }] },
  { refs: [{ book: 'Psalms', startChapter: 51, startVerse: 3, endChapter: 51, endVerse: 3 }] },
  { refs: [{ book: 'Psalms', startChapter: 51, startVerse: 9, endChapter: 51, endVerse: 9 }] },
  { refs: [{ book: 'Psalms', startChapter: 51, startVerse: 17, endChapter: 51, endVerse: 17 }] },
  { refs: [{ book: 'Joel', startChapter: 2, startVerse: 13, endChapter: 2, endVerse: 13 }] },
  { refs: [{ book: 'Daniel', startChapter: 9, startVerse: 9, endChapter: 9, endVerse: 10 }] },
  { refs: [
    { book: 'Jeremiah', startChapter: 10, startVerse: 24, endChapter: 10, endVerse: 24 },
    { book: 'Psalms', startChapter: 6, startVerse: 1, endChapter: 6, endVerse: 1 },
  ] },
  { refs: [{ book: 'Matthew', startChapter: 3, startVerse: 2, endChapter: 3, endVerse: 2 }] },
  { refs: [{ book: 'Luke', startChapter: 15, startVerse: 18, endChapter: 15, endVerse: 19 }] },
  { refs: [{ book: 'Psalms', startChapter: 143, startVerse: 2, endChapter: 143, endVerse: 2 }] },
  { refs: [{ book: '1 John', startChapter: 1, startVerse: 8, endChapter: 1, endVerse: 9 }] },
];

/** The Grace — 2 Corinthians 13:14 */
const GRACE_REF: ReadingRef = {
  book: '2 Corinthians', startChapter: 13, startVerse: 14, endChapter: 13, endVerse: 14,
};

/** Easter Anthems — compiled from three passages */
const EASTER_ANTHEM_REFS: ReadingRef[] = [
  { book: '1 Corinthians', startChapter: 5, startVerse: 7, endChapter: 5, endVerse: 8 },
  { book: 'Romans', startChapter: 6, startVerse: 9, endChapter: 6, endVerse: 11 },
  { book: '1 Corinthians', startChapter: 15, startVerse: 20, endChapter: 15, endVerse: 22 },
];

// ─── Cached liturgy data ────────────────────────────────────────────────

interface LiturgyPiece {
  type: 'rubric' | 'text' | 'versicle' | 'heading';
  content: string;
  speaker?: string;
}

interface LiturgySection {
  id: string;
  title: string;
  pieces: LiturgyPiece[];
}

interface CollectEntry {
  id: string;
  occasion: string;
  collect: string;
}

let morningPrayer: LiturgySection[] | null = null;
let eveningPrayer: LiturgySection[] | null = null;
let collects: CollectEntry[] | null = null;

async function loadLiturgyData(): Promise<void> {
  if (!morningPrayer) {
    const resp = await fetch(`${import.meta.env.BASE_URL}data/liturgy/morning-prayer.json`);
    morningPrayer = await resp.json();
  }
  if (!eveningPrayer) {
    const resp = await fetch(`${import.meta.env.BASE_URL}data/liturgy/evening-prayer.json`);
    eveningPrayer = await resp.json();
  }
  if (!collects) {
    const resp = await fetch(`${import.meta.env.BASE_URL}data/liturgy/collects.json`);
    collects = await resp.json();
  }
}

function getLiturgySection(session: Session, sectionId: string): LiturgySection | undefined {
  const data = session === 'morning' ? morningPrayer : eveningPrayer;
  return data?.find(s => s.id === sectionId);
}

// ─── Piece → SectionContent conversion ─────────────────────────────────

function pieceToContent(piece: LiturgyPiece): SectionContent {
  switch (piece.type) {
    case 'rubric':
      return { type: 'rubric', text: piece.content };
    case 'heading':
      return { type: 'heading', text: piece.content };
    case 'versicle':
      if (piece.speaker) {
        return { type: 'versicle-response', leader: piece.speaker, people: piece.content };
      }
      return { type: 'static-text', text: piece.content };
    case 'text':
    default:
      return { type: 'static-text', text: piece.content };
  }
}

function sectionPiecesToContent(pieces: LiturgyPiece[]): SectionContent[] {
  return pieces.map(pieceToContent);
}

// ─── Section builders ───────────────────────────────────────────────────

/**
 * Pick an opening sentence. The BCP says "some one or more of these Sentences."
 * We rotate through the 11 sentences based on the day of the year,
 * so the user sees a different sentence each day.
 */
function pickOpeningSentenceIndex(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / 86_400_000);
  return dayOfYear % 11; // 11 opening sentences available
}

async function buildPreparation(session: Session, date: Date, translation: Translation): Promise<SessionSection> {
  const content: SectionContent[] = [];

  // Opening sentences — rotate daily, loaded from selected Bible translation
  const opening = getLiturgySection(session, 'opening-sentences');
  if (opening) {
    const rubric = opening.pieces.find(p => p.type === 'rubric');
    if (rubric) content.push(pieceToContent(rubric));

    const idx = pickOpeningSentenceIndex(date);
    const sentence = OPENING_SENTENCES[idx % OPENING_SENTENCES.length]!;
    const refLabels: string[] = [];
    for (const ref of sentence.refs) {
      const result = await loadReading(translation, ref);
      if (result && result.verses.length > 0) {
        content.push({ type: 'scripture', reference: ref, verses: result.verses });
      }
      refLabels.push(formatRef(ref));
    }
    if (refLabels.length > 0) {
      content.push({ type: 'rubric', text: refLabels.join('; ') });
    }
  }

  // Exhortation
  const exhort = getLiturgySection(session, 'exhortation');
  if (exhort) {
    content.push({ type: 'heading', text: 'Exhortation' });
    content.push(...sectionPiecesToContent(exhort.pieces));
  }

  // General Confession
  const confession = getLiturgySection(session, 'general-confession');
  if (confession) {
    content.push({ type: 'heading', text: 'A General Confession' });
    content.push(...sectionPiecesToContent(confession.pieces));
  }

  // Absolution
  const absolution = getLiturgySection(session, 'absolution');
  if (absolution) {
    content.push({ type: 'heading', text: 'The Absolution' });
    content.push(...sectionPiecesToContent(absolution.pieces));
  }

  // Lord's Prayer
  const lp = getLiturgySection(session, 'lords-prayer');
  if (lp) {
    content.push({ type: 'heading', text: "The Lord's Prayer" });
    content.push(...sectionPiecesToContent(lp.pieces));
  }

  // Versicles & Responses
  const versicles = getLiturgySection(session, 'versicles');
  if (versicles) {
    content.push(...sectionPiecesToContent(versicles.pieces));
  }

  return {
    id: 'preparation',
    title: 'Preparation',
    content,
    isCheckable: true,
  };
}

async function buildPsalms(
  date: Date,
  session: Session,
  litDay: LiturgicalDay,
  translation: Translation,
): Promise<SessionSection> {
  const content: SectionContent[] = [];
  const psalmNumbers = getPsalmsForDay(date, session);

  // Venite (morning only, unless Day 19 or Easter Day)
  if (session === 'morning') {
    const isEaster = litDay.holyDayName === 'Easter Day';
    const omitVenite = shouldOmitVenite(date);

    if (isEaster) {
      // Easter Anthems replace Venite — loaded from selected Bible translation
      content.push({ type: 'heading', text: 'Easter Anthems' });
      content.push({ type: 'rubric', text: 'On Easter Day, instead of the Psalm O come, let us sing, etc. these Anthems shall be sung or said.' });
      for (const ref of EASTER_ANTHEM_REFS) {
        const result = await loadReading(translation, ref);
        if (result && result.verses.length > 0) {
          content.push({ type: 'scripture', reference: ref, verses: result.verses });
          content.push({ type: 'rubric', text: formatRef(ref) });
        }
      }
      content.push({ type: 'static-text', text:
        'Glory be to the Father, and to the Son : and to the Holy Ghost;\n' +
        'As it was in the beginning, is now, and ever shall be : world without end. Amen.'
      });
    } else if (!omitVenite) {
      const venite = getLiturgySection(session, 'venite');
      if (venite) {
        content.push({ type: 'heading', text: 'Venite, exultemus Domino. Psalm 95' });
        for (const piece of venite.pieces) {
          if (piece.type !== 'rubric') {
            content.push(pieceToContent(piece));
          }
        }
      }
    }
  }

  // Appointed Psalms
  const psalterDay = litDay.psalmsDay;
  const subtitleParts: string[] = [];

  for (const psNum of psalmNumbers) {
    // Check for Psalm 119 divisions
    if (psNum === 119) {
      const divisionKey = `${psalterDay}-${session}`;
      const division = PSALM_119_DIVISIONS[divisionKey];
      if (division) {
        const ref: ReadingRef = {
          book: 'Psalms',
          startChapter: 119,
          startVerse: division.startVerse,
          endChapter: 119,
          endVerse: division.endVerse,
        };
        subtitleParts.push(`119:${division.startVerse}-${division.endVerse}`);
        const result = await loadReading(translation, ref);
        if (result) {
          content.push({ type: 'heading', text: `Psalm 119:${division.startVerse}-${division.endVerse}` });
          if (result.superscription) {
            content.push({ type: 'rubric', text: result.superscription });
          }
          content.push({ type: 'scripture', reference: ref, verses: result.verses });
          content.push({ type: 'static-text', text: 'Glory be to the Father, and to the Son : and to the Holy Ghost;\nAs it was in the beginning, is now, and ever shall be : world without end. Amen.' });
        }
        continue;
      }
    }

    subtitleParts.push(String(psNum));
    const ref: ReadingRef = {
      book: 'Psalms',
      startChapter: psNum,
      endChapter: psNum,
    };
    const result = await loadReading(translation, ref);
    if (result) {
      content.push({ type: 'heading', text: `Psalm ${psNum}` });
      if (result.superscription) {
        content.push({ type: 'rubric', text: result.superscription });
      }
      content.push({ type: 'scripture', reference: ref, verses: result.verses });
      content.push({ type: 'static-text', text: 'Glory be to the Father, and to the Son : and to the Holy Ghost;\nAs it was in the beginning, is now, and ever shall be : world without end. Amen.' });
    }
  }

  const subtitle = subtitleParts.length > 0
    ? `Psalms ${subtitleParts.join(', ')}`
    : 'Psalms';

  return {
    id: 'psalms',
    title: session === 'morning' ? 'Psalms' : 'Psalms',
    subtitle,
    content,
    isCheckable: true,
  };
}

async function buildLesson(
  refs: ReadingRef[],
  lessonNum: 1 | 2,
  session: Session,
  translation: Translation,
): Promise<SessionSection> {
  const content: SectionContent[] = [];
  const refLabels: string[] = [];

  // Add the rubric from the liturgy
  const rubricSection = getLiturgySection(session, lessonNum === 1 ? 'first-lesson' : 'second-lesson');
  if (rubricSection && rubricSection.pieces.length > 0) {
    content.push(pieceToContent(rubricSection.pieces[0]!));
  }

  for (const ref of refs) {
    const label = formatRef(ref);
    refLabels.push(label);

    if (APOCRYPHAL_BOOKS.has(ref.book)) {
      content.push({ type: 'rubric', text: `${label} (Apocrypha — reference only)` });
    } else {
      const result = await loadReading(translation, ref);
      if (result && result.verses.length > 0) {
        content.push({ type: 'scripture', reference: ref, verses: result.verses });
      } else {
        content.push({ type: 'rubric', text: `${label} — text not available` });
      }
    }
  }

  const title = lessonNum === 1 ? 'The First Lesson' : 'The Second Lesson';
  const subtitle = refLabels.join('; ');

  return {
    id: lessonNum === 1 ? 'first-lesson' : 'second-lesson',
    title,
    subtitle,
    content,
    isCheckable: true,
  };
}

function buildCanticle1(session: Session, litDay: LiturgicalDay): SessionSection {
  const content: SectionContent[] = [];
  const section = getLiturgySection(session, 'canticle-1');
  if (!section) return { id: 'canticle-1', title: 'Canticle', content: [], isCheckable: true };

  if (session === 'morning') {
    // Te Deum (pieces[0] = rubric, pieces[1] = Te Deum text)
    // Benedicite (pieces[2] = rubric, pieces[3] = Benedicite text)
    // During Lent: use Benedicite instead of Te Deum
    const isLent = litDay.season === 'lent' || litDay.season === 'holy-week';

    if (isLent && section.pieces.length >= 4) {
      content.push({ type: 'heading', text: 'Benedicite, omnia opera Domini' });
      content.push(pieceToContent(section.pieces[3]!));
    } else if (section.pieces.length >= 2) {
      content.push({ type: 'heading', text: 'Te Deum Laudamus' });
      content.push(pieceToContent(section.pieces[1]!));
    }
  } else {
    // Evening: Magnificat (pieces[0]) or Cantate Domino (pieces[2])
    // Day 19 evening: Cantate Domino (Ps 98) is omitted as alternative since Ps 98 is in ordinary course
    if (section.pieces.length >= 1) {
      content.push({ type: 'heading', text: 'Magnificat' });
      content.push(pieceToContent(section.pieces[0]!));
    }
  }

  const title = session === 'morning'
    ? (litDay.season === 'lent' || litDay.season === 'holy-week' ? 'Benedicite' : 'Te Deum')
    : 'Magnificat';

  return {
    id: 'canticle-1',
    title,
    content,
    isCheckable: true,
  };
}

function buildCanticle2(session: Session): SessionSection {
  const content: SectionContent[] = [];
  const section = getLiturgySection(session, 'canticle-2');
  if (!section) return { id: 'canticle-2', title: 'Canticle', content: [], isCheckable: true };

  if (session === 'morning') {
    // Benedictus (pieces[0]) or Jubilate (pieces[2])
    if (section.pieces.length >= 1) {
      content.push({ type: 'heading', text: 'Benedictus' });
      content.push(pieceToContent(section.pieces[0]!));
    }
  } else {
    // Nunc Dimittis (pieces[0]) or Deus Misereatur (pieces[2])
    if (section.pieces.length >= 1) {
      content.push({ type: 'heading', text: 'Nunc Dimittis' });
      content.push(pieceToContent(section.pieces[0]!));
    }
  }

  const title = session === 'morning' ? 'Benedictus' : 'Nunc Dimittis';

  return {
    id: 'canticle-2',
    title,
    content,
    isCheckable: true,
  };
}

function buildCreed(session: Session): SessionSection {
  const section = getLiturgySection(session, 'apostles-creed');
  const content: SectionContent[] = [];

  if (section) {
    content.push({ type: 'heading', text: "The Apostles' Creed" });
    content.push(...sectionPiecesToContent(section.pieces));
  }

  return {
    id: 'creed',
    title: "The Apostles' Creed",
    content,
    isCheckable: true,
  };
}

async function buildPrayers(session: Session, litDay: LiturgicalDay, translation: Translation): Promise<SessionSection> {
  const content: SectionContent[] = [];

  // Prayers introduction (The Lord be with you / Let us pray / Kyrie)
  const intro = getLiturgySection(session, 'prayers-intro');
  if (intro) {
    content.push(...sectionPiecesToContent(intro.pieces));
  }

  // Lord's Prayer (second occurrence)
  const lp2 = getLiturgySection(session, 'lords-prayer-2');
  if (lp2) {
    content.push({ type: 'heading', text: "The Lord's Prayer" });
    content.push(...sectionPiecesToContent(lp2.pieces));
  }

  // Suffrages (versicle-response pairs)
  const suffrages = getLiturgySection(session, 'suffrages');
  if (suffrages) {
    content.push(...sectionPiecesToContent(suffrages.pieces));
  }

  // Collect of the Day — look up from collects.json by collectId
  content.push({ type: 'heading', text: 'The Collect of the Day' });
  const collectText = findCollect(litDay.collectId);
  if (collectText) {
    content.push({ type: 'static-text', text: collectText });
  } else {
    content.push({ type: 'rubric', text: `Collect for ${litDay.name}` });
  }

  // Second Collect (for Peace)
  const peace = getLiturgySection(session, 'collect-peace');
  if (peace) {
    content.push({ type: 'heading', text: 'The Second Collect, for Peace' });
    content.push(...sectionPiecesToContent(peace.pieces));
  }

  // Third Collect (Grace for morning, Aid against perils for evening)
  const thirdCollectId = session === 'morning' ? 'collect-grace' : 'collect-aid';
  const third = getLiturgySection(session, thirdCollectId);
  if (third) {
    const thirdTitle = session === 'morning'
      ? 'The Third Collect, for Grace'
      : 'The Third Collect, for Aid against all Perils';
    content.push({ type: 'heading', text: thirdTitle });
    content.push(...sectionPiecesToContent(third.pieces));
  }

  // State Prayers
  const state = getLiturgySection(session, 'state-prayers');
  if (state) {
    content.push({ type: 'heading', text: 'Prayers for the Sovereign and Church' });
    content.push(...sectionPiecesToContent(state.pieces));
  }

  // The Grace — 2 Corinthians 13:14, loaded from selected Bible translation
  content.push({ type: 'heading', text: 'The Grace' });
  const graceResult = await loadReading(translation, GRACE_REF);
  if (graceResult && graceResult.verses.length > 0) {
    content.push({ type: 'scripture', reference: GRACE_REF, verses: graceResult.verses });
    content.push({ type: 'rubric', text: formatRef(GRACE_REF) });
  }

  return {
    id: 'prayers',
    title: 'The Prayers',
    content,
    isCheckable: true,
  };
}

// ─── Collect lookup ─────────────────────────────────────────────────────

/** Map collectId → collect text. Built lazily from the collects JSON. */
let collectMap: Map<string, string> | null = null;

/**
 * Build a mapping from liturgical collect IDs to collect texts.
 * The collects.json uses auto-generated IDs from the occasion text, so we
 * need to match them to our liturgical calendar's collectId values.
 */
function buildCollectMap(): Map<string, string> {
  if (collectMap) return collectMap;
  collectMap = new Map();
  if (!collects) return collectMap;

  // Map common occasion strings to our collectId values
  const occasionToId: Record<string, string> = {
    'The Nativity of our Lord': 'christmas',
    'Christmas-Day': 'christmas',
    'Saint Stephen': 'st-stephen',
    'Saint John the Evangelist': 'st-john-evangelist',
    'The Innocents': 'holy-innocents',
    'The Circumcision': 'circumcision',
    'The Epiphany': 'epiphany',
    'First Sunday after the Epiphany': 'epiphany-1',
    'Second Sunday after the Epiphany': 'epiphany-2',
    'Third Sunday after the Epiphany': 'epiphany-3',
    'Fourth Sunday after the Epiphany': 'epiphany-4',
    'Fifth Sunday after the Epiphany': 'epiphany-5',
    'Sixth Sunday after the Epiphany': 'epiphany-6',
    'Septuagesima': 'pre-lent-1',
    'Sexagesima': 'pre-lent-2',
    'Quinquagesima': 'pre-lent-3',
    'Ash-Wednesday': 'ash-wednesday',
    'First Sunday in Lent': 'lent-1',
    'Second Sunday in Lent': 'lent-2',
    'Third Sunday in Lent': 'lent-3',
    'Fourth Sunday in Lent': 'lent-4',
    'Fifth Sunday in Lent': 'lent-5',
    'Sunday next before Easter': 'palm-sunday',
    'Good Friday': 'good-friday',
    'Easter Even': 'easter-even',
    'Easter Day': 'easter-day',
    'Monday in Easter Week': 'easter-monday',
    'Tuesday in Easter Week': 'easter-tuesday',
    'First Sunday after Easter': 'easter-1',
    'Second Sunday after Easter': 'easter-2',
    'Third Sunday after Easter': 'easter-3',
    'Fourth Sunday after Easter': 'easter-4',
    'Fifth Sunday after Easter': 'easter-5',
    'Ascension Day': 'ascension-day',
    'Sunday after Ascension Day': 'ascension-1',
    'Whit-Sunday': 'whitsunday',
    'Whitsunday': 'whitsunday',
    'Monday in Whitsun Week': 'whitsun-monday',
    'Tuesday in Whitsun Week': 'whitsun-tuesday',
    'Trinity Sunday': 'trinity-sunday',
    'Conversion of Saint Paul': 'conversion-st-paul',
    'Purification': 'purification',
    'Saint Matthias': 'st-matthias',
    'Annunciation': 'annunciation',
    'Saint Mark': 'st-mark',
    'Saint Philip and Saint James': 'ss-philip-james',
    'Saint Barnabas': 'st-barnabas',
    'Saint John Baptist': 'nativity-john-baptist',
    'Saint Peter': 'st-peter',
    'Saint James': 'st-james',
    'Saint Bartholomew': 'st-bartholomew',
    'Saint Matthew': 'st-matthew',
    'Saint Michael': 'michaelmas',
    'Michaelmas': 'michaelmas',
    'Saint Luke': 'st-luke',
    'Saint Simon and Saint Jude': 'ss-simon-jude',
    'All Saints': 'all-saints',
    'Saint Andrew': 'st-andrew',
    'Saint Thomas': 'st-thomas',
  };

  // Add Trinity Sundays 1-25
  for (let i = 1; i <= 25; i++) {
    const ordinal = getOrdinal(i);
    occasionToId[`${ordinal} Sunday after Trinity`] = `trinity-${i}`;
  }

  // Add Advent Sundays 1-4
  const adventOrdinals = ['First', 'Second', 'Third', 'Fourth'];
  for (let i = 0; i < 4; i++) {
    occasionToId[`${adventOrdinals[i]} Sunday in Advent`] = `advent-${i + 1}`;
  }

  for (const entry of collects) {
    // Try matching the occasion text against our known mappings
    const occ = entry.occasion;
    for (const [pattern, id] of Object.entries(occasionToId)) {
      if (occ.includes(pattern) && occ.includes('Collect')) {
        collectMap!.set(id, entry.collect);
        break;
      }
    }
  }

  return collectMap;
}

function getOrdinal(n: number): string {
  const ordinals = [
    '', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh',
    'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth',
    'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth',
    'Nineteenth', 'Twentieth', 'Twenty-first', 'Twenty-second',
    'Twenty-third', 'Twenty-fourth', 'Twenty-fifth',
  ];
  return ordinals[n] ?? `${n}th`;
}

function findCollect(collectId: string): string | undefined {
  const map = buildCollectMap();
  return map.get(collectId);
}

// ─── BCP Plan Factory ───────────────────────────────────────────────────

function createBcpPlan(planId: PlanId, config: PlanConfig): PlanAssembler {
  return {
    config,
    async assembleSections(
      date: Date,
      session: Session,
      litDay: LiturgicalDay,
      translation: Translation,
    ): Promise<SessionSection[]> {
      await loadLiturgyData();

      // Resolve lectionary readings
      const readings = await resolveReadings(date, session, planId, litDay);

      // Build all 8 sections
      const sections: SessionSection[] = [];

      // 1. Preparation
      sections.push(await buildPreparation(session, date, translation));

      // 2. Psalms
      sections.push(await buildPsalms(date, session, litDay, translation));

      // 3. First Lesson (OT)
      sections.push(await buildLesson(readings.first, 1, session, translation));

      // 4. Canticle 1
      sections.push(buildCanticle1(session, litDay));

      // 5. Second Lesson (NT)
      sections.push(await buildLesson(readings.second, 2, session, translation));

      // 6. Canticle 2
      sections.push(buildCanticle2(session));

      // 7. Creed
      sections.push(buildCreed(session));

      // 8. Prayers
      sections.push(await buildPrayers(session, litDay, translation));

      return sections;
    },
  };
}

// ─── Exports ────────────────────────────────────────────────────────────

export const bcp1662OriginalPlan = createBcpPlan('1662-original', {
  id: '1662-original',
  name: '1662 Original',
  description: 'The original 1662 BCP lectionary — civil calendar readings.',
  hasPsalter: true,
  hasLiturgy: true,
});

export const bcp1662RevisedPlan = createBcpPlan('1662-revised', {
  id: '1662-revised',
  name: '1662 Revised (1922)',
  description: 'The 1922 revised lectionary — liturgical calendar readings.',
  hasPsalter: true,
  hasLiturgy: true,
});
