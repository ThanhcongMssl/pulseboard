'use client';

import { useEffect, useState } from 'react';
import type { LiveUpdate } from './useLiveQueries.ts';

/** How long an update stays up unless dismissed. */
const SHOW_MS = 6_000;

/**
 * Announces new data for the range on screen. The live region is always in
 * the DOM, so screen readers announce the message when it appears in it.
 */
export function Toast({ update }: { update: LiveUpdate | null }) {
  const [hidden, setHidden] = useState<number | null>(null);
  const visible = update !== null && hidden !== update.id;

  useEffect(() => {
    if (!update) return;
    const timer = setTimeout(() => setHidden(update.id), SHOW_MS);
    return () => clearTimeout(timer);
  }, [update]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-50 flex justify-end"
    >
      {visible && (
        <div
          key={update.id}
          className="toast pointer-events-auto flex items-center gap-3 rounded-xl border border-line bg-raised py-2.5 pr-2 pl-4 text-sm shadow-lg"
        >
          <span aria-hidden className="size-2 rounded-full bg-good" />
          {update.message}
          <button
            type="button"
            onClick={() => setHidden(update.id)}
            aria-label="Dismiss"
            className="rounded-md p-1 text-muted hover:bg-line hover:text-ink"
          >
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              className="size-3.5"
              fill="none"
              stroke="currentColor"
            >
              <path d="M4 4l8 8M12 4l-8 8" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
