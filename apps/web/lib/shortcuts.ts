import type { RangePreset } from './filters.ts';

// The dashboard's keyboard shortcuts: which key does what, and the list the
// help dialog shows. Pure, so the key handling is tested without a DOM.

export type ShortcutAction =
  | { type: 'help' }
  | { type: 'range'; preset: RangePreset }
  | { type: 'compare' }
  | { type: 'edit' }
  | { type: 'theme' }
  | { type: 'undo' }
  | { type: 'redo' };

export interface KeyLike {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey?: boolean;
}

/** ⌘Z / Ctrl+Z undoes; ⇧⌘Z, Ctrl+Shift+Z and Ctrl+Y redo. */
export function undoRedoKey({ key, metaKey, ctrlKey, shiftKey }: KeyLike): 'undo' | 'redo' | null {
  if (!metaKey && !ctrlKey) return null;
  const k = key.toLowerCase();
  if (k === 'z') return shiftKey ? 'redo' : 'undo';
  if (k === 'y' && ctrlKey && !shiftKey) return 'redo';
  return null;
}

/** Single keys, typed without ⌘, Ctrl or Alt. */
const PLAIN: Record<string, ShortcutAction> = {
  '?': { type: 'help' },
  '1': { type: 'range', preset: 7 },
  '2': { type: 'range', preset: 30 },
  '3': { type: 'range', preset: 90 },
  c: { type: 'compare' },
  e: { type: 'edit' },
  t: { type: 'theme' },
};

/**
 * The action for a key press, or null. Nothing fires while the viewer types
 * in a field (`inField`), so "c" in a date input stays a "c".
 */
export function shortcutFor(event: KeyLike, inField: boolean): ShortcutAction | null {
  if (inField) return null;
  const undoRedo = undoRedoKey(event);
  if (undoRedo) return { type: undoRedo };
  if (event.metaKey || event.ctrlKey || event.altKey) return null;
  // "?" needs Shift on most layouts; letters and digits must not have it.
  if (event.shiftKey && event.key !== '?') return null;
  return PLAIN[event.key] ?? null;
}

/** What the help dialog lists, in order. `mac` picks ⌘ or Ctrl. */
export function shortcutList(mac: boolean): { keys: string[]; label: string }[] {
  const mod = mac ? '⌘' : 'Ctrl';
  return [
    { keys: ['1', '2', '3'], label: 'Last 7, 30 or 90 days' },
    { keys: ['C'], label: 'Compare with the previous period' },
    { keys: ['E'], label: 'Edit layout' },
    { keys: ['T'], label: 'Switch light / dark' },
    { keys: [mod, 'Z'], label: 'Undo a layout change' },
    { keys: mac ? ['⇧', '⌘', 'Z'] : ['Ctrl', 'Y'], label: 'Redo' },
    { keys: ['?'], label: 'This list' },
  ];
}
