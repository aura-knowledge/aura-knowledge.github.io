# Phase 2 Plan: Expand Intake And Retrieval

## Phase Goal

Add intake, import, graph expansion, and agent retrieval primitives while keeping the public site static and the source ledger as the only path from external material to public claims.

## Scope

Phase 2 contains 5 roadmap ideas:

1. **Source Ledger Importer** — CLI that imports URLs, arXiv IDs, DOIs, GitHub repos, and newsletters into normalized source-ledger candidates.
2. **Scheduled Source Ledger Scout** — cron-ready, dry-run feed collector that writes candidate source entries and article seeds without publishing.
3. **Provenance Graph v2** — richer graph edges (`supports`, `contests`, `depends-on`, `mentions`, `derived-from`) with optional reviewed edge metadata.
4. **Draft Audit Report** — per-article audit that groups existing diagnostics findings as suggestions in `workspace/audit.json`.
5. **Garden Query Tools** — static tool contract and thin local CLI for safe, read-only agent operations over garden artifacts.

## Execution order

1. **Source Ledger Importer** — foundational; produces the normalized source candidate format the scout consumes.
2. **Draft Audit Report** — reuses existing diagnostics and writes a per-article workspace report; no new dependencies.
3. **Provenance Graph v2** — data-model change; land after source intake and audit are stable.
4. **Scheduled Source Ledger Scout** — builds on the importer and writes candidates to `content/scout/`.
5. **Garden Query Tools** — static tool contract and CLI over the now-stable artifacts.

---

## 1. Source Ledger Importer

### Goal

Give authors a CLI to pull external material into the garden's source-ledger format without manually copying metadata.

### Supported inputs

- `url` — generic web page; extracts title, final URL, description.
- `arxiv` — arXiv ID or abstract URL; fetches metadata via arXiv API.
- `doi` — DOI; resolves via doi.org and Crossref if possible.
- `github` — `owner/repo` or repo URL; extracts repo metadata.
- Generic URL with `--type` hint (e.g. `newsletter`) is preferred over a dedicated newsletter importer.

### Output

A source candidate file in `content/scout/candidates/<date>/<source-id>.json` with:

```json
{
  "schemaVersion": 1,
  "id": "candidate-source-example-001",
  "url": "https://example.com",
  "title": "Example Article",
  "type": "article",
  "accessed": "2026-06-19",
  "input": {
    "kind": "url",
    "value": "https://example.com"
  },
  "status": "candidate",
  "notes": "Imported by source-ledger-importer."
}
```

- `id` follows `^candidate-source-[a-z0-9-]+$`.
- `type` aligns with the existing `SOURCE_TYPES` set used by validators (`article`, `paper`, `report`, `book`, `dataset`, `protocol`, `tool`, `standard`, `newsletter`, `blog`, `repository`, `documentation`, `inline`).
- Promotion to a real artifact source is manual or via `scripts/promote-source.mjs`. Candidates are never auto-committed to `artifact.json`.

### Use cases

- **Author:** imports a paper DOI and gets a source candidate ready for review.
- **Author:** imports a GitHub repo as a protocol/tool source.
- **Maintainer:** normalizes importer output before it can support a claim.
- **Agent:** reads candidate format and promotes approved entries into `artifact.json` sources.

### Files to create/change

- `scripts/source-importer.mjs`
- `scripts/promote-source.mjs`
- `schemas/source-candidate.schema.json`
- `content/scout/candidates/.gitkeep`
- `.gitignore` — exclude `content/scout/candidates/` from tracked generated noise
- `package.json` `source:import` and `source:promote` scripts

### Implementation steps

1. Define `source-candidate.schema.json`.
2. Implement fetch/normalize helpers for each input kind with graceful fallbacks.
3. Write CLI with `--kind` and `--value` (or auto-detect).
4. Add `promote-source.mjs` to copy a candidate into an article's `artifact.json` sources.
5. Save candidate JSON and print promotion next steps.
6. Test with a real arXiv URL/ID and a generic URL.

---

## 2. Scheduled Source Ledger Scout

### Goal

A cron-ready agent that watches configured feeds and writes source candidates and article seeds, but never publishes without human review.

### Feeds

Configured in `scout.config.json`:

```json
{
  "schemaVersion": 1,
  "feeds": [
    { "id": "hn-ai", "name": "Hacker News AI", "type": "rss", "url": "...", "topic": "ai-native-publishing", "enabled": true },
    { "id": "arxiv-cs-ai", "name": "arXiv CS.AI", "type": "rss", "url": "...", "topic": "research-workflows", "enabled": true }
  ]
}
```

### Output

- Source candidates in `content/scout/candidates/<date>/`.
- A scout report in `content/scout/reports/<date>.json` listing discovered items and any suggested article seeds.

### Use cases

- **Author:** reviews the latest scout report for relevant sources.
- **Maintainer:** adjusts feed list and topic mappings in `scout.config.json`.
- **CI:** runs the scout in dry-run mode on demand to validate configuration.
- **Scheduler:** runs the script from a local cron job or GitHub Actions workflow ( documented in README ).

### Files to create/change

- `scripts/scout-sources.mjs`
- `scout.config.json`
- `schemas/scout-config.schema.json`
- `package.json` `scout` script
- `.github/workflows/scout.yml` (optional GitHub Actions cron)
- `.gitignore` — exclude `content/scout/candidates/` and `content/scout/reports/` from tracked generated noise

### Implementation steps

