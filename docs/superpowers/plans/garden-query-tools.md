# Garden Query Tools — Implementation Plan

## Goal

Add safe, static query interfaces over the Aura Knowledge garden so agents and authors can retrieve articles, claims, and sources by structured fields without turning the public site into a runtime app.

## Scope

This task maps to the roadmap's "Expand Intake And Retrieval" phase. It is intentionally not a chatbot or MCP server. It is a CLI query engine plus a generated catalog of pre-computed query results that agents can read directly from the published `public/agents/` output.

## Deliverables

1. `scripts/lib/garden-queries.mjs` — shared query engine.
2. `scripts/garden-query.mjs` — CLI for ad-hoc queries.
3. `schemas/garden-queries.schema.json` — schema for the generated catalog.
4. `public/agents/garden-queries.json` — generated catalog of query dimensions and sample results.
5. `package.json` script entries: `garden:query` and `garden:query:smoke`.
6. Update `scripts/generate-agent-index.mjs` to emit the catalog and mention it in `llms.txt`.
7. Update `scripts/validate-content.mjs` to assert catalog existence, validate it against the schema, and verify referenced article ids.
8. Update `npm run check` to include the smoke test.

## Query Dimensions

The engine reads source artifacts (so drafts can be queried by authors) and generated `public/agents/verification-report.json` and `public/graph/edges.json`.

Supported article filters (AND logic):

- `--topic <topic>` — article artifact `topics` includes the topic.
- `--tag <tag>` — article frontmatter `tags` includes the tag.
- `--maturity <seed|sprout|evergreen|contested|superseded>` — article artifact `maturity`.
- `--status <draft|review|published|archived>` — article `status` (no default; includes all unless specified).
- `--cites-source-type <type>` — article artifact `sources` has a source with `type === <type>`.
- `--claim-state <verified|contested|stale|needs-evidence|missing-counterevidence|draft>` — article has at least one claim whose computed verification state matches.
- `--keyword <phrase>` — case-insensitive substring in title, summary, thesis, claim text, source title, or tags/topics.
- `--related-to <slug>` — articles that share a topic or have a `related` / graph edge to the target article (excluding the target).

Output:

- `--format ids|json|jsonl|markdown` (default `json`).
- `--limit <n>`.
- `--output <file>` (default stdout).

## Generated Catalog

`public/agents/garden-queries.json` will contain:

- `schemaVersion: 1`
- `schema` — canonical URL for `schemas/garden-queries.schema.json`
- `site`, `base`
- `generatedAt`
- `catalogSize` — summary counts for the named queries
- `dimensions` — list of available filter dimensions with descriptions and sample values
- `queries` — named pre-computed results:
  - `articles-by-topic` — article ids grouped by topic.
  - `claims-needing-evidence` — claims with state `needs-evidence`.
  - `claims-contested-or-stale` — claims with state `contested` or `stale`.
  - `high-confidence-claims` — claims with confidence `high`.
  - `sources-by-type` — source ids grouped by source type.
  - `articles-with-draft-claims` — published articles containing draft-state claims.

Each result entry includes the relevant article id, claim id (when applicable), source id (when applicable), and canonical URLs so agents can fetch the original packet.

## Validation And Smoke Tests

- `npm run check` must pass. It is updated to run `garden:query:smoke` after `validate:build`.
- `garden:query:smoke` runs `--help` and a sample filter (`--topic product-truth --format ids`).
- `validate-content.mjs` validates `public/agents/garden-queries.json` against `schemas/garden-queries.schema.json`, asserts that every referenced article id exists in `index.json`, and confirms required generated files exist.

## Risks And Boundaries

- Keep the public site static. No server, no runtime database, no MCP write tools.
- The CLI reads source artifacts so it can query drafts; the generated catalog only includes published results.
- Source `type` values are author-defined. The `sources-by-type` catalog groups by the exact value used in the artifact.
- The catalog is unbounded by design for now; because the garden is small, this is acceptable. If it grows, add per-query limits later.
