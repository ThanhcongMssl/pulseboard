import type { IsoDate } from '@pulseboard/shared';
import { env } from './env.ts';
import { affectsView } from './live.ts';

// TanStack Query keys and fetchers. Keys over a date range share one shape,
// [name, from, to, ...rest], so a reports-updated event can decide which
// cached queries it touched without knowing every endpoint.

export interface DateRange {
  from: IsoDate;
  to: IsoDate;
}

export const queryKeys = {
  reports: ({ from, to }: DateRange) => ['reports', from, to] as const,
  status: () => ['status'] as const,
};

/** Endpoints whose data doesn't depend on a date range: refetched after every rebuild. */
const RANGELESS = new Set(['status']);

/**
 * Whether a cached query is out of date once these days were rebuilt. Range
 * queries only when a rebuilt day falls inside their range, so a backfill of
 * last year doesn't refetch the dashboard showing this month.
 */
export function isAffected(queryKey: readonly unknown[], dates: readonly IsoDate[]): boolean {
  const [name, from, to] = queryKey;
  if (typeof name === 'string' && RANGELESS.has(name)) return true;
  if (typeof from !== 'string' || typeof to !== 'string') return true;
  return affectsView({ dates }, { from, to });
}

/** GET a path of the API as JSON; TanStack Query passes the abort signal. */
export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, { signal, cache: 'no-store' });
  if (!res.ok) throw new Error(`API responded ${res.status}`);
  return (await res.json()) as T;
}
