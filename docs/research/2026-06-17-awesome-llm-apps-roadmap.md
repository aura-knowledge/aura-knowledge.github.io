# Awesome LLM Apps Roadmap Research

> Product roadmap research for the AI-native knowledge garden, based on a review of `Shubhamsaboo/awesome-llm-apps`.

## Research Frame

- Reviewed repository: `https://github.com/Shubhamsaboo/awesome-llm-apps`
- Local review commit: `ca3a3d3`
- Commit date: `2026-06-14`
- Review date: `2026-06-17`
- Target product: a public GitHub Pages knowledge garden with human-readable articles, agent-readable artifacts, claim/evidence packets, source ledgers, graph navigation, validation, and PR-based publishing.

The repository is useful because it is not a theory deck. It is a collection of runnable agent, RAG, MCP, generative UI, memory, and optimization examples. The right move is not to copy those apps into the garden. The right move is to extract product primitives that strengthen publishing: evidence, provenance, review, retrieval, compact agent consumption, and author workflow.

## Executive Thesis

The knowledge garden should evolve from "article plus agent packet" into a validated research-object pipeline.

The next foundation should not be a chatbot on the public page. It should be:

1. Stronger claim evidence packets.
2. CI diagnostics for weak evidence and stale artifacts.
3. An authoring workspace that turns research sessions into files.
4. A bounded component catalog for human and agent-facing views.
5. A trust-gated review path with dry-run previews.

Runtime agent interfaces, MCP write tools, and generative dashboards are promising, but they belong after the static artifact contract is stable.

## Method

I reviewed the source repository directly from a local clone and split the research into three independent review passes:

- RAG, research papers, citations, memory, and graph retrieval.
- Agent workflows, MCP, always-on agents, trust gates, and skills.
- Generative UI, dashboards, app builders, and token-efficiency examples.

The cross-agent synthesis converged on one design principle: keep the public garden static and readable while moving agency into authoring, validation, and generated artifacts.

## Priority Definitions

- `P0`: next foundation work. These make the current garden more credible and repeatable.
- `P1`: near-term product roadmap. These expand intake, retrieval, and author workflow after launch.
- `P2`: later experiments. These are valuable but should not precede the artifact contract.

The machine-readable version lives in `content/roadmap/awesome-llm-apps-roadmap.json` and is generated to `public/agents/roadmap/awesome-llm-apps-roadmap.json`.

## Recommended Roadmap

### Phase 0: Make Evidence Packets Real

Outcome: every public claim has structured support, counterevidence, source quality, and validation rules that fail weak packets before publishing.

P0 work:

- Claim Evidence Packet v2.
- Evidence CI and RAG Diagnostics.
- Claim Verification Workbench.
- UX Governance Checks.

Why this comes first: the first article already proves the human and agent artifact pairing. The next credibility jump is to make support for each claim inspectable enough that readers and agents can audit it without trusting prose.

Source patterns:

- `rag_tutorials/knowledge_graph_rag_citations/README.md`
- `rag_tutorials/rag_failure_diagnostics_clinic/README.md`
- `rag_tutorials/corrective_rag/README.md`
- `awesome_agent_skills/fact-checker/SKILL.md`
- `awesome_agent_skills/deep-research/SKILL.md`
- `awesome_agent_skills/academic-researcher/SKILL.md`

### Phase 1: Build The Authoring Workspace

Outcome: research plans, source captures, article drafts, artifact diffs, and reviewer results become durable files instead of disappearing in chat history.

P0 work:

- Research Workspace Builder.
- Artifact Widget Catalog.
- Trust-Gated Publishing Pipeline.

Why this comes second: a public knowledge garden needs a private production workflow. Agents are useful when they leave behind structured evidence, planned tasks, and review output, not when they merely generate text.

Source patterns:

