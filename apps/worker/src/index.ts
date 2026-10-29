import { FlowProducer, Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { closeMongo, collections, connectMongo, ensureIndexes } from '@pulseboard/db';
import {
  lastNDays,
  QUEUES,
  SOURCES,
  type AggregateJobData,
  type IngestJobData,
  type ScheduleJobData,
} from '@pulseboard/shared';
import { aggregateProcessor } from './aggregate.ts';
import { connection, env } from './env.ts';
import { addDateFlows } from './flows.ts';
import { ingestProcessor, type IngestResult } from './ingest.ts';

const db = await connectMongo(env.MONGO_URL);
await ensureIndexes(db);

const flows = new FlowProducer({ connection });
// Publishes reports-updated events; the API relays them to dashboards.
const publisher = new Redis(env.REDIS_URL);
const scheduleQueue = new Queue<ScheduleJobData>(QUEUES.schedule, { connection });

const workers = [
  new Worker<IngestJobData, IngestResult>(
    QUEUES.ingest,
    ingestProcessor(db, env.CONNECTOR_FAILURE_RATE),
    { connection, concurrency: SOURCES.length },
  ),
  new Worker<AggregateJobData>(QUEUES.aggregate, aggregateProcessor(db, publisher), { connection }),
  // Each tick refreshes yesterday too, for data that lands late upstream.
  new Worker<ScheduleJobData>(
    QUEUES.schedule,
    (job) => addDateFlows(flows, lastNDays(job.data.days), String(job.timestamp)),
    { connection },
  ),
];

for (const worker of workers) {
  worker.on('failed', (job, err) => {
    const attempt = job ? `${job.attemptsMade}/${job.opts.attempts ?? 1}` : '';
    console.warn(`${worker.name} ${job?.id ?? ''} failed ${attempt}: ${err.message}`);
  });
}

// Upserting the scheduler is idempotent, so restarts and extra worker replicas
// keep a single schedule.
await scheduleQueue.upsertJobScheduler(
  'ingest-recent',
  { every: env.INGEST_EVERY_MINUTES * 60_000 },
  { name: 'ingest-recent', data: { days: 2 } },
);
console.log(`worker running; ingesting today and yesterday every ${env.INGEST_EVERY_MINUTES} min`);

// Seed only into an empty database, so restarts never re-queue the history.
if (env.SEED_DAYS > 0 && (await collections(db).reportsDaily.estimatedDocumentCount()) === 0) {
  await addDateFlows(flows, lastNDays(env.SEED_DAYS), String(Date.now()));
  console.log(`no reports yet; queued ${env.SEED_DAYS} days of history`);
}

async function shutdown() {
  await Promise.all(workers.map((w) => w.close()));
  await Promise.all([flows.close(), scheduleQueue.close(), publisher.quit()]);
  await closeMongo();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
