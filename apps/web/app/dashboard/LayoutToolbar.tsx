'use client';

import type { LayoutItem, WidgetKind } from '@pulseboard/shared';
import { WIDGET_ORDER, WIDGETS } from '../../lib/widgets.ts';
import { useIsMac } from '../useIsMac.ts';
import type { SaveState } from './useSavedLayout.ts';

interface Props {
  items: LayoutItem[];
  editing: boolean;
  onToggleEditing(): void;
  onAdd(kind: WidgetKind): void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo(): void;
  onRedo(): void;
  isDefault: boolean;
  onReset(): void;
  saveState: SaveState;
  onRetrySave(): void;
}

const LIBRARY_ID = 'widget-library';
const button =
  'inline-flex items-center gap-1.5 rounded-lg border border-line bg-raised px-3 py-1.5 text-sm hover:bg-line disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-raised';

function SaveStatus({ state, onRetry }: { state: SaveState; onRetry(): void }) {
  if (state === 'error')
    return (
      <span role="status" className="text-right text-sm text-critical">
        Couldn’t save.{' '}
        <button type="button" onClick={onRetry} className="underline">
          Retry
        </button>
      </span>
    );
  const text = { saved: 'Saved', unsaved: 'Unsaved changes', saving: 'Saving…' }[state];
  return (
    <span role="status" className="text-right text-sm text-muted">
      {text}
    </span>
  );
}

/** Builder controls. Rearranging is a desktop affair: on phones the grid is one column. */
export function LayoutToolbar(props: Props) {
  const placed = new Set(props.items.map((i) => i.kind));
  const mac = useIsMac();
  const mod = mac ? '⌘' : 'Ctrl+';
  return (
    // The group hugs the right edge, so anything that changes width (the save
    // status, the edit-only buttons) sits on the left and the rest stay put.
    <div className="hidden flex-wrap items-center gap-2 md:flex">
      <SaveStatus state={props.saveState} onRetry={props.onRetrySave} />
      {props.editing && (
        <>
          <button type="button" popoverTarget={LIBRARY_ID} className={button}>
            <span aria-hidden>+</span> Add widget
          </button>
          <button
            type="button"
            onClick={props.onUndo}
            disabled={!props.canUndo}
            title={`Undo (${mod}Z)`}
            className={button}
          >
            Undo
          </button>
          <button
            type="button"
            onClick={props.onRedo}
            disabled={!props.canRedo}
            title={`Redo (${mac ? '⇧⌘Z' : 'Ctrl+Y'})`}
            className={button}
          >
            Redo
          </button>
          <button
            type="button"
            onClick={props.onReset}
            disabled={props.isDefault}
            className={button}
          >
            Reset
          </button>
        </>
      )}
      <button
        type="button"
        aria-pressed={props.editing}
        onClick={props.onToggleEditing}
        className={`${button} min-w-26 justify-center aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-page`}
      >
        {props.editing ? 'Done' : 'Edit layout'}
      </button>

      <div
        id={LIBRARY_ID}
        popover="auto"
        aria-label="Widget library"
        className="fixed inset-y-0 right-0 left-auto m-0 h-full w-80 max-w-full overflow-y-auto border-l border-line bg-raised p-5 text-ink shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Add a widget</h2>
          <button
            type="button"
            popoverTarget={LIBRARY_ID}
            popoverTargetAction="hide"
            aria-label="Close widget library"
            className="rounded-md p-1 text-muted hover:bg-line hover:text-ink"
          >
            ✕
          </button>
        </div>
        <ul className="space-y-2">
          {WIDGET_ORDER.map((kind) => {
            const on = placed.has(kind);
            return (
              <li key={kind}>
                <button
                  type="button"
                  disabled={on}
                  onClick={() => props.onAdd(kind)}
                  className="w-full rounded-lg border border-line p-3 text-left hover:bg-line disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <span className="flex items-center justify-between gap-2 text-sm font-medium">
                    {WIDGETS[kind].title}
                    {on && <span className="text-xs font-normal text-muted">On dashboard</span>}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {WIDGETS[kind].description}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