- `generative_ui_agents/ai-deep-research-agent/README.md`
- `advanced_ai_agents/single_agent_apps/research_agent_gemini_interaction_api/README.md`
- `generative_ui_agents/generative-ui-starter-project/README.md`
- `advanced_ai_agents/multi_agent_apps/trust_gated_agent_team/README.md`
- `advanced_ai_agents/multi_agent_apps/multi_agent_trust_layer/README.md`

### Phase 2: Expand Intake And Retrieval

Outcome: the garden can scout new sources, import papers and URLs, suggest graph relations, and expose safe retrieval paths for agents.

P1 work:

- Always-On Source Ledger Scout.
- Provenance Graph v2.
- Source Ledger Importer.
- Corrective Research Assistant.
- Garden MCP Router.

Why this comes after launch: source intake and retrieval become more valuable once the garden has several articles, claims, and recurring topics. Before that, the system risks optimizing an empty graph.

Source patterns:

- `always_on_agents/always_on_hn_briefing_agent/README.md`
- `advanced_llm_apps/chat_with_X_tutorials/chat_with_research_papers/README.md`
- `advanced_llm_apps/chat_with_X_tutorials/chat_with_substack/README.md`
- `advanced_llm_apps/llm_apps_with_memory_tutorials/ai_arxiv_agent_memory/README.md`
- `mcp_ai_agents/multi_mcp_agent_router/README.md`
- `mcp_ai_agents/github_mcp_agent/README.md`
- `mcp_ai_agents/browser_mcp_agent/README.md`

### Phase 3: Optimize Agent Consumption

Outcome: agents can consume compact packets, inspect evidence interactively, and regression-test briefs without turning the public site into a runtime app.

P1/P2 work:

- Compact Agent Feeds.
- Claim Evidence Canvas.
- Agent Brief Evaluation Harness.
- Agent-Native Packet Inspector.

Why this waits: compact formats and interactive inspectors are valuable only after the canonical artifacts are stable. Compressing or visualizing weak data makes weak data look more mature than it is.

Source patterns:

- `advanced_llm_apps/llm_optimization_tools/toonify_token_optimization/README.md`
- `advanced_llm_apps/llm_optimization_tools/headroom_context_optimization/README.md`
- `generative_ui_agents/ai-dashboard-canvas-agent/README.md`
- `awesome_agent_skills/self-improving-agent-skills/README.md`
- `generative_ui_agents/mcp-apps-generative-ui-showcase/README.md`
- `generative_ui_agents/ai-mcp-app-builder/README.md`

## Product Ideas

### Claim Evidence Packet v2

Pattern: retrieval and citation examples use typed objects that connect answer content back to sources, evidence, confidence, and reasoning traces.

Garden mapping: extend `artifact.json` beyond `claim.evidence: sourceId[]`. A claim should eventually include support snippets, source location, support type, extraction metadata, counterevidence, confidence, and reviewer status.

First implementation: add an `evidencePackets` array and render one compact evidence card per claim in the article audit section.

Risk: citation IDs are not verification. The support snippet and source context must actually support the claim.

### Evidence CI And RAG Diagnostics

Pattern: the RAG diagnostics clinic frames failures as reusable patterns and recommends structural fixes instead of pure prompt tweaks.

Garden mapping: fail CI for weak evidence patterns: orphan claims, missing counterevidence, stale source dates, dangling graph edges, missing generated packets, and low source diversity for high-confidence claims.

First implementation: deterministic checks first, optional LLM audit report later.

Risk: LLM audits can be noisy. They should begin as review artifacts, not deploy blockers.

### Claim Verification Workbench

Pattern: fact-checking and deep-research skills provide a reusable claim verification loop: identify claim, define required evidence, evaluate source quality, rate confidence, and note missing context.

Garden mapping: every claim can move through statuses such as `unverified`, `supported`, `contested`, `stale`, and `needs-source`.

First implementation: add verification fields to claim objects and a report command that groups claims by verification status.

Risk: source quality is contextual. Some judgments must remain human-reviewed.

