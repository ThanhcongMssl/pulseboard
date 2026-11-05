// Easing for animated numbers. Pure, so the curve is tested; the hook that
// drives it with requestAnimationFrame lives with the components.

/** Fast start, gentle landing; 0 → 0 and 1 → 1. */
export const easeOutCubic = (t: number) => 1 - (1 - Math.min(Math.max(t, 0), 1)) ** 3;

/** The value `t` (0–1) of the way from `from` to `to`, eased. */
export const tweenValue = (from: number, to: number, t: number) =>
  from + (to - from) * easeOutCubic(t);
