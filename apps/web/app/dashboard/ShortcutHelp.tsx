'use client';

import { useSyncExternalStore, type RefObject } from 'react';
import { shortcutList } from '../../lib/shortcuts.ts';

const noop = () => () => {};
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform);

/** The keyboard shortcuts, in a native modal dialog (Esc and the backdrop close it). */
export function ShortcutHelp({ dialog }: { dialog: RefObject<HTMLDialogElement | null> }) {
  const mac = useSyncExternalStore(noop, isMac, () => false);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="shortcut-help-title"
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className="m-auto w-full max-w-md rounded-xl border border-line bg-raised p-0 text-ink shadow-xl backdrop:bg-black/30"
    >
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="shortcut-help-title" className="text-base font-semibold">
            Keyboard shortcuts
          </h2>
          <form method="dialog">
            <button
              aria-label="Close"
              className="rounded-md p-1 text-muted hover:bg-line hover:text-ink"
            >
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                className="size-4"
                fill="none"
                stroke="currentColor"
              >
                <path d="M4 4l8 8M12 4l-8 8" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </button>
          </form>
        </div>
        <dl className="space-y-2 text-sm">
          {shortcutList(mac).map(({ keys, label }) => (
            <div key={label} className="flex items-center justify-between gap-4">
              <dt className="text-ink-secondary">{label}</dt>
              <dd className="flex gap-1">
                {keys.map((k) => (
                  <kbd
                    key={k}
                    className="min-w-6 rounded border border-line bg-page px-1.5 py-0.5 text-center font-sans text-xs"
                  >
                    {k}
                  </kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </dialog>
  );
}