### Research Workspace Builder

Pattern: the deep research UI renders tool calls as cards while maintaining a sidecar workspace of todos, files, and research outputs.

Garden mapping: agent-assisted writing should produce repo files: source captures, claim packets, draft outlines, review reports, and generated artifacts.

First implementation: a CLI scaffold that creates an article workspace and source ledger before any live UI.

Risk: chat history is not a source of truth.

### Artifact Widget Catalog

Pattern: generative UI is safer when agents choose from known components and schemas.

Garden mapping: define approved static widgets such as `ClaimCard`, `SourceLedger`, `MaturityBadge`, `StemGraph`, `AgentPacketPreview`, and `RoadmapItem`.

First implementation: render the public roadmap from a schema-validated JSON artifact.

Risk: arbitrary generated UI is not acceptable for a public static site.

### Trust-Gated Publishing Pipeline

Pattern: trust-gated multi-agent examples gate participation by role, score, policy, and audit trail.

Garden mapping: a future publish gate can require reviewer roles, input/output hashes, review status, policy scope, and human approval before `status: published`.

First implementation: optional `provenance.json` per article.

Risk: hash chains do not solve trust by themselves. Sensitive prompts should be hashed or summarized, not published.

### Always-On Source Ledger Scout

Pattern: the always-on HN briefing agent collects, ranks, summarizes, and delivers high-signal items with dry-run delivery.

Garden mapping: a scout can watch AI publishing, agent protocols, research papers, product docs, and repos for new evidence or counterevidence.

First implementation: dry-run issue drafts or source-ledger proposals, not automatic article edits.

Risk: scheduled agents create noise without scoring, deduplication, and topic boundaries.

### Provenance Graph v2

Pattern: knowledge graph RAG supports multi-hop reasoning when entity and relationship edges carry provenance.

Garden mapping: the graph can grow from topic/article/claim/source into concept, entity, method, supports, contests, depends-on, mentions, and derived-from edges.

First implementation: reviewed edge metadata and "why this edge exists" labels in the graph UI.

Risk: extracted edges can invent relationships. Graph data needs review states.

### Source Ledger Importer

Pattern: paper, newsletter, GitHub, and web examples show how external corpora become retrievable.

Garden mapping: add a source CLI that imports arXiv, DOI, URL, GitHub, and newsletter metadata into the ledger with accessed dates and candidate claim links.

First implementation: URL and arXiv metadata import with manual approval.

Risk: imported summaries are notes, not evidence by themselves.

### Corrective Research Assistant

Pattern: agentic RAG can grade retrieved context, rewrite weak queries, retrieve more, and identify gaps.

Garden mapping: audit drafts for missing sources, unsupported claims, shallow counterarguments, and unclear research questions.

First implementation: non-blocking draft audit reports grouped by claim ID and severity.

Risk: query rewrite decisions need traceability so the agent does not silently answer a different question.

### Garden MCP Router

Pattern: MCP routing examples send requests to specialist agents with only the tools needed for a task.

Garden mapping: expose safe operations as tools: query artifacts, inspect graph slices, validate packets, create scaffolds, update source ledgers, and open PRs.

First implementation: tool contracts and dry-run semantics before write-capable MCP.

Risk: broad MCP permissions are dangerous. Write operations need explicit preview and human approval.

### Compact Agent Feeds

Pattern: TOON and context-compression examples reduce redundant structured data while preserving retrieval hooks.

Garden mapping: generate compact claim/source/roadmap tables beside canonical JSON and JSONL.

First implementation: token estimates and a compact derived claims table.

Risk: canonical artifacts should remain JSON. Compression must not drop counterevidence or maturity markers.

### Claim Evidence Canvas

Pattern: dashboard canvas examples make data panels addressable and persistent.

Garden mapping: add an optional evidence view with claim coverage, source diversity, maturity, counterevidence, and graph health.

