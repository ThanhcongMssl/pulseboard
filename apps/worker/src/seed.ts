import { ALL_CHANNELS, DATA_VERSION, lastNDays, type IsoDate } from '@pulseboard/shared';
import { collections, type Db } from '@pulseboard/db';

/**
 * The days of `window` still to build: those without a totals row built by
 * the current DATA_VERSION. Pure, so the boot decision is tested without Mongo.
 */
export function staleDays(window: readonly IsoDate[], upToDate: Iterable<IsoDate>): IsoDate[] {
  const done = new Set(upToDate);
  return window.filter((date) => !done.has(date));
}

/**
 * The days of the last `days` that a seed must (re)build. An empty database,
 * one built by an older pipeline, and a seed cut short by a restart all heal
 * the same way, and a finished seed returns nothing, so restarts are cheap.
 */
export async function daysToSeed(db: Db, days: number): Promise<IsoDate[]> {
  const window = lastNDays(days);
  const built = await collections(db)
    .reportsDaily.find(
      {
        channel: ALL_CHANNELS,
        date: { $gte: window[0]!, $lte: window.at(-1)! },
        dataVersion: DATA_VERSION,
      },
      { projection: { _id: 0, date: 1 } },
    )
    .toArray();
  return staleDays(
    window,
    built.map((r) => r.date),
  );
}
