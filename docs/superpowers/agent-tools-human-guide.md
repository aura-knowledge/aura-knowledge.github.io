# Agent Tools: Human Prompt Guide

Aura Knowledge now exposes its script layer as a set of agent tools. You do not
need to remember npm commands — you can ask your AI agent to run them for you.
This guide gives you copy/paste prompt patterns for the most common tasks.

> The agent has access to the tool manifest at
> `https://aura-knowledge.github.io/agents/tools.json` and can run them through
> the dispatcher (`scripts/agent-tool.mjs`) or workflows
> (`scripts/agent-workflow.mjs`).

## Before you start

- The agent works from the repo root.
- **Write tools require confirmation.** The agent will show you a dry-run
  preview first; say “yes” or pass `--confirm` only after you review it.
- **Never run writes on `main`.** Create a feature branch or ask the agent to
  work in a new branch.

---

## 1. Discuss an existing article

### What you might say

```text
I want to discuss the article "agent-auditable-research". Please pull up its
claims, sources, and any related articles, then summarize the key evidence and
counter-arguments for me.
```

### Tools the agent will likely use

1. `inspectPacket` — mode `article` or `claim` to show the article packet.
2. `queryGarden` — keyword or related-to search for related articles.
3. `inspectPacket` — mode `graphSlice` to show first-hop neighbors.

### Example dispatcher calls behind the scenes

```bash
npm run agent:tool -- --tool inspectPacket \
  --input '{"mode":"article","target":"agent-auditable-research","format":"markdown"}'

npm run agent:tool -- --tool queryGarden \
  --input '{"relatedTo":"agent-auditable-research","limit":10}'

npm run agent:tool -- --tool inspectPacket \
  --input '{"mode":"graphSlice","target":"article:agent-auditable-research","format":"markdown"}'
```

### Prompt variations

- “Show me the strongest and weakest claims in `agentic-commerce-product-truth`.”
- “Which sources in `agent-auditable-research` are papers versus articles?”
- “Find articles related to product-truth and list their maturity/status.”

---

## 2. Start a new article

### What you might say

```text
Start a new article workspace for "agentic-commerce-update". Primary topic should
be "agentic-commerce". Title: "Agentic Commerce Update". Show me the preview
first; do not create files until I confirm.
```

### Tool the agent will use

- `createWorkspace` in dry-run mode, then again with `--confirm` after you
  approve.

### Example dispatcher calls

```bash
# preview
npm run agent:tool -- --tool createWorkspace \
  --input '{"slug":"agentic-commerce-update","topic":"agentic-commerce","title":"Agentic Commerce Update"}'

# after you confirm
npm run agent:tool -- --tool createWorkspace \
  --input '{"slug":"agentic-commerce-update","topic":"agentic-commerce","title":"Agentic Commerce Update"}' \
  --confirm
```

### Prompt variations

- “Scaffold a draft for `digital-gardens-primer` with a thesis about
  publish-then-curate workflows.”
- “Create a workspace from my notes file `notes/llm-search.txt` under slug
  `llm-search-2026`."

---

## 3. Import a source into the garden

### What you might say

```text
Import this paper as a source candidate: https://arxiv.org/abs/2505.13246.
Label it as a paper and tag it for the agentic-commerce topic.
```

### Tool the agent will use

- `importSource`

### Example dispatcher call

```bash
npm run agent:tool -- --tool importSource \
  --input '{"value":"https://arxiv.org/abs/2505.13246","kind":"url","type":"paper","notes":"Agentic commerce background"}' \
  --confirm
```

### Prompt variations

- “Import DOI 10.1234/example as a paper.”
- “Import the GitHub repo `owner/repo` as a repository source.”
- “Run the RSS scout and show me today’s candidates before saving any.”

---

## 4. Add a source to an existing article

### What you might say

```text
Promote candidate `candidate-source-abc123` into the source ledger of the
`agentic-commerce-update` article. Show me the preview first.
```

### Tool the agent will use

- `promoteSource`

### Example dispatcher call

```bash
npm run agent:tool -- --tool promoteSource \
  --input '{"candidateId":"candidate-source-abc123","article":"agentic-commerce-update"}' \
  --confirm
```

---

## 5. Audit a draft

### What you might say

```text
Audit the draft `agentic-commerce-update` and tell me which claims need more
 evidence or better citations.
```

### Tool the agent will use

- `auditDraft`

### Example dispatcher call

```bash
npm run agent:tool -- --tool auditDraft \
  --input '{"slug":"agentic-commerce-update"}' \
  --confirm
```

### Prompt variations

- “Audit all drafts and give me a prioritized list of gaps.”
- “Which claims in the garden currently have the weakest evidence?”

---

## 6. Run the full end-to-end article workflow

### What you might say

```text
Run the composeArticle workflow for slug `agentic-commerce-update` with title
`Agentic Commerce Update` and import this source: https://arxiv.org/abs/2505.13246.
Use dry-run first, then ask me before creating anything.
```

### Workflow the agent will use

- `composeArticle`

### Example workflow call

```bash
npm run agent:workflow -- --workflow composeArticle \
  --input '{
    "slug": "agentic-commerce-update",
    "title": "Agentic Commerce Update",
    "topic": "agentic-commerce",
    "sources": [{"value":"https://arxiv.org/abs/2505.13246","type":"paper"}]
  }' \
  --dry-run
```

After you review, rerun without `--dry-run` and with `--confirm`.

---

## 7. Verify the site before publishing

### What you might say

```text
Run the full CI check so I know the garden builds cleanly.
```

### Tool the agent will use

- `validateGarden` (or simply `npm run check`)

### Example dispatcher call

```bash
npm run agent:tool -- --tool validateGarden
```

---

## Quick reference: tool categories

| If you want to… | Ask the agent to use… |
|-----------------|-----------------------|
| Find or compare articles | `queryGarden`, `inspectPacket` |
| Start a new draft | `createWorkspace` |
| Save a source candidate | `importSource` |
| Attach a source to an article | `promoteSource` |
| Check evidence quality | `auditDraft` |
| Import RSS/Atom candidates | `scoutSources` |
| Do everything at once | `composeArticle` workflow |
| Rebuild public artifacts | `generateArtifacts` |
| Run CI | `validateGarden` / `npm run check` |

---

## Remember

- **Preview first, confirm second.** Any command that changes files should show
  you a dry-run preview before you say yes.
- **Work in branches.** The agent cannot run write tools on `main`.
- **Inspect before you edit.** Use `queryGarden` and `inspectPacket` to understand
  the current state before asking for changes.
