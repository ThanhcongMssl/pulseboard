import type { IsoDate, IsoMonth } from './domain.ts';

// Calendar-day helpers. Dates are UTC `YYYY-MM-DD` strings; going through
// Date.UTC keeps the math free of the host timezone and DST.

/** Inclusive range of UTC calendar days. */
export interface DateRange {
  from: IsoDate;
  to: IsoDate;
}

const DAY_MS = 86_400_000;

const toMs = (date: IsoDate) => Date.parse(`${date}T00:00:00Z`);
const fromMs = (ms: number): IsoDate => new Date(ms).toISOString().slice(0, 10);

export const todayUtc = (now = new Date()): IsoDate => now.toISOString().slice(0, 10);

export const addDays = (date: IsoDate, days: number): IsoDate => fromMs(toMs(date) + days * DAY_MS);

/** Every day from `from` to `to`, both included; empty when `from` is after `to`. */
export function datesInRange({ from, to }: DateRange): IsoDate[] {
  const dates: IsoDate[] = [];
  for (let ms = toMs(from); ms <= toMs(to); ms += DAY_MS) dates.push(fromMs(ms));
  return dates;
}

/** The `n` days ending on `end` (included), oldest first. */
export const lastNDays = (n: number, end: IsoDate = todayUtc()): IsoDate[] =>
  n <= 0 ? [] : datesInRange({ from: addDays(end, -(n - 1)), to: end });

export const monthOf = (date: IsoDate): IsoMonth => date.slice(0, 7);

export function daysInMonth(month: IsoMonth): number {
  const [year, m] = month.split('-').map(Number) as [number, number];
  // Day 0 of the next month is the last day of this one.
  return new Date(Date.UTC(year, m, 0)).getUTCDate();
}

/** Day of week, 0 = Sunday … 6 = Saturday. */
export const weekdayOf = (date: IsoDate): number => new Date(toMs(date)).getUTCDay();
