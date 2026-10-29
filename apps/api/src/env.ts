import { z } from 'zod';

const envSchema = z.object({
  MONGO_URL: z.url(),
  REDIS_URL: z.url(),
  API_PORT: z.coerce.number().int().positive().default(4000),
});

export const env = envSchema.parse(process.env);
