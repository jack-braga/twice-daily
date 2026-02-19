import { describe, it, expect } from 'vitest';
import { getPsalmsForDay, getPsalterDayNumber, shouldOmitVenite, PSALTER_30_DAY } from '../psalter';

describe('getPsalterDayNumber', () => {
  it('maps day 1-30 directly', () => {
    for (let d = 1; d <= 30; d++) {
      expect(getPsalterDayNumber(new Date(2026, 0, d))).toBe(d);
    }
  });

  it('maps day 31 to day 30', () => {
    expect(getPsalterDayNumber(new Date(2026, 0, 31))).toBe(30);
  });

  it('maps last day of February (non-leap) to day 30', () => {
    expect(getPsalterDayNumber(new Date(2026, 1, 28))).toBe(30);
  });

  it('maps Feb 29 (leap year) to day 30 (last day of Feb)', () => {
    // Feb 29 is the last day of February in a leap year, so it uses Day 30
    expect(getPsalterDayNumber(new Date(2024, 1, 29))).toBe(30);
  });

  it('maps Feb 28 in a leap year to day 28 (not the last day)', () => {
    expect(getPsalterDayNumber(new Date(2024, 1, 28))).toBe(28);
  });
});

describe('getPsalmsForDay', () => {
  it('returns correct psalms for day 1 morning', () => {
    expect(getPsalmsForDay(new Date(2026, 0, 1), 'morning')).toEqual([1, 2, 3, 4, 5]);
  });

  it('returns correct psalms for day 1 evening', () => {
    expect(getPsalmsForDay(new Date(2026, 0, 1), 'evening')).toEqual([6, 7, 8]);
  });

  it('returns correct psalms for day 30 evening (last psalms)', () => {
    expect(getPsalmsForDay(new Date(2026, 0, 30), 'evening')).toEqual([147, 148, 149, 150]);
  });
});

describe('shouldOmitVenite', () => {
  it('returns true on day 19', () => {
    expect(shouldOmitVenite(new Date(2026, 0, 19))).toBe(true);
  });

  it('returns false on other days', () => {
    expect(shouldOmitVenite(new Date(2026, 0, 18))).toBe(false);
    expect(shouldOmitVenite(new Date(2026, 0, 20))).toBe(false);
  });
});

describe('PSALTER_30_DAY coverage', () => {
  it('covers all 150 psalms', () => {
    const allPsalms = new Set<number>();
    for (const day of PSALTER_30_DAY) {
      for (const p of day.morning) allPsalms.add(p);
      for (const p of day.evening) allPsalms.add(p);
    }
    // Psalms 1-150 should all be present (119 appears on days 24-26)
    for (let p = 1; p <= 150; p++) {
      expect(allPsalms.has(p)).toBe(true);
    }
  });
});
