import { describe, expect, it } from 'vitest';
import { createHistory, push, redo, undo } from './history.ts';

describe('history', () => {
  it('undoes and redoes steps in order', () => {
    let h = push(push(createHistory(1), 2), 3);
    h = undo(h);
    expect(h.present).toBe(2);
    h = undo(h);
    expect(h.present).toBe(1);
    h = redo(h);
    expect(h.present).toBe(2);
    expect(h.future).toEqual([3]);
  });

  it('is a no-op past either end', () => {
    const h = createHistory('a');
    expect(undo(h)).toBe(h);
    expect(redo(h)).toBe(h);
  });

  it('drops the redo branch when a new step is recorded after an undo', () => {
    const h = push(undo(push(createHistory(1), 2)), 5);
    expect(h).toEqual({ past: [1], present: 5, future: [] });
  });

  it('skips a step equal to the present', () => {
    const h = push(createHistory({ v: 1 }), { v: 1 }, (a, b) => a.v === b.v);
    expect(h.past).toEqual([]);
  });

  it('keeps at most `limit` past steps', () => {
    let h = createHistory(0);
    for (let i = 1; i <= 10; i++) h = push(h, i, Object.is, 3);
    expect(h.past).toEqual([7, 8, 9]);
  });
});
