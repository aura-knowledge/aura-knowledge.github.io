# Organization Human Home Design

## Goal

Create two public human-facing entry points for the Aura Knowledge organization:

1. A GitHub organization profile README for people who land on the GitHub organization page.
2. A site page at `/organization/` for a fuller explanation of purpose, structure, operating principles, and navigation.

The existing site homepage remains unchanged. The existing `/agents/` route remains the machine-facing path.

## Audience

The primary audience is a human visitor who has little or no context about Aura Knowledge. They may arrive from GitHub, a shared link, or a repository search result. The page should help them understand what the organization does, where to start, and how the public repositories relate to the published site.

AI agents and automation are secondary. They should be acknowledged only through a clearly labeled section that points to existing machine-readable routes.

## Content Model

The organization story should explain:

- Aura Knowledge is a public knowledge garden for human-readable essays, research artifacts, and experiments around agent-auditable publishing.
- The public site is the easiest human entry point.
- The repository source is public so the publication workflow, claims, provenance, and generated artifacts can be inspected.
- Humans should browse articles, roadmap, graph, and contribution docs before touching agent-specific files.
- Agents have a separate path through `/agents/`, `llms.txt`, generated JSON packets, and graph data.

## GitHub Organization Profile

Create `profile/README.md` for a GitHub special `.github` repository. In this worktree, store it at `.github/profile/README.md` so it can be copied or pushed into the organization profile repository.

The profile README should be concise and scannable:

- Lead with a plain-language description of Aura Knowledge.
- Provide a short "Start here" section with human-first links.
- Explain the current repository structure, starting with `aura-knowledge.github.io`.
- State operating principles in simple bullets.
- Include a small section for contributors.
- Include a final, clearly separate section for agents and automation.

## Site Page

Add `src/pages/organization.astro`.

The page should:

- Use the existing `BaseLayout`.
- Follow existing visual patterns: `page-shell`, `utility-page`, `utility-hero`, `section-band`, `section-grid`, `signal-list`, `button`, and existing typography tokens.
- Avoid turning the page into a marketing landing page.
- Explain the organization as an operating system for public knowledge work: purpose, browsing model, repository model, principles, and contribution path.
- Link to the public site routes: articles, roadmap, graph, agents, README, and CONTRIBUTING.
- Keep the agent section short and explicitly secondary.

Add a primary navigation link labeled `Organization` in `BaseLayout.astro`. Keep it near the front of the nav because it is a human orientation page.

## Non-Goals

- Do not replace the existing homepage at `/`.
- Do not change the article, roadmap, graph, or agent data generation contracts.
- Do not add new runtime dependencies.
- Do not create generated assets or decorative imagery.
- Do not redesign the global site shell.

## Validation

Run:

```bash
npm run check
```

Expected result:

- Agent packets regenerate successfully.
- Content validation passes.
- Astro builds the added `/organization/` page.
- Build validation passes.

## Open Decisions Resolved

- The organization page is not the site homepage.
- The GitHub profile and the site page are both in scope.
- Human orientation is the primary goal.
- Agent entry points stay separate and are linked only as technical references.
