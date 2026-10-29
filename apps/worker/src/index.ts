import { Queue } from 'bullmq';
import { closeMongo, connectMongo, ensureIndexes } from '@pulseboard/db';
import { QUEUES, type AggregateJobData, type IngestJobData } from '@pulseboard/shared';
import { env } from './env.ts';

const db = await connectMongo(env.MONGO_URL);
await ensureIndexes(db);

// BullMQ needs maxRetriesPerRequest: null so blocking commands are not cut off.
const connection = { url: env.REDIS_URL, maxRetriesPerRequest: null };

// Queues only for now; repeatable ingest jobs and their workers come on Day 2.
const queues = [
  new Queue<IngestJobData>(QUEUES.ingest, { connection }),
  new Queue<AggregateJobData>(QUEUES.aggregate, { connection }),
];
await Promise.all(queues.map((q) => q.waitUntilReady()));
console.log(`worker connected; queues: ${queues.map((q) => q.name).join(', ')}`);

async function shutdown() {
  await Promise.all(queues.map((q) => q.close()));
  await closeMongo();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
