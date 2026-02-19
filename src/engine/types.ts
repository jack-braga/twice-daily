// ============================================================
// Liturgical Calendar Types
// ============================================================

export type Session = 'morning' | 'evening';

export type LiturgicalSeason =
  | 'advent'
  | 'christmas'
  | 'epiphany'
  | 'pre-lent'
  | 'lent'
  | 'holy-week'
  | 'easter'
  | 'ascension'
  | 'whitsun'
  | 'trinity';

export type HolyDayRank = 'principal' | 'major' | 'minor';

export interface LiturgicalDay {
  date: Date;
  season: LiturgicalSeason;
  weekOfSeason: number;
  dayOfWeek: number; // 0 = Sunday ... 6 = Saturday
  name: string; // "Third Sunday after Trinity", "Tuesday in Advent 2"
  isHolyDay: boolean;
  holyDayName?: string;
  holyDayRank?: HolyDayRank;
  collectId: string; // key into the collects lookup
  isSunday: boolean;
  psalmsDay: number; // 1–30 for the psalter cycle
}

export interface MoveableFeasts {
  septuagesima: Date;
  sexagesima: Date;
  quinquagesima: Date;
  ashWednesday: Date;
  palmSunday: Date;
  goodFriday: Date;
  easterDay: Date;
  easterMonday: Date;
  ascensionDay: Date;
  whitsunday: Date;
  whitMonday: Date;
  trinitySunday: Date;
  adventSunday: Date;
  christmasDay: Date;
  epiphany: Date;
}

// ============================================================
// Bible / Reading Types
// ============================================================

export interface ReadingRef {
  book: string; // Canonical display name: "Genesis", "1 Samuel", "Psalms"
  startChapter: number;
  startVerse?: number; // undefined = from start of chapter
  endChapter: number;
  endVerse?: number; // undefined = to end of chapter
}

export interface BibleVerse {
  verse: number;
  text: string;
  poetry?: number; // indentation level (1, 2) for poetry lines
}

export interface BibleChapter {
  chapter: number;
  superscription?: string; // Psalm superscriptions ("A Psalm of David")
  verses: BibleVerse[];
}

export interface BibleBook {
  id: string; // slug: "genesis", "1-samuel", "psalms"
  name: string; // display: "Genesis", "1 Samuel", "Psalms"
  shortName: string; // "Gen", "1 Sam", "Ps"
  chapters: BibleChapter[];
}

export type Translation = 'kjv' | 'web-usa' | 'web-brit';

// ============================================================
// Psalter Types
// ============================================================

export interface PsalterDay {
  day: number; // 1–30
  morning: number[]; // psalm numbers
  evening: number[];
}

// ============================================================
// Lectionary Types
// ============================================================

export type PlanId = '1662-original' | '1662-revised' | 'mcheyne';

export interface DailyReadings {
  first: ReadingRef[]; // OT readings (may have alternates)
  second: ReadingRef[]; // NT readings (may have alternates)
}

// ============================================================
// Liturgy / Renderable Types
// ============================================================

export type SectionContentType =
  | 'rubric'
  | 'static-text'
  | 'scripture'
  | 'versicle-response'
  | 'heading';

export type SectionContent =
  | { type: 'rubric'; text: string }
  | { type: 'static-text'; text: string }
  | { type: 'scripture'; reference: ReadingRef; verses: BibleVerse[] }
  | { type: 'versicle-response'; leader: string; people: string }
  | { type: 'heading'; text: string };

export interface SessionSection {
  id: string;
  title: string;
  subtitle?: string; // e.g., "Isaiah 40" or "Psalms 23–25"
  content: SectionContent[];
  isCheckable: boolean;
}

export interface DailySession {
  id: string;
  title: string; // "Morning Prayer", "Family Readings"
  timeOfDay: Session | 'any';
  sections: SessionSection[];
}

export interface DailyPlan {
  date: string; // ISO date
  planId: PlanId;
  season?: LiturgicalSeason;
  liturgicalDay?: LiturgicalDay;
  sessions: DailySession[];
}
