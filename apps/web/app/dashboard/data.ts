'use client';

import type {
  CampaignsResponse,
  Channel,
  OrdersResponse,
  ReportsResponse,
  StatusResponse,
} from '@pulseboard/shared';
import type { OrderSort, SortDir } from '@pulseboard/shared';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getJson, queryKeys, type DateRange } from '../../lib/queries.ts';

// One hook per endpoint. Widgets call them for what they show; TanStack Query
// shares a single request and cache entry between every widget with the same
// key, and keeps the previous range on screen (dimmed) while the next loads.

/** Every channel for the range: the table and mix chart need them all, so switching channel is instant. */
export const useReports = (range: DateRange, enabled = true) =>
  useQuery({
    queryKey: queryKeys.reports(range),
    enabled,
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

export const useCampaigns = (range: DateRange, channel: Channel | null, enabled = true) =>
  useQuery({
    queryKey: queryKeys.campaigns(range, channel),
    enabled,
    queryFn: ({ signal }) =>
      getJson<CampaignsResponse>(`/campaigns?${params(range, { channel })}`, signal),
    placeholderData: keepPreviousData,
  });

/**
 * Campaign names by id over the range, for labels outside the campaign table.
 * Shares its cache entry with the campaign widget when that shows every channel.
 */
export function useCampaignNames(range: DateRange): Map<string, string> {
  const { data } = useCampaigns(range, null);
  return useMemo(() => new Map(data?.campaigns.map((c) => [c.campaignId, c.campaignName])), [data]);
}

/** Rows per /orders page: the API's maximum, so a long scroll makes few requests. */
const ORDERS_PAGE = 200;

/**
 * Every order in the range, of a channel or campaign, in the chosen order:
 * keyset pages fetched one after another as the table scrolls. The first
 * page carries the total.
 */
export const useOrders = (
  range: DateRange,
  channel: Channel | null,
  campaign: string | null,
  sort: OrderSort,
  dir: SortDir,
) =>
  useInfiniteQuery({
    queryKey: queryKeys.orders(range, channel, campaign, sort, dir),
    queryFn: ({ signal, pageParam }) =>
      getJson<OrdersResponse>(
        `/orders?${params(range, {
          channel,
          campaignId: campaign,
          sort,
          dir,
          limit: String(ORDERS_PAGE),
          cursor: pageParam,
        })}`,
        signal,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    placeholderData: keepPreviousData,
  });
