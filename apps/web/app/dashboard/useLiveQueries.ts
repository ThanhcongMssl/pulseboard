'use client';

import type { IsoDate } from '@pulseboard/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { isAffected, isPipelineQuery } from '../../lib/queries.ts';
import { useLive, type LiveStatus } from './useLive.ts';

/** A backfill rebuilds many days in a burst; invalidate once it settles. */
const INVALIDATE_DEBOUNCE_MS = 500;

/**
 * Keep the query cache in sync with the API's reports-updated events. Rebuilt
 * dates are collected over a short window, then only the queries whose range
 * contains one of them are invalidated (active ones refetch). After a
 * reconnect, events may have been missed, so all pipeline queries are.
 */
export function useLiveQueries(): LiveStatus {
  const queryClient = useQueryClient();
  const pending = useRef<{ dates: Set<IsoDate>; all: boolean; timer?: number }>({
    dates: new Set(),
    all: false,
  });
  useEffect(() => () => clearTimeout(pending.current.timer), []);

  const schedule = (dates: readonly IsoDate[] | 'all') => {
    const p = pending.current;
    if (dates === 'all') p.all = true;
    else for (const date of dates) p.dates.add(date);
    clearTimeout(p.timer);
    p.timer = window.setTimeout(() => {
      const rebuilt = [...p.dates];
      const all = p.all;
      pending.current = { dates: new Set(), all: false };
      void queryClient.invalidateQueries({
        predicate: (query) =>
          all ? isPipelineQuery(query.queryKey) : isAffected(query.queryKey, rebuilt),
      });
    }, INVALIDATE_DEBOUNCE_MS);
  };

  return useLive({
    onUpdate: (event) => schedule(event.dates),
    onReconnect: () => schedule('all'),
  });
}
