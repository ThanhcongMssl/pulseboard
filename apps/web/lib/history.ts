// Snapshot undo/redo. Each entry is a whole value (a layout is small), so
// undo is a pointer move rather than replaying inverse operations.

export interface History<T> {
  past: readonly T[];
  present: T;
  future: readonly T[];
}

/** Steps kept; the oldest is dropped past this. */
export const HISTORY_LIMIT = 50;

export const createHistory = <T>(present: T): History<T> => ({ past: [], present, future: [] });

/**
 * Record `next` as a new step. A value equal to the present (by `same`) is
 * not a step: dropping a widget where it was shouldn't need two undos.
 * Recording after an undo discards the redo branch, as editors do.
 */
export function push<T>(
  history: History<T>,
  next: T,
  same: (a: T, b: T) => boolean = Object.is,
  limit = HISTORY_LIMIT,
): History<T> {
  if (same(history.present, next)) return history;
  return {
    past: [...history.past, history.present].slice(-limit),
    present: next,
    future: [],
  };
}

export function undo<T>(history: History<T>): History<T> {
  const previous = history.past.at(-1);
  if (previous === undefined) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redo<T>(history: History<T>): History<T> {
  const [next, ...rest] = history.future;
  if (next === undefined) return history;
  return { past: [...history.past, history.present], present: next, future: rest };
}
