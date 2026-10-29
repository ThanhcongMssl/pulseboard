'use client';

import type { ReportsUpdatedEvent, WsMessage } from '@pulseboard/shared';
import { useEffect, useRef, useState } from 'react';
import { env } from '../../lib/env.ts';
import { backoffMs } from '../../lib/live.ts';

export type LiveStatus = 'connecting' | 'live' | 'reconnecting' | 'offline';

interface Handlers {
  onUpdate(event: ReportsUpdatedEvent): void;
  /** The socket came back after a drop: events may have been missed. */
  onReconnect(): void;
}

/** After this many failed reconnects the badge says Offline (it keeps retrying). */
const OFFLINE_AFTER = 3;

/** Subscribe to /ws, reconnecting with capped exponential backoff. */
export function useLive(handlers: Handlers): LiveStatus {
  const [status, setStatus] = useState<LiveStatus>('connecting');
  // Latest handlers without reconnecting the socket when they change.
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    let socket: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    let wasConnected = false;
    let disposed = false;

    const connect = () => {
      socket = new WebSocket(env.NEXT_PUBLIC_WS_URL);
      socket.onopen = () => {
        if (wasConnected) latest.current.onReconnect();
        wasConnected = true;
        failures = 0;
        setStatus('live');
      };
      socket.onmessage = (message) => {
        const data = JSON.parse(String(message.data)) as WsMessage;
        if (data.type === 'reports.updated') latest.current.onUpdate(data);
      };
      socket.onclose = () => {
        if (disposed) return;
        setStatus(failures >= OFFLINE_AFTER ? 'offline' : 'reconnecting');
        timer = setTimeout(connect, backoffMs(failures++));
      };
    };
    connect();

    return () => {
      disposed = true;
      clearTimeout(timer);
      socket?.close();
    };
  }, []);

  return status;
}
