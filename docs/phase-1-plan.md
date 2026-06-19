# Phase 1 Plan: Build The Authoring Workspace

## Phase Goal

Turn research plans, source captures, article drafts, artifact diffs, and reviewer results into durable files rather than chat history. The workspace remains local/static; no runtime authoring app is added to the public site.

## Scope

Phase 1 contains 3 roadmap ideas:

1. **Research Workspace Builder** — CLI scaffolding for a new article workspace
2. **Artifact Widget Catalog** — typed, bounded components for the public site
3. **Trust-Gated Publishing Pipeline** — provenance records for agent roles, output hashes, review status, and human approval

---

## 1. Research Workspace Builder

### Goal

Provide a local CLI command that scaffolds a new article workspace with all the files an author needs to research, draft, and publish an article.

### Workspace layout

```text
content/articles/<year>/<slug>/
├── article.md
├── agent.md
├── artifact.json
└── workspace/
    ├── README.md
    ├── checklist.md
    ├── plan.md
    ├── notes.md
    ├── review.md
    ├── drafts/
    └── sources/
        ├── source-001.md
        └── source-002.md
```

### Use cases

- **Author:** runs `npm run workspace:create <slug>` and gets a complete scaffold.
- **Author:** re-runs the command by mistake and is warned about an existing workspace unless `--force` is used.
- **Author:** seeds a workspace from an existing research note or roadmap idea (optional `--seed <file>`).
- **Reviewer:** reads `workspace/review.md` and `workspace/checklist.md` to see review status and notes.
- **Maintainer:** updates the template set and verifies that a freshly scaffolded workspace passes `npm run check`.
- **Agent:** reads `workspace/README.md`, `workspace/plan.md`, and `workspace/notes.md` as context for the article.
- **CI:** checks that a scaffolded workspace passes `npm run check` before template changes are merged.

### Files to create

- `scripts/create-workspace.mjs`
- Template files in `scripts/templates/workspace/`
- Update `package.json` with `workspace:create` script

### Implementation steps

1. Create templates for `article.md` (with a sample claim marker), `agent.md`, `artifact.json` (matching the provenance schema), `workspace/README.md`, `workspace/checklist.md`, `workspace/plan.md`, `workspace/notes.md`, `workspace/review.md`, `workspace/drafts/.gitkeep`, and `source-template.md`.
2. Write `scripts/create-workspace.mjs` that:
   - Accepts slug and optional year/topic/seed
   - Uses the current calendar year by default
   - Validates the slug against `^[a-z0-9-]+$`
   - Refuses to overwrite an existing workspace unless `--force` is passed
   - Supports `--dry-run` to preview paths without writing files
   - Creates directory structure and fills templates with slug, year, date, topic
   - Prints next steps (`npm run generate`, edit `artifact.json`, run `npm run check`)
3. Add `npm run workspace:create -- <slug>` script.
4. Ensure newly scaffolded articles use `status: "draft"` so validators treat empty evidence leniently.
5. Test by creating a sample workspace and running `npm run check`.

---

## 2. Artifact Widget Catalog

### Goal

Define and document approved static components for rendering artifact data. This prevents arbitrary generated UI and aligns the public site with the artifact schema.

### Widgets

| Widget | Purpose | File |
|--------|---------|------|
| `ClaimCard` | Render a claim with evidence/counterevidence packets | `src/components/ClaimCard.astro` |
| `SourceLedger` | Render source list | `src/components/SourceLedger.astro` |
| `MaturityBadge` | Render maturity value (reuse existing `.maturity-*` classes) | `src/components/MaturityBadge.astro` |
| `EvidencePacket` | Render a single evidence packet | `src/components/EvidencePacket.astro` |
| `CounterevidencePacket` | Render a single counterevidence packet | `src/components/CounterevidencePacket.astro` |
| `RoadmapCard` | Render a roadmap phase or idea via `variant` prop | `src/components/RoadmapCard.astro` |
| `ProvenancePanel` | Render provenance summary on article pages | `src/components/ProvenancePanel.astro` |
| `StatusBadge` | Render article status (`draft`/`review`/`published`/`archived`) | `src/components/StatusBadge.astro` |
| `AgentPacketLink` | Render the "Machine-readable packet" link section | `src/components/AgentPacketLink.astro` |

### Existing components to catalogue

- `FocusRail.astro` — claim metadata; consider refactoring to use `ClaimCard` internals.
- `TopicChip.astro` — topic tag rendering.
- `ThemeToggle.astro` — site chrome widget.

### Use cases

- **Human reader:** sees consistent, predictable UI across article, roadmap, and graph pages.
- **Agent/generative UI:** can reference bounded component contracts instead of arbitrary HTML.
- **Developer:** knows which components accept which props and which are server-only Astro components.
- **Accessibility reviewer:** each widget carries baseline ARIA contracts.
- **Maintainer:** knows where to update shared rendering logic.

### Files to change/create

- Create components in `src/components/`
- Refactor `src/pages/articles/[slug].astro` to use `ClaimCard`, `SourceLedger`, `ProvenancePanel`, `StatusBadge`, and `AgentPacketLink`
- Refactor `src/pages/roadmap.astro` to use `RoadmapCard`
- Add `docs/widget-catalog.md` documenting contracts

### Implementation steps

