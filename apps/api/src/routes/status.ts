import { Router } from 'express';
import { collections, type Db } from '@pulseboard/db';
import type { IngestRun, Source, StatusResponse } from '@pulseboard/shared';

interface SourceRow {
  _id: Source;
  lastStatus: IngestRun['status'];
  lastFinishedAt: Date;
  lastSucceededAt: Date | null;
}

export function statusRouter(db: Db) {
  const { reportsDaily, ingestRuns } = collections(db);
  const router = Router();

  router.get('/status', async (_req, res) => {
    const [latest, sources] = await Promise.all([
      reportsDaily
        .find({}, { projection: { computedAt: 1 } })
        .sort({ computedAt: -1 })
        .limit(1)
        .next(),
      ingestRuns
        .aggregate<SourceRow>([
          // Walks the {finishedAt: -1} index; running attempts have no finishedAt.
          { $match: { finishedAt: { $ne: null } } },
          { $sort: { finishedAt: -1 } },
          {
            $group: {
              _id: '$source',
              lastStatus: { $first: '$status' },
              lastFinishedAt: { $first: '$finishedAt' },
              lastSucceededAt: {
                $max: { $cond: [{ $eq: ['$status', 'succeeded'] }, '$finishedAt', null] },
              },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
    ]);

    const body: StatusResponse = {
      lastComputedAt: latest?.computedAt.toISOString() ?? null,
      sources: sources.map((s) => ({
        source: s._id,
        lastStatus: s.lastStatus,
        lastFinishedAt: s.lastFinishedAt.toISOString(),
        lastSucceededAt: s.lastSucceededAt?.toISOString() ?? null,
      })),
    };
    res.set('Cache-Control', 'no-store').json(body);
  });

  return router;
}
