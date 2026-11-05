'use client';

import { createContext, useContext, type ReactNode } from 'react';

/** The grid's edit controls for the widget a panel belongs to; null outside edit mode. */
export interface WidgetChrome {
  title: string;
  onRemove(): void;
}

export const WidgetChromeContext = createContext<WidgetChrome | null>(null);

/** react-grid-layout drags a widget by elements with this class. */
export const DRAG_HANDLE = 'widget-drag-handle';

/** Remove control shown on every widget in edit mode. Buttons never start a drag. */
export function RemoveButton({ chrome }: { chrome: WidgetChrome }) {
  return (
    <button
      type="button"
      onClick={chrome.onRemove}
      aria-label={`Remove ${chrome.title}`}
      className="rounded-md p-1 text-muted hover:bg-line hover:text-ink"
    >
      <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor">
        <path d="M4 4l8 8M12 4l-8 8" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    </button>
  );
}

function DragGrip() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4 shrink-0 text-muted" fill="currentColor">
      {[4, 8, 12].flatMap((y) =>
        [6, 10].map((x) => <circle key={`${x},${y}`} cx={x} cy={y} r="1.2" />),
      )}
    </svg>
  );
}

/** A widget's card: title, optional subtitle and actions, and a body that fills the cell. */
export function Panel({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const chrome = useContext(WidgetChromeContext);
  return (
    <section className="flex h-full flex-col rounded-xl border border-line bg-raised p-4 sm:p-5">
      <header className="mb-3 flex items-start gap-2">
        <div
          className={`min-w-0 flex-1 ${chrome ? `${DRAG_HANDLE} flex cursor-grab items-start gap-1.5 active:cursor-grabbing` : ''}`}
        >
          {chrome && <DragGrip />}
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{title}</h2>
            {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
          </div>
        </div>
        {actions}
        {chrome && <RemoveButton chrome={chrome} />}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
