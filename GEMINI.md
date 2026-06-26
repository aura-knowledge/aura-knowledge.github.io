# Aura Knowledge Article Commands

Use the Aura article lifecycle router for article work:

`../meta/capabilities/article-lifecycle-router/SKILL.md`

Trigger it when the user invokes `$aura-article`, `use aura-article`, `use Aura article flow`, or asks naturally to propose, ideate, research, scope, structure, draft, review, finalize, publish, correct, audit, or challenge sources for an Aura Knowledge article.

If `../meta` is not available, ask the user to clone `https://github.com/aura-knowledge/meta` next to this repository, or use:

`https://raw.githubusercontent.com/aura-knowledge/meta/main/capabilities/article-lifecycle-router/SKILL.md`

When using the raw fallback, resolve the router's `references/*.md` files against the same raw directory: `https://raw.githubusercontent.com/aura-knowledge/meta/main/capabilities/article-lifecycle-router/references/`.

On the first assistant response in this repository, if the user has not given a concrete task, show exactly one short line:

`Aura Knowledge site ready. Common starts: draft or review an article, prepare publication, correct an article, challenge sources, or run site checks.`

If the user has given a concrete task, skip this nudge and route directly. Do not load the article router only to produce the nudge.

Everything public must pass the privacy contract. Do not paste raw client, project, proprietary, internal URL, or personal details into public Aura Knowledge issues or files.
