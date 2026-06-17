# Organization Human Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build human-facing organization orientation in both the GitHub profile README and the public Astro site without changing the existing homepage or agent contract.

**Architecture:** Add static content at two entry points. `.github/profile/README.md` serves as the source for the GitHub organization profile README, while `src/pages/organization.astro` serves as the fuller public-site explainer using the existing layout and CSS primitives. `BaseLayout.astro` receives one new nav link. Publishing the README to the live GitHub organization requires the special `aura-knowledge/.github` repository; this plan verifies GitHub access and records a blocker if authenticated push access is unavailable.

**Tech Stack:** Astro 6, TypeScript content helpers, static GitHub Markdown, existing global CSS tokens and layouts.

## Global Constraints

- The existing site homepage remains unchanged.
- The existing `/agents/` route remains the machine-facing path.
- Human orientation is the primary goal.
- Agent entry points stay separate and are linked only as technical references.
- Do not change the article, roadmap, graph, or agent data generation contracts.
- Do not add new runtime dependencies.
- Do not create generated assets or decorative imagery.
- Do not redesign the global site shell.

---

## Execution Note

Local implementation and validation completed in the site worktree. The shell default `GH_CONFIG_DIR=/Users/vishalsingh/.config/gh-personal` points to an invalid `v-i-s-h-a-l` token, but `GH_CONFIG_DIR=/Users/vishalsingh/.codex-homes/personal/.config/gh` authenticates successfully as `vishal-zaps`. Live GitHub organization profile publishing is still blocked because `vishal-zaps` does not have permission to create the special `aura-knowledge/.github` repository. The source README is ready at `.github/profile/README.md`, but it has not been pushed to the special organization profile repository.

## File Structure

- Create `.github/profile/README.md`: source Markdown for the GitHub organization profile repository.
- Create `src/pages/organization.astro`: full human-facing organization explainer page.
- Modify `src/layouts/BaseLayout.astro`: add one `Organization` navigation link.
- Validation only: `npm run check` may regenerate `content`, `public/agents`, `public/graph`, and `public/llms.txt`; expected result is `git diff --exit-code -- content public`.

### Task 1: GitHub Organization Profile README

**Files:**
- Create: `.github/profile/README.md`

**Interfaces:**
- Consumes: Public URLs `https://aura-knowledge.github.io/`, `https://github.com/aura-knowledge/aura-knowledge.github.io`, and site routes `/roadmap/`, `/graph/`, `/agents/`.
- Produces: A Markdown org profile that can be copied into or pushed as the `aura-knowledge/.github` repository profile README.

- [ ] **Step 1: Create the profile directory and README**

Use this content exactly as the initial README:

```markdown
# Aura Knowledge

Aura Knowledge is a public place for essays and research notes that should be easy for people to read, trace, and review.

The public site is the front door for people. The repositories stay public so the claims, sources, review workflow, and generated machine-readable packets behind the work can be inspected.

## Start here

- **Read the public site:** https://aura-knowledge.github.io/
- **Understand the organization:** https://aura-knowledge.github.io/organization/
- **Follow the roadmap:** https://aura-knowledge.github.io/roadmap/
- **Browse topic and claim relationships:** https://aura-knowledge.github.io/graph/
- **Inspect the source repository:** https://github.com/aura-knowledge/aura-knowledge.github.io

## What this organization is for

Aura Knowledge explores a publishing model where an article is not just prose. Each public article is paired with a compact agent brief, structured claims, source references, generated discovery feeds, and graph entries.

That structure makes the work easier to read, review, revisit, and audit.

## Current repository map

- `aura-knowledge.github.io` is the public site and source repository for the first knowledge garden.
- Article folders contain the human article, agent brief, and structured artifact together.
- Generated public files expose discovery indexes, graph data, and compact packets without making humans read machine-oriented files first.

## Operating principles

- Humans get the clearest path first.
- Claims should be visible enough to inspect.
- Sources and provenance matter.
- Public repositories should explain how the published work is made.
- Agent-facing files should support automation without becoming the main human interface.

## Contributing

Start with the repository README and contribution guide:

- https://github.com/aura-knowledge/aura-knowledge.github.io#readme
- https://github.com/aura-knowledge/aura-knowledge.github.io/blob/main/CONTRIBUTING.md

The core content contract is simple: a public article should preserve both the readable essay and the structured artifact that makes it auditable.

## Agents and automation

Agents should use the dedicated machine-readable entry points instead of scraping the human pages first:

- https://aura-knowledge.github.io/agents/
- https://aura-knowledge.github.io/llms.txt
- https://aura-knowledge.github.io/agents/index.json
- https://aura-knowledge.github.io/graph/nodes.json
- https://aura-knowledge.github.io/graph/edges.json
```

- [ ] **Step 2: Review Markdown link intent**

Run:

```bash
sed -n '1,220p' .github/profile/README.md
```

Expected: the README opens with human-readable purpose, has a "Start here" section before agent links, and has no placeholder text.

### Task 2: Public Organization Page

