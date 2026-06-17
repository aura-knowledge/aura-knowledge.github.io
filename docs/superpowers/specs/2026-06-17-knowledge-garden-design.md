# Knowledge Garden Design

> A separate GitHub Pages knowledge garden for focused human essays and token-efficient agent artifacts.

## Goal

Create a future-proof publishing system for Vishal's AI-era writing journey. The site should publish polished human-readable essays, expose adjacent machine-readable artifacts for agents, and enforce a repeatable workflow so future articles do not become one-off pages.

## Recommended Approach

Use the existing local `knowledge` repo as the new GitHub Pages project site. The intended remote is `v-i-s-h-a-l/knowledge`, which would publish under `https://v-i-s-h-a-l.github.io/knowledge/`. The personal site remains the identity/portfolio surface and links to the knowledge garden.

Three approaches were considered:

- **Extend personal Jekyll blog:** fastest to publish, but mixes old portfolio/blog concerns with a new agent-native structure.
- **Create a separate Astro knowledge garden:** recommended. It supports Markdown content collections, typed schemas, static output, GitHub Pages deployment, focused UX, and generated agent artifacts.
- **Build custom static HTML generator:** maximum control and low dependency count, but slower to evolve and less ergonomic for recurring articles.

## Product Shape

The site has two equal audiences:

- **Humans:** readers who need a focused, mobile-friendly essay experience with clear impact blocks, progressive disclosure, source trails, and a topic graph.
- **Agents:** AI systems that need low-noise entry points, structured metadata, claim lists, sources, summaries, and machine-readable navigation.

The first article proves the system:

- Title: "The Future of Publishing Is Agent-Auditable Research"
- Thesis: the future is not AI-written content; it is research that humans can read and agents can audit.
- Human page: focused essay with one knowledge point per viewport-like section.
- Agent page: compact Markdown brief plus JSON artifact with claims, sources, tags, and relationships.

## UX Principles

- **One knowledge point at a time.** Sections should behave like a calm reading sequence. Each scroll segment carries one epistemic beat: one claim, one supporting evidence cluster, and one next step. Adjacent content is visible enough for orientation but visually subordinate.
- **Progressive context.** Start with a concrete thesis, then reveal stakes, competitors, proposed primitive, and implications.
- **Impact as structure.** Highlight boxes should name why the idea matters, not decorate the article.
- **Quiet motion.** Use scroll progress, claim-rail highlighting, soft focus transitions, and reduced-motion fallbacks. Avoid scrolljacking, heavy parallax, video-like scroll gimmicks, sticky traps, and animation that competes with reading.
- **Visible trust.** Major claims expose provenance, confidence, counterpoints, and source IDs without turning the essay into a dashboard.
- **Graph after narrative.** The graph helps exploration after the reader understands the first path. It should not interrupt the essay.
- **Light and dark modes.** Theme must respect system preference and allow manual toggle.
- **Mobile first.** The article must read cleanly on narrow screens; graph and side panels collapse into simple lists.

## Content Model

Each article has a folder:

```text
content/articles/<yyyy>/<slug>/
  article.md          # human article body and frontmatter
  agent.md            # token-efficient agent brief
  artifact.json       # structured metadata, claims, sources, relationships
  assets/             # optional local article assets
```

Required article fields:

- `schemaVersion`
- `id`
- `slug`
- `title`
- `dek`
- `date`
- `updated`
- `status`
- `maturity`
- `topic`
- `tags`
- `summary`
- `readingTime`
- `agentArtifact`
- `sourcePath`

Required artifact fields:

- `schemaVersion`
- `id`
- `title`
- `canonicalPath`
- `thesis`
- `audiences`
- `claims`
- `sources`
- `related`
- `agentInstructions`
- `humanReview`
- `contentHash`

Supported maturity states:

- `seed`
- `sprout`
- `evergreen`
- `contested`
- `superseded`

## Site Structure

```text
/
  index                # garden home, latest article, topic stems
  /articles/<slug>/    # focused article view
  /graph/              # topic/claim graph browser
  /agents/             # agent landing page and feed links
  /agents/index.json   # generated machine-readable index
  /agents/index.jsonl  # generated compact discovery feed
  /llms.txt            # curated map for LLMs
```

## Design Direction

The visual identity should be "research instrument, not magazine template." Use restrained typography, precise spacing, and a signature stem graph. A stem represents a topic lineage: root idea, current article, related claims, sources, and future questions.

Suggested design tokens:

- Backgrounds: near-white `#f7f7f3`, ink `#111318`, dark `#0d1117`
- Accent: signal cyan `#26c6da`, evidence green `#62c370`, caution amber `#d99a2b`
- Type: system serif for essay display if external fonts are avoided; system sans for UI; monospace for agent/data labels.

## Governance

Development must happen on branches and worktrees. `main` should be protected remotely with required PRs and checks once the remote exists.

Local safeguards:

- `npm run validate` checks content schema, artifact shape, source links, and generated indexes.
- pre-commit hook runs formatting and validation.
- commit-msg hook rejects direct commits to `main` locally.

CI safeguards:

- Install dependencies.
- Validate content/artifacts.
- Validate schema contracts.
- Build static site.
- Check generated agent index, JSONL discovery feed, graph data, and `llms.txt`.
- Detect human/agent artifact drift through content hashes.
- Deploy to GitHub Pages only from `main`.

## First Release Scope

Include:

- Astro static site.
- First article.
- Agent artifact files.
- Topic graph/stem browser.
- Generated `llms.txt` and `agents/index.json`.
- Validation script.
- GitHub Actions build/deploy workflow.
- Hook installation script.
- Contribution workflow docs.

Exclude for now:

- Hosted search backend.
- Comments.
- User accounts.
- Runtime agent chat.
- Signed packets or cryptographic identity. Keep schema fields ready for future signing.

## Open Risks

- GitHub remote creation/push may be blocked by local authentication. Build locally and document the remote handoff.
- Over-designing the graph can distract from the article. The first release should privilege reading.
- Agent artifacts can drift from article content. Validation must ensure required references exist, but human review is still required for semantic alignment.

## Sources

- Astro GitHub Pages deployment docs: https://docs.astro.build/en/guides/deploy/github/
- GitHub protected branch docs: https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- pre-commit docs: https://pre-commit.com/
- llms.txt proposal: https://github.com/answerdotai/llms-txt
- Maggie Appleton on digital gardens: https://maggieappleton.com/nontechnical-gardening
- Vivian Qu on digital gardens: https://vivqu.com/blog/2020/10/18/digital-gardens/
- CSS-Tricks on Apple-style scroll animations: https://css-tricks.com/lets-make-one-of-those-fancy-scrolling-animations-used-on-apple-product-pages/
