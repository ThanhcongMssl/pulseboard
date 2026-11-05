'use client';

import type {
  CampaignsResponse,
  Channel,
  OrdersResponse,
  ReportsResponse,
  StatusResponse,
} from '@pulseboard/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getJson, queryKeys, type DateRange } from '../../lib/queries.ts';

// One hook per endpoint. Widgets call them for what they show; TanStack Query
// shares a single request and cache entry between every widget with the same
// key, and keeps the previous range on screen (dimmed) while the next loads.

/** Every channel for the range: the table and mix chart need them all, so switching channel is instant. */
export const useReports = (range: DateRange) =>
  useQuery({
    queryKey: queryKeys.reports(range),
    queryFn: ({ signal }) =>
      getJson<ReportsResponse>(`/reports?from=${range.from}&to=${range.to}`, signal),
    placeholderData: keepPreviousData,
  });

export const useStatus = () =>
  useQuery({
    queryKey: queryKeys.status(),
    queryFn: ({ signal }) => getJson<StatusResponse>('/status', signal),
  });

const params = (range: DateRange, extra: Record<string, string | null>) => {
  const p = new URLSearchParams({ from: range.from, to: range.to });
  for (const [k, v] of Object.entries(extra)) if (v !== null) p.set(k, v);
  return p.toString();
};

export const useCampaigns = (range: DateRange, channel: Channel | null) =>
  useQuery({
    queryKey: queryKeys.campaigns(range, channel),
    queryFn: ({ signal }) =>
      getJson<CampaignsResponse>(`/campaigns?${params(range, { channel })}`, signal),
    placeholderData: keepPreviousData,
  });

/** The newest orders in the range: the first page only, newest first. */
export const useLatestOrders = (range: DateRange, channel: Channel | null, limit = 50) =>
  useQuery({
    queryKey: queryKeys.orders(range, channel),
    queryFn: ({ signal }) =>
      getJson<OrdersResponse>(
        `/orders?${params(range, { channel, limit: String(limit) })}`,
        signal,
      ),
    placeholderData: keepPreviousData,
  });
