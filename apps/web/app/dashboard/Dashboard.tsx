'use client';

import { datesInRange } from '@pulseboard/shared';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { env } from '../../lib/env.ts';
import {
  filtersToSearch,
  parseFilters,
  toQuery,
  type Filters as FilterState,
} from '../../lib/filters.ts';
import { formatDay } from '../../lib/format.ts';
import { staleDays } from '../../lib/series.ts';
import { addWidget } from '../../lib/widgets.ts';
import { DashboardProvider, type DashboardState } from './DashboardContext.tsx';
import { DashboardSkeleton } from './DashboardSkeleton.tsx';
import { useReports, useStatus } from './data.ts';
import { Filters } from './Filters.tsx';
import { LayoutToolbar } from './LayoutToolbar.tsx';
import { LiveBadge } from './LiveBadge.tsx';
import { ScopeBar } from './ScopeBar.tsx';
import { StaleBanner } from './StaleBanner.tsx';
import { ThemeToggle } from './ThemeToggle.tsx';
import { useLiveQueries } from './useLiveQueries.ts';
import { useSavedLayout } from './useSavedLayout.ts';
import { WidgetGrid } from './WidgetGrid.tsx';

export function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const range = useMemo(() => toQuery(filters), [filters]);
  const dates = useMemo(() => datesInRange(range), [range]);
  const reports = useReports(range);
  const status = useStatus();
  const live = useLiveQueries();
  const layout = useSavedLayout();
  const [editing, setEditing] = useState(false);

  const state = useMemo<DashboardState>(
    () => ({
      filters,
      range,
      dates,
      setFilters: (next: FilterState) =>
        router.push(`${pathname}${filtersToSearch(next)}`, { scroll: false }),
    }),
    [filters, range, dates, router, pathname],
  );
  const stale = useMemo(() => staleDays(reports.data?.reports ?? []), [reports.data]);

  return (
    <DashboardProvider value={state}>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Pulseboard</h1>
            <p className="text-sm text-muted">
              {formatDay(range.from)} – {formatDay(range.to)} · simulated data from 5 sources
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LiveBadge status={live} lastComputedAt={status.data?.lastComputedAt ?? null} />
          </div>
        </header>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Filters filters={filters} onChange={state.setFilters} />
            {layout.items && (
              <LayoutToolbar
                items={layout.items}
                editing={editing}
                onToggleEditing={() => setEditing((e) => !e)}
                onAdd={(kind) => layout.commit(addWidget(layout.items!, kind))}
                canUndo={layout.canUndo}
                canRedo={layout.canRedo}
                onUndo={layout.undo}
                onRedo={layout.redo}
                isDefault={layout.isDefault}
                onReset={layout.reset}
                saveState={layout.saveState}
                onRetrySave={layout.retrySave}
              />
            )}
          </div>
          <ScopeBar />
        </div>

        {reports.isError && !reports.data ? (
          <div role="alert" className="rounded-xl border border-line bg-raised p-6">
            <p className="font-medium">Couldn’t load reports</p>
            <p className="mt-1 text-sm text-muted">
              {reports.error.message}. Is the API running on {env.NEXT_PUBLIC_API_URL}?
            </p>
            <button
              type="button"
              onClick={() => void reports.refetch()}
              className="mt-4 rounded-lg bg-ink px-3 py-1.5 text-sm text-page"
            >
              Retry
            </button>
          </div>
        ) : !reports.data || !layout.items ? (
          <DashboardSkeleton />
        ) : reports.data.reports.length === 0 ? (
          <div className="rounded-xl border border-line bg-raised p-6">
            <p className="font-medium">No reports in this range yet</p>
            <p className="mt-1 text-sm text-muted">
              Start the worker and run <code className="rounded bg-line px-1">pnpm backfill</code>.
            </p>
          </div>
        ) : (
          <div
            className={`space-y-6 transition-opacity ${reports.isFetching ? 'opacity-60' : ''}`}
            aria-busy={reports.isFetching}
          >
            <StaleBanner days={stale} />
            {layout.items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line p-10 text-center">
                <p className="font-medium">This dashboard is empty</p>
                <p className="mt-1 text-sm text-muted">
                  Add a widget from the library, or reset to the default layout.
                </p>
              </div>
            ) : (
              <WidgetGrid items={layout.items} editing={editing} onCommit={layout.commit} />
            )}
          </div>
        )}
      </div>
    </DashboardProvider>
  );
}