**Files:**
- Create: `src/pages/organization.astro`

**Interfaces:**
- Consumes: `BaseLayout`, `getArticles()`, `import.meta.env.BASE_URL`, existing routes `/roadmap/`, `/graph/`, `/agents/`.
- Produces: Static Astro route `/organization/`.

- [ ] **Step 1: Create `src/pages/organization.astro`**

Use this structure:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import { getArticles } from "../lib/content";

const base = import.meta.env.BASE_URL;
const repoUrl = "https://github.com/aura-knowledge/aura-knowledge.github.io";
const articles = getArticles();
const latest = articles[0];
---

<BaseLayout
  title="Organization"
  description="A human guide to the Aura Knowledge organization, its public repositories, and its operating principles."
>
  <div class="page-shell utility-page">
    <header class="utility-hero">
      <p class="eyebrow">Organization</p>
      <h1>A public home for inspectable knowledge work.</h1>
      <p class="lede">
        Aura Knowledge is a public knowledge garden for essays, research artifacts, and experiments
        in agent-auditable publishing. The human path starts with readable pages; the source remains
        public so the work can be inspected, reviewed, and improved.
      </p>
      <div class="button-row" aria-label="Organization starting points">
        <a class="button primary" href={`${base}articles/${latest.slug}/`}>
          Read the first article
        </a>
        <a class="button" href={`${base}roadmap/`}>View roadmap</a>
        <a class="button" href={repoUrl}>Inspect repository</a>
      </div>
    </header>

    <section class="section-band section-grid" aria-labelledby="purpose-title">
      <div>
        <p class="eyebrow">Purpose</p>
        <h2 id="purpose-title">The organization exists to make research easier to read and audit.</h2>
      </div>
      <div>
        <p>
          The central idea is that an article should not be the only public object. Each essay can
          sit beside claims, sources, review notes, graph relationships, and compact packets that
          make the reasoning easier to revisit.
        </p>
        <ul class="signal-list">
          <li>Humans get a calm reading path before seeing machine-oriented files.</li>
          <li>Reviewers can inspect claims, sources, and maturity state.</li>
          <li>Automation gets stable artifacts without taking over the human interface.</li>
        </ul>
      </div>
    </section>

    <section class="section-band section-grid" aria-labelledby="browse-title">
      <div>
        <p class="eyebrow">Browse</p>
        <h2 id="browse-title">Start with the site, then follow the structure when you need depth.</h2>
      </div>
      <div class="packet-list">
        <article class="packet-item">
          <p>Human path</p>
          <h3>Essays</h3>
          <p>Read published arguments as prose first.</p>
          <a class="packet-link" href={`${base}articles/${latest.slug}/`}>
            Open the first article
          </a>
        </article>
        <article class="packet-item">
          <p>Direction</p>
          <h3>Roadmap</h3>
          <p>See the product and research sequence behind the garden.</p>
          <a class="packet-link" href={`${base}roadmap/`}>Open the roadmap</a>
        </article>
        <article class="packet-item">
          <p>Relationships</p>
          <h3>Graph</h3>
          <p>Move from topics to articles, then into claim maps.</p>
          <a class="packet-link" href={`${base}graph/`}>Browse the graph</a>
        </article>
      </div>
    </section>

    <section class="section-band section-grid" aria-labelledby="repository-title">
      <div>
        <p class="eyebrow">Repositories</p>
        <h2 id="repository-title">The public source explains how the public knowledge is made.</h2>
      </div>
      <div>
        <p>
          The current repository, <code>aura-knowledge.github.io</code>, contains the site, content
          sources, schemas, generated discovery files, and publication scripts. Future repositories
          can extend the same idea with focused tools or experiments.
        </p>
        <ul class="signal-list">
          <li><code>content/articles</code> keeps the human article, agent brief, and artifact together.</li>
          <li><code>public/agents</code> exposes generated machine-readable packets.</li>
          <li><code>public/graph</code> exposes topic, article, and claim relationships.</li>
        </ul>
        <div class="button-row">
          <a class="button" href={`${repoUrl}#readme`}>Repository README</a>
          <a class="button" href={`${repoUrl}/blob/main/CONTRIBUTING.md`}>Contributing guide</a>
        </div>
      </div>
    </section>

    <section class="section-band section-grid" aria-labelledby="principles-title">
      <div>
        <p class="eyebrow">Principles</p>
        <h2 id="principles-title">The operating model stays human-first and evidence-aware.</h2>
      </div>
      <div>
        <ul class="signal-list">
          <li>Readable pages are the front door.</li>
          <li>Claims should be inspectable without turning the page into a database UI.</li>
          <li>Sources and provenance are part of the artifact, not an afterthought.</li>
          <li>Maturity labels should be honest about whether an idea is early or stable.</li>
          <li>Machine-readable files should support agents without becoming the human path.</li>
        </ul>
      </div>
    </section>

    <section class="section-band section-grid" aria-labelledby="agents-title">
      <div>
        <p class="eyebrow">Agents</p>
        <h2 id="agents-title">Automation has a separate entrance.</h2>
      </div>
      <div>
        <p>
          Agent-facing files exist so tools can retrieve compact metadata, claim IDs, source IDs,
          article packets, roadmap packets, and graph data without scraping the human pages first.
        </p>
        <a class="packet-link" href={`${base}agents/`}>Open the agent entry page</a>
      </div>
    </section>
  </div>
