/**
 * Lectionary Resolver
 *
 * Resolves the daily readings for each plan:
 *   - 1662 Original: keyed by MM-DD in the civil calendar
 *   - 1662 Revised: keyed by liturgical day name (e.g., "advent1", "trinity-5-monday")
 *   - M'Cheyne: keyed by plan day (1-365), computed from anchor start date
 *   - BibleProject: keyed by plan day (1-358), computed from anchor start date
 *
 * Each returns a DailyReadings (first + second lesson) for morning and evening.
 */

import type { ReadingRef, Session, LiturgicalDay, PlanId, DailyReadings } from './types';

// ─── Cached lectionary data ────────────────────────────────────────────

let original1662: Record<string, {
  morning: { first: ReadingRef[]; second: ReadingRef[] };
  evening: { first: ReadingRef[]; second: ReadingRef[] };
}> | null = null;

let revised1662: {
  regular: Record<string, {
    dayLabel?: string;
    morning?: {
      first?: { primary?: ReadingRef[]; alternative?: ReadingRef[] };
      second?: { primary?: ReadingRef[]; alternative?: ReadingRef[] };
    };
    evening?: {
      first?: { primary?: ReadingRef[]; alternative?: ReadingRef[] };
      second?: { primary?: ReadingRef[]; alternative?: ReadingRef[] };
    };
  }>;
  fixed: Record<string, {
    dayLabel?: string;
    firstEvensong?: {
      first?: { primary?: ReadingRef[]; alternative?: ReadingRef[] };
      second?: { primary?: ReadingRef[]; alternative?: ReadingRef[] };
    };
    morning?: {
      first?: { primary?: ReadingRef[]; alternative?: ReadingRef[] };
      second?: { primary?: ReadingRef[]; alternative?: ReadingRef[] };
    };
    secondEvensong?: {
      first?: { primary?: ReadingRef[]; alternative?: ReadingRef[] };
      second?: { primary?: ReadingRef[]; alternative?: ReadingRef[] };
    };
  }>;
} | null = null;

let mcheyne: { day: number; morning: ReadingRef[]; evening: ReadingRef[] }[] | null = null;

let bibleproject: { day: number; section: string; reading: ReadingRef[]; psalm: ReadingRef }[] | null = null;

async function loadLectionary(planId: PlanId): Promise<void> {
  if (planId === '1662-original' && !original1662) {
    const resp = await fetch(`${import.meta.env.BASE_URL}data/lectionary/1662-original.json`);
    original1662 = await resp.json();
  } else if (planId === '1662-revised' && !revised1662) {
    const resp = await fetch(`${import.meta.env.BASE_URL}data/lectionary/1662-revised.json`);
    revised1662 = await resp.json();
  } else if (planId === 'mcheyne' && !mcheyne) {
    const resp = await fetch(`${import.meta.env.BASE_URL}data/lectionary/mcheyne.json`);
    mcheyne = await resp.json();
  } else if (planId === 'bibleproject' && !bibleproject) {
    const resp = await fetch(`${import.meta.env.BASE_URL}data/lectionary/bibleproject.json`);
    bibleproject = await resp.json();
  }
}

// ─── Day-of-year helper (fallback for M'Cheyne without anchor) ───────

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000) + 1;
}

// ─── 1662 Revised: liturgical key computation ──────────────────────────

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function computeRevisedKey(litDay: LiturgicalDay): string {
  const season = litDay.season;
  const week = litDay.weekOfSeason;
  const dow = litDay.dayOfWeek;

  // Special named days
  if (litDay.holyDayName) {
    const specialKeys: Record<string, string> = {
      'Easter Day': 'easterday',
      'Ascension Day': 'ascension',
      'Whitsunday': 'whitsunday',
      'Trinity Sunday': 'trinity-sunday',
      'Ash Wednesday': 'ashwednesday',
      'Good Friday': 'goodfriday',
      'Palm Sunday': 'palmsunday',
      'Christmas Day': 'christmas',
    };
    const key = specialKeys[litDay.holyDayName];
    if (key) return key;
  }

  let prefix: string;

  switch (season) {
    case 'advent':
      prefix = `advent${week}`;
      break;
    case 'christmas':
      prefix = `christmas${week}`;
      break;
    case 'epiphany':
      prefix = `epiphany${week}`;
      break;
    case 'pre-lent':
      if (week === 1) prefix = 'septuagesima';
      else if (week === 2) prefix = 'sexagesima';
      else prefix = 'quinquagesima';
      break;
    case 'lent':
      prefix = `lent${week}`;
      break;
    case 'holy-week':
      prefix = 'holyweek';
      break;
    case 'easter':
      prefix = `easter${week}`;
      break;
    case 'ascension':
      prefix = 'ascension';
      break;
    case 'whitsun':
      prefix = 'whitsun';
      break;
    case 'trinity':
      prefix = `trinity${week}`;
      break;
    default:
      prefix = `${season}${week}`;
  }

  if (dow === 0) {
    return prefix;
  }

  return `${prefix}-${DAY_NAMES[dow]}`;
}

