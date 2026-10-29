import { describe, expect, it } from 'vitest';
import { upsertOps } from './upsert.ts';

describe('upsertOps', () => {
  const rows = [
    { source: 'ga4', date: '2026-10-29', channel: 'email', sessions: 10 },
    { source: 'ga4', date: '2026-10-29', channel: 'organic', sessions: 20 },
  ];

  it('builds one upsert per doc, filtered on the key fields only', () => {
    expect(upsertOps(rows, ['source', 'date', 'channel'])).toEqual([
      {
        updateOne: {
          filter: { source: 'ga4', date: '2026-10-29', channel: 'email' },
          update: { $set: rows[0] },
          upsert: true,
        },
      },
      {
        updateOne: {
          filter: { source: 'ga4', date: '2026-10-29', channel: 'organic' },
          update: { $set: rows[1] },
          upsert: true,
        },
      },
    ]);
  });

  it('returns no ops for no docs', () => {
    expect(upsertOps([], ['source'])).toEqual([]);
  });
});
