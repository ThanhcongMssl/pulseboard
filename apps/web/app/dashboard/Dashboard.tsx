'use client';

import {
  datesInRange,
  type ReportsResponse,
  type ReportsUpdatedEvent,
  type StatusResponse,
} from '@pulseboard/shared';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { CHANNEL_LABELS } from '../../lib/channels.ts';
import { env } from '../../lib/env.ts';
import {
  filtersToSearch,
  parseFilters,
  toQuery,
  type Filters as FilterState,
} from '../../lib/filters.ts';
import { formatDay } from '../../lib/format.ts';
import { affectsView } from '../../lib/live.ts';
import { channelStack, dailySeries, staleDays, targetPacing } from '../../lib/series.ts';
import { ChannelMixChart } from './ChannelMixChart.tsx';
import { ChannelTable } from './ChannelTable.tsx';
import { DashboardSkeleton } from './DashboardSkeleton.tsx';
import { Filters } from './Filters.tsx';
import { KpiCards } from './KpiCards.tsx';
import { LiveBadge } from './LiveBadge.tsx';
import { Panel } from './Panel.tsx';
import { RevenueChart } from './RevenueChart.tsx';
import { StaleBanner } from './StaleBanner.tsx';
import { useJson } from './useJson.ts';
import { useLive } from './useLive.ts';

/** A backfill rebuilds many days in a burst; refetch once it settles. */
const REFETCH_DEBOUNCE_MS = 500;

export function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const filters = parseFilters(useSearchParams());
  const { range, channel } = filters;

  // Always every channel: the table and mix chart need them all, and switching
  // channel is then instant instead of a refetch.
  const query = useMemo(() => toQuery({ range, channel: 'all' }), [range]);
  const reports = useJson<ReportsResponse>(
    `${env.NEXT_PUBLIC_API_URL}/reports?from=${query.from}&to=${query.to}`,
  );

  const status = useJson<StatusResponse>(`${env.NEXT_PUBLIC_API_URL}/status`);

  const { refetch: refetchReports } = reports;
  const { refetch: refetchStatus } = status;
  const pending = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(pending.current), []);
  const refetchSoon = useCallback(
    (includeReports: boolean) => {
      clearTimeout(pending.current);
      pending.current = setTimeout(() => {
        refetchStatus();
        if (includeReports) refetchReports();
      }, REFETCH_DEBOUNCE_MS);
    },
    [refetchReports, refetchStatus],
  );
  const live = useLive({
    onUpdate: (event: ReportsUpdatedEvent) => refetchSoon(affectsView(event, query)),
    onReconnect: () => refetchSoon(true),
  });

  const setFilters = (next: FilterState) =>
    router.replace(`${pathname}${filtersToSearch(next)}`, { scroll: false });

  const view = useMemo(() => {
    if (!reports.data) return null;
    const rows = reports.data.reports;
    const dates = datesInRange(query);
    return {
      rows,
      daily: dailySeries(rows, channel, dates),
      stack: channelStack(rows, dates),
      pacing: targetPacing(rows, channel),
      stale: staleDays(rows),
    };
  }, [reports.data, query, channel]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pulseboard</h1>
          <p className="text-sm text-muted">
            {formatDay(query.from)} – {formatDay(query.to)} · simulated data from 5 sources
          </p>
        </div>
        <LiveBadge status={live} lastComputedAt={status.data?.lastComputedAt ?? null} />
      </header>

      <Filters filters={filters} onChange={setFilters} />

      {reports.error && !reports.data ? (
        <div role="alert" className="rounded-xl border border-line bg-raised p-6">
          <p className="font-medium">Couldn’t load reports</p>
          <p className="mt-1 text-sm text-muted">
            {reports.error}. Is the API running on {env.NEXT_PUBLIC_API_URL}?
          </p>
          <button
            type="button"
            onClick={reports.refetch}
            className="mt-4 rounded-lg bg-ink px-3 py-1.5 text-sm text-page"
          >
            Retry
          </button>
        </div>
      ) : !view ? (
        <DashboardSkeleton />
      ) : view.rows.length === 0 ? (
        <div className="rounded-xl border border-line bg-raised p-6">
          <p className="font-medium">No reports in this range yet</p>
          <p className="mt-1 text-sm text-muted">
            Start the worker and run <code className="rounded bg-line px-1">pnpm backfill</code>.
          </p>
        </div>
      ) : (
        <div
          className={`space-y-6 transition-opacity ${reports.loading ? 'opacity-60' : ''}`}
          aria-busy={reports.loading}
        >
          <StaleBanner days={view.stale} />
          <KpiCards
            channel={channel}
            summary={reports.data?.summary[channel]}
            pacing={view.pacing}
          />
          <div className={`grid gap-6 ${channel === 'all' ? 'lg:grid-cols-2' : ''}`}>
            <Panel
              title={`Revenue vs. target · ${CHANNEL_LABELS[channel]}`}
              subtitle="Daily, with ad spend for comparison"
            >
              <RevenueChart points={view.daily} channel={channel} />
            </Panel>
            {channel === 'all' && (
              <Panel title="Revenue by channel" subtitle="Daily, stacked">
                <ChannelMixChart points={view.stack} />
              </Panel>
            )}
          </div>
          <Panel title="Channels" subtitle="Totals for the range; select a row to focus it">
            <ChannelTable
              summary={reports.data?.summary ?? {}}
              selected={channel}
              onSelect={(next) => setFilters({ ...filters, channel: next })}
            />
          </Panel>
        </div>
      )}
    </div>
  );
}
