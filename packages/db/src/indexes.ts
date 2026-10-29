import type { Db } from 'mongodb';
import { collections } from './collections.ts';

/**
 * Create every index the app relies on. Idempotent (createIndex is a no-op
 * when the index already exists), so api and worker both call it at startup.
 *
 * The unique indexes on raw collections are the natural keys that ingest
 * upserts match on; they enforce idempotency at the database level too.
 */
export async function ensureIndexes(db: Db): Promise<void> {
  const c = collections(db);
  await Promise.all([
    c.rawAdSpend.createIndex({ source: 1, date: 1, campaignId: 1 }, { unique: true }),
    c.rawAdSpend.createIndex({ date: 1, channel: 1 }),

    c.rawTraffic.createIndex({ source: 1, date: 1, channel: 1 }, { unique: true }),
    // The aggregate reads a day across sources; the unique key leads with source.
    c.rawTraffic.createIndex({ date: 1, channel: 1 }),

    c.rawOrders.createIndex({ source: 1, orderId: 1 }, { unique: true }),
    c.rawOrders.createIndex({ date: 1, channel: 1 }),

    c.rawTargets.createIndex({ month: 1, channel: 1 }, { unique: true }),

    // Dashboard reads: a date range across channels, or one channel over time.
    c.reportsDaily.createIndex({ date: 1, channel: 1 }, { unique: true }),
    c.reportsDaily.createIndex({ channel: 1, date: 1 }),
    // Freshness: the latest rebuild across all days.
    c.reportsDaily.createIndex({ computedAt: -1 }),

    // One doc per job attempt; a restarted attempt overwrites its own doc.
    c.ingestRuns.createIndex({ jobId: 1, attempt: 1 }, { unique: true }),
    c.ingestRuns.createIndex({ source: 1, date: 1, startedAt: -1 }),
    c.ingestRuns.createIndex({ finishedAt: -1 }),
  ]);
}
