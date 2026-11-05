'use client';

import {
  CHANNELS,
  datesInRange,
  type Channel,
  type OrderSort,
  type ReportChannel,
  type SortDir,
  type WidgetKind,
} from '@pulseboard/shared';
import dynamic from 'next/dynamic';
import { useContext, useMemo, useState } from 'react';
import { describeChannelMix, describeRevenue } from '../../lib/a11y.ts';
import { CHANNEL_COLORS, CHANNEL_LABELS } from '../../lib/channels.ts';
import { toggleCampaign, toggleChannel, withRange } from '../../lib/filters.ts';
import { EMPTY, formatCentsExact, formatCount, formatDay } from '../../lib/format.ts';
import { isKpi, kpiSeries, kpiTile, type KpiKind } from '../../lib/kpis.ts';
import {
  coversRange,
  describeDelta,
  kpiDelta,
  previousRange,
  withPrevious,
  type ComparedPoint,
} from '../../lib/compare.ts';
import { channelStack, dailySeries, targetPacing, type StackPoint } from '../../lib/series.ts';
import { WIDGETS } from '../../lib/widgets.ts';
import { CampaignTable } from './CampaignTable.tsx';
import { ChannelTable } from './ChannelTable.tsx';
import { useDashboard } from './DashboardContext.tsx';
import { useCampaignNames, useCampaigns, useOrders, useReports } from './data.ts';
import { DRAG_HANDLE, DragGrip, Panel, RemoveButton, WidgetChromeContext } from './Panel.tsx';
import { Sparkline } from './Sparkline.tsx';
import { useTweenedNumber } from './useTweenedNumber.ts';
import { SeriesTable, TableToggle, type Column } from './SeriesTable.tsx';
import { WidgetEmpty, WidgetError, WidgetSkeleton } from './WidgetState.tsx';

// Recharts and the virtualizer load in their own chunks, after the page shell
// and the KPI tiles, and only for the widgets on the dashboard.
const LoadingChart = () => <WidgetSkeleton shape="chart" label="Loading chart" />;
const LoadingTable = () => <WidgetSkeleton shape="table" label="Loading orders" />;
const RevenueChart = dynamic(() => import('./RevenueChart.tsx').then((m) => m.RevenueChart), {
  ssr: false,
  loading: LoadingChart,
});
const ChannelMixChart = dynamic(
  () => import('./ChannelMixChart.tsx').then((m) => m.ChannelMixChart),
  { ssr: false, loading: LoadingChart },
);
const OrdersTable = dynamic(() => import('./OrdersTable.tsx').then((m) => m.OrdersTable), {
  ssr: false,
  loading: LoadingTable,
});

/** The paid channel to narrow campaigns and orders to, or null for all of them. */
const asChannel = (channel: ReportChannel): Channel | null => (channel === 'all' ? null : channel);

const PAID: ReadonlySet<ReportChannel> = new Set(['paid_social', 'paid_search']);

const TONE = { good: 'text-good', bad: 'text-critical', neutral: 'text-muted' } as const;

/**
 * The previous period's reports while comparing, once loaded for exactly that
 * period (never a placeholder from another range) and covering every day.
 */
function usePreviousPeriod() {
  const { filters, range } = useDashboard();
  const previous = useMemo(() => previousRange(range), [range]);
  const { data, isPlaceholderData } = useReports(previous, filters.compare);
  if (!filters.compare || !data || isPlaceholderData) return null;
  return { range: previous, reports: data.reports, summary: data.summary };
}

function KpiWidget({ kind }: { kind: KpiKind }) {
  const { filters, range, dates } = useDashboard();
  const { data } = useReports(range);
  const chrome = useContext(WidgetChromeContext);
  const { channel } = filters;
  const pacing = useMemo(
    () => (data && kind === 'kpi.revenue' ? targetPacing(data.reports, channel) : null),
    [data, kind, channel],
  );
  const tile = kpiTile(kind, channel, data?.summary[channel], pacing);
  const shown = useTweenedNumber(tile.raw);
  const trend = useMemo(
    () => kpiSeries(kind, data?.reports ?? [], channel, dates),
    [kind, data, channel, dates],
  );
  const previous = usePreviousPeriod();
  const delta =
    previous && coversRange(previous.reports, channel, previous.range)
      ? kpiDelta(kind, data?.summary[channel], previous.summary[channel])
      : null;
  const said = delta && describeDelta(delta);
  return (
    <section
      aria-label={tile.label}
      className="flex h-full flex-col rounded-xl border border-line bg-raised p-4"
    >
      <div className="flex items-start gap-1">
        <div
          className={`flex min-w-0 flex-1 items-start gap-1.5 ${chrome ? `${DRAG_HANDLE} cursor-grab active:cursor-grabbing` : ''}`}
        >
          {chrome && <DragGrip chrome={chrome} lineHeight="h-5" />}
          <h2 className="min-w-0 truncate text-sm text-ink-secondary">{tile.label}</h2>
        </div>
        {/* The 24px button against the 20px title line: pull it up so both centre. */}
        {chrome && <RemoveButton chrome={chrome} className="-my-0.5" />}
      </div>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">
          {shown === null ? tile.value : tile.format(shown)}
        </span>
        {said && (
          <span
            className={`text-xs font-medium whitespace-nowrap ${TONE[delta!.tone]}`}
            title={said.long}
          >
            <span aria-hidden>{said.short}</span>
            <span className="sr-only">{said.long}</span>
          </span>
        )}
      </p>
      <p className="mt-1 truncate text-xs text-muted">{tile.caption}</p>
      <div className="mt-2 min-h-0 flex-1">
        <Sparkline
          values={trend}
          color={channel === 'all' ? 'var(--ink-muted)' : CHANNEL_COLORS[channel]}
        />
      </div>
    </section>
  );
}

