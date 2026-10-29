import type { Job } from 'bullmq';
import type { Redis } from 'ioredis';
import { collections, type Db } from '@pulseboard/db';
import {
  monthOf,
  REPORTS_UPDATED_CHANNEL,
  SOURCES,
  type AggregateJobData,
  type Channel,
  type IsoDate,
  type RawTarget,
  type ReportDaily,
  type ReportsUpdatedEvent,
  type Source,
} from '@pulseboard/shared';
import { ingestJobId } from './flows.ts';
import { buildDailyReports, type ChannelSums } from './reports.ts';

interface DayRawData {
  sums: Partial<Record<Channel, ChannelSums>>;
  targets: RawTarget[];
}

/**
 * Sum one day's raw data per channel. All reads share a snapshot session, so
 * they see the database at one point in time even while ingest jobs for other
 * days (or a late retry) are writing. The queries run one after another
 * because a session must not be used concurrently.
 */
export async function readDay(db: Db, date: IsoDate): Promise<DayRawData> {
  const c = collections(db);
  const session = db.client.startSession({ snapshot: true });
  try {
    const spend = await c.rawAdSpend
      .aggregate<{ _id: Channel; spend: number }>(
        [{ $match: { date } }, { $group: { _id: '$channel', spend: { $sum: '$spend' } } }],
        { session },
      )
      .toArray();
    const traffic = await c.rawTraffic
      .aggregate<{ _id: Channel; sessions: number }>(
        [{ $match: { date } }, { $group: { _id: '$channel', sessions: { $sum: '$sessions' } } }],
        { session },
      )
      .toArray();
    const orders = await c.rawOrders
      .aggregate<{ _id: Channel; orders: number; revenue: number; newCustomers: number }>(
        [
          { $match: { date } },
          {
            $group: {
              _id: '$channel',
              orders: { $sum: 1 },
              revenue: { $sum: '$revenue' },
              newCustomers: { $sum: { $cond: ['$isNewCustomer', 1, 0] } },
            },
          },
        ],
        { session },
      )
      .toArray();
    const targets = await c.rawTargets
      .find({ month: monthOf(date) }, { session, projection: { _id: 0 } })
      .toArray();

    const sums: Partial<Record<Channel, ChannelSums>> = {};
    const at = (channel: Channel) =>
      (sums[channel] ??= { spend: 0, sessions: 0, orders: 0, revenue: 0, newCustomers: 0 });
    for (const row of spend) at(row._id).spend = row.spend;
    for (const row of traffic) at(row._id).sessions = row.sessions;
    for (const { _id, ...row } of orders) Object.assign(at(_id), row);
    return { sums, targets };
  } finally {
    await session.endSession();
  }
}

/**
 * Replace the day's reports in one transaction, so a reader never sees new
 * channel rows next to an old totals row. withTransaction retries transient
 * errors such as write conflicts.
 */
export async function writeReports(db: Db, docs: ReportDaily[]): Promise<void> {
  const session = db.client.startSession();
  try {
    await session.withTransaction(() =>
      collections(db).reportsDaily.bulkWrite(
        docs.map((doc) => ({
          replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
        })),
        { session },
      ),
    );
  } finally {
    await session.endSession();
  }
}

/**
 * Sources whose ingest child failed past its retries. BullMQ reports them by
 * job key (`<prefix>:<queue>:<jobId>`); job ids contain no ":", so the id is
 * whatever follows the last one.
 */
async function staleSourcesOf(job: Job<AggregateJobData>): Promise<Source[]> {
  const failedIds = new Set(
    Object.keys(await job.getIgnoredChildrenFailures()).map((key) =>
      key.slice(key.lastIndexOf(':') + 1),
    ),
  );
  const { date, runId } = job.data;
  return SOURCES.filter((source) => failedIds.has(ingestJobId(source, date, runId)));
}

/**
 * BullMQ processor for a day's flow parent. Runs once every ingest child has
 * finished (or given up): rebuilds reports_daily for the date, then tells the
 * API over Redis pub/sub so dashboards refetch.
 */
export const aggregateProcessor =
  (db: Db, redis: Redis) =>
  async (job: Job<AggregateJobData>): Promise<{ date: IsoDate; staleSources: Source[] }> => {
    const { date } = job.data;
    const staleSources = await staleSourcesOf(job);
    const computedAt = new Date();

    const docs = buildDailyReports({
      date,
      ...(await readDay(db, date)),
      staleSources,
      computedAt,
    });
    await writeReports(db, docs);

    const event: ReportsUpdatedEvent = {
      type: 'reports.updated',
      dates: [date],
      channels: docs.map((d) => d.channel),
      computedAt: computedAt.toISOString(),
    };
    await redis.publish(REPORTS_UPDATED_CHANNEL, JSON.stringify(event));

    const stale = staleSources.length ? ` (stale: ${staleSources.join(', ')})` : '';
    console.log(`aggregate ${date}: ${docs.length} reports written${stale}`);
    return { date, staleSources };
  };
