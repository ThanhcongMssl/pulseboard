import { z } from 'zod';

// Next inlines NEXT_PUBLIC_* into the browser bundle only for literal
// `process.env.NAME` reads, so each variable is read by name. Next loads .env
// from apps/web/, not the repo root, so the defaults match the dev setup.
const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url().default('http://localhost:4000'),
  NEXT_PUBLIC_WS_URL: z.url().default('ws://localhost:4000/ws'),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
});
