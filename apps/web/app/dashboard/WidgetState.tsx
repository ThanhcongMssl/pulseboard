import type { ReactNode } from 'react';

// The states a widget's body can be in besides showing data. Each fills the
// widget's body, so the card keeps its size while loading or failing.

const block = 'animate-pulse rounded bg-line motion-reduce:animate-none';

/** Placeholder shaped like what's coming: bars for a chart, rows for a table. */
export function WidgetSkeleton({ shape, label }: { shape: 'chart' | 'table'; label: string }) {
  return (
    <div role="status" aria-label={label} className="flex h-full flex-col gap-2 overflow-hidden">
      {shape === 'chart' ? (
        <div className="flex flex-1 items-end gap-1.5 pt-4">
          {[55, 70, 45, 80, 60, 75, 50, 85, 65, 72, 58, 68].map((h, i) => (
            <div key={i} className={`${block} flex-1`} style={{ height: `${h}%` }} />
          ))}
        </div>
      ) : (
        Array.from({ length: 8 }, (_, i) => <div key={i} className={`${block} h-6 shrink-0`} />)
      )}
    </div>
  );
}

/** Nothing to show, and why. */
export function WidgetEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center text-center text-sm text-muted">
      <p className="max-w-xs">{children}</p>
    </div>
  );
}

/** The widget's request failed: say so, and offer to try again. */
export function WidgetError({ children, onRetry }: { children: ReactNode; onRetry(): void }) {
  return (
    <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 text-sm">
      <p className="text-ink-secondary">{children}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg border border-line bg-raised px-3 py-1.5 hover:bg-line"
      >
        Retry
      </button>
    </div>
  );
}
