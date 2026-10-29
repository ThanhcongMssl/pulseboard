import { createServer } from 'node:http';
import { Redis } from 'ioredis';
import { WebSocketServer } from 'ws';
import { closeMongo, connectMongo, ensureIndexes } from '@pulseboard/db';
import { REPORTS_UPDATED_CHANNEL } from '@pulseboard/shared';
import { createApp } from './app.ts';
import { env } from './env.ts';
import { createLiveRelay } from './live.ts';

const db = await connectMongo(env.MONGO_URL);
await ensureIndexes(db);
const redis = new Redis(env.REDIS_URL);

const server = createServer(createApp({ db, redis, webOrigin: env.WEB_ORIGIN }));

// Dashboards connect here for "reports updated" pushes from the worker.
const wss = new WebSocketServer({ server, path: '/ws' });
const live = createLiveRelay(wss);

// A subscribed connection can only run pub/sub commands, so it is separate
// from the client /health pings.
const subscriber = redis.duplicate();
subscriber.on('message', (_channel, message: string) => live.relay(message));
await subscriber.subscribe(REPORTS_UPDATED_CHANNEL);

server.listen(env.API_PORT, () => {
  console.log(`api listening on http://localhost:${env.API_PORT}`);
});

async function shutdown() {
  live.close();
  wss.close();
  subscriber.disconnect();
  server.close();
  redis.disconnect();
  await closeMongo();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
