import type { PsalterDay, Session } from './types';

/**
 * The 30-day psalter cycle from the 1662 BCP.
 * Each day maps to morning and evening psalm numbers.
 */
export const PSALTER_30_DAY: PsalterDay[] = [
  { day: 1, morning: [1, 2, 3, 4, 5], evening: [6, 7, 8] },
  { day: 2, morning: [9, 10, 11], evening: [12, 13, 14] },
  { day: 3, morning: [15, 16, 17], evening: [18] },
  { day: 4, morning: [19, 20, 21], evening: [22, 23] },
  { day: 5, morning: [24, 25, 26], evening: [27, 28, 29] },
  { day: 6, morning: [30, 31], evening: [32, 33, 34] },
  { day: 7, morning: [35, 36], evening: [37] },
  { day: 8, morning: [38, 39, 40], evening: [41, 42, 43] },
  { day: 9, morning: [44, 45, 46], evening: [47, 48, 49] },
  { day: 10, morning: [50, 51, 52], evening: [53, 54, 55] },
  { day: 11, morning: [56, 57, 58], evening: [59, 60, 61] },
  { day: 12, morning: [62, 63, 64], evening: [65, 66, 67] },
  { day: 13, morning: [68], evening: [69, 70] },
  { day: 14, morning: [71, 72], evening: [73, 74] },
  { day: 15, morning: [75, 76, 77], evening: [78] },
  { day: 16, morning: [79, 80, 81], evening: [82, 83, 84, 85] },
  { day: 17, morning: [86, 87, 88], evening: [89] },
  { day: 18, morning: [90, 91, 92], evening: [93, 94] },
  { day: 19, morning: [95, 96, 97], evening: [98, 99, 100, 101] },
  { day: 20, morning: [102, 103], evening: [104] },
  { day: 21, morning: [105], evening: [106] },
  { day: 22, morning: [107], evening: [108, 109] },
  { day: 23, morning: [110, 111, 112, 113], evening: [114, 115] },
  { day: 24, morning: [116, 117, 118], evening: [119] }, // Ps 119:1-32 in evening
  { day: 25, morning: [119], evening: [119] }, // portions of 119 — handled via verse ranges
  { day: 26, morning: [119], evening: [119] }, // portions of 119
  { day: 27, morning: [120, 121, 122, 123, 124, 125], evening: [126, 127, 128, 129, 130, 131] },
  { day: 28, morning: [132, 133, 134, 135], evening: [136, 137, 138] },
  { day: 29, morning: [139, 140, 141], evening: [142, 143] },
  { day: 30, morning: [144, 145, 146], evening: [147, 148, 149, 150] },
];

/**
 * Psalm 119 verse ranges for days 24-26 of the psalter.
 * The BCP divides Ps 119 (176 verses) across 3 evenings and 2 mornings:
 *   Day 24 Evening: 119:1-32 (portions i-iv)
 *   Day 25 Morning: 119:33-72 (portions v-ix)
 *   Day 25 Evening: 119:73-104 (portions x-xiii)
 *   Day 26 Morning: 119:105-144 (portions xiv-xviii)
 *   Day 26 Evening: 119:145-176 (portions xix-xxii)
 */
export const PSALM_119_DIVISIONS: Record<string, { startVerse: number; endVerse: number }> = {
  '24-evening': { startVerse: 1, endVerse: 32 },
  '25-morning': { startVerse: 33, endVerse: 72 },
  '25-evening': { startVerse: 73, endVerse: 104 },
  '26-morning': { startVerse: 105, endVerse: 144 },
  '26-evening': { startVerse: 145, endVerse: 176 },
};

/**
 * Get the psalter day (1–30) for a given date.
 * Day 31 → Day 30. Last day of February → Day 30.
 */
export function getPsalterDayNumber(date: Date): number {
  const dayOfMonth = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();

  // February: last day uses Day 30
  if (month === 1) {
    const daysInFeb = new Date(year, 2, 0).getDate();
    if (dayOfMonth === daysInFeb) {
      return 30;
    }
  }

  return Math.min(dayOfMonth, 30);
}

/**
 * Get psalm numbers for a date and session.
 */
export function getPsalmsForDay(date: Date, session: Session): number[] {
  const psalterDay = getPsalterDayNumber(date);
  const entry = PSALTER_30_DAY[psalterDay - 1];
  if (!entry) return [];
  return session === 'morning' ? entry.morning : entry.evening;
}

/**
 * Check if Psalm 95 (the Venite) should be omitted.
 * On Day 19 morning, Psalm 95 appears naturally in the appointed psalms,
 * so the separate Venite is omitted to avoid repetition.
 */
export function shouldOmitVenite(date: Date): boolean {
  return getPsalterDayNumber(date) === 19;
}
