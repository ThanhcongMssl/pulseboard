import { describe, expect, it } from 'vitest';
import { shortcutFor, shortcutList, undoRedoKey } from './shortcuts.ts';

const key = (
  key: string,
  mods: Partial<Record<'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey', boolean>> = {},
) => ({ key, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...mods });

describe('shortcutFor', () => {
  it('maps plain keys to actions', () => {
    expect(shortcutFor(key('1'), false)).toEqual({ type: 'range', preset: 7 });
    expect(shortcutFor(key('3'), false)).toEqual({ type: 'range', preset: 90 });
    expect(shortcutFor(key('c'), false)).toEqual({ type: 'compare' });
    expect(shortcutFor(key('e'), false)).toEqual({ type: 'edit' });
    expect(shortcutFor(key('t'), false)).toEqual({ type: 'theme' });
    expect(shortcutFor(key('?', { shiftKey: true }), false)).toEqual({ type: 'help' });
  });

  it('routes undo and redo', () => {
    expect(shortcutFor(key('z', { metaKey: true }), false)).toEqual({ type: 'undo' });
    expect(shortcutFor(key('y', { ctrlKey: true }), false)).toEqual({ type: 'redo' });
  });

  it('does nothing while typing, or with other modifiers', () => {
    expect(shortcutFor(key('c'), true)).toBeNull();
    expect(shortcutFor(key('z', { metaKey: true }), true)).toBeNull();
    expect(shortcutFor(key('c', { metaKey: true }), false)).toBeNull();
    expect(shortcutFor(key('1', { altKey: true }), false)).toBeNull();
    expect(shortcutFor(key('C', { shiftKey: true }), false)).toBeNull();
    expect(shortcutFor(key('x'), false)).toBeNull();
  });
});

describe('shortcutList', () => {
  it('uses the platform modifier', () => {
    expect(shortcutList(true).find((s) => s.label === 'Redo')?.keys).toEqual(['⇧', '⌘', 'Z']);
    expect(shortcutList(false).find((s) => s.label === 'Redo')?.keys).toEqual(['Ctrl', 'Y']);
  });
});

describe('undoRedoKey', () => {
  const key = (
    key: string,
    mods: Partial<Record<'metaKey' | 'ctrlKey' | 'shiftKey', boolean>> = {},
  ) => ({
    key,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    ...mods,
  });

  it('maps the usual shortcuts', () => {
    expect(undoRedoKey(key('z', { metaKey: true }))).toBe('undo');
    expect(undoRedoKey(key('z', { ctrlKey: true }))).toBe('undo');
    expect(undoRedoKey(key('Z', { metaKey: true, shiftKey: true }))).toBe('redo');
    expect(undoRedoKey(key('y', { ctrlKey: true }))).toBe('redo');
  });

  it('ignores plain keys and other combinations', () => {
    expect(undoRedoKey(key('z'))).toBeNull();
    expect(undoRedoKey(key('s', { metaKey: true }))).toBeNull();
    expect(undoRedoKey(key('y', { metaKey: true }))).toBeNull();
  });
});
