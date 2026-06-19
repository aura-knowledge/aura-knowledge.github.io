# Agent-Native Packet Inspector

## Scope

A local, read-only CLI inspector for Aura Knowledge artifacts. It lets agents and authors request compact slices of the garden without exposing a runtime endpoint on the public GitHub Pages site.

## Tool Contract

```
node scripts/inspect-packet.mjs [mode] [--format json|markdown]
```

Modes:

- `--article <slug>` — summary of an article packet.
- `--claim <slug:claimId>` — a single claim with evidence and counterevidence.
- `--source <sourceId>` — source metadata and every article/claim that cites it.
- `--graph-slice <nodeId>` — first-hop neighbors from `public/graph/edges.json`.

## Output Shapes

### Article slice (JSON)

```json
{
  "id": "article:agent-auditable-research",
  "slug": "agent-auditable-research",
  "title": "The Future of Publishing Is Agent-Auditable Research",
  "status": "published",
  "maturity": "seed",
  "topics": ["ai-native-publishing", "research-workflows", "agent-provenance", "digital-gardens"],
  "thesis": "...",
  "articleUrl": "...",
  "tokenEstimate": 473,
  "claimCount": 6,
  "sourceCount": 9,
  "claims": [...],
  "sources": [...]
}
```

### Claim slice (JSON)

```json
{
  "articleId": "article:agent-auditable-research",
  "slug": "agent-auditable-research",
  "claimId": "article:agent-auditable-research:claim-001",
  "localClaimId": "claim-001",
  "claim": "...",
  "confidence": "high",
  "status": "core",
  "evidence": [...],
  "counterevidence": [...]
}
```

### Source slice (JSON)

```json
{
  "sourceId": "source-agentic-publications-2025",
  "occurrences": [
    {
      "articleId": "article:agent-auditable-research",
      "slug": "agent-auditable-research",
      "source": { "id": "...", "title": "...", "type": "...", "url": "..." },
      "supportingClaimIds": [...],
      "contestingClaimIds": [...]
    }
  ]
}
```

### Graph slice (JSON)

```json
{
  "node": { "id": "...", "type": "...", "label": "..." },
  "outgoing": [{ "type": "argues", "nodeId": "...", "label": "..." }],
  "incoming": [{ "type": "supports", "nodeId": "...", "label": "..." }]
}
```

## Safety Boundaries

- Reads only files under `public/agents/` and `public/graph/`.
- Does not read private notes, `.env`, or repository history.
- Does not perform any writes or network calls.
- Not exposed as a public route or MCP server.

## Integration

- Script: `scripts/inspect-packet.mjs`
- Package script: `npm run inspect:packet`
- Smoke test: `npm run inspect:packet:smoke` (included in `npm run check`)
