import { Router } from 'express';
import { z } from 'zod';
import { collections, type Db } from '@pulseboard/db';
import {
  campaignsQuerySchema,
  summarizeCampaigns,
  type CampaignsResponse,
} from '@pulseboard/shared';

export function campaignsRouter(db: Db) {
  const { reportsCampaignDaily } = collections(db);
  const router = Router();

  router.get('/campaigns', async (req, res) => {
    const parsed = campaignsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: 'invalid_query',
        issues: z.flattenError(parsed.error).fieldErrors,
      });
      return;
    }
    const { from, to, channel } = parsed.data;
    // Served by {date, campaignId}, or {channel, date} for one channel. A year
    // of campaigns is a few thousand small docs, summed here like /reports.
    const rows = await reportsCampaignDaily
      .find(
        { date: { $gte: from, $lte: to }, ...(channel && { channel }) },
        { projection: { _id: 0, computedAt: 0 } },
      )
      .sort({ date: 1 })
      .toArray();

    const body: CampaignsResponse = {
      from,
      to,
      channel: channel ?? null,
      campaigns: summarizeCampaigns(rows),
    };
    res.set('Cache-Control', 'no-store').json(body);
  });

  return router;
}