First implementation: a static summary on the roadmap or graph page, not a runtime dashboard.

Risk: dashboard creep can compete with reading.

### Agent Brief Evaluation Harness

Pattern: self-improving skill examples evaluate outputs against scenarios and keep targeted improvements.

Garden mapping: regression-test `agent.md` and generated packets against expected retrieval queries.

First implementation: static eval set before any self-improvement loop.

Risk: optimization can overfit narrow evals and degrade human prose.

### Agent-Native Packet Inspector

Pattern: MCP app examples connect tool calls to sandboxed interactive resources.

Garden mapping: later, agents could request graph slices, packet summaries, or review reports from garden artifacts through a local or hosted inspector.

First implementation: keep this outside the public GitHub Pages site until the artifact contract is mature.

Risk: runtime apps add hosting, security, authentication, and permission concerns.

## Anti-Patterns To Avoid

1. Do not wrap deterministic checks in agents. Schema validation, hash checks, path checks, generated diff checks, and graph integrity are ordinary software problems.
2. Do not let web fallback bypass the source ledger. Any source that supports a public claim must become a reviewed ledger entry.
3. Do not publish personal memory. Use memory to assist authoring, not as public artifact content.
4. Do not add runtime chat to the public site too early. The reading experience should remain static, focused, and accessible.
5. Do not let generated UI execute arbitrary code. Use bounded components and schema-validated artifacts.
6. Do not compress canonical artifacts. Compact packets should be derived and hash-linked.
7. Do not treat hash chains as complete security. They help tamper evidence but do not replace signing, trusted timestamps, or review.

## Immediate Implementation Recommendation

The next implementation pass should be small and structural:

1. Add evidence packet fields to article artifacts.
2. Add deterministic evidence diagnostics in `scripts/validate-content.mjs`.
3. Add a source-ledger import stub for URL/arXiv metadata.
4. Add a public roadmap page generated from `content/roadmap/awesome-llm-apps-roadmap.json`.
5. Add agent-facing roadmap JSON under `public/agents/roadmap/`.

This report implements item 4 and the agent-facing roadmap artifact. The evidence packet and diagnostics work should be its own branch because it changes the article schema and validation contract.

## Source Notes

The strongest direct inspiration came from these areas of `awesome-llm-apps`:

- `always_on_agents/always_on_hn_briefing_agent/README.md`: dry-run scheduled source scouting and digest delivery.
- `rag_tutorials/knowledge_graph_rag_citations/README.md`: provenance-aware graph retrieval and reasoning traces.
- `rag_tutorials/rag_failure_diagnostics_clinic/README.md`: reusable diagnostics for RAG failures.
- `advanced_llm_apps/llm_apps_with_memory_tutorials/ai_arxiv_agent_memory/README.md`: persistent research interests and paper search.
- `advanced_ai_agents/multi_agent_apps/trust_gated_agent_team/README.md`: trust gating and hash-chained review trails.
- `mcp_ai_agents/multi_mcp_agent_router/README.md`: specialist routing and least-tool access.
- `generative_ui_agents/ai-deep-research-agent/README.md`: sidecar workspace for research outputs.
- `generative_ui_agents/ai-dashboard-canvas-agent/README.md`: persistent addressable UI panels.
- `advanced_llm_apps/llm_optimization_tools/toonify_token_optimization/README.md`: compact structured data for agent consumption.
- `advanced_llm_apps/llm_optimization_tools/headroom_context_optimization/README.md`: context compression for tool-heavy workflows.
- `awesome_agent_skills/self-improving-agent-skills/README.md`: eval-driven improvement loops.

## Review Record

- Main synthesis: Codex.
- RAG and memory reviewer: Ohm.
- Agent workflow reviewer: Bacon.
- Generative UI and token-efficiency reviewer: Gauss.

The reviewers agreed on the main sequencing: strengthen evidence and governance first, then author workflow and source intake, then MCP/generative UI and compact agent-consumption layers.