const money = (n: number | null | undefined) =>
  n === null || n === undefined ? EMPTY : formatCentsExact(n);

function RevenueWidget() {
  const { filters, range, dates, setFilters } = useDashboard();
  const { data } = useReports(range);
  const previous = usePreviousPeriod();
  const [table, setTable] = useState(false);
  const points = useMemo(() => {
    const current = dailySeries(data?.reports ?? [], filters.channel, dates);
    // Without a comparison every day's previousRevenue is null, and the line is hidden.
    const before = previous
      ? dailySeries(previous.reports, filters.channel, datesInRange(previous.range))
      : [];
    return withPrevious(current, before);
  }, [data, previous, filters.channel, dates]);
  const scope = CHANNEL_LABELS[filters.channel];
  const label = useMemo(() => describeRevenue(points, scope), [points, scope]);
  const columns = useMemo<Column<ComparedPoint>[]>(
    () => [
      { label: 'Date', cell: (p) => formatDay(p.date) },
      { label: 'Revenue', cell: (p) => money(p.revenue), numeric: true },
      { label: 'Target', cell: (p) => money(p.targetRevenue), numeric: true },
      { label: 'Ad spend', cell: (p) => money(p.spend), numeric: true },
      ...(previous
        ? [
            {
              label: 'Previous period',
              cell: (p: ComparedPoint) => money(p.previousRevenue),
              numeric: true,
            },
          ]
        : []),
    ],
    [previous],
  );
  return (
    <Panel
      title={`Revenue vs. target · ${scope}`}
      subtitle="Daily, with ad spend for comparison · drag across to zoom"
      actions={<TableToggle on={table} onChange={setTable} />}
    >
      {points.every((p) => p.revenue === null) ? (
        <WidgetEmpty>No reports for {scope} in this range yet.</WidgetEmpty>
      ) : table ? (
        <SeriesTable caption={label} columns={columns} rows={points} />
      ) : (
        <RevenueChart
          points={points}
          channel={filters.channel}
          label={label}
          onZoom={(zoomed) => setFilters(withRange(filters, zoomed))}
        />
      )}
    </Panel>
  );
}

const MIX_COLUMNS: Column<StackPoint>[] = [
  { label: 'Date', cell: (p) => formatDay(p.date) },
  ...CHANNELS.map((c) => ({
    label: CHANNEL_LABELS[c],
    cell: (p: StackPoint) => money(p[c]),
    numeric: true,
  })),
  {
    label: 'Total',
    cell: (p) =>
      CHANNELS.some((c) => p[c] !== undefined)
        ? money(CHANNELS.reduce((s, c) => s + (p[c] ?? 0), 0))
        : EMPTY,
    numeric: true,
  },
];

function ChannelMixWidget() {
  const { filters, range, dates, setFilters } = useDashboard();
  const { data } = useReports(range);
  const [table, setTable] = useState(false);
  const points = useMemo(() => channelStack(data?.reports ?? [], dates), [data, dates]);
  const label = useMemo(() => describeChannelMix(points), [points]);
  return (
    <Panel
      title="Revenue by channel"
      subtitle="Daily, stacked"
      actions={<TableToggle on={table} onChange={setTable} />}
    >
      {points.every((p) => Object.keys(p).length === 1) ? (
        <WidgetEmpty>No reports in this range yet.</WidgetEmpty>
      ) : table ? (
        <SeriesTable caption={label} columns={MIX_COLUMNS} rows={points} />
      ) : (
        <ChannelMixChart
          points={points}
          selected={filters.channel}
          label={label}
          onSelect={(channel) => setFilters(toggleChannel(filters, channel))}
        />
      )}
    </Panel>
  );
}

