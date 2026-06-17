# Knowledge Garden Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a separate GitHub Pages knowledge garden with focused human articles, token-efficient agent artifacts, a topic graph, and governance checks.

**Architecture:** Astro generates a static site from year-scoped Markdown article folders and adjacent JSON artifacts. Node scripts validate content, generate `public/llms.txt`, `public/agents/index.json`, `public/agents/index.jsonl`, and graph data. GitHub Actions validates/builds/deploys, while local hooks prevent accidental direct-main work.

**Tech Stack:** Astro, TypeScript, plain CSS, Node validation scripts, GitHub Actions, Git hooks.

## Global Constraints

- Work only on `feature/knowledge-garden-foundation` or later feature branches; never commit directly to `main`.
- Keep the first release static and GitHub Pages-compatible.
- Support `base: /knowledge/` for project Pages deployment.
- Support light mode, dark mode, keyboard focus, reduced motion, and mobile layouts.
- Every article must include `article.md`, `agent.md`, and `artifact.json`.
- Every major claim in the human article must map to an artifact claim ID.
- `npm run validate` and `npm run build` must pass before completion.
- Do not touch the untracked `.claude/` directory in the personal website repo.

---

### Task 1: Astro Site Scaffold

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `src/styles/global.css`
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/pages/index.astro`

**Interfaces:**
- Produces: a static Astro app that can run `npm run build`.
- Produces: base layout with theme bootstrap, metadata slots, and global CSS.

- [ ] Initialize package metadata and scripts for `dev`, `build`, `validate`, and `generate`.
- [ ] Configure Astro for `site: https://v-i-s-h-a-l.github.io` and `base: /knowledge`.
- [ ] Build a minimal home page with the garden thesis and links to articles, graph, and agent entry.
- [ ] Run `npm install`.
- [ ] Run `npm run build` and fix scaffold issues.
- [ ] Commit with `feat: scaffold knowledge garden site`.

### Task 2: Content Model and First Article

**Files:**
- Create: `content/articles/2026/agent-auditable-research/article.md`
- Create: `content/articles/2026/agent-auditable-research/agent.md`
- Create: `content/articles/2026/agent-auditable-research/artifact.json`
- Create: `src/lib/content.ts`
- Modify: `src/pages/index.astro`
- Create: `src/pages/articles/[slug].astro`

**Interfaces:**
- Produces: `getArticles()` returning sorted article metadata and body paths.
- Produces: article page that renders Markdown content and links agent artifacts.

- [ ] Write the first article with sections: hook, thesis, why now, competitor landscape, research bundle primitive, impact, risks, future.
- [ ] Add impact callouts and claim markers in the article body.
- [ ] Add `agent.md` with a concise agent brief.
- [ ] Add `artifact.json` with claims, sources, relationships, and review metadata.
- [ ] Implement article loading and routing.
- [ ] Run `npm run build`.
- [ ] Commit with `feat: publish first agent-auditable research article`.

### Task 3: Focused Reading UX

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/pages/articles/[slug].astro`
- Create: `src/components/FocusRail.astro`
- Create: `src/components/ThemeToggle.astro`

**Interfaces:**
- Produces: focus rail navigation derived from article sections.
- Produces: theme toggle persisting to `localStorage`.

- [ ] Add responsive article layout with one dominant reading column.
- [ ] Add section focus styling using CSS scroll margins, subtle opacity shifts, and visible headings.
- [ ] Add scroll progress and claim rail for desktop; collapse to section list on mobile.
- [ ] Add theme toggle and system preference support.
- [ ] Add reduced-motion media query.
- [ ] Run `npm run build`.
- [ ] Commit with `feat: add focused reading experience`.

### Task 4: Agent Index, Graph, and llms.txt Generation

**Files:**
- Create: `scripts/generate-agent-index.mjs`
- Create: `scripts/validate-content.mjs`
- Create: `src/pages/graph.astro`
- Create: `src/pages/agents.astro`
- Generated: `public/agents/index.json`
- Generated: `public/agents/index.jsonl`
- Generated: `public/graph/nodes.json`
- Generated: `public/graph/edges.json`
- Generated: `public/llms.txt`

**Interfaces:**
- Produces: `npm run generate` for agent outputs.
- Produces: `npm run validate` for schema/content checks.

- [ ] Implement validation for required article files and artifact fields.
- [ ] Validate claim ID parity between article markers and `artifact.json`.
- [ ] Validate content hash drift between article source and `artifact.json`.
- [ ] Generate `public/agents/index.json` from artifacts.
- [ ] Generate `public/agents/index.jsonl` from artifacts.
- [ ] Generate graph nodes/edges from topics, claims, sources, and relations.
- [ ] Generate `public/llms.txt` with article and agent brief links.
- [ ] Build graph page from artifact relationships.
- [ ] Build agents page explaining available machine-readable files.
- [ ] Run `npm run validate` and `npm run build`.
- [ ] Commit with `feat: generate agent-readable garden artifacts`.

### Task 5: Governance, CI, and Hooks

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy.yml`
- Create: `scripts/install-hooks.sh`
- Create: `scripts/hooks/pre-commit`
- Create: `scripts/hooks/commit-msg`
- Create: `CONTRIBUTING.md`
- Modify: `.gitignore`
- Modify: `README.md`

**Interfaces:**
- Produces: local hook installer.
- Produces: CI workflow for validation/build.
- Produces: deploy workflow for GitHub Pages after remote setup.

- [ ] Add CI workflow running install, generate, validate, and build.
- [ ] Add deploy workflow using GitHub Pages actions.
- [ ] Add hook installer that copies hooks into `.git/hooks`.
- [ ] Add pre-commit hook running validation/build checks when relevant files change.
- [ ] Add commit-msg hook rejecting commits on `main`.
- [ ] Document branch/worktree workflow and remote branch protection settings.
- [ ] Run hook installer in the worktree.
- [ ] Run `npm run validate` and `npm run build`.
- [ ] Commit with `chore: add publishing governance checks`.

### Task 6: Personal Site Link Patch

**Files:**
- Modify in personal repo only after garden build exists: `_data/navigation.yml` or `index.html`

**Interfaces:**
- Produces: a link from `v-i-s-h-a-l.github.io` to `/knowledge/`.

- [ ] Create a separate worktree/branch in the personal site repo.
- [ ] Add a single visible link to the knowledge garden.
- [ ] Do not touch `.claude/`.
- [ ] Run the personal site build if dependencies are available; otherwise run a syntax/file inspection check.
- [ ] Commit with `feat: link knowledge garden`.