</BaseLayout>
```

- [ ] **Step 2: Build once**

Run:

```bash
npm run build
```

Expected: Astro reports 6 page(s) built, including `/organization/index.html`.

### Task 3: Site Navigation

**Files:**
- Modify: `src/layouts/BaseLayout.astro`

**Interfaces:**
- Consumes: `base` from `import.meta.env.BASE_URL`.
- Produces: Header nav link to `/organization/`.

- [ ] **Step 1: Add the Organization link**

In `.nav-links`, insert this link before `First Article`:

```astro
<a href={`${base}organization/`}>Organization</a>
```

- [ ] **Step 2: Check rendered nav source**

Run:

```bash
npm run build
rg -n "Organization|/organization/" dist/index.html dist/organization/index.html
```

Expected: both built HTML files include the `Organization` nav link.

### Task 4: Full Validation and Commit

**Files:**
- Validate all changed files.

**Interfaces:**
- Consumes: Tasks 1-3.
- Produces: Passing build and one implementation commit.

- [ ] **Step 1: Run full check**

Run:

```bash
npm run check
npm audit --audit-level=moderate
git diff --exit-code -- content public
```

Expected: generation succeeds, validation succeeds, Astro builds 6 pages, build validation passes, dependency audit finds no moderate-or-higher vulnerabilities, and generated files have no uncommitted diff.

- [ ] **Step 2: Review diff**

Run:

```bash
git diff -- .github/profile/README.md src/pages/organization.astro src/layouts/BaseLayout.astro docs/superpowers/specs/2026-06-18-organization-human-home-design.md docs/superpowers/plans/2026-06-18-organization-human-home.md
git status --short
```

Expected: changes are limited to the profile README, organization page, layout nav, and planning docs.

- [ ] **Step 3: Commit implementation**

Run:

```bash
git add .github/profile/README.md src/pages/organization.astro src/layouts/BaseLayout.astro docs/superpowers/specs/2026-06-18-organization-human-home-design.md docs/superpowers/plans/2026-06-18-organization-human-home.md
git commit -m "feat: add organization human home"
```

Expected: commit succeeds with the repo-local Git identity.

### Task 5: GitHub Organization Profile Publishing Check

**Files:**
- No site files changed unless authenticated GitHub access is available and the special repository is cloned outside this site worktree.

**Interfaces:**
- Consumes: `.github/profile/README.md` from this site repository.
- Produces: Either a pushed branch/PR for `aura-knowledge/.github` or a recorded blocker that GitHub authentication is unavailable.

- [ ] **Step 1: Verify GitHub CLI authentication**

Run:

```bash
gh auth status
```

Expected: authenticated access to `github.com` as an account that can create or push to `aura-knowledge/.github`.

- [ ] **Step 2: If authentication works, create or update the special repository**

Run:

```bash
gh repo view aura-knowledge/.github --json nameWithOwner,visibility,url || gh repo create aura-knowledge/.github --public --description "GitHub organization profile for Aura Knowledge"
```

Expected: repository exists at `https://github.com/aura-knowledge/.github`.

- [ ] **Step 3: If authentication works, copy the profile README into that repository**

Run:

```bash
mkdir -p ../.worktrees/aura-knowledge-org-profile
git clone https://github.com/aura-knowledge/.github.git ../.worktrees/aura-knowledge-org-profile/.github
mkdir -p ../.worktrees/aura-knowledge-org-profile/.github/profile
cp .github/profile/README.md ../.worktrees/aura-knowledge-org-profile/.github/profile/README.md
cd ../.worktrees/aura-knowledge-org-profile/.github
git checkout -b feature/org-profile-readme
git add profile/README.md
git commit -m "docs: add organization profile"
git push -u origin feature/org-profile-readme
gh pr create --repo aura-knowledge/.github --title "Add organization profile README" --body "Adds a human-facing GitHub organization profile for Aura Knowledge."
```

Expected: a PR exists against `aura-knowledge/.github`.

- [ ] **Step 4: If authentication fails, record the blocker**

Do not fabricate a live publish. Report that `.github/profile/README.md` is ready locally, but the live organization profile cannot be created or pushed until `gh` is re-authenticated.

## Self-Review

- Spec coverage: Task 1 covers the GitHub org profile source; Task 2 covers the site page; Task 3 covers navigation; Task 4 covers validation and commit; Task 5 covers the live GitHub organization profile publishing check.
- Placeholder scan: no `TBD`, `TODO`, or fill-in markers are intentionally present.
- Type consistency: the only code interface is Astro route/layout usage with existing `base` URL handling.
