# Phase 0 Plan: Make Evidence Packets Real

## Phase Goal

Extend the current article + agent-packet model into a validated research-object pipeline. By the end of Phase 0, every public claim must carry structured support, counterevidence, source quality, and validation rules that fail weak packets before publish.

## Scope

Phase 0 contains 4 roadmap ideas:

1. **Claim Evidence Packet v2** — extend claim records in `artifact.json`
2. **Evidence CI And RAG Diagnostics** — deterministic CI validators for evidence quality
3. **Claim Verification Workbench** — author-side report for claim evidence gaps
4. **UX Governance Checks** — reading-quality checklist + optional Playwright assertions

These four ideas are implemented in series because each builds on the previous one.

---

## 1. Claim Evidence Packet v2

### Goal

Move claims from simple IDs and strings to typed evidence objects that include snippets, source locations, support type, counterevidence, and reviewer status.

### Current state

A claim in `artifact.json` currently looks like:

```json
{
  "id": "claim-001",
  "claim": "...",
  "confidence": "high",
  "status": "supported",
  "evidence": ["source-001"],
  "counterevidence": []
}
```

### Target state

```json
{
  "id": "claim-001",
  "claim": "...",
  "confidence": "high",
  "status": "supported",
  "verification": {
    "reviewedAt": "2026-06-19",
    "reviewer": "human",
    "status": "verified"
  },
  "evidence": [
    {
      "sourceId": "source-001",
      "snippet": "...",
      "supports": "direct",
      "location": "section 3.2",
      "assessedAt": "2026-06-19"
    }
  ],
  "counterevidence": [
    {
      "sourceId": "source-002",
      "snippet": "...",
      "qualification": "...",
      "assessedAt": "2026-06-19"
    }
  ]
}
```

### Use cases

- **Human reader:** sees one compact evidence card per claim in the article audit section with snippet, source link, and counterevidence.
- **Agent reader:** fetches `/agents/articles/{slug}.json` and gets typed evidence objects instead of source IDs only.
- **Author:** records why a source supports a claim and what counterevidence exists without rewriting the prose.

### Files to change

- `schemas/artifact.schema.json` — extend claim definition; bump schemaVersion to 2
- `src/lib/content.ts` — update TypeScript types for claim evidence/counterevidence
- `scripts/lib/content-utils.mjs` — add date helpers and source-type helpers
- `scripts/generate-agent-index.mjs` — read `evidence.sourceId` instead of evidence string
- `scripts/validate-content.mjs` — read `evidence.sourceId` instead of evidence string
- `src/pages/articles/[slug].astro` — render evidence cards from new structure
- `src/components/FocusRail.astro` — surface new verification state
- `src/styles/global.css` — evidence card styles
- `content/articles/*/*/artifact.json` — migrate via script
- `scripts/migrate-evidence-v2.mjs` — new migration script
- `public/llms.txt` — document schemaVersion 2 change

### Backwards compatibility and migration

- Bump `artifact.schemaVersion` from `1` to `2`.
- Do **not** support mixed string/object evidence arrays after merge.
- Write a migration script `scripts/migrate-evidence-v2.mjs` that converts existing `evidence: string[]` and `counterevidence: string[]` into the new object shape.
- Preserve existing `evidenceNotes` as `notes` fields on evidence packets where relevant.
- External agent consumers will see the new shape; document the change in `llms.txt` and agent instructions.

### Implementation steps

1. Update `artifact.schema.json` with new `evidencePacket` shape and bump `schemaVersion` to 2.
2. Add TypeScript types in `src/lib/content.ts`.
3. Update `scripts/generate-agent-index.mjs` to read `evidence.sourceId` and `counterevidence.sourceId`.
4. Update `scripts/validate-content.mjs` to read `evidence.sourceId` and `counterevidence.sourceId`.
5. Update `[slug].astro` claim audit section to render evidence packets.
6. Update `FocusRail.astro` to show verification state.
7. Add CSS for evidence cards.
8. Write `scripts/migrate-evidence-v2.mjs` and run it to migrate existing artifacts.
9. Update `public/llms.txt` text to mention schemaVersion 2.
10. Run `npm run check`.

### Validation

- Schema validation passes.
- Human page shows evidence cards.
- Agent JSON contains the new evidence objects.

---

## 2. Evidence CI And RAG Diagnostics

### Goal

Add deterministic validators that fail the build for weak or incomplete evidence packets.

### Failure taxonomy

