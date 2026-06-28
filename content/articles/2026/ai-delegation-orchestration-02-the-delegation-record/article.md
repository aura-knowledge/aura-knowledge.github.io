---
schemaVersion: 1
id: article:ai-delegation-orchestration-02-the-delegation-record
slug: ai-delegation-orchestration-02-the-delegation-record
title: "The Delegation Record: A Schema for Consequential AI Work"
dek: "A concrete schema for preserving objective, scope, boundaries, evidence, risk, review, rollback, and exit conditions."
date: 2026-06-28
updated: 2026-06-28
status: published
maturity: sprout
topic: ai-agents
tags:
  - ai-agents
  - agent-orchestration
  - delegation
  - human-ai-interaction
  - workflow
  - governance
summary: "Defines the delegation record and shows why it is more operational than a transcript, summary, ticket, or pull request alone."
readingTime: 6 min
agentArtifact: /agents/articles/ai-delegation-orchestration-02-the-delegation-record.json
sourcePath: content/articles/2026/ai-delegation-orchestration-02-the-delegation-record/article.md
---

<span id="claim-001" class="claim-marker" data-claim="claim-001">Claim C1</span>

# The Delegation Record: A Schema for Consequential AI Work

## Thesis

A delegation record is the system-of-record artifact that makes AI work inspectable, resumable, reviewable, and bounded.

Article 1 argued that conversation should remain the interface, while delegation should become the durable work primitive. This article defines the artifact that makes that practical.

## The Record Is Not The Work

The delegation is the assignment. The delegation record is the durable representation of that assignment and its execution state.

This distinction matters because AI work changes over time. The agent may discover new facts, change files, retrieve sources, fail tests, ask questions, or encounter policy boundaries. A transcript records many of those events, but it does not reliably answer the operator's next question: what is the current contract of work?

## Minimal Schema

| Field | Purpose |
|---|---|
| Principal | The user, team, or process that initiated the work. |
| Delegate | Agent, model, capability, or toolchain assigned to act. |
| Objective | What outcome is sought. |
| Scope | What is included. |
| Non-goals | What must not be changed or attempted. |
| Inputs | Source documents, files, datasets, prompts, or context packets. |
| Control boundary | Allowed actions, approval-required actions, and forbidden actions. |
| State | Current progress, blockers, and latest meaningful change. |
| Evidence | Tests, citations, logs, diffs, traces, or source references. |
| Decisions | Decisions made by agents, tools, policy, or humans. |
| Pending decisions | What still requires a control-locus decision. |
| Freshness | Age of source context, memory, assumptions, or retrieved sources. |
| Risk | Side effects, reversibility, data sensitivity, and consequence level. |
| Review owner | Who or what must review the result before acceptance. |
| Rollback path | How to undo, abandon, or restart safely. |
| Exit condition | What counts as done, stopped, escalated, or failed. |

This schema is not a mandate for every prompt. It is a minimum viable structure for consequential work.

## A Compact Example

```yaml
principal: product_engineering
delegate: coding_agent
objective: Make the checkout confirmation test pass.
scope:
  - checkout confirmation flow
  - directly related tests
non_goals:
  - billing provider behavior
  - authentication
  - database schema
inputs:
  - failing test output
  - relevant checkout files
control_boundary:
  allowed:
    - inspect local files
    - edit branch-local code
    - run tests
  approval_required:
    - external service calls
    - deployment
  forbidden:
    - database schema changes
state: tests passing after scoped code change
evidence:
  - failing test before change
  - passing test after change
  - scoped diff summary
risk:
  - user-facing checkout behavior
  - payment edge cases
review_owner: human reviewer or verifier agent
rollback_path: revert branch changes
exit_condition: tests pass, diff stays in scope, risks are summarized
```

The same structure can represent non-coding work. A research delegation would replace tests with citations, claim maps, confidence labels, and counterarguments. A legal review would replace diffs with clause references, risk rubric, confidentiality boundaries, and counsel review.

## Why A Summary Is Not Enough

