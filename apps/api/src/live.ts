import { WebSocket, type WebSocketServer } from 'ws';
import { reportsUpdatedEventSchema, type WsMessage } from '@pulseboard/shared';

export interface LiveRelay {
  /** Validate a raw Redis message and forward it to every open client. */
  relay(raw: string): void;
  close(): void;
}

/**
 * Pushes "reports updated" events to dashboards on /ws. Clients only listen;
 * a heartbeat drops sockets that stopped answering pings (closed laptop,
 * proxy that silently cut the connection) so they don't pile up.
 */
export function createLiveRelay(
  wss: WebSocketServer,
  { heartbeatMs = 30_000 }: { heartbeatMs?: number } = {},
): LiveRelay {
  const alive = new WeakMap<WebSocket, boolean>();
  const send = (socket: WebSocket, message: WsMessage) => socket.send(JSON.stringify(message));

  wss.on('connection', (socket) => {
    alive.set(socket, true);
    socket.on('pong', () => alive.set(socket, true));
    send(socket, { type: 'hello' });
  });

  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (!alive.get(socket)) {
        socket.terminate();
        continue;
      }
      alive.set(socket, false);
      socket.ping();
    }
  }, heartbeatMs);

  return {
    relay(raw) {
      let event;
      try {
        event = reportsUpdatedEventSchema.parse(JSON.parse(raw));
      } catch {
        console.warn(`live: dropped invalid reports-updated message: ${raw.slice(0, 200)}`);
        return;
      }
      for (const socket of wss.clients) {
        if (socket.readyState === WebSocket.OPEN) send(socket, event);
      }
    },
    close() {
      clearInterval(heartbeat);
    },
  };
}
