import type { RangeSummary, ReportChannel } from '@pulseboard/shared';
import {
  formatCents,
  formatCentsExact,
  formatCount,
  formatPercent,
  formatRatio,
} from '../../lib/format.ts';
import type { Pacing } from '../../lib/series.ts';

interface Props {
  channel: ReportChannel;
  summary: RangeSummary | undefined;
  pacing: Pacing | null;
}

interface Tile {
  label: string;
  value: string;
  caption: string;
}

export function KpiCards({ channel, summary, pacing }: Props) {
  const s = summary ?? {
    spend: 0,
    revenue: 0,
    orders: 0,
    newCustomers: 0,
    sessions: 0,
    roas: null,
    cac: null,
    conversionRate: null,
  };
  const noSpend = s.spend === 0;
  const tiles: Tile[] = [
    {
      label: 'Revenue',
      value: formatCents(s.revenue),
      caption: pacing ? `${formatPercent(pacing.ratio, 0)} of target` : 'No target set',
    },
    {
      label: 'Ad spend',
      value: formatCents(s.spend),
      caption: noSpend ? 'Unpaid channel' : 'Paid media',
    },
    {
      // The totals row divides all revenue (organic, email, direct too) by paid spend.
      label: channel === 'all' ? 'Blended ROAS' : 'ROAS',
      value: formatRatio(s.roas),
      caption: noSpend
        ? 'No ad spend'
        : channel === 'all'
          ? 'All revenue ÷ ad spend'
          : 'Revenue ÷ ad spend',
    },
    {
      label: 'CAC',
      value: formatCentsExact(s.cac),
      caption: `${formatCount(s.newCustomers)} new customers`,
    },
    {
      label: 'Conversion rate',
      value: formatPercent(s.conversionRate),
      caption: `${formatCount(s.sessions)} sessions`,
    },
    {
      label: 'Orders',
      value: formatCount(s.orders),
      caption: s.orders ? `${formatCentsExact(Math.round(s.revenue / s.orders))} avg. order` : '—',
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-xl border border-line bg-raised p-4">
          <dt className="text-sm text-ink-secondary">{t.label}</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight">{t.value}</dd>
          <dd className="mt-1 truncate text-xs text-muted">{t.caption}</dd>
        </div>
      ))}
    </dl>
  );
}
