import express from 'express';
import type { Db } from '@pulseboard/db';
import type { Redis } from 'ioredis';

export interface AppDeps {
  db: Db;
  redis: Redis;
}

const check = async (probe: () => Promise<unknown>) => {
  try {
    await probe();
    return 'ok' as const;
  } catch {
    return 'error' as const;
  }
};

export function createApp({ db, redis }: AppDeps) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());

  app.get('/health', async (_req, res) => {
    const [mongo, redisStatus] = await Promise.all([
      check(() => db.command({ ping: 1 })),
      check(() => redis.ping()),
    ]);
    const healthy = mongo === 'ok' && redisStatus === 'ok';
    res.status(healthy ? 200 : 503).json({ mongo, redis: redisStatus });
  });

  return app;
}
