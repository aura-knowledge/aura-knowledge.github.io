# Agentic Commerce Human Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the human-facing article into a possibility-oriented builder/venture thesis memo without weakening the agent artifact.

**Architecture:** Keep the article, agent brief, and artifact as the canonical source files. Rewrite only the human narrative and the minimal matching metadata/artifact fields needed to preserve consistency, then regenerate public agent and graph outputs with the existing generator.

**Tech Stack:** Markdown article content, JSON artifact, existing Node/Astro validation pipeline.

## Global Constraints

- Treat the thesis as a plausible possibility, not a verified market conclusion.
- Prefer wording such as "may", "could", "plausible", "early signals", and "if this shift continues".
- Preserve all existing claim IDs unless a claim is intentionally removed.
- Keep public/privacy posture unchanged: no local paths, private project names, or personal discussion details.
- Validate with `npm run check` before pushing.

---

### Task 1: Restructure Article Narrative

**Files:**
- Modify: `content/articles/2026/agentic-commerce-product-truth/article.md`

**Interfaces:**
- Consumes: Existing claim markers `claim-001` through `claim-015`.
- Produces: A human-readable article that still contains visible markers for every artifact claim.

- [ ] **Step 1: Rewrite the article around this section order**

Use this exact narrative outline:

```text
1. A Small Behavior Change
2. The Possible Shift
3. The New Bottleneck
4. Not Product Truth, Product Assurance
5. Evidence, Not Reviews
6. What Can Go Wrong
7. Where to Test It
8. The Incumbent-Adjacent Opportunity
9. Evidence Notes
```

- [ ] **Step 2: Consolidate existing material**

Move the existing sections into the new structure:

```text
Brand loyalty and shower gel example -> A Small Behavior Change
Delegated intent and market signals -> The Possible Shift
Product truth layer -> The New Bottleneck
Product assurance + open/not owned -> Not Product Truth, Product Assurance
Experience packets + private entitlements + claim ledgers + offline/small sellers + human evidence -> Evidence, Not Reviews
Remaining challenges + secondary ecosystem layers -> What Can Go Wrong
MVP wedges -> Where to Test It
Incumbent-adjacent commerce -> The Incumbent-Adjacent Opportunity
```

- [ ] **Step 3: Apply possibility-language pass**

Replace over-certain language patterns:

```text
will -> may / could / is likely to
requires -> would need / is likely to need
the next commerce shift -> a possible commerce shift
product truth layer -> product assurance layer after first definition
This shift has already started -> Early signals point in this direction
```

- [ ] **Step 4: Preserve claim coverage**

Run:

```bash
rg -n 'data-claim="claim-[0-9]{3}"' content/articles/2026/agentic-commerce-product-truth/article.md
```

Expected: all claim IDs `claim-001` through `claim-015` appear exactly once.

### Task 2: Align Artifact And Agent Brief

**Files:**
- Modify: `content/articles/2026/agentic-commerce-product-truth/agent.md`
- Modify: `content/articles/2026/agentic-commerce-product-truth/artifact.json`

**Interfaces:**
- Consumes: The rewritten article stance and section flow.
- Produces: Agent-facing metadata that describes the article as a possibility thesis.

- [ ] **Step 1: Update brief thesis language**

In `agent.md`, make the thesis explicitly possibility-oriented:

```text
AI shopping agents may shift commerce from capturing human attention to satisfying delegated buyer intent. The article treats this as a possibility thesis, not a verified market conclusion.
```

- [ ] **Step 2: Update artifact thesis and review note**

In `artifact.json`, keep the same schema but adjust `thesis` and `humanReview.notes` to say the article was reviewed as a public possibility thesis.

- [ ] **Step 3: Regenerate derived outputs**

Run:

```bash
npm run generate
```

Expected: generated public agent and graph files update deterministically.

### Task 3: Validate And Push

**Files:**
- Modify: generated files under `public/agents/`, `public/graph/`, and `public/llms.txt` as produced by `npm run generate`.

**Interfaces:**
- Consumes: Tasks 1 and 2.
- Produces: A pushed PR update with passing CI.

- [ ] **Step 1: Run full validation**

Run:

```bash
npm run check
```

Expected: command exits 0 and builds `/articles/agentic-commerce-product-truth/`.

- [ ] **Step 2: Review diff**

Run:

```bash
git diff --stat
git diff --check
```

Expected: no whitespace errors; diff is limited to the article, matching artifact/brief, generated outputs, and this plan.

- [ ] **Step 3: Commit and update PR branch**

Commit:

```bash
git add content/articles/2026/agentic-commerce-product-truth docs/superpowers/plans/2026-06-18-agentic-commerce-human-structure.md public/agents public/graph public/llms.txt
git commit -m "content: restructure agentic commerce thesis"
```

Push to PR branch using the same GitHub API fallback if normal Git push still rejects HTTPS credentials.

- [ ] **Step 4: Confirm CI**

Run:

```bash
gh pr view 4 --repo aura-knowledge/aura-knowledge.github.io --json statusCheckRollup,headRefOid
```

Expected: all `Validate and build` checks complete with `SUCCESS`.

## Self-Review

- Spec coverage: The plan covers the approved option 2 thesis-memo structure, possibility framing, artifact/brief alignment, generation, validation, and push.
- Placeholder scan: No TODO/TBD placeholders remain.
- Scope check: This is one content restructuring task, not a new feature or schema migration.
