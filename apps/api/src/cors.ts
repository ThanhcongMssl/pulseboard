import type { RequestHandler } from 'express';

/**
 * CORS for the dashboard's single origin. The API sends no credentials and
 * its only write is a JSON PUT of a layout, so this is all it needs, without
 * a dependency for it.
 */
export const cors =
  (origin: string): RequestHandler =>
  (req, res, next) => {
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    });
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Max-Age', '86400').sendStatus(204);
      return;
    }
    next();
  };
