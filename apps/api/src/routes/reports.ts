import { Router } from 'express';
import { z } from 'zod';
import { collections, type Db } from '@pulseboard/db';
import {
  reportsQuerySchema,
  summarizeReports,
  type ReportDaily,
  type ReportsQuery,
  type ReportsResponse,
} from '@pulseboard/shared';
import type { Filter } from 'mongodb';

/** Served by the {date, channel} index, or {channel, date} when filtered by channel. */
export const reportsFilter = ({ from, to, channel }: ReportsQuery): Filter<ReportDaily> => ({
  date: { $gte: from, $lte: to },
  ...(channel && { channel }),
});

export function reportsRouter(db: Db) {
  const { reportsDaily } = collections(db);
  const router = Router();

  router.get('/reports', async (req, res) => {
    const parsed = reportsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: 'invalid_query',
        issues: z.flattenError(parsed.error).fieldErrors,
      });
      return;
    }
    const query = parsed.data;
    const reports = await reportsDaily
      .find(reportsFilter(query))
      .sort({ date: 1, channel: 1 })
      .toArray();

    const body: ReportsResponse = {
      from: query.from,
      to: query.to,
      channel: query.channel ?? null,
      reports: reports.map((r) => ({ ...r, computedAt: r.computedAt.toISOString() })),
      summary: summarizeReports(reports),
    };
    // Freshness comes from the WebSocket push, so never serve a cached copy.
    res.set('Cache-Control', 'no-store').json(body);
  });

  return router;
}
