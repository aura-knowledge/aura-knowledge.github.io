# Open Issue UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Address the open public-site UI feedback by making the home page feel more like a navigable knowledge garden and making the theme control a true switch.

**Architecture:** Keep the existing Astro static site, content helpers, and routes. Recompose `src/pages/index.astro` using current article/topic data and add CSS in `src/styles/global.css`; replace `src/components/ThemeToggle.astro` with a switch-style button that preserves the existing `knowledge-theme` storage key.

**Tech Stack:** Astro 6, TypeScript content helpers, plain CSS, vanilla inline JavaScript.

## Global Constraints

- Preserve article + agent brief + artifact model.
- Preserve source-backed claims, public auditability, machine-readable routes, and existing data.
- Do not add decorative plant imagery; express the garden through navigation, paths, and relationships.
- Theme switch must remain keyboard-accessible and screen-reader labeled.
- Verify with `npm run check` and a local visual smoke test.

---

### Task 1: Theme Switch

**Files:**
- Modify: `src/components/ThemeToggle.astro`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `document.documentElement.dataset.theme`, `localStorage["knowledge-theme"]`
- Produces: `button[data-theme-toggle][role="switch"]` with `aria-checked`

- [x] Replace the text button with a switch structure containing sun/moon symbols and a thumb.
- [x] Update inline script so label text and `aria-checked` reflect current state.
- [x] Add CSS that separates `.theme-toggle` from `.nav-links a` styling.
- [x] Build and inspect light/dark states.

### Task 2: Garden Home Recomposition

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `getArticles()`, `groupArticlesByTopic()`
- Produces: hero path cards, latest article focus, topic branches, trace/agent panels.

- [x] Import topic grouping helper.
- [x] Compute latest article, topic entries, article/claim/source counts.
- [x] Replace the linear explanatory home sections with a compact garden map: paths, latest article, topic branches, trace panel, agent panel.
- [x] Add responsive CSS that keeps cards un-nested and text readable on mobile.
- [x] Build and inspect the page.

### Task 3: Verification

**Files:**
- No production file changes.

- [x] Run `npm run check`.
- [x] Run a local server and inspect screenshots at desktop/mobile.
- [x] Fix any layout, contrast, or overflow issues found.
