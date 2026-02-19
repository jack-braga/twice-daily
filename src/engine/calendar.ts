import type { LiturgicalDay, LiturgicalSeason, MoveableFeasts, HolyDayRank } from './types';
import { computeMoveableFeasts } from './easter';

// ============================================================
// Fixed Holy Days with Proper Lessons
// ============================================================

interface FixedHolyDay {
  month: number; // 0-indexed (0 = Jan)
  day: number;
  name: string;
  rank: HolyDayRank;
  collectId: string;
}

const FIXED_HOLY_DAYS: FixedHolyDay[] = [
  { month: 10, day: 30, name: 'St Andrew', rank: 'major', collectId: 'st-andrew' },
  { month: 11, day: 21, name: 'St Thomas', rank: 'minor', collectId: 'st-thomas' },
  { month: 11, day: 25, name: 'Christmas Day', rank: 'principal', collectId: 'christmas' },
  { month: 11, day: 26, name: 'St Stephen', rank: 'minor', collectId: 'st-stephen' },
  { month: 11, day: 27, name: 'St John the Evangelist', rank: 'minor', collectId: 'st-john-evangelist' },
  { month: 11, day: 28, name: 'Holy Innocents', rank: 'minor', collectId: 'holy-innocents' },
  { month: 0, day: 1, name: 'Circumcision', rank: 'principal', collectId: 'circumcision' },
  { month: 0, day: 6, name: 'Epiphany', rank: 'principal', collectId: 'epiphany' },
  { month: 0, day: 25, name: 'Conversion of St Paul', rank: 'major', collectId: 'conversion-st-paul' },
  { month: 1, day: 2, name: 'Purification', rank: 'major', collectId: 'purification' },
  { month: 1, day: 24, name: 'St Matthias', rank: 'minor', collectId: 'st-matthias' },
  { month: 2, day: 25, name: 'Annunciation', rank: 'major', collectId: 'annunciation' },
  { month: 3, day: 25, name: 'St Mark', rank: 'minor', collectId: 'st-mark' },
  { month: 4, day: 1, name: 'SS Philip & James', rank: 'minor', collectId: 'ss-philip-james' },
  { month: 5, day: 11, name: 'St Barnabas', rank: 'minor', collectId: 'st-barnabas' },
  { month: 5, day: 24, name: 'Nativity of St John the Baptist', rank: 'major', collectId: 'nativity-john-baptist' },
  { month: 5, day: 29, name: 'St Peter', rank: 'major', collectId: 'st-peter' },
  { month: 6, day: 25, name: 'St James', rank: 'minor', collectId: 'st-james' },
  { month: 7, day: 24, name: 'St Bartholomew', rank: 'minor', collectId: 'st-bartholomew' },
  { month: 8, day: 21, name: 'St Matthew', rank: 'minor', collectId: 'st-matthew' },
  { month: 8, day: 29, name: 'Michaelmas', rank: 'major', collectId: 'michaelmas' },
  { month: 9, day: 18, name: 'St Luke', rank: 'minor', collectId: 'st-luke' },
  { month: 9, day: 28, name: 'SS Simon & Jude', rank: 'minor', collectId: 'ss-simon-jude' },
  { month: 10, day: 1, name: 'All Saints\' Day', rank: 'major', collectId: 'all-saints' },
];

// ============================================================
// Date Helpers
// ============================================================

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86400000;
  const aUtc = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bUtc = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((bUtc - aUtc) / msPerDay);
}

function isDateInRange(date: Date, start: Date, end: Date): boolean {
  return daysBetween(start, date) >= 0 && daysBetween(date, end) >= 0;
}

