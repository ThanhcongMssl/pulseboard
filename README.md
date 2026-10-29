# Pulseboard

Marketing analytics pipeline and dashboard. Scheduled jobs ingest ad spend, web traffic, orders and
targets from five sources, precompute daily per-channel KPIs (spend, revenue, ROAS, CAC, conversion
rate) into MongoDB, and serve them to a dashboard that updates live.

> 🚧 Work in progress. Architecture, design decisions and screenshots are coming.

## Architecture

```mermaid
flowchart TB
    sched(["BullMQ repeatable schedule<br/>(e.g. every 6h)"])

    subgraph worker["apps/worker · BullMQ"]
        direction TB
        flow["FlowProducer: one flow per date"]
        subgraph children["ingest jobs (children) · retries + backoff"]
            direction LR
            fb["ingest<br/>facebook_ads"]
            gads["ingest<br/>google_ads"]
            ga["ingest<br/>ga4"]
            sh["ingest<br/>shopify"]
            gs["ingest<br/>sheets_targets"]
        end
        agg["aggregate job (parent)<br/>runs when all children finish"]
        flow --> children
        children -- "all done" --> agg
    end

    subgraph connectors["packages/connectors"]
        conn["Connector.fetch(range)<br/>simulated, deterministic seed data"]
    end

    subgraph mongo["MongoDB replica set rs0"]
        raw[("raw_ad_spend · raw_traffic<br/>raw_orders · raw_targets")]
        runs[("ingest_runs")]
        reports[("reports_daily<br/>_id = date:channel, plus 'all' totals<br/>KPIs precomputed")]
    end

    redis{{"Redis<br/>queues + pub/sub"}}

    subgraph api["apps/api · Express"]
        rest["GET /reports?from&to&channel"]
        ws["WebSocket /ws"]
    end

    web["apps/web · Next.js<br/>KPI cards · charts · live badge"]

    sched --> flow
    children --> conn
    children -- "upsert on natural key<br/>(re-run overwrites)" --> raw
    children -- "status" --> runs
    agg -- "snapshot read via<br/>aggregation pipeline" --> raw
    agg -- "replace day's docs<br/>in one transaction" --> reports
    agg -- "PUBLISH reports-updated" --> redis
    redis -- "SUBSCRIBE" --> ws
    rest -- "read only" --> reports
    ws -- "push: reports.updated" --> web
    web -- "refetch" --> rest
```

1. A repeatable schedule starts one flow per date: five ingest jobs (children) and one aggregate job
   (parent) that BullMQ holds until every child has finished.
2. Each ingest job pulls from its connector and upserts raw rows on a natural key, so re-running a
   day never double-counts. If a source still fails after its retries, the aggregate runs anyway with
   that source's last good data, and `ingest_runs` flags it as stale.
3. The aggregate reads the raw data at one snapshot and replaces the day's `reports_daily` documents
   in a single transaction, so readers never see half-updated totals.
4. It then publishes to Redis. The API relays that to open dashboards over WebSocket, and they
   refetch precomputed reports, so no KPI math happens at request time.

## Stack

TypeScript monorepo (pnpm) · Node.js + Express · BullMQ + Redis · MongoDB (replica set) ·
Next.js + React + Tailwind · Vitest · Docker Compose · GitHub Actions

## Run locally

Requires Node 24, pnpm (via `corepack enable`) and Docker.

```sh
pnpm install
cp .env.example .env
pnpm db:up   # MongoDB replica set + Redis
pnpm dev       # api :4000, worker, web :3000
pnpm backfill  # in a second terminal: queue the last 30 days (or `pnpm backfill 90`)
```

Data sources are simulated connectors with deterministic seed data, so no API keys are needed.
The worker re-ingests today and yesterday every `INGEST_EVERY_MINUTES`. To watch retries and stale
sources, set `CONNECTOR_FAILURE_RATE=0.3` in `.env`, which makes about 30% of connector fetches fail.

## Dashboard

Open http://localhost:3000 once a backfill has run.

- **Filters**: 7, 30 or 90 days, and a single channel or all of them. They live in the URL
  (`/?range=7&channel=email`), so any view can be linked.
- **KPI cards**: revenue against the prorated target, ad spend, ROAS, CAC, conversion rate and
  orders. With all channels selected, ROAS is _blended_.
- **Charts**: daily revenue against target and spend, and daily revenue stacked by channel. The
  channel table below holds the same numbers in text; select a row to focus that channel.
- **Live badge**: the dashboard listens on `/ws` and refetches only when a rebuild touches a day on
  screen. It reconnects with backoff and shows how old the data is.
- **Stale banner**: shown when a day's numbers come from a source's last good data.

The browser calls the API directly. Next.js reads `.env` from `apps/web/`, not the repo root, and
the defaults point at `localhost:4000`. To use another API, set `NEXT_PUBLIC_API_URL` and
`NEXT_PUBLIC_WS_URL` in `apps/web/.env.local`, and `WEB_ORIGIN` for the API's CORS.

## API

Read-only, served from `reports_daily` (no aggregation at request time).

| Endpoint                       | Returns                                                                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /reports?from&to&channel` | Daily rows sorted by date, plus a range `summary` per channel. Defaults to the last 30 days and every channel; ranges are capped at 366 days. |
| `GET /status`                  | `lastComputedAt` and the last finished ingest attempt of each source, for a "last updated" badge.                                             |
| `GET /health`                  | Mongo and Redis reachability (`200` or `503`).                                                                                                |
| `WS /ws`                       | `{"type":"hello"}` on connect, then `{"type":"reports.updated","dates":[…],"channels":[…],"computedAt":…}` after every rebuild.               |

```sh
curl 'localhost:4000/reports?from=2026-10-01&to=2026-10-29&channel=paid_social'
curl localhost:4000/status
```

Invalid queries get `400 {"error":"invalid_query","issues":{…}}`. Range ratios in `summary` are
computed from the range's totals, not averaged across days. The `all` row's ROAS is _blended_: all
revenue over paid spend.