1. Create `MaturityBadge.astro`.
2. Create `EvidencePacket.astro` and `CounterevidencePacket.astro`.
3. Create `ClaimCard.astro` using `EvidencePacket` and `CounterevidencePacket`.
4. Create `SourceLedger.astro`.
5. Create `StatusBadge.astro`.
6. Create `AgentPacketLink.astro`.
7. Create `ProvenancePanel.astro` (depends on the provenance model from Task 1).
8. Create `RoadmapCard.astro` with `variant: "phase" | "idea"`.
9. Refactor article page to use new components.
10. Refactor roadmap page to use `RoadmapCard`.
11. Document widget contracts and ARIA expectations.

---

## 3. Trust-Gated Publishing Pipeline

### Goal

Add provenance records that capture agent roles, output hashes, review status, policy scope, and human approval before an article can be published.

### Provenance model

This bumps `artifact.schemaVersion` from `2` to `3`. The existing `humanReview` field is deprecated in favor of `provenance.reviews`, which becomes the single source of truth for review history.

Each artifact gets a new `provenance` object:

```json
{
  "schemaVersion": 3,
  "provenance": {
    "createdAt": "2026-06-19",
    "createdBy": "human",
    "agents": [
      {
        "role": "draft-assistant",
        "model": "gpt-5.5",
        "invokedAt": "2026-06-19",
        "inputHash": "sha256:...",
        "outputHash": "sha256:..."
      }
    ],
    "reviews": [
      {
        "reviewer": "human",
        "reviewedAt": "2026-06-19",
        "status": "approved",
        "scope": ["claims", "sources", "tone"],
        "notes": "...",
        "contentHash": "sha256:..."
      }
    ],
    "policy": {
      "id": "policy:default",
      "version": "1.0.0"
    }
  }
}
```

Review statuses: `approved`, `requested-changes`, `commented`, `rejected`.

Hash scope and normalization:
- `inputHash` is computed over the inputs fed to the agent (e.g., `workspace/plan.md` + `workspace/notes.md`), normalized to UTF-8 with LF line endings and a stable key order if JSON.
- `outputHash` is computed over the agent output file.
- `contentHash` inside a review entry records the `article.md` hash that was approved.
- Algorithm is `sha256` and recorded as `sha256:<hex>`.

### Policy layer

- Add `policies/default-1.0.0.json` describing the default policy.
- Add `schemas/policy.schema.json` to validate policy files.
- Validator must ensure `artifact.provenance.policy.id` resolves to a known policy file.

### Publishing gate

- A published article must have at least one human review with `status: "approved"`.
- The artifact `contentHash` must match the current `article.md` hash (already enforced).
- The latest approved review must reference the current `contentHash`.
- Agent output hashes are recorded for traceability.
- Draft/review articles may carry provenance but are not required to pass the gate.

### Use cases

- **Human reviewer:** sees provenance before approving publication.
- **Author:** uses `scripts/record-agent-run.mjs` to log an agent invocation with computed hashes instead of hand-editing JSON.
- **Maintainer:** ships a policy file and updates the policy registry.
- **Agent:** reads provenance to know what was human-approved vs. agent-generated.
- **CI:** blocks publish if provenance requirements are not met.

### Files to change

- `schemas/artifact.schema.json` — add provenance definition, bump schemaVersion to 3
- `schemas/policy.schema.json` — new policy schema
- `policies/default-1.0.0.json` — sample policy
- `src/lib/content.ts` — add provenance and policy types
- `scripts/validate-content.mjs` — enforce publishing gate and policy resolution
- `scripts/lib/evidence-diagnostics.mjs` — add `provenance-policy-missing`, `unapproved-publication`, `provenance-contentHash-mismatch` rules
- `scripts/record-agent-run.mjs` — helper to append an agent provenance entry with hashes
- `scripts/migrate-artifact-v3.mjs` — derive provenance from existing `humanReview`
- `src/pages/articles/[slug].astro` — render provenance summary via `ProvenancePanel`
- `public/llms.txt` — document schemaVersion 3 and policy references
- Existing `content/articles/*/*/artifact.json` — migrate to schemaVersion 3 with provenance

### Implementation steps

1. Finalize provenance schema and bump `artifact.schemaVersion` to `3`.
2. Add policy schema and default policy file.
3. Update TypeScript types.
4. Add `record-agent-run.mjs` helper with hash normalization.
5. Update validator and diagnostics with publishing gate rules.
6. Create migration script that converts existing `humanReview` into `provenance.reviews`.
7. Migrate existing artifacts and run `npm run check`.

---

## Phase 1 Execution Order

Dependency order:

1. **Trust-Gated Publishing Pipeline** — finalizes the provenance data contract (schema, policy, validator rules, helper). This is the stable contract that later tasks target.
2. **Artifact Widget Catalog** — refactors public UI, including the `ProvenancePanel` that depends on the provenance model.
3. **Research Workspace Builder** — scaffolds new articles, including an `artifact.json` template that already matches the provenance schema.

This order avoids forcing a second template update after the schema settles.

## Phase 1 Branches

| Task | Branch |
|------|--------|
| Trust-Gated Publishing Pipeline | `feature/trust-gated-publishing` |
| Artifact Widget Catalog | `feature/artifact-widget-catalog` |
| Research Workspace Builder | `feature/research-workspace-builder` |
