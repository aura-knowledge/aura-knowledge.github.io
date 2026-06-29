---
schemaVersion: 1
id: article:agents
slug: agents
title: "Agents: Goal-Directed AI Systems That Use Tools"
dek: "Why a modern AI agent is more like a focused assistant with a to-do list than a chatbot with extra features."
date: 2026-06-29
updated: 2026-06-29
status: published
maturity: seed
topic: ai-agents
tags:
  - ai-agents
  - ai-literacy
  - agents
  - tools
  - de-hype
summary: "A plain-language guide to what AI agents are, how they combine goals, tools, loops, and memory, and where the current hype overstates their autonomy."
readingTime: 6 min
agentArtifact: /agents/articles/agents.json
sourcePath: content/articles/2026/agents/article.md
---

<p class="article-kicker">AI, De-Mystified · Article 7</p>

A chatbot answers one question at a time. An **agent** keeps working. Give it a goal, and it can plan steps, call tools, check progress, remember what it learned, and decide when to stop. That can be genuinely useful, but "agent" is also a heavily hyped label, so it helps to know what is actually inside the box.

<span id="claim-001" class="claim-marker" data-claim="claim-001">Claim C1</span> An AI agent is a system that pursues a goal across multiple steps, choosing when to use tools, what to remember, and when to stop.

<h2 id="plain-english-meaning">Plain English Meaning</h2>

In plain English, an AI agent is a program that accepts a task and acts on its own for a while. It runs a loop: understand the goal, decide what to do, use a tool if needed, observe the result, update what it knows, and repeat until the goal is met or a stopping rule fires.

Think of it like hiring a research assistant. You describe the question. The assistant searches journals, takes notes, notices gaps, asks for clarification, and delivers a report. The assistant decides the next step; you do not hand-write every query.

<aside class="analogy-limit" data-claim="claim-001">
  <strong>Analogy limit:</strong> A human assistant has common sense, stakes, and judgment about when to stop. An AI agent has none of those by default; it follows patterns and boundaries set by its builders.
</aside>

<h2 id="existing-concept-it-resembles">Existing Concept It Resembles</h2>

The agent idea is not new. Older systems also accepted goals and performed actions:

- **Personal assistants and chatbots** set reminders, answered questions, and triggered simple workflows.
- **Robotic process automation (RPA)** scripts followed step-by-step rules to fill forms or move files.
- **Game bots and simulation agents** sensed their environment, picked actions, and tried to win or survive.

<span id="claim-002" class="claim-marker" data-claim="claim-002">Claim C2</span> The idea of an agent that follows goals and uses tools is older than large language models; it appears in automation scripts, personal assistants, and game AI.

<aside class="analogy-limit" data-claim="claim-002">
  <strong>Analogy limit:</strong> RPA scripts follow fixed rules on predictable interfaces. A modern AI agent must interpret messy natural-language instructions, unstructured web pages, and changing context, which makes it more flexible and less predictable.
</aside>

<h2 id="what-is-actually-new">What Is Actually New?</h2>

What changed is the **glue**. In older agents, the glue was hard-coded logic. In modern AI agents, the glue is language. A large language model reads the goal, reasons about what to do next, selects a tool, parses the tool's output, and writes a short note to itself for the next step.

That flexibility is the real advance. The same agent can, in principle, look up a flight, edit a file, run a test, or summarize a paper depending on the goal. But flexibility is also a risk: it can misinterpret the goal, call the wrong tool, trust a bad result, or loop endlessly while sounding confident.

<h2 id="the-harness-idea">The Harness Idea</h2>

A useful shorthand is: **agent = model + harness**. The model supplies language understanding and reasoning. The harness supplies everything else: the tools the agent can call, the memory it can read and write, the permissions that bound its actions, the checkpoints that let humans pause or resume it, and the subagents it can delegate to.

LangChain's DeepAgents is one example of such a harness. It wraps a model with a virtual filesystem, sandboxed code execution, skills, memory, subagent spawning, and human-in-the-loop interrupts. The model is still the thinker; the harness turns that thinking into repeated, governed action.

