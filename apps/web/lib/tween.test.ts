import { describe, expect, it } from 'vitest';
import { easeOutCubic, tweenValue } from './tween.ts';

describe('tween', () => {
  it('starts and lands exactly, clamping outside 0–1', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(2)).toBe(1);
  });

  it('moves fast first, then slows down', () => {
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875);
  });

  it('interpolates both ways', () => {
    expect(tweenValue(100, 200, 1)).toBe(200);
    expect(tweenValue(200, 100, 0.5)).toBeCloseTo(112.5);
  });
});
