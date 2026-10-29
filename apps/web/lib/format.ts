// Display formatting. Values arrive as integer cents and raw ratios; this is
// the only place they become strings. Null (no denominator) renders as a dash.

export const EMPTY = '—';

const compactUsd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const integer = new Intl.NumberFormat('en-US');

/** `$12.3K` for cards and axes. */
export const formatCents = (cents: number | null) =>
  cents === null ? EMPTY : compactUsd.format(cents / 100);

/** `$38.59` for exact amounts (CAC, tooltips). */
export const formatCentsExact = (cents: number | null) =>
  cents === null ? EMPTY : usd.format(cents / 100);

export const formatCount = (n: number) => integer.format(n);

/** ROAS as a multiplier: `2.85×`. */
export const formatRatio = (ratio: number | null) =>
  ratio === null ? EMPTY : `${ratio.toFixed(2)}×`;

/** A 0–1 fraction as a percentage: `1.53%`. */
export const formatPercent = (fraction: number | null, digits = 2) =>
  fraction === null ? EMPTY : `${(fraction * 100).toFixed(digits)}%`;

/** `just now`, `3 min ago`, `2 h ago`, `4 d ago`. */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

/** `Oct 29` from `2026-10-29`, in UTC like every report date. */
export const formatDay = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
