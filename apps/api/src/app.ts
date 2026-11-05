import express, { type ErrorRequestHandler } from 'express';
import type { Db } from '@pulseboard/db';
import type { Redis } from 'ioredis';
import { cors } from './cors.ts';
import { campaignsRouter } from './routes/campaigns.ts';
import { layoutsRouter } from './routes/layouts.ts';
import { ordersRouter } from './routes/orders.ts';
import { reportsRouter } from './routes/reports.ts';
import { statusRouter } from './routes/status.ts';

export interface AppDeps {
  db: Db;
  redis: Redis;
  webOrigin: string;
}

const check = async (probe: () => Promise<unknown>) => {
  try {
    await probe();
    return 'ok' as const;
  } catch {
    return 'error' as const;
  }
};

// JSON instead of Express's HTML error page; details stay in the log.
// Body-parser errors (malformed JSON, a body over the limit) carry a 4xx status.
const onError: ErrorRequestHandler = (err: { status?: unknown }, _req, res, _next) => {
  if (typeof err.status === 'number' && err.status >= 400 && err.status < 500) {
    res.status(err.status).json({ error: 'bad_request' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'internal' });
};

export function createApp({ db, redis, webOrigin }: AppDeps) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors(webOrigin));
  // Only layouts have a body; 40 widgets fit in a few KB.
  app.use(express.json({ limit: '16kb' }));

  app.get('/health', async (_req, res) => {
    const [mongo, redisStatus] = await Promise.all([
      check(() => db.command({ ping: 1 })),
      check(() => redis.ping()),
    ]);
    const healthy = mongo === 'ok' && redisStatus === 'ok';
    res.status(healthy ? 200 : 503).json({ mongo, redis: redisStatus });
  });

  app.use(reportsRouter(db));
  app.use(campaignsRouter(db));
  app.use(ordersRouter(db));
  app.use(statusRouter(db));
  app.use(layoutsRouter(db));

  app.use((_req, res) => {
    res.status(404).json({ error: 'not_found' });
  });
  app.use(onError);

  return app;
}
