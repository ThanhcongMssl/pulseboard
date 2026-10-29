import { FlowProducer } from 'bullmq';
import { z } from 'zod';
import { lastNDays } from '@pulseboard/shared';
import { connection, env } from './env.ts';
import { addDateFlows } from './flows.ts';

// Queue ingest flows for the last N days (default BACKFILL_DAYS), e.g.
// `pnpm backfill 90`. The running worker processes them. This is a separate
// command so worker restarts don't re-ingest the whole history.

const days = z.coerce.number().int().positive().default(env.BACKFILL_DAYS).parse(process.argv[2]);
const dates = lastNDays(days);

const flows = new FlowProducer({ connection });
await addDateFlows(flows, dates, String(Date.now()));
await flows.close();
console.log(`queued ${days} days of ingest flows: ${dates[0]} to ${dates.at(-1)}`);
