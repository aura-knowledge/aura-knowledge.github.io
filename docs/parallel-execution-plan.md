# Parallel Execution Plan — UX Polish Backlog

## Overview

The backlog covers issues #5–#19. This plan groups them into waves that minimize file conflicts and maximize parallel execution. Each wave is a set of independent sessions you can spawn manually.

**Principle:** Each session is self-contained, has a ready-to-use prompt, and produces one logical commit.

---

## Wave 1 — Foundation + Helpers + Article Page

These three sessions are independent and can run in parallel.

### Session A: Navigation & Accessibility Foundation
**Issues:** #6, #7, #16
**Primary files:**
- `src/layouts/BaseLayout.astro`
- `src/styles/global.css`

**Prompt to paste:**
```text
Implement the UX polish issues #6, #7, and #16 in the Astro project at /Users/vishalsingh/Documents/v-i-s-h-a-l/aura-knowledge/aura-knowledge.github.io.

Context: This is an Astro static site. The recent UX restructure adopted the principle "Structured for agents; guided for humans."

What to do:
1. Issue #6 — Restore visible focus indicator on buttons.
   - Edit `src/styles/global.css`. Buttons currently remove outline on focus.
   - Replace with a visible focus ring using `box-shadow` plus `border`.
   - Keep hover state distinct.
2. Issue #7 — Add active-state indicator to primary navigation.
   - Edit `src/layouts/BaseLayout.astro` and `src/styles/global.css`.
   - Use `Astro.url.pathname` to determine the current section.
   - Add `aria-current="page"` to the active nav link and a distinct visual style.
   - Must work for `/`, `/topics/`, `/articles/`, `/roadmap/`, `/organization/`, and nested article paths should highlight `Articles`.
3. Issue #16 — Accessibility contrast audit after focus and active state changes.
   - Verify the new focus ring and active nav state meet contrast requirements in both light and dark themes.
   - Fix any contrast failures found.

Run `npm run check` before finishing. Do not touch files outside the scope. Report the exact changes and any blockers.
```

**Commit message suggestion:**
```text
a11y: restore button focus, add active nav state, and audit contrast

- Fixes #6
- Fixes #7
- Fixes #16
```

---

### Session B: Centralize Topic Helpers
**Issues:** #10
**Primary files:**
- `src/lib/content.ts`
- `src/pages/topics.astro`
- `src/pages/graph.astro`

**Prompt to paste:**
```text
Implement issue #10 in the Astro project at /Users/vishalsingh/Documents/v-i-s-h-a-l/aura-knowledge/aura-knowledge.github.io.

Context: The site has topic grouping logic duplicated between `src/pages/topics.astro` and `src/pages/graph.astro`.

What to do:
1. Add shared helpers to `src/lib/content.ts` (or create `src/lib/topics.ts` if cleaner):
   - `groupArticlesByTopic(articles)` → `Map<string, Article[]>`
   - `formatTopicLabel(topic)` → human-readable string
   - Optionally `getTopicEntries(articles)` → sorted `[topic, articles][]`
2. Refactor `src/pages/topics.astro` to use the helpers.
3. Refactor `src/pages/graph.astro` to use the helpers.
4. Ensure no visual or functional regression on either page.

Run `npm run check` before finishing. Do not touch files outside the scope. Report the exact changes and any blockers.
```

**Commit message suggestion:**
```text
refactor: centralize topic grouping and label helpers

- Fixes #10
```

---

### Session C: Article Page Cleanup
**Issues:** #9, #15
**Primary files:**
- `src/pages/articles/[slug].astro`
- `src/components/FocusRail.astro`
- `src/styles/global.css`

**Prompt to paste:**
```text
Implement issues #9 and #15 in the Astro project at /Users/vishalsingh/Documents/v-i-s-h-a-l/aura-knowledge/aura-knowledge.github.io.

Context: Article pages expose machine-readable artifacts in multiple places, and FocusRail shows different metadata on desktop vs mobile.

What to do:
1. Issue #9 — Consolidate machine-readable packet links on article pages.
   - Edit `src/pages/articles/[slug].astro`.
   - Remove the per-claim "Open packet" links in the claim audit cards.
   - Keep the bottom-of-page "Machine-readable packet" section with Agent JSON and Agent brief buttons.
2. Issue #15 — Fix FocusRail metadata mismatch.
   - Edit `src/components/FocusRail.astro`.
   - Show both `claim.status` and `claim.confidence` consistently in both desktop and mobile rails.
   - Adjust CSS in `src/styles/global.css` if the layout needs it.

Run `npm run check` before finishing. Do not touch files outside the scope. Report the exact changes and any blockers.
```

**Commit message suggestion:**
```text
ux: consolidate agent links and unify FocusRail metadata

- Fixes #9
- Fixes #15
```

---

## Wave 2 — Roadmap/Graph/Tagline + Topic UI + Empty States

Start Wave 2 after Wave 1 has merged into `main`. Within Wave 2, **Session D and Session F both touch `index.astro`, `organization.astro`, and `global.css`**. You can run them in parallel if you trust careful rebasing, or run them sequentially to avoid conflicts. Session E is independent.

### Session D: Roadmap, Graph Discoverability, Tagline, Footer
**Issues:** #8, #12, #13, #19
**Primary files:**
- `src/pages/roadmap.astro`
- `src/pages/index.astro`
- `src/pages/organization.astro`
- `src/layouts/BaseLayout.astro`
- `src/styles/global.css`

