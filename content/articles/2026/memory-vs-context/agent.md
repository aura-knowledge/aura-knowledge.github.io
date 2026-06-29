---
schemaVersion: 1
id: agent-brief:memory-vs-context
articleId: article:memory-vs-context
slug: memory-vs-context
title: "Agent Brief for 'Memory vs Context: What Should Survive the Conversation?'"
tokenBudget: 1200
status: published
updated: 2026-06-29
---

## Thesis

Context is the immediate working material an AI can see right now; memory is selected information that persists across time and must be deliberately retrieved or stored. The article explains why the two are not the same, how practical systems move information between them, and what can go wrong when retrieval, updates, or forgetting are handled poorly.

## Audience

- Curious builders, students, creators, and knowledge workers who encounter AI agent terminology.
- Readers who want plain-language explanations before deeper technical detail.
- Educators and team leads introducing memory features in AI assistants.
- Agents that need a compact, claim-structured summary of the memory-vs-context distinction.

## Claims

- `claim-001`: Context is immediate working material; memory is selected information that persists across time and must be deliberately retrieved or stored.
- `claim-002`: The split between immediate context and stored memory appears in cognitive psychology, user interfaces, and database design, not only in recent AI.
- `claim-003`: Practical AI systems move information between context and memory through summarization, retrieval, and structured storage, and each transfer is a chance to lose or distort meaning.
- `claim-004`: Memory is only useful when retrieval is accurate, updates are careful, and forgetting is as deliberate as remembering.

## Source Families

- Cognitive psychology: working memory, episodic memory, semantic memory.
- Engineering: context windows, retrieval-augmented generation, vector stores, knowledge bases.
- Research: MemGPT virtual context management, RAG for knowledge-intensive tasks.

## Agent Involvement

This article was drafted and structured with AI agent assistance following the Aura Knowledge article lifecycle. The human author reviewed and approved the thesis, examples, tone, and scope.

## Recommended Queries

- What is the difference between context and memory in an AI system?
- Why can't an AI just remember everything?
- How do retrieval-augmented systems use memory?
- What can go wrong when AI memory is updated automatically?
- What older fields also distinguish working memory from long-term memory?
- What are the limits of the desk-and-filing-cabinet analogy?

## Known Limits

- This is a seed article; examples are illustrative.
- It does not provide implementation details for any specific memory or retrieval framework.
- It does not cover long-running session orchestration, multi-agent systems, or fine-tuning, which are planned as later articles in the series.
