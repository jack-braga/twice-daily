import { describe, it, expect } from 'vitest';
import { computeEaster, computeAdventSunday, computeMoveableFeasts } from '../easter';

describe('computeEaster', () => {
  const knownEasterDates: [number, number, number][] = [
    // [year, month (1-indexed), day]
    [2020, 4, 12],
    [2021, 4, 4],
    [2022, 4, 17],
    [2023, 4, 9],
    [2024, 3, 31],
    [2025, 4, 20],
    [2026, 4, 5],
    [2027, 3, 28],
    [2028, 4, 16],
    [2029, 4, 1],
    [2030, 4, 21],
  ];

  it.each(knownEasterDates)(
    'computes Easter for %i as %i/%i',
    (year, month, day) => {
      const easter = computeEaster(year);
      expect(easter.getFullYear()).toBe(year);
      expect(easter.getMonth() + 1).toBe(month); // JS months are 0-indexed
      expect(easter.getDate()).toBe(day);
    },
  );

  it('always falls on a Sunday', () => {
    for (let year = 2000; year <= 2050; year++) {
      const easter = computeEaster(year);
      expect(easter.getDay()).toBe(0); // Sunday
    }
  });
});

describe('computeAdventSunday', () => {
  it('falls between Nov 27 and Dec 3 inclusive', () => {
    for (let year = 2000; year <= 2050; year++) {
      const advent = computeAdventSunday(year);
      expect(advent.getDay()).toBe(0); // Sunday
      const month = advent.getMonth();
      const day = advent.getDate();
      if (month === 10) {
        // November: must be 27, 28, 29, or 30
        expect(day).toBeGreaterThanOrEqual(27);
        expect(day).toBeLessThanOrEqual(30);
      } else {
        // December: must be 1, 2, or 3
        expect(month).toBe(11);
        expect(day).toBeGreaterThanOrEqual(1);
        expect(day).toBeLessThanOrEqual(3);
      }
    }
  });

  it('computes 2026 correctly (Nov 29)', () => {
    const advent = computeAdventSunday(2026);
    expect(advent.getMonth()).toBe(10); // November
    expect(advent.getDate()).toBe(29);
  });
});

describe('computeMoveableFeasts', () => {
  it('derives correct dates for 2026', () => {
    const feasts = computeMoveableFeasts(2026);

    // Easter 2026 = April 5
    expect(feasts.easterDay.getMonth()).toBe(3);
    expect(feasts.easterDay.getDate()).toBe(5);

    // Ash Wednesday = Easter - 46 = Feb 18
    expect(feasts.ashWednesday.getMonth()).toBe(1);
    expect(feasts.ashWednesday.getDate()).toBe(18);

    // Good Friday = Easter - 2 = April 3
    expect(feasts.goodFriday.getMonth()).toBe(3);
    expect(feasts.goodFriday.getDate()).toBe(3);

    // Ascension = Easter + 39 = May 14
    expect(feasts.ascensionDay.getMonth()).toBe(4);
    expect(feasts.ascensionDay.getDate()).toBe(14);

    // Whitsunday = Easter + 49 = May 24
    expect(feasts.whitsunday.getMonth()).toBe(4);
    expect(feasts.whitsunday.getDate()).toBe(24);

    // Trinity = Easter + 56 = May 31
    expect(feasts.trinitySunday.getMonth()).toBe(4);
    expect(feasts.trinitySunday.getDate()).toBe(31);
  });

  it('Ascension Day is always a Thursday', () => {
    for (let year = 2000; year <= 2050; year++) {
      const feasts = computeMoveableFeasts(year);
      expect(feasts.ascensionDay.getDay()).toBe(4); // Thursday
    }
  });
});
