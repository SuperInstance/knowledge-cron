# Knowledge Cron

**A scheduled knowledge-management service that periodically harvests, processes, and indexes information from configured sources.** It provides the cron-driven automation layer for keeping SuperInstance's knowledge base current — fetching updates from Git repos, RSS feeds, and APIs on configurable schedules.

## Why It Matters

Knowledge bases decay without maintenance. Documentation goes stale, crate registries update, and architectural decisions drift from reality. Rather than manual refreshes, a knowledge cron automates the pipeline: on a schedule, it pulls fresh data from each source, processes it (summarize, embed, index), and writes results to the vector store. This keeps semantic search relevant without human intervention.

## How It Works

The service operates as a periodic task runner:

1. **Schedule** — Cron expressions define when each source is harvested (e.g., daily for docs, hourly for crates).
2. **Fetch** — Pull data from the source (git pull, HTTP GET, API call).
3. **Process** — Extract text, generate embeddings (via Workers AI BGE model), and compute metadata.
4. **Index** — Upsert embeddings into the Vectorize index for semantic search.
5. **Notify** — Emit metrics and optional notifications for new/changed content.

The crate is currently a scaffold — it does not yet have implementation code. The intended architecture mirrors the fleet-metrics-cron pattern: a Cloudflare Worker with a Cron Trigger that dispatches to handler functions.

## Quick Start

```bash
# This crate is a scaffold. Once implemented:
cargo build --release
# Deploy as a scheduled Worker with wrangler
```

## API

*To be defined — see the [architecture overview](https://github.com/SuperInstance/SuperInstance/blob/main/ARCHITECTURE.md) for the planned design.*

## Architecture Notes

This crate is part of the SuperInstance knowledge pipeline. It feeds the [fleet-vector-api](https://github.com/SuperInstance/SuperInstance/blob/main/ARCHITECTURE.md) for semantic search and integrates with the [KD-tree](https://github.com/SuperInstance/SuperInstance/blob/main/ARCHITECTURE.md) for local nearest-neighbor queries.

## License

MIT