**Prompt to paste:**
```text
Implement issues #8, #12, #13, and #19 in the Astro project at /Users/vishalsingh/Documents/v-i-s-h-a-l/aura-knowledge/aura-knowledge.github.io.

Context: The Roadmap page still elevates the Agent JSON button, the Graph page is hard to discover, and the new tagline ordering is inconsistent across pages.

What to do:
1. Issue #8 — De-emphasize Agent JSON button on Roadmap hero.
   - Edit `src/pages/roadmap.astro`.
   - Make the primary button a human-facing link (Research report or Source repo).
   - Style Agent JSON as a secondary button.
2. Issue #12 — Improve Graph page discoverability.
   - Add a Graph card/link in `src/pages/organization.astro` Browse section.
   - Optionally add a subtle footer utility link in `src/layouts/BaseLayout.astro`.
3. Issue #13 — Align tagline ordering across site.
   - Use the canonical ordering "Structured for agents. Guided for humans." everywhere.
   - Update `src/pages/index.astro` hero and `src/layouts/BaseLayout.astro` footer.
4. Issue #19 — Footer and utility link pattern after graph discoverability change.
   - Lock in the footer/utility link convention after #12.
   - Ensure Agent entry and Graph links are styled consistently as secondary utility links.

Run `npm run check` before finishing. Do not touch files outside the scope. Report the exact changes and any blockers.
```

**Commit message suggestion:**
```text
ux: roadmap hero, graph discoverability, tagline alignment, footer pattern

- Fixes #8
- Fixes #12
- Fixes #13
- Fixes #19
```

---

### Session E: Topic Link + Topic Chip Component
**Issues:** #11, #17
**Primary files:**
- `src/pages/articles/[slug].astro`
- `src/pages/topics.astro`
- `src/lib/content.ts`
- new component: `src/components/TopicChip.astro`

**Prompt to paste:**
```text
Implement issues #11 and #17 in the Astro project at /Users/vishalsingh/Documents/v-i-s-h-a-l/aura-knowledge/aura-knowledge.github.io.

Context: Topic helpers were centralized in a previous session (issue #10). This session links the article topic eyebrow to the topic hub and introduces a reusable topic chip.

What to do:
1. Issue #11 — Link article hero topic eyebrow to topic hub.
   - Edit `src/pages/articles/[slug].astro`.
   - Wrap the topic eyebrow in a link to `/topics/#topic-{topic}`.
2. Issue #17 — Reusable topic chip component.
   - Create `src/components/TopicChip.astro`.
   - Replace topic markup in `src/pages/topics.astro` and the article eyebrow with the new component.
   - Use the shared `formatTopicLabel` helper from `src/lib/content.ts`.

Run `npm run check` before finishing. Do not touch files outside the scope. Report the exact changes and any blockers.
```

**Commit message suggestion:**
```text
components: topic chip component and article topic link

- Fixes #11
- Fixes #17
```

---

### Session F: Empty States + Maturity Badges
**Issues:** #14, #18
**Primary files:**
- `src/pages/index.astro`
- `src/pages/organization.astro`
- `src/pages/articles/index.astro`
- `src/pages/topics.astro`
- `src/styles/global.css`

**Prompt to paste:**
```text
Implement issues #14 and #18 in the Astro project at /Users/vishalsingh/Documents/v-i-s-h-a-l/aura-knowledge/aura-knowledge.github.io.

Context: Several pages assume at least one article exists and may throw at runtime with zero content. Maturity badge styles also only cover seed/sprout/evergreen.

What to do:
1. Issue #14 — Harden empty states and maturity badge styles.
   - Guard `articles[0]` usage in `src/pages/index.astro` and `src/pages/organization.astro`.
   - Add `.maturity-contested` (use caution color) and `.maturity-superseded` (use text-soft) styles to `src/styles/global.css`.
2. Issue #18 — Empty-state design system for zero-content scenarios.
   - Add consistent empty-state messages to `src/pages/index.astro`, `src/pages/organization.astro`, `src/pages/articles/index.astro`, and `src/pages/topics.astro`.
   - Keep the tone calm and aligned with the human-first guidance.

Run `npm run check` before finishing. Do not touch files outside the scope. Report the exact changes and any blockers.
```

**Commit message suggestion:**
```text
robustness: empty states and full maturity badge styles

- Fixes #14
- Fixes #18
```

---

## Pre-existing Issue #5

**Issue:** #5 — Plan article organization by topic and date

This is not a code task yet. Consider reviewing it after Wave 1/B (topic helpers) is complete, since the topic helper refactor may inform the organization plan.

---

## Commit & Merge Strategy

1. **Create a feature branch per session.**
   ```bash
   git checkout -b feature/<session-name>
   ```
2. **Run `npm run check`** in each session before committing.
3. **Make one logical commit per session** using the suggested message.
4. **Push each branch** and open a PR.
5. **Merge using rebase** to keep linear history:
   ```bash
   git checkout main
   git pull --rebase origin main
   git rebase main feature/<session-name>
   git checkout main
   git merge feature/<session-name>
   git push origin main
   ```
   Or use GitHub's "Rebase and merge" in the UI.
6. **Wave order:** Merge all of Wave 1 before starting Wave 2.
7. **Conflict resolution:** If Wave 2 sessions conflict on `global.css`, `index.astro`, or `organization.astro`, resolve by rebasing the second branch onto the first and keeping only the intended changes.

---

## Conflict Map

| File | Sessions that touch it |
|------|------------------------|
| `src/layouts/BaseLayout.astro` | A, D |
| `src/styles/global.css` | A, C, D, F |
| `src/pages/articles/[slug].astro` | C, E |
| `src/pages/index.astro` | D, F |
| `src/pages/organization.astro` | D, F |
| `src/lib/content.ts` | B, E |
| `src/pages/topics.astro` | B, E, F |
| `src/pages/graph.astro` | B |
| `src/pages/roadmap.astro` | D |
| `src/components/FocusRail.astro` | C |
| `src/pages/articles/index.astro` | F |

Use this map to decide which sessions to run truly in parallel and which to sequence.
