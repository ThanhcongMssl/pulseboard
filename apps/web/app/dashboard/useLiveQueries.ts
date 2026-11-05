'use client';

import type { IsoDate, ReportChannel } from '@pulseboard/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { affectsView } from '../../lib/live.ts';
import { isAffected, isPipelineQuery, type DateRange } from '../../lib/queries.ts';
import { describeUpdate } from '../../lib/updates.ts';
import { useLive, type LiveStatus } from './useLive.ts';

/** A backfill rebuilds many days in a burst; invalidate once it settles. */
const INVALIDATE_DEBOUNCE_MS = 500;

/** A rebuild that touched the range on screen, to announce. `id` tells repeats apart. */
export interface LiveUpdate {
  id: number;
  message: string;
}

/**
 * Keep the query cache in sync with the API's reports-updated events. Rebuilt
 * dates are collected over a short window, then only the queries whose range
 * contains one of them are invalidated (active ones refetch). After a
 * reconnect, events may have been missed, so all pipeline queries are. When a
 * burst touched `range`, it becomes the latest update to announce.
 */
export function useLiveQueries(range: DateRange): {
  status: LiveStatus;
  update: LiveUpdate | null;
} {
  const queryClient = useQueryClient();
  const [update, setUpdate] = useState<LiveUpdate | null>(null);
  const view = useRef(range);
  useEffect(() => {
    view.current = range;
  });
  const pending = useRef<{
    dates: Set<IsoDate>;
    channels: Set<ReportChannel>;
    all: boolean;
    timer?: number;
  }>({ dates: new Set(), channels: new Set(), all: false });
  useEffect(() => () => clearTimeout(pending.current.timer), []);

  const flush = () => {
    const { dates, channels, all } = pending.current;
    pending.current = { dates: new Set(), channels: new Set(), all: false };
    const rebuilt = [...dates];
    void queryClient.invalidateQueries({
      predicate: (query) =>
        all ? isPipelineQuery(query.queryKey) : isAffected(query.queryKey, rebuilt),
    });
    const shown = rebuilt.filter((d) => affectsView({ dates: [d] }, view.current));
    const message = describeUpdate(shown, [...channels]);
    if (message) setUpdate((u) => ({ id: (u?.id ?? 0) + 1, message }));
  };

  const schedule = (dates: readonly IsoDate[] | 'all', channels: readonly ReportChannel[] = []) => {
    const p = pending.current;
    if (dates === 'all') p.all = true;
    else for (const date of dates) p.dates.add(date);
    for (const channel of channels) p.channels.add(channel);
    clearTimeout(p.timer);
    p.timer = window.setTimeout(flush, INVALIDATE_DEBOUNCE_MS);
  };

  const status = useLive({
    onUpdate: (event) => schedule(event.dates, event.channels),
    onReconnect: () => schedule('all'),
  });
  return { status, update };
}
