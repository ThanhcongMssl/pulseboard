import { describe, expect, it } from 'vitest';
import { clientIdSchema, dashboardLayoutSchema } from './layouts.ts';

const item = (id: string, x = 0, w = 4) => ({ id, kind: 'chart.revenue', x, y: 0, w, h: 6 });

describe('dashboardLayoutSchema', () => {
  it('accepts a layout inside the 12-column grid', () => {
    expect(dashboardLayoutSchema.safeParse({ items: [item('a'), item('b', 8, 4)] }).success).toBe(
      true,
    );
  });

  it('rejects a widget that overflows the grid', () => {
    expect(dashboardLayoutSchema.safeParse({ items: [item('a', 9, 4)] }).success).toBe(false);
  });

  it('rejects duplicate ids and unknown kinds', () => {
    expect(dashboardLayoutSchema.safeParse({ items: [item('a'), item('a', 4)] }).success).toBe(
      false,
    );
    expect(
      dashboardLayoutSchema.safeParse({ items: [{ ...item('a'), kind: 'chart.pie' }] }).success,
    ).toBe(false);
  });

  it('rejects more than 40 widgets', () => {
    const items = Array.from({ length: 41 }, (_, i) => ({ ...item(`w${i}`), y: i }));
    expect(dashboardLayoutSchema.safeParse({ items }).success).toBe(false);
  });
});

describe('clientIdSchema', () => {
  it('accepts a UUID and nothing else', () => {
    expect(clientIdSchema.safeParse('7d444840-9dc0-4a8e-8f3f-0c3c0a9a7b1e').success).toBe(true);
    expect(clientIdSchema.safeParse('../etc/passwd').success).toBe(false);
  });
});
