import type { RequestHandler } from 'express';

/**
 * CORS for the dashboard's single origin. The API is read-only and sends no
 * credentials, so this is all it needs, without a dependency for it.
 */
export const cors =
  (origin: string): RequestHandler =>
  (req, res, next) => {
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      Vary: 'Origin',
    });
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Max-Age', '86400').sendStatus(204);
      return;
    }
    next();
  };