function ChannelsWidget() {
  const { filters, range, setFilters } = useDashboard();
  const { data } = useReports(range);
  return (
    <Panel title="Channels" subtitle="Totals for the range; select a row to focus it">
      <ChannelTable
        summary={data?.summary ?? {}}
        selected={filters.channel}
        onSelect={(channel) => setFilters(toggleChannel(filters, channel))}
      />
    </Panel>
  );
}

function CampaignsWidget() {
  const { filters, range, setFilters } = useDashboard();
  const unpaid = filters.channel !== 'all' && !PAID.has(filters.channel);
  // An unpaid channel has no campaigns: there's nothing to ask the API.
  const campaigns = useCampaigns(range, asChannel(filters.channel), !unpaid);
  return (
    <Panel
      title="Campaigns"
      subtitle={`Attributed revenue per ad campaign · ${CHANNEL_LABELS[filters.channel]}`}
    >
      {unpaid ? (
        <WidgetEmpty>
          {CHANNEL_LABELS[filters.channel]} is unpaid, so it has no campaigns.
        </WidgetEmpty>
      ) : campaigns.isError && !campaigns.data ? (
        <WidgetError onRetry={() => void campaigns.refetch()}>Couldn’t load campaigns.</WidgetError>
      ) : !campaigns.data ? (
        <WidgetSkeleton shape="table" label="Loading campaigns" />
      ) : campaigns.data.campaigns.length === 0 ? (
        <WidgetEmpty>No campaign spend in this range.</WidgetEmpty>
      ) : (
        <CampaignTable
          campaigns={campaigns.data.campaigns}
          selected={filters.campaign}
          onSelect={(c) => setFilters(toggleCampaign(filters, c.campaignId, c.channel))}
        />
      )}
    </Panel>
  );
}

const ORDER_LABELS = {
  date: { desc: 'newest first', asc: 'oldest first' },
  revenue: { desc: 'highest revenue first', asc: 'lowest revenue first' },
} as const;

function OrdersWidget() {
  const { filters, range } = useDashboard();
  const [order, setOrder] = useState<{ sort: OrderSort; dir: SortDir }>({
    sort: 'date',
    dir: 'desc',
  });
  const orders = useOrders(
    range,
    asChannel(filters.channel),
    filters.campaign,
    order.sort,
    order.dir,
  );
  const names = useCampaignNames(range);
  const rows = useMemo(() => orders.data?.pages.flatMap((p) => p.orders) ?? [], [orders.data]);
  const total = orders.data?.pages[0]?.total ?? null;
  const scope = filters.campaign ? ` · ${names.get(filters.campaign) ?? filters.campaign}` : '';
  // A header click sorts by that column, or flips the direction when it already does.
  const onSort = (sort: OrderSort) =>
    setOrder((o) => ({ sort, dir: o.sort === sort && o.dir === 'desc' ? 'asc' : 'desc' }));
  return (
    <Panel
      title={WIDGETS['table.orders'].title}
      subtitle={`${total === null ? 'Orders' : `${formatCount(total)} orders`} · ${ORDER_LABELS[order.sort][order.dir]}${scope}`}
    >
      {orders.isError && !orders.data ? (
        <WidgetError onRetry={() => void orders.refetch()}>Couldn’t load orders.</WidgetError>
      ) : !orders.data ? (
        <WidgetSkeleton shape="table" label="Loading orders" />
      ) : rows.length === 0 ? (
        <WidgetEmpty>No orders match these filters.</WidgetEmpty>
      ) : (
        <OrdersTable
          orders={rows}
          total={total}
          campaignNames={names}
          sort={order.sort}
          dir={order.dir}
          onSort={onSort}
          hasNextPage={orders.hasNextPage}
          isFetchingNextPage={orders.isFetchingNextPage}
          fetchNextPage={() => void orders.fetchNextPage()}
          pending={orders.isPlaceholderData}
        />
      )}
    </Panel>
  );
}

/** The widget component for a kind, filling its grid cell. */
export function Widget({ kind }: { kind: WidgetKind }) {
  if (isKpi(kind)) return <KpiWidget kind={kind} />;
  switch (kind) {
    case 'chart.revenue':
      return <RevenueWidget />;
    case 'chart.channelMix':
      return <ChannelMixWidget />;
    case 'table.channels':
      return <ChannelsWidget />;
    case 'table.campaigns':
      return <CampaignsWidget />;
    case 'table.orders':
      return <OrdersWidget />;
  }
}

export const widgetTitle = (kind: WidgetKind) => WIDGETS[kind].title;
