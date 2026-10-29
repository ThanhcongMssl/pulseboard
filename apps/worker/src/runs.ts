import type { Job } from 'bullmq';
import { collections, type Db } from '@pulseboard/db';
import type { IngestJobData } from '@pulseboard/shared';

// ingest_runs bookkeeping: one doc per job attempt. attemptsMade only grows
// when an attempt fails, so a stalled job that BullMQ restarts rewrites the
// same doc instead of leaving an orphaned "running" one.

const runKey = (job: Job<IngestJobData>) => ({
  jobId: job.id ?? job.name,
  attempt: job.attemptsMade + 1,
});

export async function startRun(db: Db, job: Job<IngestJobData>): Promise<void> {
  await collections(db).ingestRuns.updateOne(
    runKey(job),
    {
      $set: {
        ...job.data,
        status: 'running',
        startedAt: new Date(),
        finishedAt: null,
        recordCount: null,
        error: null,
        stale: false,
      },
    },
    { upsert: true },
  );
}

export async function finishRun(
  db: Db,
  job: Job<IngestJobData>,
  outcome: { recordCount: number } | { error: unknown },
): Promise<void> {
  const update =
    'error' in outcome
      ? {
          status: 'failed' as const,
          error: outcome.error instanceof Error ? outcome.error.message : String(outcome.error),
          // No retries left: the aggregate will run on this source's last good data.
          stale: job.attemptsMade + 1 >= (job.opts.attempts ?? 1),
        }
      : { status: 'succeeded' as const, recordCount: outcome.recordCount };
  await collections(db).ingestRuns.updateOne(runKey(job), {
    $set: { ...update, finishedAt: new Date() },
  });
}
