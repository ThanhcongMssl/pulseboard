'use client';

import { useEffect, useRef } from 'react';
import { shortcutFor, type ShortcutAction } from '../../lib/shortcuts.ts';

/** Fields where a key press is typing, not a shortcut. */
const inField = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/**
 * Run `onAction` for the dashboard's keyboard shortcuts (see lib/shortcuts.ts).
 * One listener for the page; the latest handler is used without re-subscribing.
 */
export function useShortcuts(onAction: (action: ShortcutAction) => void) {
  const latest = useRef(onAction);
  useEffect(() => {
    latest.current = onAction;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // An open modal dialog owns the keyboard.
      if (e.defaultPrevented || document.querySelector('dialog[open]')) return;
      const action = shortcutFor(e, inField(e.target));
      if (!action) return;
      e.preventDefault();
      latest.current(action);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