A summary compresses what happened. A delegation record governs what can happen next.

Those are different jobs. A summary may say: "The agent changed three files and tests now pass." A delegation record can also say: "The change stayed within scope, billing behavior was not touched, the remaining risk is refund coverage, and the next control action is verifier review."

The second version is operational. It lets another agent, reviewer, or future human resume the work without reading the full transcript.

| Artifact | Primary job | Weakness for agent work |
|---|---|---|
| Transcript | Preserve conversation. | Buries current boundary, state, and evidence. |
| Summary | Compress what happened. | May omit permissions, freshness, rollback, or pending decisions. |
| Ticket/issue | Track assignment and lifecycle. | Often lacks agent tool traces, evidence quality, and control boundary. |
| Pull request | Review code diffs and checks. | Coding-specific; weak for research, legal, policy, and cross-workstream routing. |
| Delegation record | Preserve current work contract and control state. | Can become bureaucratic or privacy-heavy if overbuilt. |

## Is This Just A Ticket, Issue, Or PR?

Sometimes, yes. A delegation record should not replace good existing artifacts.

In coding, a pull request already carries diffs, tests, review comments, checks, and ownership. In business operations, a ticket may already carry assignment and status. In legal work, a matter file may already preserve source documents and review obligations.

The AI-specific addition is not a new brand of task tracker. It is the fields that become critical when an agent can act:

- control boundary
- allowed tools
- approval-required actions
- forbidden actions
- freshness of context
- evidence quality
- tool traces
- verifier status
- rollback path
- exit condition

If an existing issue, PR, case file, or work order can carry those fields, use it. If not, the orchestration layer needs a companion record.

## Record Design Has Privacy Cost

A durable record is useful because it remembers. That is also why it can become dangerous.

The record should preserve enough evidence to support review and recovery, not everything the agent saw forever. Sensitive domains may need redaction, encryption, limited retention, or separate public and private views. A delegation record should follow data minimization, access control, retention, and purpose limitation.

The danger is not only privacy leakage. Excessive audit trails can become surveillance. A record that captures every token, every draft, every private note, and every intermediate thought may create more institutional risk than value. The useful record is not the largest possible record. It is the smallest record that supports accountability, resumption, and correction.

## Practical Takeaway

When designing a delegation record, ask:

1. What does a future reviewer need to trust or reject the result?
2. What does another agent need to resume safely?
3. What does policy need to enforce boundaries?
4. What does the human need to decide next?
5. What should not be retained?

## Claim Support

| Claim | Source support | Confidence | Caveat |
|---|---|---|---|
| Current agent tooling exposes tools, traces, state, and human-in-the-loop primitives. | OpenAI Agents docs; OpenAI tracing/HITL docs; LangGraph docs. | High | Tooling changes quickly; source freshness matters. |
| A durable record should include evidence, control boundaries, state, and review. | Synthesis from agent tooling plus NIST AI RMF governance concepts. | Medium | Proposed schema is not an accepted standard. |
| More retention is not automatically better. | NIST AI RMF governance/risk framing and privacy design reasoning. | Medium | Needs domain-specific privacy review before adoption. |

## Bridge To Article 3

Once there are many delegation records, the operator faces a new problem. Which delegation needs attention next, and what kind of attention does it need?

## Sources

- OpenAI Agents guide. https://developers.openai.com/api/docs/guides/agents
- OpenAI Agents SDK tracing. https://openai.github.io/openai-agents-python/tracing/
- OpenAI Agents SDK human-in-the-loop documentation. https://openai.github.io/openai-agents-python/human_in_the_loop/
- LangGraph documentation. https://docs.langchain.com/oss/python/langgraph/overview
- NIST AI Risk Management Framework. https://www.nist.gov/itl/ai-risk-management-framework

## Agent Involvement

This article was prepared with AI assistance from a sanitized research discussion and public sources. The human maintainer approved this publication package on 2026-06-28. Treat the design primitives as exploratory proposals, not settled standards.
