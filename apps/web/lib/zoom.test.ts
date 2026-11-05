import { describe, expect, it } from 'vitest';
import { labelDay, zoomSelection } from './zoom.ts';

describe('zoomSelection', () => {
  it('orders the two ends, whichever way the drag went', () => {
    const range = { from: '2026-10-03', to: '2026-10-09' };
    expect(zoomSelection('2026-10-03', '2026-10-09')).toEqual(range);
    expect(zoomSelection('2026-10-09', '2026-10-03')).toEqual(range);
  });

  it('is no zoom for a click, a one-day drag or a missing end', () => {
    expect(zoomSelection('2026-10-03', '2026-10-03')).toBeNull();
    expect(zoomSelection('2026-10-03', null)).toBeNull();
    expect(zoomSelection(null, null)).toBeNull();
  });
});

describe('labelDay', () => {
  it('accepts only calendar days', () => {
    expect(labelDay('2026-10-03')).toBe('2026-10-03');
    expect(labelDay(undefined)).toBeNull();
    expect(labelDay(3)).toBeNull();
  });
});
