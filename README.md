# Pulseboard

Marketing analytics pipeline and dashboard. Scheduled jobs ingest ad spend, web traffic, orders and
targets from four sources, precompute daily per-channel KPIs (spend, revenue, ROAS, CAC, conversion
rate) into MongoDB, and serve them to a dashboard that updates live.

> 🚧 Work in progress. Architecture, design decisions and screenshots are coming.

## Stack

TypeScript monorepo (pnpm) · Node.js + Express · BullMQ + Redis · MongoDB (replica set) ·
Next.js + React + Tailwind · Vitest · Docker Compose · GitHub Actions

## Run locally

Requires Node 24, pnpm (via `corepack enable`) and Docker.

```sh
pnpm install
cp .env.example .env
pnpm db:up   # MongoDB replica set + Redis
pnpm dev     # api :4000, worker, web :3000
```

Data sources are simulated connectors with deterministic seed data, so no API keys are needed.
