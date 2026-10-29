import { z } from 'zod';
import { addDays, datesInRange, todayUtc } from './dates.ts';
import {
  isoDateSchema,
  reportChannelSchema,
  type IsoDate,
  type ReportChannel,
  type Source,
} from './domain.ts';
import { cac, conversionRate, roas } from './kpi.ts';
import type { IngestRun, ReportDaily } from './models.ts';

// Request and response contracts of the report API, shared by the API (which
// validates with them) and the dashboard (which renders them).

export const DEFAULT_RANGE_DAYS = 30;
export const MAX_RANGE_DAYS = 366;

/**
 * GET /reports query. Both ends are optional: `to` defaults to today (UTC),
 * `from` to the 30 days ending on `to`. Omitting `channel` returns every
 * channel plus the "all" totals row.
 */
export const reportsQuerySchema = z
  .object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    channel: reportChannelSchema.optional(),
  })
  .transform(({ from, to = todayUtc(), channel }) => ({
    from: from ?? addDays(to, -(DEFAULT_RANGE_DAYS - 1)),
    to,
    ...(channel && { channel }),
  }))
  .refine(({ from, to }) => from <= to, { message: 'from must not be after to', path: ['from'] })
  .refine(({ from, to }) => datesInRange({ from, to }).length <= MAX_RANGE_DAYS, {
    message: `range must be at most ${MAX_RANGE_DAYS} days`,
    path: ['from'],
  });
export type ReportsQuery = z.output<typeof reportsQuerySchema>;

/** A report as it arrives over JSON: dates become ISO strings. */
export type ReportDailyJson = Omit<ReportDaily, 'computedAt'> & { computedAt: string };

/** One channel's totals over a date range, with ratios derived from the totals. */
export interface RangeSummary {
  spend: number;
  revenue: number;
  orders: number;
  newCustomers: number;
  sessions: number;
  roas: number | null;
  cac: number | null;
  conversionRate: number | null;
}

type Totals = Pick<RangeSummary, 'spend' | 'revenue' | 'orders' | 'newCustomers' | 'sessions'>;

/**
 * Range totals per channel present in `reports`. Ratios are recomputed from
 * the summed numbers, never averaged across days, so a quiet day doesn't
 * weigh as much as a busy one (the same rule as the daily "all" row).
 */
export function summarizeReports(
  reports: readonly Pick<ReportDaily, 'channel' | keyof Totals>[],
): Partial<Record<ReportChannel, RangeSummary>> {
  const totals = new Map<ReportChannel, Totals>();
  for (const r of reports) {
    const t = totals.get(r.channel) ?? {
      spend: 0,
      revenue: 0,
      orders: 0,
      newCustomers: 0,
      sessions: 0,
    };
    t.spend += r.spend;
    t.revenue += r.revenue;
    t.orders += r.orders;
    t.newCustomers += r.newCustomers;
    t.sessions += r.sessions;
    totals.set(r.channel, t);
  }
  return Object.fromEntries(
    [...totals].map(([channel, t]) => [
      channel,
      {
        ...t,
        roas: roas(t.revenue, t.spend),
        cac: cac(t.spend, t.newCustomers),
        conversionRate: conversionRate(t.orders, t.sessions),
      },
    ]),
  );
}

export interface ReportsResponse {
  from: IsoDate;
  to: IsoDate;
  channel: ReportChannel | null;
  /** Sorted by date, then channel. */
  reports: ReportDailyJson[];
  summary: Partial<Record<ReportChannel, RangeSummary>>;
}

/** GET /status: data freshness for the dashboard's "last updated" badge. */
export interface StatusResponse {
  /** Latest computedAt across reports_daily; null before the first aggregate. */
  lastComputedAt: string | null;
  /** The most recent finished ingest attempt of each source that has run. */
  sources: {
    source: Source;
    lastStatus: IngestRun['status'];
    lastFinishedAt: string;
    lastSucceededAt: string | null;
  }[];
}
