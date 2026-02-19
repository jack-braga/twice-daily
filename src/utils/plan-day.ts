import { daysBetween } from './date';

/**
 * Compute the plan day number (1-based) for a sequential reading plan.
 * Returns null if the current date is before the start date or after the plan ends.
 */
export function computePlanDay(
  startDate: string,
  currentDate: string,
  totalDays: number,
): number | null {
  const offset = daysBetween(startDate, currentDate) + 1;
  if (offset < 1) return null;
  if (offset > totalDays) return null;
  return offset;
}

/** Check if the plan has been completed (current date is past the last plan day). */
export function isPlanComplete(
  startDate: string,
  currentDate: string,
  totalDays: number,
): boolean {
  const offset = daysBetween(startDate, currentDate) + 1;
  return offset > totalDays;
}

/** Check if a date falls within the plan's active range [startDate, startDate + totalDays - 1]. */
export function isDateInPlanRange(
  startDate: string,
  dateStr: string,
  totalDays: number,
): boolean {
  const offset = daysBetween(startDate, dateStr) + 1;
  return offset >= 1 && offset <= totalDays;
}
