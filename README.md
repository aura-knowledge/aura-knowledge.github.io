# Knowledge Garden

A focused GitHub Pages knowledge garden for human-readable essays and agent-auditable research artifacts.

The site is designed around one publishing rule: every public article has a sibling agent brief, structured artifact, generated discovery feed, and graph entry.

## Structure

```text
content/articles/<year>/<slug>/
  article.md          # canonical human article source
  agent.md            # compact agent brief
  artifact.json       # claims, sources, relations, review state, hash

content/roadmap/
  *.json              # schema-validated public roadmap artifacts

public/
  agents/index.json   # generated discovery index
  agents/index.jsonl  # generated compact feed
  agents/articles/    # generated per-article packets
  agents/roadmap/     # generated roadmap packets
  graph/              # generated graph nodes/edges
  llms.txt            # generated LLM entry map

src/
  pages/              # Astro pages
  components/         # reusable UI
  styles/             # global design tokens and layouts
```

## Commands

```bash
npm install
npm run dev
npm run generate
npm run validate
npm run build
npm run check
```

`npm run check` regenerates agent artifacts, validates source content and generated files, then builds the static site.

## Publishing Workflow

Work must happen on feature branches and worktrees, not directly on `main`.

```bash
git worktree add ../.worktrees/knowledge-<topic> -b feature/<topic> main
cd ../.worktrees/knowledge-<topic>
npm install
npm run check
```

Before committing, install local hooks:

```bash
./scripts/install-hooks.sh
```

Remote `main` should be protected with required PR review, required checks, conversation resolution, linear history, and no bypass.

## GitHub Pages

The intended remote is `v-i-s-h-a-l/knowledge`.

Once the repository exists on GitHub:

1. Push this branch.
2. Open a pull request.
3. Configure Pages source as GitHub Actions.
4. Protect `main` using the settings in `CONTRIBUTING.md`.
5. Merge through the PR after checks pass.

The site is configured for `https://v-i-s-h-a-l.github.io/knowledge/`.

If `gh` is authenticated, the repo bootstrap can be automated:

```bash
./scripts/bootstrap-github.sh
```

The script creates `v-i-s-h-a-l/knowledge` as a public repository if it is missing,
sets `origin`, pushes `main` and `feature/knowledge-garden-foundation`, and opens a
draft pull request.
