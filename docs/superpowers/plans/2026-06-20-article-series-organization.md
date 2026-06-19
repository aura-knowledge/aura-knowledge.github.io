# Article Series Organization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add explicit article-series organization so `/articles/` and article pages show linked, ordered series entries.

**Architecture:** Add optional series metadata to article artifacts, validate it with a focused script, and expose pure grouping helpers from `src/lib/content.ts`. Render series groups on the articles index and compact previous/next series navigation on article pages.

**Tech Stack:** Astro 6, TypeScript, Markdown frontmatter, Node.js scripts, existing global CSS.

## Global Constraints

- Keep changes scoped to the public site worktree.
- Do not use topic tags as the source of series order.
- Use existing design tokens and 8px-or-less border radii.
- Preserve standalone articles in a recency list.
- Add a failing check before production changes.

---

### Task 1: Add Series Metadata Check

**Files:**
- Create: `scripts/check-series.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run check:series`, which exits nonzero when series artifact metadata is missing, duplicated, or wrongly ordered.

- [x] **Step 1: Write the failing check**

Create `scripts/check-series.mjs` to load article artifacts from `content/articles/*/*/artifact.json`, inspect optional `series`, and assert the LHRA sequence.

- [x] **Step 2: Run check to verify it fails**

Run: `node scripts/check-series.mjs`

Expected: FAIL because published article artifacts do not yet have `series` metadata.

- [x] **Step 3: Wire script into package scripts**

Add `"check:series": "node scripts/check-series.mjs"` and include it in `"check"` after content validation.

### Task 2: Add Series Artifact Metadata and Schema

**Files:**
- Modify: `schemas/artifact.schema.json`
- Modify: `content/articles/2026/long-human-road-to-ai/artifact.json`
- Modify: seven LHRA chapter `artifact.json` files

**Interfaces:**
- Consumes: `check:series`
- Produces: valid optional `series` metadata on LHRA artifacts.

- [x] **Step 1: Add schema property**

Allow optional `series` with `slug`, `title`, `season`, `order`, and `role`.

- [x] **Step 2: Add LHRA metadata**

Set reader guide to `order: 0`, `role: guide`; set seven chapter articles to `order: 1..7`, `role: chapter`.

- [x] **Step 3: Run series check**

Run: `npm run check:series`

Expected: PASS.

### Task 3: Add Series Grouping Helpers

**Files:**
- Modify: `src/lib/content.ts`

**Interfaces:**
- Produces: `getSeriesEntries(articles)` and `getSeriesNavigation(article, articles)`.

- [x] **Step 1: Add TypeScript types**

Extend `ArticleArtifact` and `Article` with optional `series`.

- [x] **Step 2: Add grouping and navigation helpers**

Group articles by `series.slug`, sort groups by latest publication date, sort entries by `series.order`, and return previous/next neighbors.

### Task 4: Render Series on Articles Index and Article Pages

**Files:**
- Modify: `src/pages/articles/index.astro`
- Modify: `src/pages/articles/[slug].astro`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `getSeriesEntries`, `getSeriesNavigation`
- Produces: grouped `/articles/` view and per-article series navigation.

- [x] **Step 1: Update articles index**

Render series groups before standalone recency cards. Keep archive year links.

- [x] **Step 2: Update article page**

Render compact previous/next navigation when the current article has series metadata.

- [x] **Step 3: Add CSS**

Add responsive styles for series groups, ordered rails, and compact article-page navigation using existing tokens.

### Task 5: Verify

**Files:**
- Generated: `dist/`
- Generated: `public/agents/`

**Interfaces:**
- Consumes: all prior tasks.

- [x] **Step 1: Run focused checks**

Run: `npm run check:series`

Expected: PASS.

- [x] **Step 2: Run full check**

Run: `npm run check`

Expected: PASS with only pre-existing content validation warnings.