// ─── Public API ────────────────────────────────────────────────────────

export async function resolveReadings(
  date: Date,
  session: Session,
  planId: PlanId,
  litDay?: LiturgicalDay,
  planDay?: number,
): Promise<DailyReadings> {
  await loadLectionary(planId);

  switch (planId) {
    case '1662-original':
      return resolve1662Original(date, session);
    case '1662-revised':
      return resolve1662Revised(date, session, litDay);
    case 'mcheyne':
      return resolveMcheyne(date, session, planDay);
    case 'bibleproject':
      return resolveBibleProject(planDay);
  }
}

function resolve1662Original(date: Date, session: Session): DailyReadings {
  if (!original1662) return { first: [], second: [] };

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const key = `${month}-${day}`;
  const entry = original1662[key];
  if (!entry) return { first: [], second: [] };

  const s = session === 'morning' ? entry.morning : entry.evening;
  return { first: s.first, second: s.second };
}

function resolve1662Revised(_date: Date, session: Session, litDay?: LiturgicalDay): DailyReadings {
  if (!revised1662 || !litDay) return { first: [], second: [] };

  const key = computeRevisedKey(litDay);
  const regular = revised1662.regular[key];

  if (regular) {
    const s = session === 'morning' ? regular.morning : regular.evening;
    if (s) {
      return {
        first: s.first?.primary ?? [],
        second: s.second?.primary ?? [],
      };
    }
  }

  // Try fixed holy days
  if (litDay.isHolyDay && litDay.holyDayName) {
    const fixedKey = litDay.collectId;
    const fixed = revised1662.fixed[fixedKey];
    if (fixed) {
      if (session === 'morning' && fixed.morning) {
        return {
          first: fixed.morning.first?.primary ?? [],
          second: fixed.morning.second?.primary ?? [],
        };
      }
      if (session === 'evening' && fixed.secondEvensong) {
        return {
          first: fixed.secondEvensong.first?.primary ?? [],
          second: fixed.secondEvensong.second?.primary ?? [],
        };
      }
    }
  }

  return { first: [], second: [] };
}

function resolveMcheyne(date: Date, session: Session, planDay?: number): DailyReadings {
  if (!mcheyne) return { first: [], second: [] };

  // Use planDay from anchor if available, otherwise fall back to dayOfYear
  let doy: number;
  if (planDay != null) {
    doy = planDay;
  } else {
    doy = dayOfYear(date);
    // Leap year Feb 29: use same readings as Feb 28
    const year = date.getFullYear();
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    if (isLeapYear && date.getMonth() === 1 && date.getDate() === 29) {
      doy = dayOfYear(new Date(year, 1, 28));
    }
    // After Feb 29 in a leap year, adjust day number back by 1
    if (isLeapYear && doy > 60) {
      doy--;
    }
  }

  // Clamp to 365
  doy = Math.min(doy, 365);

  const entry = mcheyne.find(d => d.day === doy);
  if (!entry) return { first: [], second: [] };

  const readings = session === 'morning' ? entry.morning : entry.evening;

  // M'Cheyne has 2 readings per session — map to first/second
  return {
    first: readings.length > 0 ? [readings[0]!] : [],
    second: readings.length > 1 ? [readings[1]!] : [],
  };
}

function resolveBibleProject(planDay?: number): DailyReadings {
  if (!bibleproject || planDay == null) return { first: [], second: [] };

  const entry = bibleproject.find(d => d.day === planDay);
  if (!entry) return { first: [], second: [] };

  return {
    first: entry.reading,
    second: [entry.psalm],
  };
}
