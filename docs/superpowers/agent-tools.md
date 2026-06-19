# Agent-Native Tool Orchestrator

Aura Knowledge is a static research garden, but its script layer is now exposed as a
provider-agnostic tool orchestrator. Any agent — Claude, Kimi, Z.AI, or a local
workflow engine — can discover the available tools, call them through a single
dispatcher, and run multi-step authoring workflows without a human remembering
individual npm scripts.

## Manifest

The canonical tool catalog is published at:

```text
https://aura-knowledge.github.io/agents/tools.json
```

It is generated from `scripts/lib/agent-tools.mjs` and validated against
`schemas/agent-tools.schema.json`. Each entry contains:

- `name`, `description`, `category`
- `write` — true if the tool mutates the repo
- `dryRunSupported` — true if the tool can preview its effects
- `inputSchema` / `outputSchema` — JSON Schema for programmatic validation
- `examples` — sample invocations

## Dispatcher CLI

The dispatcher turns any tool into a uniform JSON-in / JSON-out command:

```bash
# Read tool
npm run agent:tool -- --tool queryGarden --input '{"topic":"product-truth","limit":5}'

# Dry-run write tool
npm run agent:tool -- --tool createWorkspace --input '{"slug":"agentic-commerce-update"}' --dry-run

# Execute write tool (requires --confirm)
npm run agent:tool -- --tool createWorkspace --input '{"slug":"agentic-commerce-update","title":"Agentic Commerce Update"}' --confirm
```

Write tools are blocked on the `main` branch. If a tool supports dry-run, the
dispatcher returns a preview when `--confirm` is omitted.

## Workflows

`scripts/agent-workflow.mjs` composes tools into higher-level recipes.

```bash
# List workflows
npm run agent:workflow -- --list

# Preview a full article-creation flow
npm run agent:workflow -- --workflow composeArticle \
  --input '{"slug":"agentic-commerce-update","title":"Agentic Commerce Update","sources":[{"value":"https://arxiv.org/abs/2505.13246"}]}' \
  --dry-run

# Run it
npm run agent:workflow -- --workflow composeArticle \
  --input '{"slug":"agentic-commerce-update","title":"Agentic Commerce Update","sources":[{"value":"https://arxiv.org/abs/2505.13246"}]}' \
  --confirm
```

`composeArticle` performs:

1. `createWorkspace`
2. `importSource` for each source
3. `promoteSource` for each imported candidate
4. `auditDraft`
5. `generateArtifacts`
6. `validateGarden` (optional, when `"validate": true`)

## Available Tools

| Tool | Category | Write | Dry-run | Purpose |
|------|----------|-------|---------|---------|
| `createWorkspace` | authoring | yes | yes | Scaffold a new article workspace |
| `importSource` | authoring | yes | yes | Import a URL/arXiv/DOI/GitHub source candidate |
| `promoteSource` | authoring | yes | yes | Promote a candidate into an article source ledger |
| `auditDraft` | governance | yes | no | Run evidence diagnostics on draft(s) |
| `scoutSources` | authoring | yes | yes | Fetch RSS/Atom feeds and write candidates |
| `queryGarden` | retrieval | no | n/a | Query articles by topic, tag, maturity, etc. |
| `inspectPacket` | retrieval | no | n/a | Return a slice of an article, claim, source, or graph node |
| `runEvaluation` | governance | yes | no | Run the agent-brief evaluation harness |
| `generateArtifacts` | build | yes | no | Regenerate public agent and graph artifacts |
| `validateGarden` | governance | no | n/a | Run the full CI pipeline |

## Safety Model

- **Main-branch guard**: every write tool checks the current Git branch and refuses
  to run on `main`.
- **Confirmation gate**: write tools require `--confirm`; dry-run-capable tools
  return a preview first.
- **Input validation**: JSON inputs are validated against each tool's JSON Schema.
- **Path safety**: all paths must be relative and cannot contain `..`, `~`, or
  point at sensitive files like `.env`.

## Smoke Tests

`npm run agent:tools:smoke` regenerates the manifest, validates it, and exercises
read tools plus dry-run writes. It is included in `npm run check`.

## For Humans

Instead of memorizing script names and argument order, you can ask your agent to
run a workflow. The agent receives structured JSON results and can show you a
preview before any file is changed. The same commands also work directly from
your terminal when you want to drive them manually.
