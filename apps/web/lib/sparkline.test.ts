import { describe, expect, it } from 'vitest';
import { sparkPath } from './sparkline.ts';

describe('sparkPath', () => {
  it('spans the box from the series minimum to its maximum', () => {
    expect(sparkPath([0, 5, 10], 100, 20)).toBe('M0 20L50 10L100 0');
  });

  it('breaks the line at gaps', () => {
    expect(sparkPath([1, null, 2, 3], 30, 10)).toBe('M0 10M20 5L30 0');
  });

  it('draws a flat series through the middle, and nothing without values', () => {
    expect(sparkPath([4, 4], 10, 10)).toBe('M0 5L10 5');
    expect(sparkPath([null, null], 10, 10)).toBe('');
    expect(sparkPath([], 10, 10)).toBe('');
  });
});
