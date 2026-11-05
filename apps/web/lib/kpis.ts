import type {
  IsoDate,
  RangeSummary,
  ReportChannel,
  ReportDailyJson,
  WidgetKind,
} from '@pulseboard/shared';
import {
  EMPTY,
  formatCents,
  formatCentsExact,
  formatCount,
  formatPercent,
  formatRatio,
} from './format.ts';
import type { Pacing } from './series.ts';

export type KpiKind = Extract<WidgetKind, `kpi.${string}`>;

export const isKpi = (kind: WidgetKind): kind is KpiKind => kind.startsWith('kpi.');

export interface KpiTile {
  label: string;
  /** `raw` formatted, or a dash when it's undefined. */
  value: string;
  caption: string;
  /** The number behind `value`, for animating between values; null when undefined. */
  raw: number | null;
  format(n: number): string;
}

/** The summary (and daily report) field each tile shows. */
export const KPI_FIELD = {
  'kpi.revenue': 'revenue',
  'kpi.spend': 'spend',
  'kpi.roas': 'roas',
  'kpi.cac': 'cac',
  'kpi.conversionRate': 'conversionRate',
  'kpi.orders': 'orders',
} as const satisfies Record<KpiKind, keyof RangeSummary & keyof ReportDailyJson>;

const FORMAT: Record<KpiKind, (n: number) => string> = {
  'kpi.revenue': formatCents,
  'kpi.spend': formatCents,
  'kpi.roas': formatRatio,
  'kpi.cac': formatCentsExact,
  'kpi.conversionRate': (n) => formatPercent(n),
  'kpi.orders': formatCount,
};

const EMPTY_SUMMARY: RangeSummary = {
  spend: 0,
  revenue: 0,
  orders: 0,
  newCustomers: 0,
  sessions: 0,
  roas: null,
  cac: null,
  conversionRate: null,
};

/** What a KPI tile shows for a channel's range summary (zeros when it has none). */
export function kpiTile(
  kind: KpiKind,
  channel: ReportChannel,
  summary: RangeSummary | undefined,
  pacing: Pacing | null,
): KpiTile {
  const s = summary ?? EMPTY_SUMMARY;
  const raw = s[KPI_FIELD[kind]];
  const format = FORMAT[kind];
  return {
    ...describe(kind, channel, s, pacing),
    value: raw === null ? EMPTY : format(raw),
    raw,
    format,
  };
}

function describe(
  kind: KpiKind,
  channel: ReportChannel,
  s: RangeSummary,
  pacing: Pacing | null,
): { label: string; caption: string } {
  const noSpend = s.spend === 0;
  switch (kind) {
    case 'kpi.revenue':
      return {
        label: 'Revenue',
        caption: pacing ? `${formatPercent(pacing.ratio, 0)} of target` : 'No target set',
      };
    case 'kpi.spend':
      return { label: 'Ad spend', caption: noSpend ? 'Unpaid channel' : 'Paid media' };
    case 'kpi.roas':
      // The totals row divides all revenue (organic, email, direct too) by paid spend.
      return {
        label: channel === 'all' ? 'Blended ROAS' : 'ROAS',
        caption: noSpend
          ? 'No ad spend'
          : channel === 'all'
            ? 'All revenue ÷ ad spend'
            : 'Revenue ÷ ad spend',
      };
    case 'kpi.cac':
      return {
        label: 'CAC',
        caption: noSpend ? 'No ad spend' : `${formatCount(s.newCustomers)} new customers`,
      };
    case 'kpi.conversionRate':
      return { label: 'Conversion rate', caption: `${formatCount(s.sessions)} sessions` };
    case 'kpi.orders':
      return {
        label: 'Orders',
        caption: s.orders
          ? `${formatCentsExact(Math.round(s.revenue / s.orders))} avg. order`
          : EMPTY,
      };
  }
}

/** The tile's metric for each day in `dates`, for its sparkline; a day without a report is a gap. */
export function kpiSeries(
  kind: KpiKind,
  reports: readonly ReportDailyJson[],
  channel: ReportChannel,
  dates: readonly IsoDate[],
): (number | null)[] {
  const field = KPI_FIELD[kind];
  const byDate = new Map(
    reports.filter((r) => r.channel === channel).map((r) => [r.date, r[field]]),
  );
  return dates.map((d) => byDate.get(d) ?? null);
}
