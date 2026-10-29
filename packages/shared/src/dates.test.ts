import { describe, expect, it } from 'vitest';
import {
  addDays,
  datesInRange,
  daysInMonth,
  lastNDays,
  monthOf,
  todayUtc,
  weekdayOf,
} from './dates.ts';

describe('todayUtc', () => {
  it('uses the UTC calendar day, not the local one', () => {
    expect(todayUtc(new Date('2026-10-29T23:30:00-05:00'))).toBe('2026-10-30');
  });
});

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('datesInRange', () => {
  it('includes both ends', () => {
    expect(datesInRange({ from: '2026-02-27', to: '2026-03-02' })).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
    ]);
  });

  it('returns one day when from equals to', () => {
    expect(datesInRange({ from: '2026-10-29', to: '2026-10-29' })).toEqual(['2026-10-29']);
  });

  it('is empty when from is after to', () => {
    expect(datesInRange({ from: '2026-10-29', to: '2026-10-28' })).toEqual([]);
  });
});

describe('lastNDays', () => {
  it('ends on the given day, oldest first', () => {
    expect(lastNDays(3, '2026-11-01')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01']);
  });

  it('is empty for n <= 0', () => {
    expect(lastNDays(0, '2026-11-01')).toEqual([]);
  });
});

describe('monthOf / daysInMonth', () => {
  it('extracts the month', () => {
    expect(monthOf('2026-10-29')).toBe('2026-10');
  });

  it('handles month lengths and leap years', () => {
    expect(daysInMonth('2026-10')).toBe(31);
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysInMonth('2028-02')).toBe(29);
  });
});

describe('weekdayOf', () => {
  it('returns the UTC day of week', () => {
    expect(weekdayOf('2026-10-29')).toBe(4); // Thursday
  });
});
