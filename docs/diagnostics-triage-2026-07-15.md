# Aura Knowledge Diagnostics Triage — 15 July 2026

> Status: triaged, backlog documented  
> Scope: `aura-knowledge.github.io` low-source-diversity warnings  
> Trigger: exhaustive issue-resolution pass left 408 residual warnings across 63 published articles

## What was fixed in this pass

The four shared articles that had active diagnostics warnings in the `site-open-issues` build were strengthened and verified:

| Article | Previous warnings | Current status |
|---|---|---|
| `agent-auditable-research` | 3 | 0 warnings, 6 verified claims |
| `agentic-commerce-product-truth` | 3 | 0 warnings, 15 verified claims |
| `before-machines` | 1 | 0 warnings, 8 verified claims |
| `foundation-models` | 10 | 0 warnings, 12 verified claims |

These articles are now clean in `site-open-issues`, `site-article-series-index`, and `aura-knowledge.github.io`.

## Residual warning inventory

`aura-knowledge.github.io` currently reports **408 low-source-diversity warnings** across **63 articles** (out of 92 published articles). All warnings are of the rule `low-source-diversity`: a claim relies on a single source or a single source type for evidence.

### Top 20 articles by warning count

| Warnings | Article |
|---|---|
| 19 | `product-ideas-that-could-shift-incentives` |
| 15 | `trust-and-outrage-platforms-and-cohesion` |
| 14 | `ai-agent-advanced-questions` |
| 14 | `from-penny-press-to-infinite-scroll` |
| 14 | `the-attention-matthew-effect` |
| 12 | `compound-habits-career-stages` |
| 12 | `the-creator-economys-incentive-trap` |
| 12 | `what-ai-makes-cheap` |
| 10 | `gender-and-the-attention-economy` |
| 9 | `by-the-numbers-what-indians-do-online` |
| 9 | `planning-and-reflection` |
| 9 | `the-student-screen-education-vs-entertainment` |
| 9 | `why-good-content-loses-to-loud-content` |
| 8 | `a-readers-guide-to-the-series` |
| 8 | `agents` |
| 8 | `ai-agent-first-conversation` |
| 8 | `context-management` |
| 8 | `long-running-sessions` |
| 8 | `open-questions-the-series-leaves-unresolved` |
| 8 | `reasoning-models` |

The remaining 43 articles each have 1–7 warnings.

## Triage decision

These 408 warnings are **accepted as a quality backlog**, not blockers, because:

1. They are all of one rule type (`low-source-diversity`) and do not indicate schema breakage, missing evidence, missing counterevidence, or stale sources.
2. Fixing them requires article-by-article research to identify additional public sources of a different type for each flagged claim. This is valuable but not a prerequisite for closing the currently open GitHub issues.
3. The articles remain readable and published; the warnings are surfaced in the agent diagnostics feed so readers and agents can see where evidence could be strengthened.
4. No article in the narrower `site-open-issues` or `site-article-series-index` builds now has a warning.

## Resolution path

- Treat the top 20 articles as the first research wave.
- For each flagged claim, add at least one additional public source of a different source type (e.g., pair an academic paper with a regulatory filing, industry report, or authoritative news source).
- After adding sources, update the claim `verification.status` to `verified` if the evidence is now diverse and strong.
- Regenerate with `npm run generate` and confirm the warning count drops.

## Verification command

```bash
npm run generate
# Warnings are listed in public/agents/diagnostics.json
```

Last regenerated: 2026-07-15.
