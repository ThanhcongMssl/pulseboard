import { CHANNELS, type IsoDate, type ReportChannel } from '@pulseboard/shared';
import { CHANNEL_LABELS } from './channels.ts';
import { formatDay } from './format.ts';

// The words of the "new data" toast, from what a burst of reports-updated
// events rebuilt. Pure and tested.

/** "Nov 2" or "Oct 30 – Nov 2" for the rebuilt days, oldest to newest. */
function days(dates: readonly IsoDate[]): string {
  const sorted = [...dates].sort();
  const first = sorted[0]!;
  const last = sorted.at(-1)!;
  return first === last ? formatDay(first) : `${formatDay(first)} – ${formatDay(last)}`;
}

/** The channels named when there are one or two, counted when there are more (not all). */
function channels(list: readonly ReportChannel[]): string | null {
  const named = CHANNELS.filter((c) => list.includes(c));
  if (named.length === 0) return null;
  if (named.length <= 2) return named.map((c) => CHANNEL_LABELS[c]).join(' and ');
  if (named.length === CHANNELS.length) return 'all channels';
  return `${named.length} channels`;
}

/** "Reports updated for Nov 2 · Paid search"; null when nothing was rebuilt. */
export function describeUpdate(
  dates: readonly IsoDate[],
  touched: readonly ReportChannel[],
): string | null {
  if (dates.length === 0) return null;
  const which = channels(touched);
  return `Reports updated for ${days(dates)}${which ? ` · ${which}` : ''}`;
}
