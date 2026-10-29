import { describe, expect, it } from 'vitest';
import {
  EMPTY,
  formatCents,
  formatCentsExact,
  formatDay,
  formatPercent,
  formatRatio,
  formatRelative,
} from './format.ts';

describe('formatting', () => {
  it('formats cents as compact and exact dollars', () => {
    expect(formatCents(1_234_567)).toBe('$12.3K');
    expect(formatCents(0)).toBe('$0');
    expect(formatCentsExact(3_859)).toBe('$38.59');
  });

  it('formats ratios and percentages', () => {
    expect(formatRatio(2.8485)).toBe('2.85×');
    expect(formatPercent(0.015297)).toBe('1.53%');
  });

  it('renders null as a dash', () => {
    for (const format of [formatCents, formatCentsExact, formatRatio, formatPercent]) {
      expect(format(null)).toBe(EMPTY);
    }
  });

  it('formats relative times', () => {
    const now = new Date('2026-10-29T12:00:00Z');
    expect(formatRelative('2026-10-29T11:59:30Z', now)).toBe('just now');
    expect(formatRelative('2026-10-29T11:57:00Z', now)).toBe('3 min ago');
    expect(formatRelative('2026-10-29T09:00:00Z', now)).toBe('3 h ago');
    expect(formatRelative('2026-10-25T12:00:00Z', now)).toBe('4 d ago');
  });

  it('formats report days in UTC', () => {
    expect(formatDay('2026-10-29')).toBe('Oct 29');
  });
});
