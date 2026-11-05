import { z } from 'zod';
import { addDays, datesInRange, todayUtc } from './dates.ts';
import {
  channelSchema,
  isoDateSchema,
  reportChannelSchema,
  type Channel,
  type IsoDate,
  type ReportChannel,
  type Source,
} from './domain.ts';
import { cac, conversionRate, ctr, roas } from './kpi.ts';
import type { IngestRun, RawOrder, ReportCampaignDaily, ReportDaily } from './models.ts';

// Request and response contracts of the report API, shared by the API (which
// validates with them) and the dashboard (which renders them).

export const DEFAULT_RANGE_DAYS = 30;
export const MAX_RANGE_DAYS = 366;

const rangeShape = { from: isoDateSchema.optional(), to: isoDateSchema.optional() };

/** `to` defaults to today (UTC), `from` to the 30 days ending on `to`. */
const withRangeDefaults = <Q extends { from?: IsoDate; to?: IsoDate }>({
  from,
  to = todayUtc(),
  ...rest
}: Q) => ({ ...rest, from: from ?? addDays(to, -(DEFAULT_RANGE_DAYS - 1)), to });

/** A range must run forwards and span at most 366 days. */
const checkRange = <S extends z.ZodType<{ from: IsoDate; to: IsoDate }>>(schema: S) =>
  schema
    .refine(({ from, to }) => from <= to, { message: 'from must not be after to', path: ['from'] })
    .refine(({ from, to }) => datesInRange({ from, to }).length <= MAX_RANGE_DAYS, {
      message: `range must be at most ${MAX_RANGE_DAYS} days`,
      path: ['from'],
    });

/**
 * GET /reports query. Both ends of the range are optional (see
 * withRangeDefaults). Omitting `channel` returns every channel plus the
 * "all" totals row.
 */
export const reportsQuerySchema = checkRange(
  z.object({ ...rangeShape, channel: reportChannelSchema.optional() }).transform(withRangeDefaults),
);
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

/** GET /campaigns query: campaigns over a range, optionally of one paid channel. */
export const campaignsQuerySchema = checkRange(
  z.object({ ...rangeShape, channel: channelSchema.optional() }).transform(withRangeDefaults),
);
export type CampaignsQuery = z.output<typeof campaignsQuerySchema>;

type CampaignTotals = Pick<
  ReportCampaignDaily,
  'spend' | 'impressions' | 'clicks' | 'orders' | 'revenue' | 'newCustomers'
>;

/** One campaign's totals over a range, with ratios derived from the totals. */
export interface CampaignSummary extends CampaignTotals {
  campaignId: string;
  campaignName: string;
  channel: Channel;
  roas: number | null;
  cac: number | null;
  ctr: number | null;
}

/**
 * Range totals per campaign, by spend, largest first. Like summarizeReports,
 * ratios come from the summed numbers. The name is the latest day's, in case
 * a campaign was renamed during the range (rows must be sorted by date).
 */
export function summarizeCampaigns(
  rows: readonly Pick<
    ReportCampaignDaily,
    'campaignId' | 'campaignName' | 'channel' | keyof CampaignTotals
  >[],
): CampaignSummary[] {
  const byId = new Map<string, CampaignSummary>();
  for (const r of rows) {
    const t = byId.get(r.campaignId) ?? {
      campaignId: r.campaignId,
      campaignName: r.campaignName,
      channel: r.channel,
      spend: 0,
      impressions: 0,
      clicks: 0,
      orders: 0,
      revenue: 0,
      newCustomers: 0,
      roas: null,
      cac: null,
      ctr: null,
    };
    t.campaignName = r.campaignName;
    t.spend += r.spend;
    t.impressions += r.impressions;
    t.clicks += r.clicks;
    t.orders += r.orders;
    t.revenue += r.revenue;
    t.newCustomers += r.newCustomers;
    byId.set(r.campaignId, t);
  }
  return [...byId.values()]
    .map((t) => ({
      ...t,
      roas: roas(t.revenue, t.spend),
      cac: cac(t.spend, t.newCustomers),
      ctr: ctr(t.clicks, t.impressions),
    }))
    .sort((a, b) => b.spend - a.spend || a.campaignId.localeCompare(b.campaignId));
}

export interface CampaignsResponse {
  from: IsoDate;
  to: IsoDate;
  channel: Channel | null;
  campaigns: CampaignSummary[];
}

export const ORDER_SORTS = ['date', 'revenue'] as const;
export type OrderSort = (typeof ORDER_SORTS)[number];
export const SORT_DIRS = ['asc', 'desc'] as const;
export type SortDir = (typeof SORT_DIRS)[number];
export const MAX_ORDERS_PAGE = 200;

/**
 * GET /orders query: one page of raw orders over a range, filtered by channel
 * or campaign. Pages are keyset-paginated: pass the previous page's
 * `nextCursor` back as `cursor`, with the same filters and sort.
 */
export const ordersQuerySchema = checkRange(
  z
    .object({
      ...rangeShape,
      channel: channelSchema.optional(),
      campaignId: z.string().min(1).max(64).optional(),
      sort: z.enum(ORDER_SORTS).default('date'),
      dir: z.enum(SORT_DIRS).default('desc'),
      limit: z.coerce.number().int().min(1).max(MAX_ORDERS_PAGE).default(100),
      cursor: z.string().min(1).max(256).optional(),
    })
    .transform(withRangeDefaults),
);
export type OrdersQuery = z.output<typeof ordersQuerySchema>;

/** An order as the API returns it: the raw record without its source. */
export type OrderJson = Omit<RawOrder, 'source'>;

export interface OrdersResponse {
  orders: OrderJson[];
  /** Opaque; null on the last page. */
  nextCursor: string | null;
  /** Orders matching the filters across all pages; counted on the first page only (null after). */
  total: number | null;
}