/** Find the next Sunday on or after a date. */
function nextSundayOnOrAfter(date: Date): Date {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  if (dayOfWeek === 0) return d;
  d.setDate(d.getDate() + (7 - dayOfWeek));
  return d;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ============================================================
// Psalter Day Computation
// ============================================================

/**
 * Get the psalter day (1–30) for a given date.
 * - Day = date of month (1–31)
 * - Day 31 → use Day 30
 * - Last day of February → use Day 30 (psalter catches up)
 */
export function getPsalterDayNumber(date: Date): number {
  const dayOfMonth = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();

  // February: check if this is the last day
  if (month === 1) { // 0-indexed, so 1 = February
    const daysInFeb = new Date(year, 2, 0).getDate(); // 28 or 29
    if (dayOfMonth === daysInFeb) {
      return 30; // Last day of Feb uses Day 30
    }
  }

  return Math.min(dayOfMonth, 30);
}

// ============================================================
// Season Determination
// ============================================================

export function determineSeason(date: Date, feasts: MoveableFeasts): LiturgicalSeason {
  const year = date.getFullYear();

  // Holy Week: Palm Sunday through Holy Saturday (Easter - 1)
  const holySaturday = addDays(feasts.easterDay, -1);
  if (isDateInRange(date, feasts.palmSunday, holySaturday)) {
    return 'holy-week';
  }

  // Lent: Ash Wednesday through the day before Palm Sunday
  const dayBeforePalm = addDays(feasts.palmSunday, -1);
  if (isDateInRange(date, feasts.ashWednesday, dayBeforePalm)) {
    return 'lent';
  }

  // Pre-Lent: Septuagesima through Shrove Tuesday (Ash Wed - 1)
  const shroveTuesday = addDays(feasts.ashWednesday, -1);
  if (isDateInRange(date, feasts.septuagesima, shroveTuesday)) {
    return 'pre-lent';
  }

  // Easter: Easter Day through eve of Ascension (Easter + 38)
  const eveOfAscension = addDays(feasts.ascensionDay, -1);
  if (isDateInRange(date, feasts.easterDay, eveOfAscension)) {
    return 'easter';
  }

  // Ascensiontide: Ascension Day through eve of Whitsunday (Easter + 48)
  const eveOfWhitsun = addDays(feasts.whitsunday, -1);
  if (isDateInRange(date, feasts.ascensionDay, eveOfWhitsun)) {
    return 'ascension';
  }

  // Whitsun: Whitsunday through Trinity Saturday (Easter + 55)
  const trinitySaturday = addDays(feasts.trinitySunday, -1);
  if (isDateInRange(date, feasts.whitsunday, trinitySaturday)) {
    return 'whitsun';
  }

  // Trinity: Trinity Sunday through Saturday before Advent Sunday
  const satBeforeAdvent = addDays(feasts.adventSunday, -1);
  if (isDateInRange(date, feasts.trinitySunday, satBeforeAdvent)) {
    return 'trinity';
  }

  // Advent: Advent Sunday through Dec 24
  const dec24 = new Date(year, 11, 24);
  // Advent may start in current year or we might be in the Advent from a previous year's calculation
  // We need to check both current year's Advent and potentially previous year's for dates in January
  if (isDateInRange(date, feasts.adventSunday, dec24)) {
    return 'advent';
  }

  // Christmas: Dec 25 through Jan 5
  const christmasDay = new Date(year, 11, 25);
  const dec31 = new Date(year, 11, 31);
  if (isDateInRange(date, christmasDay, dec31)) {
    return 'christmas';
  }
  const jan1 = new Date(year, 0, 1);
  const jan5 = new Date(year, 0, 5);
  if (isDateInRange(date, jan1, jan5)) {
    return 'christmas';
  }

  // Epiphany: Jan 6 through the day before Septuagesima
  const dayBeforeSeptuagesima = addDays(feasts.septuagesima, -1);
  if (isDateInRange(date, feasts.epiphany, dayBeforeSeptuagesima)) {
    return 'epiphany';
  }

  // Fallback: should not reach here if all ranges are correct
  return 'trinity';
}

// ============================================================
// Week-of-Season Computation
// ============================================================

function computeWeekOfSeason(date: Date, season: LiturgicalSeason, feasts: MoveableFeasts): number {
  const diff = daysBetween;
  switch (season) {
    case 'advent': {
      const weeksFromAdvent = Math.floor(diff(feasts.adventSunday, date) / 7);
      return weeksFromAdvent + 1;
    }
    case 'epiphany': {
      const firstSundayAfterEpiphany = nextSundayOnOrAfter(addDays(feasts.epiphany, 1));
      if (daysBetween(date, firstSundayAfterEpiphany) > 0) return 0;
      const weeks = Math.floor(diff(firstSundayAfterEpiphany, date) / 7);
      return weeks + 1;
    }
    case 'lent': {
      const weeks = Math.floor(diff(feasts.ashWednesday, date) / 7);
      return weeks + 1;
    }
    case 'easter': {
      const weeks = Math.floor(diff(feasts.easterDay, date) / 7);
      return weeks + 1;
    }
    case 'trinity': {
      // "First Sunday after Trinity" is the Sunday AFTER Trinity Sunday
      // Trinity Sunday itself = week 0, first Sunday after = week 1
      const weeks = Math.floor(diff(feasts.trinitySunday, date) / 7);
      return weeks;
    }
    default:
      return 1;
  }
}

// ============================================================
// Liturgical Day Name
// ============================================================

function formatDayName(season: LiturgicalSeason, week: number, dayOfWeek: number): string {
  const seasonNames: Record<LiturgicalSeason, string> = {
    advent: 'Advent',
    christmas: 'Christmas',
    epiphany: 'Epiphany',
    'pre-lent': 'Pre-Lent',
    lent: 'Lent',
    'holy-week': 'Holy Week',
    easter: 'Easter',
    ascension: 'Ascensiontide',
    whitsun: 'Whitsun',
    trinity: 'Trinity',
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const ordinals = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh',
    'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth',
    'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth', 'Twentieth',
    'Twenty-first', 'Twenty-second', 'Twenty-third', 'Twenty-fourth', 'Twenty-fifth'];

  const seasonName = seasonNames[season];
  const ord = ordinals[week] ?? `${week}th`;

  if (dayOfWeek === 0) {
    if (season === 'trinity') return `The ${ord} Sunday after Trinity`;
    if (season === 'advent') return `The ${ord} Sunday in Advent`;
    if (season === 'lent') return `The ${ord} Sunday in Lent`;
    if (season === 'easter') return `The ${ord} Sunday after Easter`;
    if (season === 'epiphany') return `The ${ord} Sunday after Epiphany`;
    return `${seasonName} ${ord} Sunday`;
  }

  return `${dayNames[dayOfWeek]} in ${seasonName} ${week}`;
}

// ============================================================
// Collect ID Computation
// ============================================================

function computeCollectId(season: LiturgicalSeason, week: number): string {
  return `${season}-${week}`;
}

// ============================================================
// Main Resolver
// ============================================================

/**
 * Resolve the full liturgical identity of a given date.
 * Handles: season, week, holy days, precedence, collect assignment.
 */
export function resolveLiturgicalDay(date: Date): LiturgicalDay {
  const year = date.getFullYear();
  const feasts = computeMoveableFeasts(year);

  // For dates in early January, we may need last year's moveable feasts
  // to correctly identify seasons like Christmas that span the year boundary
  const season = determineSeason(date, feasts);
  const dayOfWeek = date.getDay();
  const isSunday = dayOfWeek === 0;
  const week = computeWeekOfSeason(date, season, feasts);
  const psalmsDay = getPsalterDayNumber(date);

  // Check for fixed holy days
  const fixedHolyDay = FIXED_HOLY_DAYS.find(
    hd => hd.month === date.getMonth() && hd.day === date.getDate()
  );

  // Check for moveable feast days
  let moveableName: string | undefined;
  let moveableCollectId: string | undefined;
  let moveableRank: HolyDayRank | undefined;

  if (isSameDay(date, feasts.easterDay)) {
    moveableName = 'Easter Day';
    moveableCollectId = 'easter-day';
    moveableRank = 'principal';
  } else if (isSameDay(date, feasts.ascensionDay)) {
    moveableName = 'Ascension Day';
    moveableCollectId = 'ascension-day';
    moveableRank = 'principal';
  } else if (isSameDay(date, feasts.whitsunday)) {
    moveableName = 'Whitsunday';
    moveableCollectId = 'whitsunday';
    moveableRank = 'principal';
  } else if (isSameDay(date, feasts.trinitySunday)) {
    moveableName = 'Trinity Sunday';
    moveableCollectId = 'trinity-sunday';
    moveableRank = 'principal';
  } else if (isSameDay(date, feasts.ashWednesday)) {
    moveableName = 'Ash Wednesday';
    moveableCollectId = 'ash-wednesday';
    moveableRank = 'major';
  } else if (isSameDay(date, feasts.goodFriday)) {
    moveableName = 'Good Friday';
    moveableCollectId = 'good-friday';
    moveableRank = 'major';
  } else if (isSameDay(date, feasts.palmSunday)) {
    moveableName = 'Palm Sunday';
    moveableCollectId = 'palm-sunday';
    moveableRank = 'major';
  }

  // Precedence: moveable feasts (principal) > fixed holy days > Sunday propers > ordinary
  let isHolyDay = false;
  let holyDayName: string | undefined;
  let holyDayRank: HolyDayRank | undefined;
  let collectId = computeCollectId(season, week);
  let name = formatDayName(season, week, dayOfWeek);

  if (moveableName && moveableRank === 'principal') {
    isHolyDay = true;
    holyDayName = moveableName;
    holyDayRank = moveableRank;
    collectId = moveableCollectId!;
    name = moveableName;
  } else if (moveableName) {
    isHolyDay = true;
    holyDayName = moveableName;
    holyDayRank = moveableRank;
    collectId = moveableCollectId!;
    name = moveableName;
  } else if (fixedHolyDay) {
    // Fixed holy days: minor saints yield to Sunday
    if (isSunday && fixedHolyDay.rank === 'minor') {
      // Sunday takes precedence over minor saint
      // Keep the Sunday name and collect
    } else {
      isHolyDay = true;
      holyDayName = fixedHolyDay.name;
      holyDayRank = fixedHolyDay.rank;
      collectId = fixedHolyDay.collectId;
      name = fixedHolyDay.name;
    }
  }

  return {
    date,
    season,
    weekOfSeason: week,
    dayOfWeek,
    name,
    isHolyDay,
    holyDayName,
    holyDayRank,
    collectId,
    isSunday,
    psalmsDay,
  };
}
