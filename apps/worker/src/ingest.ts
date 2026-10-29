import type { Job } from 'bullmq';
import { connectors, withFailureRate, type DateRange } from '@pulseboard/connectors';
import { collections, upsertMany, type Db } from '@pulseboard/db';
import {
  rawAdSpendSchema,
  rawOrderSchema,
  rawTargetSchema,
  rawTrafficSchema,
  type IngestJobData,
  type Source,
} from '@pulseboard/shared';
import { finishRun, startRun } from './runs.ts';

export interface IngestResult {
  recordCount: number;
}

/**
 * Pull one day from a source, validate it, and upsert it on the natural key
 * documented in models.ts. Re-running a day overwrites the same rows.
 */
export async function runIngest(
  db: Db,
  { source, date }: IngestJobData,
  failureRate = 0,
): Promise<IngestResult> {
  const c = collections(db);
  const range: DateRange = { from: date, to: date };
  const fetch = <S extends Source>(s: S) =>
    withFailureRate(connectors[s], failureRate).fetch(range);

  let recordCount: number;
  switch (source) {
    case 'facebook_ads':
    case 'google_ads': {
      const rows = rawAdSpendSchema.array().parse(await fetch(source));
      recordCount = await upsertMany(c.rawAdSpend, rows, ['source', 'date', 'campaignId']);
      break;
    }
    case 'ga4': {
      const rows = rawTrafficSchema.array().parse(await fetch(source));
      recordCount = await upsertMany(c.rawTraffic, rows, ['source', 'date', 'channel']);
      break;
    }
    case 'shopify': {
      const rows = rawOrderSchema.array().parse(await fetch(source));
      recordCount = await upsertMany(c.rawOrders, rows, ['source', 'orderId']);
      break;
    }
    case 'sheets_targets': {
      // Targets are monthly: a one-day range returns that day's month.
      const rows = rawTargetSchema.array().parse(await fetch(source));
      recordCount = await upsertMany(c.rawTargets, rows, ['month', 'channel']);
      break;
    }
  }
  return { recordCount };
}

/** BullMQ processor: runIngest wrapped in ingest_runs bookkeeping. Rethrows so BullMQ retries. */
export const ingestProcessor =
  (db: Db, failureRate: number) =>
  async (job: Job<IngestJobData>): Promise<IngestResult> => {
    await startRun(db, job);
    try {
      const result = await runIngest(db, job.data, failureRate);
      await finishRun(db, job, result);
      return result;
    } catch (error) {
      await finishRun(db, job, { error });
      throw error;
    }
  };
