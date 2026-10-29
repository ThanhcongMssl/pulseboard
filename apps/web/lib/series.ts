import {
  CHANNELS,
  type Channel,
  type IsoDate,
  type ReportChannel,
  type ReportDailyJson,
  type Source,
} from '@pulseboard/shared';

// Chart- and banner-shaped views of /reports rows. Pure, so they're tested
// without rendering anything.

export interface DailyPoint {
  date: IsoDate;
  revenue: number | null;
  spend: number | null;
  targetRevenue: number | null;
}

/**
 * One point per date in `dates` for `channel`. A day without a report is a
 * gap (null), never a zero: "no data yet" must not look like "no revenue".
 */
export function dailySeries(
  reports: readonly ReportDailyJson[],
  channel: ReportChannel,
  dates: readonly IsoDate[],
): DailyPoint[] {
  const byDate = new Map(reports.filter((r) => r.channel === channel).map((r) => [r.date, r]));
  return dates.map((date) => {
    const r = byDate.get(date);
    return {
      date,
      revenue: r?.revenue ?? null,
      spend: r?.spend ?? null,
      targetRevenue: r?.target?.revenue ?? null,
    };
  });
}

export type StackPoint = { date: IsoDate } & Partial<Record<Channel, number>>;

/** Daily revenue per channel (no "all" row), for the stacked channel-mix bars. */
export function channelStack(
  reports: readonly ReportDailyJson[],
  dates: readonly IsoDate[],
): StackPoint[] {
  const points = new Map<IsoDate, StackPoint>(dates.map((date) => [date, { date }]));
  for (const r of reports) {
    const point = points.get(r.date);
    if (point && r.channel !== 'all') point[r.channel] = r.revenue;
  }
  return [...points.values()];
}

export interface StaleDay {
  date: IsoDate;
  sources: Source[];
}

/** Days whose reports were built on a source's last good data, oldest first. */
export function staleDays(reports: readonly ReportDailyJson[]): StaleDay[] {
  const days = new Map<IsoDate, Set<Source>>();
  for (const r of reports) {
    if (r.staleSources.length === 0) continue;
    const sources = days.get(r.date) ?? new Set();
    for (const s of r.staleSources) sources.add(s);
    days.set(r.date, sources);
  }
  return [...days]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, sources]) => ({ date, sources: [...sources].sort() }));
}

export interface Pacing {
  revenue: number;
  target: number;
  /** revenue / target, e.g. 1.04 = 4% ahead. */
  ratio: number;
}

/**
 * Range revenue against the summed daily targets. Null when any day lacks a
 * target: a partial sum would make the channel look far ahead of plan.
 */
export function targetPacing(
  reports: readonly ReportDailyJson[],
  channel: ReportChannel,
): Pacing | null {
  const rows = reports.filter((r) => r.channel === channel);
  if (rows.length === 0 || rows.some((r) => r.target === null)) return null;
  const revenue = rows.reduce((sum, r) => sum + r.revenue, 0);
  const target = rows.reduce((sum, r) => sum + r.target!.revenue, 0);
  return target === 0 ? null : { revenue, target, ratio: revenue / target };
}

/** Channels in their fixed display order, "all" last as the total. */
export const TABLE_CHANNELS: readonly ReportChannel[] = [...CHANNELS, 'all'];
