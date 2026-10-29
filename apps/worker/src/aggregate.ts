import type { Job } from 'bullmq';
import type { AggregateJobData } from '@pulseboard/shared';
import type { IngestResult } from './ingest.ts';

/**
 * Runs once every ingest child of the day's flow has finished (or failed
 * past its retries). Keys of both maps are BullMQ job keys of the children.
 */
export async function aggregateProcessor(job: Job<AggregateJobData>) {
  const ingested = await job.getChildrenValues<IngestResult>();
  const failed = await job.getIgnoredChildrenFailures();

  // TODO(Day 3): rebuild reports_daily for job.data.date from the raw
  // collections in one transaction, then publish REPORTS_UPDATED_CHANNEL.

  const records = Object.values(ingested).reduce((sum, r) => sum + r.recordCount, 0);
  const staleNote = Object.keys(failed).length ? `, ${Object.keys(failed).length} stale` : '';
  console.log(
    `aggregate ${job.data.date}: ${Object.keys(ingested).length} sources, ${records} records${staleNote}`,
  );
  return { date: job.data.date, staleSources: Object.keys(failed).length };
}
