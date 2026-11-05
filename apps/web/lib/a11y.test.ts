import { describe, expect, it } from 'vitest';
import { describeChannelMix, describeRevenue } from './a11y.ts';

const day = (date: string, revenue: number | null) => ({
  date,
  revenue,
  spend: null,
  targetRevenue: null,
});

describe('describeRevenue', () => {
  it('gives the total, the best and the worst day', () => {
    const points = [
      day('2026-10-01', 500_000),
      day('2026-10-02', null),
      day('2026-10-03', 200_000),
    ];
    expect(describeRevenue(points, 'Email')).toBe(
      'Revenue for Email, Oct 1 – Oct 3: $7K in total; highest $5K on Oct 1, lowest $2K on Oct 3.',
    );
  });

  it('says when there is nothing', () => {
    expect(describeRevenue([day('2026-10-01', null)], 'All channels')).toBe(
      'Revenue for All channels, Oct 1 – Oct 1: no data.',
    );
  });
});

describe('describeChannelMix', () => {
  it('lists channels largest first with their share', () => {
    const points = [
      { date: '2026-10-01', email: 100_000, organic: 300_000 },
      { date: '2026-10-02', email: 100_000, direct: 0 },
    ];
    expect(describeChannelMix(points)).toBe(
      'Revenue by channel, Oct 1 – Oct 2: Organic $3K (60%), Email $2K (40%).',
    );
  });

  it('says when there is nothing', () => {
    expect(describeChannelMix([{ date: '2026-10-01' }])).toBe(
      'Revenue by channel, Oct 1 – Oct 1: no data.',
    );
  });
});
