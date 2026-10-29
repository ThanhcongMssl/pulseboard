# Pulseboard: guide for agents

Marketing analytics pipeline. Scheduled jobs ingest ad spend, traffic, orders and targets from five
sources, precompute daily per-channel KPI reports into MongoDB, and serve them through a read-only
API and a Next.js dashboard that updates live over WebSocket. This is a public portfolio project, so
code and commit history are read by reviewers: keep both clean and explainable.

## Layout

```
apps/api         Express 5 REST + ws WebSocket (/ws). Read-only over reports_daily.
apps/worker      BullMQ consumers: ingest jobs per source, then the aggregate job.
apps/web         Next.js 16 (App Router) + Tailwind 4 + Recharts dashboard.
packages/shared  Domain types + zod schemas, KPI math, queue names, event types. No I/O.
packages/db      Mongo client, typed collection accessors, ensureIndexes().
packages/connectors  Connector interface + simulated sources (deterministic seed data).
infra/mongo      mongosh scripts used by docker-compose (replica-set healthcheck).
```

Dependency direction: `apps/* → packages/db → packages/shared`, `apps/worker → packages/connectors`.
`apps/web` imports only `packages/shared` (never `db`). `packages/shared` imports nothing internal.

## Commands

```sh
pnpm install
pnpm db:up            # mongo (replica set rs0) + redis via docker compose
cp .env.example .env  # first time only
pnpm dev              # api :4000, worker, web :3000
pnpm backfill [days]  # queue ingest flows for the last N days (default 30); worker must run
pnpm lint && pnpm typecheck && pnpm test   # run all three before every commit
pnpm format           # prettier --write
pnpm build            # tsup bundles for api/worker, next build for web

docker compose up -d --build --wait                      # whole stack from the root Dockerfile
docker compose run --rm worker node dist/backfill.js 30  # backfill inside Docker
```

The compose apps and `pnpm dev` both bind ports 3000/4000: run one at a time. The web image bakes
`NEXT_PUBLIC_*` in at build time (Dockerfile build args), so changing them means rebuilding it.

Health check: `curl localhost:4000/health` → `{"mongo":"ok","redis":"ok"}`. Reports:
`curl 'localhost:4000/reports?channel=all'`.

## Data model rules

- **Dates** are UTC `YYYY-MM-DD` strings (`IsoDate`); months are `YYYY-MM`. Never store `Date` for
  a calendar day.
- **Money** is integer cents everywhere (`spend`, `revenue`, `cac`). Convert only for display.
- **Idempotency:** every raw collection has a unique natural key (documented on its schema in
  `packages/shared/src/models.ts` and enforced in `packages/db/src/indexes.ts`). Ingest writes
  raw data only through `upsertMany(collection, docs, keyFields)` in `packages/db/src/upsert.ts`.
  Never `insertOne` raw data.
- **reports_daily** is a read model: `_id` is `reportId(date, channel)`, one doc per channel plus a
  `channel: "all"` totals row. Only the aggregate job writes it (one transaction per day, built by
  the pure `buildDailyReports` in `apps/worker/src/reports.ts`); the API only reads it.
- The `all` row's ratios come from its totals, never from averaging channel ratios. `staleSources`
  on every row lists sources whose ingest gave up for that day (their data is the last good copy).
- KPI ratios come from `packages/shared/src/kpi.ts` and are `null` on a zero denominator. Ratios
  over a date range come from `summarizeReports` (sum first, then divide), never from averaging.
- New collection or query pattern → add the index to `ensureIndexes()` in the same change.

## Conventions

- TypeScript strict, ESM. Relative imports use the **`.ts` extension** (`./kpi.ts`).
- Internal packages export TypeScript source (`exports: ./src/index.ts`); there is no package build.
  tsup bundles workspace packages into api/worker but keeps third-party libraries external, so **if a
  package's dependency (e.g. `mongodb`) is used at runtime by an app, the app must list it too**.
- Validate env vars with zod in each app's `src/env.ts`; validate data crossing a boundary
  (connector output, API query params) with the zod schemas from `packages/shared`.
- API request/response and `/ws` message types live in `packages/shared/src/api.ts` and
  `queues.ts`, so the dashboard imports the same contract the API validates with.
- The API's Redis subscriber is a `redis.duplicate()`: a subscribed ioredis connection can't run
  other commands. Messages read off Redis are validated before they're relayed.
- Web view logic (formatting, URL filters, chart series, live-update checks) lives in pure
  functions in `apps/web/lib/` with tests; components in `apps/web/app/` stay thin. Colors are
  semantic tokens in `apps/web/app/globals.css`, and channel colors are keyed by channel in
  `apps/web/lib/channels.ts`, never by position.
- Tests: Vitest, next to the code as `*.test.ts` (under `src/`, or `apps/web/lib/`). Pure logic (KPI math, aggregation, date ranges)
  must have tests.
- TypeScript is pinned to 6.0.x because typescript-eslint doesn't support 7 yet. TS 6 doesn't
  auto-load `@types/*`: set `"types"` in tsconfig when needed.
- pnpm 12 blocks dependency install scripts. Allow one in `pnpm-workspace.yaml` `allowBuilds` only
  if it's required.
- `apps/web/AGENTS.md` is generated by Next.js. Read it before touching the web app: Next 16 APIs
  may differ from what you expect.

## Local environment

- Mongo runs as a single-node replica set. From the host, connect with `directConnection=true`
  (see `.env.example`); the member hostname `mongo` only resolves inside the compose network.
- Redis runs with `maxmemory-policy noeviction` (BullMQ requires it). BullMQ connections need
  `maxRetriesPerRequest: null`.
- BullMQ rejects custom job ids containing `:`; flow job ids use `-` (see `apps/worker/src/flows.ts`).

## Commits

Small, focused commits with a body explaining _why_. Don't commit `.env`, `dist/` or `.next/`.
