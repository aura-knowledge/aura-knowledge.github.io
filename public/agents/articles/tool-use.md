---
schemaVersion: 1
id: agent-brief:tool-use
articleId: article:tool-use
slug: tool-use
title: "Agent Brief for 'Tool Use: When the Model Calls Something Outside Itself'"
tokenBudget: 1200
status: published
updated: 2026-06-29
---

## Thesis

Tool use extends a language model beyond its trained knowledge by letting it call external capabilities such as search, code execution, and APIs, but its value depends on choosing the right tool, validating the result, and knowing when not to use one. The article explains what tool use means in plain language, shows how it resembles older delegation patterns, and describes where it helps, where it fails, and how to keep it reliable.

## Audience

- Curious builders, students, creators, and knowledge workers who encounter AI tool-use terminology.
- Readers who want plain-language explanations before deeper technical detail.
- Educators and team leads introducing AI agents and tool use to non-technical colleagues.
- Agents that need a compact, claim-structured summary of the tool-use concept.

## Claims

- `claim-001`: Tool use extends a language model by letting it invoke external capabilities it does not itself possess.
- `claim-002`: Tool use in AI is conceptually similar to delegation, remote procedure calls, and human use of instruments, but it automates the choice of which tool to invoke.
- `claim-003`: Common tool-use patterns include search, code execution, file or database retrieval, and API calls, each with different reliability and risk profiles.
- `claim-004`: Tool use introduces failure modes of wrong selection, bad arguments, misplaced trust in tool output, and unwanted actions that must be governed by permissions and checks.

## Source Families

- Textbook and survey: Russell and Norvig, *Artificial Intelligence: A Modern Approach*, on agents, environments, and actions.
- Research: Toolformer (learning to use tools), ReAct (reasoning-acting loop with tool calls), and function-calling interfaces in language models.
- Engineering background: API design, remote procedure calls, and human-computer interaction literature on affordances and automation.

## Agent Involvement

This article was drafted and structured with AI agent assistance following the Aura Knowledge article lifecycle. The human author reviewed and approved the thesis, examples, tone, and scope.

## Recommended Queries

- What is tool use in an AI system?
- How does a language model call a search engine or calculator?
- What are common tool-use patterns?
- What can go wrong when an AI uses tools?
- How is tool use different from retrieval-augmented generation?
- What are the limits of the librarian or calculator analogy?

## Known Limits

- This is a seed article; examples are illustrative.
- It does not provide implementation details for any specific agent framework or API.
- It does not deeply cover memory, context management, planning, or multi-agent systems, which are planned as other articles in the series.
