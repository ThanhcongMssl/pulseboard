import { Router } from 'express';
import { z } from 'zod';
import { collections, type Db } from '@pulseboard/db';
import {
  clientIdSchema,
  dashboardLayoutSchema,
  type DashboardLayoutDoc,
  type LayoutResponse,
} from '@pulseboard/shared';

const toResponse = ({ items, updatedAt }: DashboardLayoutDoc): LayoutResponse => ({
  items,
  updatedAt: updatedAt.toISOString(),
});

/**
 * Saved dashboard layouts, keyed by the anonymous client id the dashboard
 * generates. There are no accounts, so the id is the only claim to a
 * layout; the last write wins. The only thing the API writes.
 */
export function layoutsRouter(db: Db) {
  const { dashboardLayouts } = collections(db);
  const router = Router();

  router.get('/layouts/:clientId', async (req, res) => {
    const clientId = clientIdSchema.safeParse(req.params.clientId);
    if (!clientId.success) {
      res.status(400).json({ error: 'invalid_client_id' });
      return;
    }
    const doc = await dashboardLayouts.findOne({ _id: clientId.data });
    if (!doc) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.set('Cache-Control', 'no-store').json(toResponse(doc));
  });

  router.put('/layouts/:clientId', async (req, res) => {
    const clientId = clientIdSchema.safeParse(req.params.clientId);
    const layout = dashboardLayoutSchema.safeParse(req.body);
    if (!clientId.success || !layout.success) {
      res.status(400).json({
        error: clientId.success ? 'invalid_layout' : 'invalid_client_id',
        ...(!layout.success && { issues: z.flattenError(layout.error).fieldErrors }),
      });
      return;
    }
    const doc: DashboardLayoutDoc = {
      _id: clientId.data,
      items: layout.data.items,
      updatedAt: new Date(),
    };
    await dashboardLayouts.replaceOne({ _id: doc._id }, doc, { upsert: true });
    res.json(toResponse(doc));
  });

  return router;
}
