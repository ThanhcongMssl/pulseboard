import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocket, WebSocketServer } from 'ws';
import type { ReportsUpdatedEvent, WsMessage } from '@pulseboard/shared';
import { createLiveRelay, type LiveRelay } from './live.ts';

const event: ReportsUpdatedEvent = {
  type: 'reports.updated',
  dates: ['2026-10-29'],
  channels: ['paid_social', 'all'],
  computedAt: '2026-10-29T08:00:00.000Z',
};

/** A client that records every message it receives. */
async function connect(port: number) {
  const socket = new WebSocket(`ws://localhost:${port}`);
  const messages: WsMessage[] = [];
  socket.on('message', (data) => messages.push(JSON.parse(String(data))));
  await once(socket, 'open');
  await vi.waitFor(() => expect(messages).toHaveLength(1)); // hello
  return { socket, messages };
}

describe('createLiveRelay', () => {
  let wss: WebSocketServer;
  let live: LiveRelay;
  let port: number;

  beforeEach(async () => {
    wss = new WebSocketServer({ port: 0 });
    await once(wss, 'listening');
    port = (wss.address() as AddressInfo).port;
    live = createLiveRelay(wss);
  });

  afterEach(async () => {
    live.close();
    for (const socket of wss.clients) socket.terminate();
    await new Promise((resolve) => wss.close(resolve));
  });

  it('greets each client and forwards a valid event to all of them', async () => {
    const a = await connect(port);
    const b = await connect(port);
    expect(a.messages).toEqual([{ type: 'hello' }]);

    live.relay(JSON.stringify(event));
    await vi.waitFor(() => {
      expect(a.messages).toEqual([{ type: 'hello' }, event]);
      expect(b.messages).toEqual([{ type: 'hello' }, event]);
    });
  });

  it('drops messages that are not valid events', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const a = await connect(port);

    live.relay('not json');
    live.relay(JSON.stringify({ ...event, dates: ['yesterday'] }));
    live.relay(JSON.stringify(event));

    await vi.waitFor(() => expect(a.messages).toEqual([{ type: 'hello' }, event]));
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it('skips clients that have closed', async () => {
    const a = await connect(port);
    const b = await connect(port);
    b.socket.close();
    await once(b.socket, 'close');

    live.relay(JSON.stringify(event));
    await vi.waitFor(() => expect(a.messages).toHaveLength(2));
    expect(b.messages).toHaveLength(1);
  });
});

describe('heartbeat', () => {
  it('terminates a client that stops answering pings', async () => {
    const wss = new WebSocketServer({ port: 0 });
    await once(wss, 'listening');
    const live = createLiveRelay(wss, { heartbeatMs: 20 });
    // autoPong: false makes this client ignore pings, like a dead connection.
    const socket = new WebSocket(`ws://localhost:${(wss.address() as AddressInfo).port}`, {
      autoPong: false,
    });
    await once(socket, 'open');

    await once(socket, 'close');
    await vi.waitFor(() => expect(wss.clients.size).toBe(0));

    live.close();
    await new Promise((resolve) => wss.close(resolve));
  });
});
