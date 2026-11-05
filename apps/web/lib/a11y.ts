import { CHANNELS, type IsoDate } from '@pulseboard/shared';
import { CHANNEL_LABELS } from './channels.ts';
import { formatCents, formatDay } from './format.ts';
import type { DailyPoint, StackPoint } from './series.ts';

// What a chart says to someone who can't see it: one sentence with the
// totals and extremes, used as the chart's accessible name. Pure and tested.

const span = (dates: readonly IsoDate[]) =>
  dates.length ? `${formatDay(dates[0]!)} – ${formatDay(dates.at(-1)!)}` : '';

/** "Revenue for Paid search, Oct 7 – Nov 5: $216.4K in total; highest $9.1K on Nov 5, lowest $4.8K on Oct 18." */
export function describeRevenue(points: readonly DailyPoint[], scope: string): string {
  const days = points.filter((p): p is DailyPoint & { revenue: number } => p.revenue !== null);
  const head = `Revenue for ${scope}, ${span(points.map((p) => p.date))}`;
  if (days.length === 0) return `${head}: no data.`;
  const total = days.reduce((sum, p) => sum + p.revenue, 0);
  const high = days.reduce((a, b) => (b.revenue > a.revenue ? b : a));
  const low = days.reduce((a, b) => (b.revenue < a.revenue ? b : a));
  return (
    `${head}: ${formatCents(total)} in total; highest ${formatCents(high.revenue)} on ` +
    `${formatDay(high.date)}, lowest ${formatCents(low.revenue)} on ${formatDay(low.date)}.`
  );
}

/** "Revenue by channel, Oct 7 – Nov 5: Organic $257.3K (27%), Paid search $216.4K (23%), …" largest first. */
export function describeChannelMix(points: readonly StackPoint[]): string {
  const totals = CHANNELS.map((c) => ({
    c,
    sum: points.reduce((s, p) => s + (p[c] ?? 0), 0),
  })).filter((t) => t.sum > 0);
  const head = `Revenue by channel, ${span(points.map((p) => p.date))}`;
  const all = totals.reduce((s, t) => s + t.sum, 0);
  if (all === 0) return `${head}: no data.`;
  const parts = totals
    .sort((a, b) => b.sum - a.sum)
    .map(
      (t) => `${CHANNEL_LABELS[t.c]} ${formatCents(t.sum)} (${Math.round((t.sum / all) * 100)}%)`,
    );
  return `${head}: ${parts.join(', ')}.`;
}
