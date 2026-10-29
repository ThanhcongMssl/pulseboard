import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; let Next compile them.
  transpilePackages: ['@pulseboard/shared'],
  // A self-contained server for the Docker image (Vercel builds its own way).
  // Tracing starts at the repo root so workspace packages are included.
  output: process.env.VERCEL ? undefined : 'standalone',
  outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url)),
};

export default nextConfig;
