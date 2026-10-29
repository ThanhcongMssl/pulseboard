import { z } from 'zod';

const envSchema = z.object({
  MONGO_URL: z.url(),
  REDIS_URL: z.url(),
  // How often the schedule re-ingests today and yesterday.
  INGEST_EVERY_MINUTES: z.coerce.number().int().positive().default(360),
  // Days of history `pnpm backfill` ingests when no count is given.
  BACKFILL_DAYS: z.coerce.number().int().positive().default(30),
  // Share of connector fetches that fail on purpose, to demo retries and stale sources.
  CONNECTOR_FAILURE_RATE: z.coerce.number().min(0).max(1).default(0),
});

export const env = envSchema.parse(process.env);

// BullMQ needs maxRetriesPerRequest: null so blocking commands are not cut off.
export const connection = { url: env.REDIS_URL, maxRetriesPerRequest: null };
