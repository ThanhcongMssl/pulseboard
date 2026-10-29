'use client';

import { useEffect, useState } from 'react';
import { formatRelative } from '../../lib/format.ts';
import type { LiveStatus } from './useLive.ts';

const LABELS: Record<LiveStatus, { text: string; color: string }> = {
  connecting: { text: 'Connecting', color: 'var(--ink-muted)' },
  live: { text: 'Live', color: 'var(--status-good)' },
  reconnecting: { text: 'Reconnecting', color: 'var(--status-warning)' },
  offline: { text: 'Offline', color: 'var(--status-critical)' },
};

/** Connection state (always as text, the dot is only a cue) and data age. */
export function LiveBadge({
  status,
  lastComputedAt,
}: {
  status: LiveStatus;
  lastComputedAt: string | null;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(tick);
  }, []);
  // Re-anchor "just now" when new data lands rather than waiting for the tick.
  useEffect(() => setNow(new Date()), [lastComputedAt]);

  const { text, color } = LABELS[status];
  return (
    <div
      role="status"
      className="inline-flex items-center gap-2 rounded-full border border-line bg-raised px-3 py-1 text-sm"
    >
      <span className="relative flex size-2.5">
        {status === 'live' && (
          <span
            aria-hidden
            className="absolute inline-flex size-full animate-ping rounded-full opacity-60 motion-reduce:hidden"
            style={{ background: color }}
          />
        )}
        <span
          aria-hidden
          className="relative size-2.5 rounded-full"
          style={{ background: color }}
        />
      </span>
      <span className="font-medium">{text}</span>
      {lastComputedAt && (
        <span className="text-muted">· updated {formatRelative(lastComputedAt, now)}</span>
      )}
    </div>
  );
}
