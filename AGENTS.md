# Aura Knowledge Article Commands

This repository is the published Aura Knowledge garden. Article lifecycle routing is defined in the sibling `meta` repository.

When the user invokes `$aura-article`, `use aura-article`, `use Aura article flow`, or asks naturally to propose, ideate, research, scope, structure, draft, review, finalize, publish, correct, audit, or challenge sources for an Aura Knowledge article, load and follow:

- `../meta/capabilities/article-lifecycle-router/SKILL.md`

If the sibling `../meta` checkout is missing, ask the user to clone `https://github.com/aura-knowledge/meta` next to this repository, or use the canonical remote skill:

- `https://raw.githubusercontent.com/aura-knowledge/meta/main/capabilities/article-lifecycle-router/SKILL.md`

When using the raw fallback, resolve the router's `references/*.md` files against the same raw directory:

- `https://raw.githubusercontent.com/aura-knowledge/meta/main/capabilities/article-lifecycle-router/references/`

## Session start nudge

On the first assistant response in this repository, if the user has not given a concrete task, show exactly one short line:

`Aura Knowledge site ready. Common starts: draft or review an article, prepare publication, correct an article, challenge sources, or run site checks.`

If the user has given a concrete task, skip this nudge and route directly. Do not load the article router only to produce the nudge; load it only after the user chooses article lifecycle work or asks for matching work in natural language.

Everything public must pass the privacy contract. Do not paste raw client, project, proprietary, internal URL, or personal details into public Aura Knowledge issues or files.

Claude users may also invoke `/aura-article`; this repository ships `.claude/commands/aura-article.md` for that environment. Kimi Code coverage is through this `AGENTS.md` file.

## SDL capability routing

When the user invokes `$sdl`, `/sdl`, `use SDL`, `SDL mode`, `$capability-routing`, `/capability-routing`, `use capability-routing`, or asks to route work through SDL/stibdedlom, load and follow:

- `/Users/vishalsingh/.agents/skills/stibdedlom/SKILL.md`
- `/Users/vishalsingh/.agents/skills/capability-routing/SKILL.md`

Article lifecycle work continues to route through the Aura Knowledge article-lifecycle-router unless the user explicitly asks for SDL governance.

## SDL commit-author provenance

All commits in this repository must carry the `SDL-Commit-Author: capability-commit-author` trailer. This is enforced by a `commit-msg` hook in `.githooks/commit-msg`. The hook is installed automatically when `git config core.hooksPath .githooks` is set (already configured in this repo).

For new clones, run `git config core.hooksPath .githooks` after checkout to enable the hook.

To bypass the hook (e.g. for history rewrites), set `SDL_COMMIT_AUTHOR_SKIP=1` in the environment.

The SDL commit-author capability runner lives at `stibdedlom/infra/capabilities/capability_commit_author/runner.py` and can be used to group changes into logical commits with lifecycle provenance.
