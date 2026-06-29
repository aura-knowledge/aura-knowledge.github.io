---
schemaVersion: 1
id: article:ai-demystified
slug: ai-demystified
title: "AI, De-Mystified: A Field Guide to Modern AI Terminology"
dek: "A plain-language tour through the ideas behind modern AI agents, one concept at a time."
date: 2026-06-29
updated: 2026-06-29
status: published
maturity: seed
topic: ai-agents
tags:
  - ai-agents
  - ai-literacy
  - series-overview
  - reading-guide
summary: "The guide article for the AI, De-Mystified series, introducing the series promise, article order, and how to read the articles."
readingTime: 6 min
agentArtifact: /agents/articles/ai-demystified.json
sourcePath: content/articles/2026/ai-demystified/article.md
---

<p class="article-kicker">Series guide</p>

AI keeps adding new words: agents, RAG, prompt caching, reasoning models, multi-agent systems. Each one is announced as if it were a breakthrough. Most of them are useful. A few are over-sold. Nearly all of them connect to older ideas you already know.

<span id="claim-001" class="claim-marker" data-claim="claim-001">Claim C1</span> AI terminology becomes more useful when each term is explained through plain language, older related ideas, practical examples, benefits, limits, and academic roots instead of being treated as a fresh breakthrough every time.

This series is a field guide to those terms. Each article covers one concept, keeps the language simple at the start, and only adds technical depth after the basic idea is clear.

<h2 id="who-this-is-for">Who this is for</h2>

The series is written for curious builders, students, creators, and knowledge workers who use AI tools but do not want to memorize jargon or buy into hype. If you have ever read a product announcement, nodded along, and then wondered what the term actually means, these articles are for you.

You do not need a computer-science background. Academic connections appear at the end of each article as optional depth, not required reading.

<h2 id="what-each-article-covers">What each article covers</h2>

Every article follows the same shape:

1. **Plain English Meaning** — what the term means in everyday words.
2. **Existing Concept It Resembles** — the older idea it builds on.
3. **What Is Actually New?** — what changed with large language models.
4. **How It Works In Practice** — concrete examples.
5. **Where It Helps** — real situations where the idea is useful.
6. **Where It Fails** — limits, risks, and common mistakes.
7. **Academic Connections** — formal fields and research the idea comes from.
8. **Practical Checklist** — questions to ask when you use or build with the idea.
9. **The De-Hype Check** — old name, what is new, what is exaggerated, who benefits from the hype.
10. **Open Questions** — what is still being figured out.

<span id="claim-002" class="claim-marker" data-claim="claim-002">Claim C2</span> A repeating article structure makes it easier for readers to learn one concept at a time and compare new terms with ideas they already know.

<h2 id="series-map">The articles in order</h2>

The series is designed to be read in order, but each article stands alone.

<ol class="series-toc">
  <li><a href="/articles/loops-vs-goals/"><strong>Loops vs Goals</strong></a>: The difference between repetition and direction in AI agents.</li>
  <li><a href="/articles/context-management/"><strong>Context Management</strong></a>: What the AI sees right now.</li>
  <li><a href="/articles/memory-vs-context/"><strong>Memory vs Context</strong></a>: What should survive the conversation.</li>
  <li><a href="/articles/prompt-engineering/"><strong>Prompt Engineering</strong></a>: Instruction design, not magic words.</li>
  <li><a href="/articles/prompt-caching/"><strong>Prompt Caching</strong></a>: Reusing stable context.</li>
  <li><a href="/articles/evaluations/"><strong>Evaluations</strong></a>: How we know an AI workflow improved.</li>
  <li><a href="/articles/agents/"><strong>Agents</strong></a>: Goal-directed AI systems that use tools.</li>
  <li><a href="/articles/planning-and-reflection/"><strong>Planning and Reflection</strong></a>: How AI breaks down and revises work.</li>
  <li><a href="/articles/retrieval-augmented-generation/"><strong>Retrieval-Augmented Generation</strong></a>: Looking things up before answering.</li>
  <li><a href="/articles/tool-use/"><strong>Tool Use</strong></a>: When the model calls something outside itself.</li>
  <li><a href="/articles/long-running-sessions/"><strong>Long-Running Sessions</strong></a>: Keeping AI work coherent over time.</li>
  <li><a href="/articles/multi-agent-systems/"><strong>Multi-Agent Systems</strong></a>: When more than one AI worker is involved.</li>
  <li><a href="/articles/fine-tuning/"><strong>Fine-Tuning</strong></a>: Teaching a model a narrower behavior.</li>
  <li><a href="/articles/reasoning-models/"><strong>Reasoning Models</strong></a>: Slower thinking, better checks?</li>
</ol>

<h2 id="how-to-use-this-series">How to use this series</h2>

If you are new to these ideas, start at the beginning. Each article builds on the vocabulary of the ones before it. If you already know one topic, skip to the article that interests you and follow the cross-links.

Use the articles in three ways:

- **To learn:** Read one article, then try the practical checklist on a real problem.
- **To explain:** Share a single article with someone who keeps hearing the buzzword but does not know what it means.
- **To evaluate:** Use the De-Hype Check questions when you read a product announcement or sales claim.

<h2 id="what-this-series-is-not">What this series is not</h2>

This is not a product comparison site. It does not tell you which model or framework is best. It is also not an academic survey; the research references are starting points, not exhaustive bibliographies.

<span id="claim-003" class="claim-marker" data-claim="claim-003">Claim C3</span> Keeping the series inside Aura Knowledge, focused on one concept at a time, protects it from becoming a broad encyclopedia, benchmark hub, or product marketing guide.

<h2 id="the-de-hype-check">The De-Hype Check</h2>

Because this is the guide, the De-Hype Check applies to the series itself:

- **Old name for this idea:** Concept literacy, reading a field, or building a mental model.
- **What is genuinely new:** Large language models have made many old AI ideas practical for non-specialists, so the vocabulary is suddenly everywhere.
- **What gets exaggerated:** "You must learn every new term or fall behind." In reality, a few core ideas explain most of what you see.
- **Who benefits from the hype:** Vendors, influencers, and anyone selling complexity. The series tries to do the opposite.

<h2 id="open-questions">Open Questions</h2>

- Which concepts deserve deeper companion articles?
- Should the series add case studies from real projects?
- How should the articles be updated as model capabilities change?
