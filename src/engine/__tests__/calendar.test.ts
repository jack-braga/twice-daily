import { describe, it, expect } from 'vitest';
import { resolveLiturgicalDay, determineSeason } from '../calendar';
import { computeMoveableFeasts } from '../easter';

describe('determineSeason', () => {
  const feasts2026 = computeMoveableFeasts(2026);

  it('identifies Advent', () => {
    // Advent Sunday 2026 = Nov 29
    expect(determineSeason(new Date(2026, 10, 29), feasts2026)).toBe('advent');
    expect(determineSeason(new Date(2026, 11, 10), feasts2026)).toBe('advent');
    expect(determineSeason(new Date(2026, 11, 24), feasts2026)).toBe('advent');
  });

  it('identifies Christmas', () => {
    expect(determineSeason(new Date(2026, 11, 25), feasts2026)).toBe('christmas');
    expect(determineSeason(new Date(2026, 11, 31), feasts2026)).toBe('christmas');
  });

  it('identifies Christmas in early January', () => {
    const feasts2027 = computeMoveableFeasts(2027);
    expect(determineSeason(new Date(2027, 0, 3), feasts2027)).toBe('christmas');
    expect(determineSeason(new Date(2027, 0, 5), feasts2027)).toBe('christmas');
  });

  it('identifies Epiphany', () => {
    expect(determineSeason(new Date(2026, 0, 6), feasts2026)).toBe('epiphany');
    expect(determineSeason(new Date(2026, 0, 20), feasts2026)).toBe('epiphany');
  });

  it('identifies Lent', () => {
    // Ash Wednesday 2026 = Feb 18
    expect(determineSeason(new Date(2026, 1, 18), feasts2026)).toBe('lent');
    expect(determineSeason(new Date(2026, 2, 15), feasts2026)).toBe('lent');
  });

  it('identifies Holy Week', () => {
    // Palm Sunday 2026 = Mar 29
    expect(determineSeason(new Date(2026, 2, 29), feasts2026)).toBe('holy-week');
    // Holy Saturday = Apr 4
    expect(determineSeason(new Date(2026, 3, 4), feasts2026)).toBe('holy-week');
  });

  it('identifies Easter', () => {
    // Easter 2026 = Apr 5
    expect(determineSeason(new Date(2026, 3, 5), feasts2026)).toBe('easter');
    expect(determineSeason(new Date(2026, 3, 20), feasts2026)).toBe('easter');
  });

  it('identifies Ascensiontide', () => {
    // Ascension 2026 = May 14
    expect(determineSeason(new Date(2026, 4, 14), feasts2026)).toBe('ascension');
    expect(determineSeason(new Date(2026, 4, 20), feasts2026)).toBe('ascension');
  });

  it('identifies Whitsun', () => {
    // Whitsunday 2026 = May 24
    expect(determineSeason(new Date(2026, 4, 24), feasts2026)).toBe('whitsun');
  });

  it('identifies Trinity', () => {
    // Trinity Sunday 2026 = May 31
    expect(determineSeason(new Date(2026, 4, 31), feasts2026)).toBe('trinity');
    expect(determineSeason(new Date(2026, 9, 15), feasts2026)).toBe('trinity');
  });

  it('identifies Pre-Lent', () => {
    // Septuagesima 2026 = Feb 1
    expect(determineSeason(new Date(2026, 1, 1), feasts2026)).toBe('pre-lent');
    // Shrove Tuesday = Feb 17
    expect(determineSeason(new Date(2026, 1, 17), feasts2026)).toBe('pre-lent');
  });
});

describe('resolveLiturgicalDay', () => {
  it('resolves Christmas Day as a principal feast', () => {
    const day = resolveLiturgicalDay(new Date(2026, 11, 25));
    expect(day.isHolyDay).toBe(true);
    expect(day.holyDayName).toBe('Christmas Day');
    expect(day.holyDayRank).toBe('principal');
    expect(day.season).toBe('christmas');
  });

  it('resolves Easter Day as a principal feast', () => {
    // Easter 2026 = April 5
    const day = resolveLiturgicalDay(new Date(2026, 3, 5));
    expect(day.isHolyDay).toBe(true);
    expect(day.holyDayName).toBe('Easter Day');
    expect(day.holyDayRank).toBe('principal');
    expect(day.season).toBe('easter');
  });

  it('resolves Trinity Sunday', () => {
    // Trinity 2026 = May 31
    const day = resolveLiturgicalDay(new Date(2026, 4, 31));
    expect(day.isHolyDay).toBe(true);
    expect(day.holyDayName).toBe('Trinity Sunday');
  });

  it('resolves a regular Sunday after Trinity', () => {
    // June 7, 2026 = First Sunday after Trinity
    const day = resolveLiturgicalDay(new Date(2026, 5, 7));
    expect(day.isSunday).toBe(true);
    expect(day.season).toBe('trinity');
    expect(day.weekOfSeason).toBe(1);
  });

  it('minor saint on Sunday yields to the Sunday', () => {
    // St Mark = April 25. In 2027, April 25 is a Sunday
    // (Easter 2027 = March 28, so April 25 is 4th Sunday after Easter)
    const day = resolveLiturgicalDay(new Date(2027, 3, 25));
    expect(day.isSunday).toBe(true);
    // St Mark is minor, so Sunday should take precedence
    expect(day.holyDayRank).not.toBe('minor');
  });

  it('correctly computes psalter day for day 31', () => {
    // January 31
    const day = resolveLiturgicalDay(new Date(2026, 0, 31));
    expect(day.psalmsDay).toBe(30); // Day 31 maps to Day 30
  });

  it('correctly computes psalter day for last day of February', () => {
    // Feb 28, 2026 (not a leap year)
    const day = resolveLiturgicalDay(new Date(2026, 1, 28));
    expect(day.psalmsDay).toBe(30);

    // Feb 29, 2024 (leap year — last day of Feb, so Day 30)
    const leapDay = resolveLiturgicalDay(new Date(2024, 1, 29));
    expect(leapDay.psalmsDay).toBe(30);

    // Feb 28, 2024 (leap year, not the last day)
    const preleapDay = resolveLiturgicalDay(new Date(2024, 1, 28));
    expect(preleapDay.psalmsDay).toBe(28);
  });

  it('resolves Epiphany (Jan 6) as a principal feast', () => {
    const day = resolveLiturgicalDay(new Date(2026, 0, 6));
    expect(day.isHolyDay).toBe(true);
    expect(day.holyDayName).toBe('Epiphany');
    expect(day.holyDayRank).toBe('principal');
  });
});
