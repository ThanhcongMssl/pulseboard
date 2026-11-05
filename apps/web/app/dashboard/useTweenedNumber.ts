'use client';

import { useEffect, useRef, useState } from 'react';
import { tweenValue } from '../../lib/tween.ts';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * `target`, animated from the previous value over `ms` when it changes. The
 * first value, a change to or from null, and reduced motion all jump straight
 * to the new value.
 */
export function useTweenedNumber(target: number | null, ms = 400): number | null {
  const [shown, setShown] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    const from = current.current;
    if (from === target) return;
    let frame = 0;
    if (from === null || target === null || reducedMotion()) {
      frame = requestAnimationFrame(() => {
        current.current = target;
        setShown(target);
      });
      return () => cancelAnimationFrame(frame);
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = (now - start) / ms;
      const value = t >= 1 ? target : tweenValue(from, target, t);
      current.current = value;
      setShown(value);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);

  // A jump to or from null shows at once rather than a frame late.
  return target === null || shown === null ? target : shown;
}
