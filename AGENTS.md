# Aura Knowledge Article Commands

This repository is the published Aura Knowledge garden. Article lifecycle routing is defined in the sibling `meta` repository.

When the user invokes `$aura-article`, `use aura-article`, `use Aura article flow`, or asks naturally to propose, ideate, research, scope, structure, draft, review, finalize, publish, correct, audit, or challenge sources for an Aura Knowledge article, load and follow:

- `../meta/capabilities/article-lifecycle-router/SKILL.md`

If the sibling `../meta` checkout is missing, ask the user to clone `https://github.com/aura-knowledge/meta` next to this repository, or use the canonical remote skill:

- `https://raw.githubusercontent.com/aura-knowledge/meta/main/capabilities/article-lifecycle-router/SKILL.md`

When using the raw fallback, resolve the router's `references/*.md` files against the same raw directory:

- `https://raw.githubusercontent.com/aura-knowledge/meta/main/capabilities/article-lifecycle-router/references/`

Everything public must pass the privacy contract. Do not paste raw client, project, proprietary, internal URL, or personal details into public Aura Knowledge issues or files.

Claude users may also invoke `/aura-article`; this repository ships `.claude/commands/aura-article.md` for that environment. Kimi Code coverage is through this `AGENTS.md` file.
