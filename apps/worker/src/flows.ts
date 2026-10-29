import type { FlowJob, FlowProducer } from 'bullmq';
import {
  QUEUES,
  SOURCES,
  type AggregateJobData,
  type IngestJobData,
  type IsoDate,
  type Source,
} from '@pulseboard/shared';

/** Id of the ingest job for one source in one flow. (BullMQ job ids may not contain ":".) */
export const ingestJobId = (source: Source, date: IsoDate, runId: string) =>
  `ingest-${source}-${date}-${runId}`;

// Finished jobs are kept for inspection but capped, so Redis doesn't grow forever.
const keep = { removeOnComplete: { count: 1_000 }, removeOnFail: { count: 5_000 } };

/**
 * The flow that refreshes one day: an aggregate job (parent) that BullMQ
 * holds until all ingest jobs (children) have finished.
 *
 * Children retry with backoff, and ignoreDependencyOnFailure lets the
 * aggregate run even if a source still fails after its last retry; that
 * source is then flagged stale in ingest_runs.
 *
 * `runId` makes the job ids unique per trigger, so a later schedule tick can
 * refresh the same day again. The aggregate gets it too, to map its children
 * back to sources.
 */
export function dateFlow(date: IsoDate, runId: string): FlowJob {
  return {
    name: 'aggregate',
    queueName: QUEUES.aggregate,
    data: { date, runId } satisfies AggregateJobData,
    opts: { jobId: `aggregate-${date}-${runId}`, ...keep },
    children: SOURCES.map((source) => ({
      name: 'ingest',
      queueName: QUEUES.ingest,
      data: { source, date } satisfies IngestJobData,
      opts: {
        jobId: ingestJobId(source, date, runId),
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        ignoreDependencyOnFailure: true,
        ...keep,
      },
    })),
  };
}

export async function addDateFlows(
  flows: FlowProducer,
  dates: readonly IsoDate[],
  runId: string,
): Promise<void> {
  await flows.addBulk(dates.map((date) => dateFlow(date, runId)));
}
