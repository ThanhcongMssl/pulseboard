# One multi-stage build for the three apps: `docker build --target api|worker|web .`
# The build stage compiles the whole workspace once; each runtime stage copies
# only what its app needs.

FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS build
# Fetch dependencies from the lockfile alone, so this layer stays cached until
# dependencies change.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch --frozen-lockfile
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --offline --frozen-lockfile
# NEXT_PUBLIC_* are inlined into the browser bundle at build time.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_WS_URL=ws://localhost:4000/ws
RUN pnpm build
# api and worker bundle the workspace packages, so they ship with only their
# third-party production dependencies.
RUN pnpm --filter @pulseboard/api deploy --prod --legacy /out/api \
 && pnpm --filter @pulseboard/worker deploy --prod --legacy /out/worker

FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
USER node

FROM runtime AS api
COPY --from=build --chown=node /out/api/node_modules ./node_modules
COPY --from=build --chown=node /repo/apps/api/dist ./dist
COPY --from=build --chown=node /repo/apps/api/package.json ./
EXPOSE 4000
CMD ["node", "dist/index.js"]

FROM runtime AS worker
COPY --from=build --chown=node /out/worker/node_modules ./node_modules
COPY --from=build --chown=node /repo/apps/worker/dist ./dist
COPY --from=build --chown=node /repo/apps/worker/package.json ./
CMD ["node", "dist/index.js"]

FROM runtime AS web
# Next's standalone output traces the files the server needs, workspace
# packages included; static assets are copied next to it.
COPY --from=build --chown=node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node /repo/apps/web/.next/static ./apps/web/.next/static
ENV HOSTNAME=0.0.0.0 PORT=3000
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
