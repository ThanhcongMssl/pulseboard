import { z } from 'zod';

const envSchema = z.object({
  MONGO_URL: z.url(),
  REDIS_URL: z.url(),
  API_PORT: z.coerce.number().int().positive().default(4000),
  // The dashboard's origin, allowed by CORS (the browser calls the API directly).
  WEB_ORIGIN: z.url().default('http://localhost:3000'),
});

export const env = envSchema.parse(process.env);
