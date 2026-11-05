import type { RangeSummary, ReportChannel, WidgetKind } from '@pulseboard/shared';
import {
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
  value: string;
  caption: string;
}

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
  const noSpend = s.spend === 0;
  switch (kind) {
    case 'kpi.revenue':
      return {
        label: 'Revenue',
        value: formatCents(s.revenue),
        caption: pacing ? `${formatPercent(pacing.ratio, 0)} of target` : 'No target set',
      };
    case 'kpi.spend':
      return {
        label: 'Ad spend',
        value: formatCents(s.spend),
        caption: noSpend ? 'Unpaid channel' : 'Paid media',
      };
    case 'kpi.roas':
      // The totals row divides all revenue (organic, email, direct too) by paid spend.
      return {
        label: channel === 'all' ? 'Blended ROAS' : 'ROAS',
        value: formatRatio(s.roas),
        caption: noSpend
          ? 'No ad spend'
          : channel === 'all'
            ? 'All revenue ÷ ad spend'
            : 'Revenue ÷ ad spend',
      };
    case 'kpi.cac':
      return {
        label: 'CAC',
        value: formatCentsExact(s.cac),
        caption: noSpend ? 'No ad spend' : `${formatCount(s.newCustomers)} new customers`,
      };
    case 'kpi.conversionRate':
      return {
        label: 'Conversion rate',
        value: formatPercent(s.conversionRate),
        caption: `${formatCount(s.sessions)} sessions`,
      };
    case 'kpi.orders':
      return {
        label: 'Orders',
        value: formatCount(s.orders),
        caption: s.orders
          ? `${formatCentsExact(Math.round(s.revenue / s.orders))} avg. order`
          : '—',
      };
  }
}
