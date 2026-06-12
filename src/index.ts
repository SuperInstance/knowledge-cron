export interface Env {
  PATTERNS_KV: KVNamespace;
}

interface SearchResult {
  id: string;
  score: number;
  metadata?: {
    name?: string;
    domain?: string;
    repo?: string;
    description?: string;
    [key: string]: unknown;
  };
}

interface DetectedPattern {
  query: string;
  timestamp: string;
  results: SearchResult[];
  crossDomains: string[];
  domains: string[];
}

const QUERY_PATTERNS = [
  "ternary conservation law",
  "distributed agent coordination",
  "spectral transform signal",
  "entropy noise uncertainty",
  "Hamiltonian energy dynamics",
  "graph topology lattice network",
  "music rhythm counterpoint harmony",
  "gauge symmetry coupling field",
];

const VECTOR_API = "https://fleet-vector-api.casey-digennaro.workers.dev";

async function searchVectors(query: string, topK = 5): Promise<SearchResult[]> {
  const resp = await fetch(`${VECTOR_API}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, topK }),
  });
  if (!resp.ok) {
    console.error(`Search failed for "${query}": ${resp.status}`);
    return [];
  }
  const data = await resp.json<any>();
  // Normalize: results may be in data.results or data directly
  const raw = Array.isArray(data) ? data : data.results || data.matches || [];
  return raw.map((r: any) => ({
    id: r.id || r.name || "",
    score: r.score ?? r.similarity ?? 0,
    metadata: r.metadata || { name: r.name, domain: r.domain, repo: r.repo, description: r.description },
  }));
}

function extractDomains(results: SearchResult[]): string[] {
  const domains = new Set<string>();
  for (const r of results) {
    const d = r.metadata?.domain || r.metadata?.repo || "unknown";
    domains.add(d);
  }
  return [...domains];
}

async function runPatternDetection(kv: KVNamespace): Promise<{ patterns: DetectedPattern[]; timestamp: string }> {
  const timestamp = new Date().toISOString();
  const patterns: DetectedPattern[] = [];

  for (const query of QUERY_PATTERNS) {
    const results = await searchVectors(query, 5);
    const domains = extractDomains(results);
    const crossDomains = domains.length > 1 ? domains : [];

    patterns.push({
      query,
      timestamp,
      results,
      crossDomains,
      domains,
    });
  }

  // Store in KV
  await kv.put("latest", JSON.stringify({ timestamp, patterns }));
  await kv.put(`history:${timestamp}`, JSON.stringify({ timestamp, patterns }));

  // Keep a list of run timestamps (last 20)
  const existingList = await kv.get("runs");
  const runs: string[] = existingList ? JSON.parse(existingList) : [];
  runs.push(timestamp);
  if (runs.length > 20) runs.splice(0, runs.length - 20);
  await kv.put("runs", JSON.stringify(runs));

  return { patterns, timestamp };
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log("knowledge-cron triggered at", new Date().toISOString());
    const result = await runPatternDetection(env.PATTERNS_KV);
    console.log(`Detected ${result.patterns.length} patterns, ${result.patterns.filter(p => p.crossDomains.length > 0).length} with cross-domain connections`);
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/") {
      return Response.json({ status: "ok", service: "knowledge-cron" });
    }

    // Get patterns (latest or historical)
    if (url.pathname === "/patterns") {
      const ts = url.searchParams.get("ts");
      if (ts) {
        const data = await env.PATTERNS_KV.get(`history:${ts}`);
        if (!data) return Response.json({ error: "Not found" }, { status: 404 });
        return Response.json(JSON.parse(data));
      }
      const data = await env.PATTERNS_KV.get("latest");
      if (!data) {
        // No cron run yet — run detection now
        const result = await runPatternDetection(env.PATTERNS_KV);
        return Response.json(result);
      }
      return Response.json(JSON.parse(data));
    }

    // List historical runs
    if (url.pathname === "/runs") {
      const data = await env.PATTERNS_KV.get("runs");
      return Response.json(data ? JSON.parse(data) : []);
    }

    // Force re-run
    if (url.pathname === "/run" && request.method === "POST") {
      const result = await runPatternDetection(env.PATTERNS_KV);
      return Response.json(result);
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
};
