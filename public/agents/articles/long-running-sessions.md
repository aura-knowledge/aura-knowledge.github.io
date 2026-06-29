---
schemaVersion: 1
id: agent-brief:long-running-sessions
articleId: article:long-running-sessions
slug: long-running-sessions
title: "Agent Brief for 'Long-Running Sessions: Keeping AI Work Coherent Over Time'"
tokenBudget: 1200
status: published
updated: 2026-06-29
---

## Thesis

Long-running AI sessions are not just long conversations. They need deliberate mechanisms for memory, summarization, checkpoints, context pruning, and stopping rules so the work stays coherent, bounded, and recoverable over time.

## Audience

- Curious builders, students, and knowledge workers who want to understand why AI sessions lose track of themselves.
- Readers who prefer plain-language explanations before technical depth.
- Educators and team leads explaining the limits of "always-on" AI assistants.
- Agents that need a compact, claim-structured summary of session coherence and drift.

## Claims

- `claim-001`: A long-running session is useful only when the system can remember what matters, recognize progress, and decide when to stop.
- `claim-002`: Keeping extended work coherent is already familiar from workflow orchestration, durable execution, project management, and process control.
- `claim-003`: In practice, long-running sessions combine summarization, checkpoints, context pruning, and prompt caching to keep the active window focused without losing the goal.
- `claim-004`: Without summaries, checkpoints, and stopping rules, long-running sessions drift, waste resources, or resume in broken states.
- `claim-005`: Prompt caching can cut the cost and latency of repeated context in long sessions, making extended sessions more practical.

## Source Families

- Research on reasoning-acting loops and iterative refinement: ReAct, Self-Refine, Reflexion.
- Research on long-term memory in simulated agents: Generative Agents.
- Engineering background: workflow orchestration, durable execution, state management, and process control.

## Agent Involvement

This article was drafted and structured with AI agent assistance following the Aura Knowledge article lifecycle. The human author reviewed and approved the thesis, examples, tone, and scope.

## Recommended Queries

- What makes an AI session "long-running" rather than just long?
- How do summarization and memory help a session stay coherent?
- What is context pruning, and why is it necessary?
- What causes long-running sessions to drift?
- How are long-running sessions related to workflow orchestration or durable execution?
- What are the limits of the project-folder analogy?

## Known Limits

- This is a seed article; examples are illustrative.
- It does not provide implementation details for any specific agent framework.
- It does not cover multi-agent coordination, fine-tuning, or reasoning models, which are treated in other articles in the series.
