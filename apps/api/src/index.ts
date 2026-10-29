import { createServer } from 'node:http';
import { Redis } from 'ioredis';
import { WebSocketServer } from 'ws';
import { closeMongo, connectMongo, ensureIndexes } from '@pulseboard/db';
import { createApp } from './app.ts';
import { env } from './env.ts';

const db = await connectMongo(env.MONGO_URL);
await ensureIndexes(db);
const redis = new Redis(env.REDIS_URL);

const server = createServer(createApp({ db, redis }));

// Dashboards connect here for "reports updated" pushes (wired up on Day 4).
const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'hello' }));
});

server.listen(env.API_PORT, () => {
  console.log(`api listening on http://localhost:${env.API_PORT}`);
});

async function shutdown() {
  wss.close();
  server.close();
  redis.disconnect();
  await closeMongo();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
