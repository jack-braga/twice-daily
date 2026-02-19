import type { MoveableFeasts } from './types';

/**
 * Compute the date of Easter Sunday for a given year.
 * Uses the Anonymous Gregorian algorithm (Meeus/Jones/Butcher).
 * Valid for all years in the Gregorian calendar.
 */
export function computeEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/**
 * Compute Advent Sunday — the Sunday nearest to St Andrew's Day (Nov 30).
 * Falls between November 27 and December 3, inclusive.
 */
export function computeAdventSunday(year: number): Date {
  const nov30 = new Date(year, 10, 30); // month is 0-indexed
  const dayOfWeek = nov30.getDay(); // 0=Sun, 1=Mon, ...
  const offset = dayOfWeek <= 3 ? -dayOfWeek : 7 - dayOfWeek;
  return new Date(year, 10, 30 + offset);
}

/** Add (or subtract) days from a date. Returns a new Date. */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Derive all moveable feast dates from Easter for a given year.
 */
export function computeMoveableFeasts(year: number): MoveableFeasts {
  const easter = computeEaster(year);

  return {
    // Pre-Lent
    septuagesima: addDays(easter, -63),
    sexagesima: addDays(easter, -56),
    quinquagesima: addDays(easter, -49),

    // Lent
    ashWednesday: addDays(easter, -46),
    palmSunday: addDays(easter, -7),
    goodFriday: addDays(easter, -2),

    // Easter
    easterDay: easter,
    easterMonday: addDays(easter, 1),

    // Post-Easter
    ascensionDay: addDays(easter, 39),
    whitsunday: addDays(easter, 49),
    whitMonday: addDays(easter, 50),
    trinitySunday: addDays(easter, 56),

    // Advent (computed differently)
    adventSunday: computeAdventSunday(year),

    // Fixed dates (but included here for convenience)
    christmasDay: new Date(year, 11, 25),
    epiphany: new Date(year, 0, 6),
  };
}
