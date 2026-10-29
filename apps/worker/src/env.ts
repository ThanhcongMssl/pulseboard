import { z } from 'zod';

const envSchema = z.object({
  MONGO_URL: z.url(),
  REDIS_URL: z.url(),
});

export const env = envSchema.parse(process.env);
