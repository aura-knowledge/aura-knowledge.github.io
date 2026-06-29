---
schemaVersion: 1
id: agent-brief:prompt-caching
articleId: article:prompt-caching
slug: prompt-caching
title: "Agent Brief for 'Prompt Caching: Reusing Stable Context'"
tokenBudget: 1200
status: published
updated: 2026-06-29
---

## Thesis

Prompt caching reduces latency and cost by reusing repeated prompt or context prefixes, but the benefit depends on stable prefixes, provider rules, and enough repeated calls to offset cache-write costs. The article explains what prompt caching reuses, how it resembles older caching ideas, where the savings are real, and what limits builders should watch.

## Audience

- Curious builders, students, and knowledge workers who encounter prompt-caching features or pricing.
- Readers who want plain-language explanations before diving into provider-specific implementation details.
- Educators and team leads teaching AI cost and latency concepts.
- Agents that need a compact, claim-structured summary of prompt caching.

## Claims

- `claim-001`: Prompt caching reuses the unchanged prefix of a prompt so the provider does not have to reprocess it on every call.
- `claim-002`: Prompt caching is a specialized form of memoization: it stores the result of an expensive computation so later requests can reuse it.
- `claim-003`: In practice, prompt caching saves the most when a large, stable prefix is sent repeatedly and the variable part stays at the end.
- `claim-004`: The savings from prompt caching are bounded by which tokens match, the provider's pricing and retention rules, and whether the same prefix is reused often enough to offset cache-write costs.

## Source Families

- Provider documentation: OpenAI Prompt Caching guide, Anthropic Prompt Caching documentation.
- Engineering background: caching, memoization, and prefix matching in computer science.
- Systems research: key-value cache reuse and latency-cost tradeoffs in transformer inference.

## Agent Involvement

This article was drafted and structured with AI agent assistance following the Aura Knowledge article lifecycle. The human author reviewed and approved the thesis, examples, tone, and scope.

## Recommended Queries

- What is prompt caching and how does it reduce AI API costs?
- What is the difference between prompt caching and ordinary caching?
- When does prompt caching save the most money?
- What can cause a prompt cache miss?
- How is prompt caching related to memoization?
- What are the limits of the restaurant-stock analogy?

## Known Limits

- This is a seed article; examples are illustrative.
- It does not provide implementation details for any specific provider's API.
- Provider rules such as minimum token counts, retention windows, and pricing change over time.