| Rule | Severity | What it checks |
|------|----------|----------------|
| `orphan-claim` | error | A claim is not referenced by any prose claim marker |
| `empty-evidence` | error | A published claim has zero evidence entries |
| `missing-counterevidence` | warning | A claim with `confidence: high` or `status: contested` lacks counterevidence |
| `stale-source` | warning | A source was accessed more than 1 year before article updatedAt |
| `low-source-diversity` | warning | A claim relies on a single source type or single source |
| `dangling-graph-edge` | error | A graph edge references an unknown article, claim, or source |
| `missing-evidence-snippet` | warning | An evidence packet lacks a snippet or location |

### Use cases

- **Author running `npm run check` locally:** sees a report of evidence problems before pushing.
- **CI/GitHub Actions:** build fails on errors, reports warnings.
- **Agent reviewer:** can fetch a diagnostics report artifact.

### Files to change

- `scripts/validate-content.mjs` — add evidence diagnostics module
- `scripts/lib/content-utils.mjs` — helpers for date math, source types
- `package.json` — possibly add `npm run validate:evidence`
- `src/pages/agents.astro` — link to diagnostics artifact if desired

### Implementation steps

1. Add helper functions for date diff and source diversity.
2. Implement each diagnostic rule.
3. Integrate into `npm run check`.
4. Emit a diagnostics report JSON to `public/agents/diagnostics.json`.
5. Test with existing articles.

### Validation

- Introducing a fake orphan claim fails `npm run check`.
- Removing evidence from a claim fails `npm run check`.
- Existing articles pass with warnings only.

---

## 3. Claim Verification Workbench

### Goal

Add author-side report that lists every claim and its verification state: verified, needs evidence, contested, stale, or missing counterevidence.

### Use cases

- **Author:** runs `npm run verify` or opens `/verify/` locally to see a claim matrix.
- **Reviewer:** checks which claims are verified before approving publication.
- **Agent:** fetches `/agents/verification-report.json` for a summary.

### Files to change

- New script: `scripts/verify-claims.mjs`
- New page (local only): `src/pages/verify.astro` or CLI output
- `public/agents/verification-report.json` generated artifact
- `src/lib/content.ts` — helpers for claim verification state

### Implementation steps

1. Add verification state computation.
2. Create `scripts/verify-claims.mjs` that prints or writes a report.
3. Optionally create `src/pages/verify.astro` for local browser view.
4. Generate `public/agents/verification-report.json` during build.

### Validation

- Report lists all claims with state.
- State changes when evidence or counterevidence is added.

---

## 4. UX Governance Checks

### Goal

Encode reading-quality criteria as a checklist and optional Playwright assertions.

### Checks

- Mobile: no horizontal overflow, collapsed audit rail is accessible.
- Keyboard: visible focus indicators, all interactive elements reachable.
- Article: claim markers match claim IDs, source ledger is scanable.
- Routes: `/topics/`, `/articles/`, `/roadmap/`, `/organization/`, `/graph/` all return 200.
- Dark mode: text meets contrast minimums.

### Files to change

- New file: `docs/ux-governance-checklist.md`
- New file: `tests/ux-governance.spec.js` (Playwright) if Playwright is added
- `package.json` — add `test:ux` script
- `scripts/validate-build.mjs` — add route checks

### Implementation steps

1. Document the checklist in `docs/ux-governance-checklist.md`.
2. Add route-availability assertions to `scripts/validate-build.mjs`.
3. Add CSS-level focus-visible and mobile overflow checks (already covered by Wave 1).
4. Run checks locally.

### Validation

- `npm run check` includes route validation.
- Deleting a required page file fails the build.

### Note

Playwright is intentionally deferred to a later phase to keep Phase 0 lightweight.

---

## Phase 0 Execution Order

1. **Claim Evidence Packet v2** — must come first; defines the data model.
2. **Evidence CI And RAG Diagnostics** — validators depend on the v2 packet shape.
3. **Claim Verification Workbench** — consumes diagnostics and produces a report.
4. **UX Governance Checks** — independent; can run in parallel with CI diagnostics / Workbench to shorten the phase.

Tasks 2–4 each get their own branch, PR, and rebase merge into `main`. Task 1 must merge first.

## Phase 0 Branches

| Task | Branch |
|------|--------|
| Claim Evidence Packet v2 | `feature/claim-evidence-packet-v2` |
| Evidence CI And RAG Diagnostics | `feature/evidence-ci-diagnostics` |
| Claim Verification Workbench | `feature/claim-verification-workbench` |
| UX Governance Checks | `feature/ux-governance-checks` |

## Cleanup after Phase 0

- Delete all `feature/*` branches.
- Remove worktrees.
- Delete temporary prompt files.
- Sync local `main` with `origin/main`.
