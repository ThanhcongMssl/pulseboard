import { ObjectId } from 'mongodb';
import { describe, expect, it } from 'vitest';
import type { OrdersQuery } from '@pulseboard/shared';
import { decodeCursor, encodeCursor, ordersFilter, ordersSort } from './orders.ts';

const query = (overrides: Partial<OrdersQuery> = {}): OrdersQuery => ({
  from: '2026-10-01',
  to: '2026-10-31',
  sort: 'date',
  dir: 'desc',
  limit: 100,
  ...overrides,
});

const id = '65a1b2c3d4e5f6a7b8c9d0e1';

describe('cursor', () => {
  it('round-trips', () => {
    const cursor = { v: '2026-10-15', id };
    expect(decodeCursor(encodeCursor(cursor), 'date')).toEqual(cursor);
    expect(decodeCursor(encodeCursor({ v: 6_500, id }), 'revenue')).toEqual({ v: 6_500, id });
  });

  it('rejects a cursor issued for the other sort', () => {
    expect(decodeCursor(encodeCursor({ v: 6_500, id }), 'date')).toBeNull();
    expect(decodeCursor(encodeCursor({ v: '2026-10-15', id }), 'revenue')).toBeNull();
  });

  it.each(['not-base64!', encodeCursor({ v: '2026-10-15', id: 'nope' }), 'e30'])(
    'rejects garbage %s',
    (token) => {
      expect(decodeCursor(token, 'date')).toBeNull();
    },
  );
});

describe('ordersFilter', () => {
  it('filters the range and optional channel or campaign', () => {
    expect(ordersFilter(query({ channel: 'paid_search', campaignId: 'gads_1' }), null)).toEqual({
      date: { $gte: '2026-10-01', $lte: '2026-10-31' },
      channel: 'paid_search',
      campaignId: 'gads_1',
    });
  });

  it('continues after the cursor: past its value, or equal with a later _id', () => {
    expect(ordersFilter(query(), { v: '2026-10-15', id })).toEqual({
      $and: [
        { date: { $gte: '2026-10-01', $lte: '2026-10-31' } },
        {
          $or: [
            { date: { $lt: '2026-10-15' } },
            { date: '2026-10-15', _id: { $lt: new ObjectId(id) } },
          ],
        },
      ],
    });
  });

  it('flips the comparison for ascending pages', () => {
    const filter = ordersFilter(query({ sort: 'revenue', dir: 'asc' }), { v: 6_500, id });
    expect(filter.$and?.[1]).toEqual({
      $or: [{ revenue: { $gt: 6_500 } }, { revenue: 6_500, _id: { $gt: new ObjectId(id) } }],
    });
  });
});

describe('ordersSort', () => {
  it('sorts by the field, then _id, in the same direction', () => {
    expect(ordersSort(query({ sort: 'revenue', dir: 'asc' }))).toEqual({ revenue: 1, _id: 1 });
    expect(ordersSort(query())).toEqual({ date: -1, _id: -1 });
  });
});
