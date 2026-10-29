import { describe, expect, it } from 'vitest';
import { reportsFilter } from './reports.ts';

describe('reportsFilter', () => {
  it('filters an inclusive date range across channels', () => {
    expect(reportsFilter({ from: '2026-10-01', to: '2026-10-29' })).toEqual({
      date: { $gte: '2026-10-01', $lte: '2026-10-29' },
    });
  });

  it('adds the channel when given', () => {
    expect(reportsFilter({ from: '2026-10-01', to: '2026-10-29', channel: 'all' })).toEqual({
      date: { $gte: '2026-10-01', $lte: '2026-10-29' },
      channel: 'all',
    });
  });
});
