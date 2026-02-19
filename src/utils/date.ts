/**
 * Timezone-safe date utilities.
 *
 * IMPORTANT: Do NOT use `date.toISOString().split('T')[0]` anywhere in this
 * codebase — `toISOString()` converts to UTC, which shifts the date backwards
 * in timezones ahead of UTC (e.g., AEST +10), causing off-by-one bugs and
 * infinite loops in date-range generators.
 */

/** Format a Date as 'YYYY-MM-DD' using the local timezone. */
export function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Today's date as 'YYYY-MM-DD' in local timezone. */
export function todayStr(): string {
  return formatDateStr(new Date());
}

/** Add (or subtract) days from a 'YYYY-MM-DD' string. Returns 'YYYY-MM-DD'. */
export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return formatDateStr(d);
}

/** Number of days from date string `a` to date string `b` (positive if b > a). */
export function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}
