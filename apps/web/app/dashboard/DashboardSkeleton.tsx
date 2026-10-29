'use client';

import { useEffect, useState } from 'react';

const block = 'animate-pulse rounded-lg bg-line';

/** After this long, explain the wait: the hosted API may be waking from sleep. */
const SLOW_AFTER_MS = 4_000;

export function DashboardSkeleton() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div aria-busy="true" aria-label="Loading dashboard" className="space-y-6">
      {slow && (
        <p role="status" className="text-sm text-muted">
          Still loading. The hosted demo’s API sleeps when idle on a free plan, and waking it takes
          up to a minute.
        </p>
      )}
      <div className={`${block} h-10 w-64`} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={`${block} h-24`} />
        ))}
      </div>
      <div className={`${block} h-80`} />
    </div>
  );
}
