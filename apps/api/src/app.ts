import express, { type ErrorRequestHandler } from 'express';
import type { Db } from '@pulseboard/db';
import type { Redis } from 'ioredis';
import { cors } from './cors.ts';
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
const onError: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'internal' });
};

export function createApp({ db, redis, webOrigin }: AppDeps) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors(webOrigin));
  app.use(express.json());

  app.get('/health', async (_req, res) => {
    const [mongo, redisStatus] = await Promise.all([
      check(() => db.command({ ping: 1 })),
      check(() => redis.ping()),
    ]);
    const healthy = mongo === 'ok' && redisStatus === 'ok';
    res.status(healthy ? 200 : 503).json({ mongo, redis: redisStatus });
  });

  app.use(reportsRouter(db));
  app.use(statusRouter(db));

  app.use((_req, res) => {
    res.status(404).json({ error: 'not_found' });
  });
  app.use(onError);

  return app;
}