<span id="claim-005" class="claim-marker" data-claim="claim-005">Claim C5</span> A modern AI agent can be understood as a model plus a harness that provides tools, memory, permissions, checkpoints, and human oversight.

<aside class="analogy-limit" data-claim="claim-005">
  <strong>Analogy limit:</strong> Calling the wrapper a "harness" is a design lens, not a universal standard. Different frameworks split responsibilities differently, and the boundaries between model, harness, and tool are not always sharp.
</aside>

<h2 id="how-it-works-in-practice">How It Works In Practice</h2>

Most practical agents share the same skeleton:

```
receive goal → plan → pick tool → execute → observe → update memory → check if done → repeat
```

A **travel agent** parses your request, searches flights, checks a calendar, asks for confirmation, and books. A **coding agent** reads an issue, explores code, proposes edits, runs tests, reads errors, and revises until tests pass or it hits a retry limit. A **research agent** queries sources, summarizes, spots gaps, and refines the query until coverage feels adequate.

<span id="claim-003" class="claim-marker" data-claim="claim-003">Claim C3</span> In practice, an agent's loop repeatedly decides which tool to use, what to remember, and whether the goal is satisfied.

<h2 id="where-it-helps">Where It Helps</h2>

Agents help when a task is too big, too external, or too repetitive for a single prompt: multi-step work such as drafting a feature or compiling a literature review; tasks that touch outside systems such as databases or APIs; and workflows that need a little judgment.

They turn a conversation into a guided workflow.

<h2 id="where-it-fails">Where It Fails</h2>

Agents fail in predictable ways, usually around autonomy and judgment:

- **Wrong tool choice.** It searches when it should ask you, or edits the wrong file.
- **Overconfidence in tool output.** It treats a broken API response as fact.
- **Memory drift.** It remembers irrelevant details or forgets important constraints halfway through.
- **Runaway cost.** Each loop costs tokens and time; a stuck agent can burn budget quickly.
- **Goal substitution.** If the goal is vague, the agent may quietly pursue an easier one.

<span id="claim-004" class="claim-marker" data-claim="claim-004">Claim C4</span> Agent behavior depends heavily on clear goals, reliable tools, and careful limits; without them, autonomy becomes cost and error.

<h2 id="academic-connections">Academic Connections</h2>

Several older fields feed into the modern agent discussion:

- **Autonomous agents** study systems that perceive an environment and act over time.
- **Planning** provides ways to break a goal into sub-goals, from classical planners to hierarchical task networks.
- **Tool use** includes function calling, affordances, and models that learn to call external APIs.
- **Human-in-the-loop systems** study when a person should supervise, correct, or override an autonomous process.

These fields give vocabulary and methods, but they also remind us that agency is a design choice, not magic.

<h2 id="practical-checklist">Practical Checklist</h2>

Before you trust or build an agent, ask:

- Can you state the goal in one sentence?
- Which tools can it call? Are they reliable?
- What is the stopping rule or exit condition?
- How does it track memory and context?
- What happens when a tool fails or returns garbage?
- Is there a human checkpoint for expensive or irreversible actions?
- How will you evaluate whether the result is correct?

If the goal and the limits are unclear, the agent is likely to wander.

<h2 id="the-de-hype-check">The De-Hype Check</h2>

- **Old name for this idea:** workflow automation, macros, bots, expert systems, virtual assistants.
- **What is genuinely new:** large language models act as a flexible controller that can interpret instructions, choose tools, and adapt to unstructured context.
- **What gets exaggerated:** claims that agents are "fully autonomous," "self-improving," or about to replace knowledge workers. Current agents are narrow, expensive, error-prone, and need oversight.
- **Who benefits from the hype:** vendors selling autonomous-agent platforms and enterprise suites. The truth is more modest: agents extend what models can do, but only when the goal, tools, and limits are well designed.

<h2 id="open-questions">Open Questions</h2>

- How much should an agent decide on its own, and when should it ask a human?
- What is the right balance between detailed memory and compact context?
- Can agents reliably explain their plans so users can audit them?
- How do we keep long agent runs affordable?
