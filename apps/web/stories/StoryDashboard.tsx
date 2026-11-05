import { datesInRange } from '@pulseboard/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { DashboardProvider } from '../app/dashboard/DashboardContext.tsx';
import { WidgetChromeContext } from '../app/dashboard/Panel.tsx';
import { DEFAULT_FILTERS, type Filters } from '../lib/filters.ts';
import { queryKeys } from '../lib/queries.ts';
import { campaigns, PREVIOUS, RANGE, reports } from './fixtures.ts';

/**
 * What a widget needs from the page, without the page: the dashboard context
 * for `filters` over the fixture range, and a query cache already holding
 * the fixture responses, so stories never touch the network.
 */
export function StoryDashboard({
  filters,
  editing = false,
  height = 360,
  children,
}: {
  filters?: Partial<Filters>;
  editing?: boolean;
  height?: number;
  children: ReactNode;
}) {
  const [client] = useState(() => {
    const qc = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false } },
    });
    qc.setQueryData(queryKeys.reports(RANGE), reports(RANGE));
    qc.setQueryData(queryKeys.reports(PREVIOUS), reports(PREVIOUS, 2));
    const all = campaigns(RANGE);
    qc.setQueryData(queryKeys.campaigns(RANGE, null), all);
    for (const channel of ['paid_social', 'paid_search'] as const)
      qc.setQueryData(queryKeys.campaigns(RANGE, channel), {
        ...all,
        channel,
        campaigns: all.campaigns.filter((c) => c.channel === channel),
      });
    return qc;
  });
  const state = {
    filters: { ...DEFAULT_FILTERS, range: RANGE, ...filters },
    range: RANGE,
    dates: datesInRange(RANGE),
    setFilters: () => {},
  };
  const chrome = editing ? { title: 'Widget', onRemove() {}, onMove() {}, onResize() {} } : null;
  return (
    <QueryClientProvider client={client}>
      <DashboardProvider value={state}>
        <WidgetChromeContext value={chrome}>
          <div style={{ height }}>{children}</div>
        </WidgetChromeContext>
      </DashboardProvider>
    </QueryClientProvider>
  );
}
