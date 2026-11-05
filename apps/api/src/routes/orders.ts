import { Router } from 'express';
import { ObjectId, type Filter, type Sort } from 'mongodb';
import { z } from 'zod';
import { collections, type Db } from '@pulseboard/db';
import {
  isoDateSchema,
  ordersQuerySchema,
  type OrderJson,
  type OrdersQuery,
  type OrdersResponse,
  type RawOrder,
} from '@pulseboard/shared';

// Keyset pagination: each page continues after the last row of the previous
// one, identified by its (sort value, _id). Unlike skip/offset, a page costs
// the same at row 100 000 as at row 0, and rows inserted meanwhile (a live
// ingest) can't shift pages into duplicates or gaps.

/** The position after a page's last row. Opaque to clients. */
export interface Cursor {
  /** The last row's value of the sort field: a date or a revenue in cents. */
  v: string | number;
  /** The last row's _id, the tiebreaker that makes the order total. */
  id: string;
}

const cursorSchema = z.object({
  v: z.union([isoDateSchema, z.int().nonnegative()]),
  id: z.string().regex(/^[0-9a-f]{24}$/),
});

export const encodeCursor = (cursor: Cursor) =>
  Buffer.from(JSON.stringify(cursor)).toString('base64url');

/** The cursor in `token`, or null if it isn't one this API issued for `sort`. */
export function decodeCursor(token: string, sort: OrdersQuery['sort']): Cursor | null {
  try {
    const parsed = cursorSchema.safeParse(JSON.parse(Buffer.from(token, 'base64url').toString()));
    if (!parsed.success) return null;
    // A cursor from a page sorted by the other field would compare apples to oranges.
    const expected = sort === 'date' ? 'string' : 'number';
    return typeof parsed.data.v === expected ? parsed.data : null;
  } catch {
    return null;
  }
}

/** The filter for one page: the query's filters, then everything past the cursor. */
export function ordersFilter(query: OrdersQuery, cursor: Cursor | null): Filter<RawOrder> {
  const filter: Filter<RawOrder> = {
    date: { $gte: query.from, $lte: query.to },
    ...(query.channel && { channel: query.channel }),
    ...(query.campaignId && { campaignId: query.campaignId }),
  };
  if (!cursor) return filter;

  const past = query.dir === 'desc' ? '$lt' : '$gt';
  const id = new ObjectId(cursor.id);
  return {
    $and: [
      filter,
      {
        $or: [
          { [query.sort]: { [past]: cursor.v } },
          { [query.sort]: cursor.v, _id: { [past]: id } },
        ],
      },
    ],
  } as Filter<RawOrder>;
}

export const ordersSort = ({ sort, dir }: OrdersQuery): Sort => {
  const order = dir === 'desc' ? -1 : 1;
  return { [sort]: order, _id: order };
};

export function ordersRouter(db: Db) {
  const { rawOrders } = collections(db);
  const router = Router();

  router.get('/orders', async (req, res) => {
    const parsed = ordersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: 'invalid_query',
        issues: z.flattenError(parsed.error).fieldErrors,
      });
      return;
    }
    const query = parsed.data;
    const cursor = query.cursor ? decodeCursor(query.cursor, query.sort) : null;
    if (query.cursor && !cursor) {
      res.status(400).json({ error: 'invalid_cursor' });
      return;
    }

    // One extra row tells whether there is a next page without a count.
    const [rows, total] = await Promise.all([
      rawOrders
        .find(ordersFilter(query, cursor))
        .sort(ordersSort(query))
        .limit(query.limit + 1)
        .toArray(),
      // Counting every page would repeat the same scan; the first page is enough.
      cursor ? null : rawOrders.countDocuments(ordersFilter(query, null)),
    ]);
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);

    const body: OrdersResponse = {
      orders: page.map(
        ({ orderId, date, channel, campaignId, revenue, isNewCustomer }): OrderJson => ({
          orderId,
          date,
          channel,
          // Orders ingested before attribution existed have no campaignId yet.
          campaignId: campaignId ?? null,
          revenue,
          isNewCustomer,
        }),
      ),
      nextCursor:
        rows.length > query.limit && last
          ? encodeCursor({ v: last[query.sort], id: last._id.toHexString() })
          : null,
      total,
    };
    res.set('Cache-Control', 'no-store').json(body);
  });

  return router;
}
