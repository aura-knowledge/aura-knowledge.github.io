# Contributing

This repository is the source for a public knowledge garden. Treat every article as both a human page and a machine-readable research packet.

## Required Workflow

Do not commit directly to `main`.

Use a feature branch and worktree:

```bash
git worktree add ../.worktrees/knowledge-<topic> -b feature/<topic> main
cd ../.worktrees/knowledge-<topic>
npm install
./scripts/install-hooks.sh
```

Before opening a PR:

```bash
npm run check
npm audit --audit-level=moderate
```

## Article Contract

Every article needs:

- `content/articles/<year>/<slug>/article.md`
- `content/articles/<year>/<slug>/agent.md`
- `content/articles/<year>/<slug>/artifact.json`

Every major visible claim needs:

- a stable `claim-000` ID in `artifact.json`
- a visible claim marker in `article.md`
- evidence source IDs that exist in `artifact.json`

Run `npm run generate` after changing article content. It updates the content hash and generated public packets.

## Review Rules

Reviewers should check:

- the human article is readable and not overloaded with widgets
- claim markers match artifact claims
- agent brief is compact and does not overstate the article
- sources support the claims they are attached to
- maturity state is honest
- generated files changed only as expected

## Site Navigation and Utility Placement

Keep the human path clear and machine entry points discoverable:

- **Primary navigation** (`src/layouts/BaseLayout.astro`): top-level human browse pages — Topics, Articles, Roadmap, Organization. The brand link returns to Home.
- **Organization browse cards** (`src/pages/organization.astro`): human-readable cross-cutting views — Topics, Articles, Roadmap, Graph.
- **Footer meta links** (`src/layouts/BaseLayout.astro`): machine/agent entry points and secondary links — Agent entry, `llms.txt`, discovery feeds, etc.

Do not hide a human-facing page only under an agent-facing label. Any new footer or browse link must respect `import.meta.env.BASE_URL`.

## Branch Protection

After the remote exists, protect `main` with:

- require pull request before merge
- require at least one approval
- require CODEOWNERS review
- require status checks: CI / Validate and build
- require conversation resolution
- require linear history
- block force pushes and branch deletion
- do not allow bypassing the above settings

Deployments should happen only from `main` through `.github/workflows/deploy.yml`.