1. Define `scout-config.schema.json` with `enabled` flag and rate-limit config.
2. Implement RSS/Atom fetch and parse with basic backoff.
3. Map feed entries to source candidates.
4. Write candidates and report, deduplicating by normalized URL.
5. Support `--dry-run`.

---

## 3. Provenance Graph v2

### Goal

Expand the public graph from basic article/claim/source/topic nodes to richer, reviewed edges.

### New edge types

- `supports` / `contests` — source → claim. Generated from evidence/counterevidence packets.
- `depends-on` — article/claim → article/claim. Declared in `artifact.related` with `type: "depends-on"`.
- `mentions` — article → source. Declared in `artifact.related` with `type: "mentions"`.
- `derived-from` — claim/article → claim/article. Declared in `artifact.related` with `type: "derived-from"`.
- `covers` — keep existing article → topic.
- `argues` — keep existing article → claim.

### Edge metadata

Edges get an optional `provenance` object. Generated edges default to `status: "machine-generated"`:

```json
{
  "from": "source-simon-attention-scarcity",
  "to": "article:agentic-commerce-product-truth:claim-001",
  "type": "supports",
  "provenance": {
    "reviewedAt": "2026-06-18",
    "reviewer": "human",
    "status": "approved"
  }
}
```

### Use cases

- **Human reader:** sees why a graph edge exists.
- **Agent:** traverses only approved edges when retrieving evidence.
- **Maintainer:** audits unreviewed or contested edges.

### Files to create/change

- `schemas/graph-edge.schema.json`
- `scripts/generate-agent-index.mjs` graph builder
- `src/pages/graph.astro` or graph scripts to display edge provenance
- `public/graph/edges.json` (bump to schemaVersion 2)

### Implementation steps

1. Add edge schema that allows `schemaVersion` and `provenance`.
2. Update graph builder to emit `supports`/`contests` edges from evidence/counterevidence, `depends-on`/`mentions`/`derived-from` from `artifact.related`, and keep `covers`/`argues`.
3. Bump generated `edges.json` to `schemaVersion: 2`.
4. Update graph page/script to surface edge provenance.
5. Run `npm run check`.

---

## 4. Draft Audit Report

### Goal

Audits a draft article and produces a deterministic report of evidence gaps, weak counterarguments, and ungrounded claims by reusing the existing diagnostics engine.

### Report format

```json
{
  "schemaVersion": 1,
  "articleId": "article:...",
  "slug": "...",
  "generatedAt": "...",
  "suggestions": [
    { "claimId": "claim-001", "rule": "missing-counterevidence", "severity": "warning", "message": "..." }
  ]
}
```

### Rules

Rules mirror `scripts/lib/evidence-diagnostics.mjs`:

- `missing-counterevidence` for high-confidence/contested/risk claims.
- `low-source-diversity` for single-source claims.
- `empty-evidence` / `orphan-claim` for ungrounded claims.
- `stale-source` for sources older than the article update threshold.

### Use cases

- **Author:** runs `npm run audit -- <slug>` before asking for human review.
- **Reviewer:** reads `workspace/audit.json` alongside `workspace/review.md`.
- **Agent:** uses audit output to prioritize evidence collection.

### Files to create/change

- `scripts/audit-draft.mjs`
- `schemas/draft-audit.schema.json`
- `package.json` `audit` script

### Implementation steps

1. Define audit schema that mirrors existing finding shape.
2. Reuse `assessArticle` from `evidence-diagnostics.mjs`.
3. Write per-article `workspace/audit.json`.
4. Add CLI and test.

---

## 5. Garden Query Tools

### Goal

Define safe, read/query tool contracts for agents to inspect the garden without write access, plus a thin local CLI to exercise them.

### Tools

- `query_articles` — list/filter published articles by topic/status.
- `inspect_claim` — return claim, evidence, and counterevidence for a claim ID.
- `graph_neighbors` — return neighbors of a node with edge provenance.
- `validate_packet` — run schema and governance checks on an artifact.
- `scaffold_workspace` — dry-run preview of `workspace:create` output.

### Transport

- Static tool definitions in `tools/garden-tools.json`.
- Thin local CLI `scripts/garden-query.mjs` that dispatches tool calls from JSON on stdin or `--tool`/`--input` flags.
- The CLI is read-only and never writes to the repo.

### Use cases

- **Agent:** reads `tools/garden-tools.json` to discover safe operations.
- **Author:** runs `scripts/garden-query.mjs` to retrieve claims and sources for an agent session.
- **Maintainer:** reviews tool definitions to ensure no unwanted write paths.

### Files to create/change

- `scripts/garden-query.mjs`
- `tools/garden-tools.json`
- `schemas/garden-tool.schema.json`
- `package.json` `garden:query` script
- `docs/garden-tools.md`

### Implementation steps

1. Define tool schema and JSON tool definitions.
2. Implement read-only handlers that read generated artifacts.
3. Add dry-run scaffolding handler that returns the plan without writing files.
4. Document tool contracts.
5. Test with echo/json input.

---

## Phase 2 Branches

| Task | Branch |
|------|--------|
| Source Ledger Importer | `feature/source-ledger-importer` |
| Scheduled Source Ledger Scout | `feature/source-ledger-scout` |
| Provenance Graph v2 | `feature/provenance-graph-v2` |
| Draft Audit Report | `feature/draft-audit-report` |
| Garden Query Tools | `feature/garden-query-tools` |
