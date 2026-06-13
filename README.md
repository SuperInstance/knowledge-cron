# Knowledge Cron

A **scheduled knowledge-mining Cloudflare Worker** that periodically queries the fleet-vector-api across eight semantic domains, detects cross-domain connections, and stores results in a KV namespace — surfacing unexpected relationships between crates in different fields.

## Why It Matters

The SuperInstance fleet has 1,000+ crates spanning graph algorithms, distributed systems, signal processing, physics, and music theory. Serendipitous connections — like realizing that gossip protocol convergence and harmonic oscillation both follow logistic growth — drive innovation. But nobody has time to manually search for cross-domain patterns daily. This Worker automates the discovery loop: every 6 hours, it runs 8 semantic queries against the vector index, extracts the domains of top results, and flags queries where results span multiple domains. These cross-domain "bridge" patterns are stored in KV for later review. It's automated lateral thinking.

## How It Works

**Cron trigger**: The Worker is configured with a Cloudflare Cron Trigger (`crons = ["0 */6 * * *"]`), firing every 6 hours. The `scheduled` event handler executes the pattern detection pipeline.

**Query patterns**: Eight fixed queries span the fleet's semantic space:
1. `"ternary conservation law"` — physics/maths
2. `"distributed agent coordination"` — distributed systems
3. `"spectral transform signal"` — signal processing
4. `"entropy noise uncertainty"` — information theory
5. `"Hamiltonian energy dynamics"` — physics
6. `"graph topology lattice network"` — graph theory
7. `"music rhythm counterpoint harmony"` — music theory
8. `"gauge symmetry coupling field"` — theoretical physics

**Vector search**: Each query is POST'd to the fleet-vector-api `/search` endpoint, which embeds the query using BGE-small-en-v1.5 and performs cosine similarity search against the 384-dimensional index. Returns top-5 results with scores.

**Cross-domain detection**: For each query's results, extract the `domain` or `repo` field from each result's metadata. If results span >1 domain, it's flagged as a cross-domain connection — the most interesting type of result.

**Storage**: Results are stored in Cloudflare KV:
- `latest` → most recent run (JSON)
- `history:{timestamp}` → per-run archive
- `runs` → list of recent timestamps (last 20)

**HTTP API**: The Worker also serves requests:
- `GET /` — health check
- `GET /patterns` — latest (or historical) patterns
- `GET /runs` — list of run timestamps
- `POST /run` — force immediate re-run

**Complexity**: Each run performs 8 vector searches at O(N × D) each where N = 1012 vectors, D = 384 dimensions. Total: 8 × O(N × D) ≈ 3.1M operations per run — well within Cloudflare Worker CPU limits.

## Quick Start

```bash
# Deploy
npx wrangler deploy

# View latest patterns
curl https://knowledge-cron.YOUR-SUBDOMAIN.workers.dev/patterns

# Force re-run
curl -X POST https://knowledge-cron.YOUR-SUBDOMAIN.workers.dev/run

# List historical runs
curl https://knowledge-cron.YOUR-SUBDOMAIN.workers.dev/runs
```

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/patterns` | GET | Latest (or `?ts=` historical) pattern results |
| `/runs` | GET | List recent run timestamps |
| `/run` | POST | Force immediate pattern detection |

## Architecture Notes

Knowledge Cron is the automated insight layer of SuperInstance. It mines the fleet-vector-api's embedding space for cross-domain connections that humans might miss. In **γ + η = C**, this is pure **η** — once deployed, it runs autonomously with zero coordination cost, surfacing insights that would otherwise require manual exploration. See [Architecture](https://github.com/SuperInstance/SuperInstance/blob/main/ARCHITECTURE.md).

## References

- Cloudflare Workers Cron Triggers. https://developers.cloudflare.com/workers/cron-triggers/
- Cloudflare Vectorize. https://developers.cloudflare.com/vectorize/
- Swanson, D. R. "Undiscovered Public Knowledge," Library Quarterly (1986). — Cross-domain knowledge mining.

## License

MIT
