'use client';

import type { Channel, ReportChannel, WidgetKind } from '@pulseboard/shared';
import { useContext, useMemo, type ReactNode } from 'react';
import { CHANNEL_LABELS } from '../../lib/channels.ts';
import { toggleCampaign, toggleChannel } from '../../lib/filters.ts';
import { isKpi, kpiTile, type KpiKind } from '../../lib/kpis.ts';
import { channelStack, dailySeries, targetPacing } from '../../lib/series.ts';
import { WIDGETS } from '../../lib/widgets.ts';
import { CampaignTable } from './CampaignTable.tsx';
import { ChannelMixChart } from './ChannelMixChart.tsx';
import { ChannelTable } from './ChannelTable.tsx';
import { useDashboard } from './DashboardContext.tsx';
import { useCampaignNames, useCampaigns, useLatestOrders, useReports } from './data.ts';
import { OrdersTable } from './OrdersTable.tsx';
import { DRAG_HANDLE, DragGrip, Panel, RemoveButton, WidgetChromeContext } from './Panel.tsx';
import { RevenueChart } from './RevenueChart.tsx';

/** The paid channel to narrow campaigns and orders to, or null for all of them. */
const asChannel = (channel: ReportChannel): Channel | null => (channel === 'all' ? null : channel);

const PAID: ReadonlySet<ReportChannel> = new Set(['paid_social', 'paid_search']);

function Note({ children }: { children: ReactNode }) {
  return <p className="flex h-full items-center justify-center text-sm text-muted">{children}</p>;
}

function KpiWidget({ kind }: { kind: KpiKind }) {
  const { filters, range } = useDashboard();
  const { data } = useReports(range);
  const chrome = useContext(WidgetChromeContext);
  const { channel } = filters;
  const pacing = useMemo(
    () => (data && kind === 'kpi.revenue' ? targetPacing(data.reports, channel) : null),
    [data, kind, channel],
  );
  const tile = kpiTile(kind, channel, data?.summary[channel], pacing);
  return (
    <section
      aria-label={tile.label}
      className="flex h-full flex-col rounded-xl border border-line bg-raised p-4"
    >
      <div className="flex items-start gap-1">
        <div
          className={`flex min-w-0 flex-1 items-start gap-1.5 ${chrome ? `${DRAG_HANDLE} cursor-grab active:cursor-grabbing` : ''}`}
        >
          {chrome && <DragGrip lineHeight="h-5" />}
          <h2 className="min-w-0 truncate text-sm text-ink-secondary">{tile.label}</h2>
        </div>
        {/* The 24px button against the 20px title line: pull it up so both centre. */}
        {chrome && <RemoveButton chrome={chrome} className="-my-0.5" />}
      </div>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{tile.value}</p>
      <p className="mt-1 truncate text-xs text-muted">{tile.caption}</p>
    </section>
  );
}

function RevenueWidget() {
  const { filters, range, dates } = useDashboard();
  const { data } = useReports(range);
  const points = useMemo(
    () => dailySeries(data?.reports ?? [], filters.channel, dates),
    [data, filters.channel, dates],
  );
  return (
    <Panel
      title={`Revenue vs. target · ${CHANNEL_LABELS[filters.channel]}`}
      subtitle="Daily, with ad spend for comparison"
    >
      <RevenueChart points={points} channel={filters.channel} />
    </Panel>
  );
}

function ChannelMixWidget() {
  const { filters, range, dates, setFilters } = useDashboard();
  const { data } = useReports(range);
  const points = useMemo(() => channelStack(data?.reports ?? [], dates), [data, dates]);
  return (
    <Panel title="Revenue by channel" subtitle="Daily, stacked">
      <ChannelMixChart
        points={points}
        selected={filters.channel}
        onSelect={(channel) => setFilters(toggleChannel(filters, channel))}
      />
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
  const campaigns = useCampaigns(range, asChannel(filters.channel));
  return (
    <Panel
      title="Campaigns"
      subtitle={`Attributed revenue per ad campaign · ${CHANNEL_LABELS[filters.channel]}`}
    >
      {unpaid ? (
        <Note>{CHANNEL_LABELS[filters.channel]} is unpaid, so it has no campaigns.</Note>
      ) : campaigns.isError && !campaigns.data ? (
        <Note>Couldn’t load campaigns.</Note>
      ) : !campaigns.data ? (
        <Note>Loading campaigns…</Note>
      ) : campaigns.data.campaigns.length === 0 ? (
        <Note>No campaign spend in this range.</Note>
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

function OrdersWidget() {
  const { filters, range } = useDashboard();
  const orders = useLatestOrders(range, asChannel(filters.channel), filters.campaign);
  const names = useCampaignNames(range);
  const total = orders.data?.total;
  const scope = filters.campaign ? ` · ${names.get(filters.campaign) ?? filters.campaign}` : '';
  return (
    <Panel
      title={WIDGETS['table.orders'].title}
      subtitle={
        (total === null || total === undefined
          ? 'Newest first'
          : `Newest ${orders.data!.orders.length} of ${total.toLocaleString('en-US')}`) + scope
      }
    >
      {orders.isError && !orders.data ? (
        <Note>Couldn’t load orders.</Note>
      ) : !orders.data ? (
        <Note>Loading orders…</Note>
      ) : orders.data.orders.length === 0 ? (
        <Note>No orders in this range.</Note>
      ) : (
        <OrdersTable orders={orders.data.orders} campaignNames={names} />
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
