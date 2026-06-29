---
schemaVersion: 1
id: article:planning-and-reflection
slug: planning-and-reflection
title: "Planning and Reflection: How AI Breaks Down and Revises Work"
dek: "Why AI agents write a plan before acting, and how they learn from their own mistakes."
date: 2026-06-29
updated: 2026-06-29
status: published
maturity: seed
topic: ai-agents
tags:
  - ai-agents
  - ai-literacy
  - planning
  - reflection
  - de-hype
summary: "A plain-language explanation of planning and reflection in AI agents, showing how systems break work into steps, check their own output, and revise before continuing."
readingTime: 7 min
agentArtifact: /agents/articles/planning-and-reflection.json
sourcePath: content/articles/2026/planning-and-reflection/article.md
---

<p class="article-kicker">AI, De-Mystified · Article 8</p>

Most AI assistants answer one prompt at a time. When a task is larger than a single answer, the system needs to know what to do first, next, and when something goes wrong. That is where planning and reflection come in.

<span id="claim-001" class="claim-marker" data-claim="claim-001">Claim C1</span> Planning breaks a goal into ordered steps before action; reflection checks results against the goal and decides whether to revise the plan.

<h2 id="plain-english-meaning">Plain English Meaning</h2>

**Planning** is answering "What should I do, and in what order?" before doing it. A plan could be a simple list or a branching set of options: if the first search fails, try the second query.

**Reflection** is answering "Did that work?" after doing something. It compares the result to the goal and decides whether to continue, back up, or change the plan.

Together they make an agent less like a calculator and more like a worker who writes a to-do list, does the first item, checks the result, and adjusts the rest.

<h2 id="existing-concept-it-resembles">Existing Concept It Resembles</h2>

Planning and reflection are not new. They appear in older fields and everyday life:

- **Project management** breaks work into tasks with dependencies and milestones, then reviews progress.
- **The scientific method** designs an experiment, runs it, examines the outcome, and revises the hypothesis.
- **Means-ends analysis** in classical AI chooses actions that reduce the distance to a goal.
- **After-action reviews** ask what happened and how to do better next time.

<span id="claim-002" class="claim-marker" data-claim="claim-002">Claim C2</span> Planning and reflection are rooted in project management, scientific method, and classical AI search, not only in recent language models.

<aside class="analogy-limit" data-claim="claim-002">
  <strong>Analogy limit:</strong> A human project plan can be revised based on judgment or new priorities. An AI plan is usually revised based on prompt text or tool output, which may miss why a step really failed.
</aside>

<h2 id="what-is-actually-new">What Is Actually New?</h2>

What changed is that a language model can write, read, and rewrite its own plan in natural language. Older planners often needed formal rules and handcrafted domain descriptions. A modern agent can be told to plan a trip, search for hotels, notice a conflict, and revise the itinerary.

Reflection has also changed. Instead of an external evaluator for every step, the model can critique its own draft and generate a revised version.

The flexibility is real, but so is the risk. A plan written in prose can look convincing without being correct, and a self-critique can be confidently wrong.

<h2 id="from-reflection-to-harnesses">From Reflection to Harnesses</h2>

A newer pattern goes beyond asking the model to critique its own output. It asks the model to design a *harness* — a structured routine of checks, tools, and guardrails — for a recurring weakness it notices in itself. The loop has three stages:

1. **Mine a weakness:** run the model on examples and collect failures.
2. **Propose a harness:** write a small test, tool call, or verification rule that would catch that failure.
3. **Validate the harness:** check that the proposed routine actually helps on held-out examples and does not hurt overall performance.

This turns reflection into a durable engineering artifact rather than a one-time self-critique. The harness can be reused across similar tasks, reviewed by humans, and improved when new failures appear.

<span id="claim-005" class="claim-marker" data-claim="claim-005">Claim C5</span> A self-harness pattern can turn one-off reflection into reusable verification routines that are proposed by the model and validated against held-out examples.

<aside class="analogy-limit" data-claim="claim-005">
  <strong>Analogy limit:</strong> A harness proposed by the model is still only as good as the validation behind it. If the test set shares the model's blind spots, the harness can look useful while reinforcing the same errors.
</aside>

<h2 id="how-it-works-in-practice">How It Works In Practice</h2>

Here are three common patterns.

**1. Plan-then-execute:**

```
generate plan → do step 1 → do step 2 → do step 3 → return result
```

The agent writes a plan up front and follows it.

**2. Plan-revise loop:**

```
plan → act → observe → reflect → revise plan → act again
```

The agent starts with a plan, takes one step, checks what happened, and updates the plan. Common in coding and research agents.

**3. Chain-of-thought reasoning:**

```
question → reason step by step → answer
```

Here the "plan" is reasoning produced alongside the answer. Reflection may appear as a final check: "Review the reasoning above and correct any mistakes before giving the final answer."

<span id="claim-003" class="claim-marker" data-claim="claim-003">Claim C3</span> In practice, AI planning and reflection appear as upfront plans, iterative plan-revise loops, and step-by-step reasoning with final verification.

<h2 id="where-it-helps">Where It Helps</h2>

Planning helps when a task is too large to fit in one shot. Breaking a report into outline, research, draft, and review makes each step manageable. A coding agent that runs tests after each edit catches bugs early.

Both also help humans collaborate. A visible plan gives a human something to approve or stop, and a reflection step creates a checkpoint.

<h2 id="where-it-fails">Where It Fails</h2>

**Planning without enough information:** The agent commits to a plan before discovering that a key assumption is wrong. It might outline a feature based on an API that does not exist.

**Reflection without external grounding:** The agent checks its own work using the same model that produced the work. It can confirm its own mistakes because the model's errors are often consistent across attempts.

**Over-planning:** The agent spends so long refining the plan that it never starts the work, or the plan becomes longer than the work itself.

**Reflection theater:** The agent produces a critique that sounds thorough but does not actually lead to a better result.

<span id="claim-004" class="claim-marker" data-claim="claim-004">Claim C4</span> Reflection in AI agents is most reliable when paired with external checks such as tests, retrieved sources, or human review; self-critique alone can confirm rather than catch errors.

<h2 id="academic-connections">Academic Connections</h2>

- **Task decomposition** studies how complex problems can be split into subtasks.
- **Metacognition** in psychology is thinking about one's own thinking; in agents, it maps to self-evaluation.
- **Self-refinement** refers to systems that generate output, critique it, and generate an improved version.
- **Search** in classical AI explores action sequences to reach a goal.

The practical challenge remains: make a plan, act, check the result, and decide what to do next.

<h2 id="practical-checklist">Practical Checklist</h2>

When you use or build a planning-and-reflection agent, ask:

- What is the plan before the first action? Is it visible?
- What does the agent observe after each step? Is it reliable?
- How does the agent decide whether to continue, revise, or stop?
- What external checks exist? Tests? Sources? Human review?
- What happens when the plan is wrong? Can it backtrack?
- Is reflection producing real improvements, or just plausible commentary?

<h2 id="the-de-hype-check">The De-Hype Check</h2>

- **Old name for this idea:** task planning, project plans, after-action reviews, means-ends analysis, self-critique.
- **What is genuinely new:** language models can generate, read, and revise plans in natural language without hand-coded domain rules.
- **What gets exaggerated:** "Agents can plan anything and fix their own mistakes." Plans are only as good as the information behind them, and self-reflection can amplify the same blind spots that caused the original error.
- **Who benefits from the hype:** Vendors selling fully autonomous agents and consultants promising hands-off automation. The truth is more modest: planning and reflection extend what models can do, but they still need clear goals, reliable observations, and human oversight.

<h2 id="open-questions">Open Questions</h2>

- When should an agent plan everything up front versus plan one step at a time?
- How can an agent recognize that its own reflection is unreliable?
- What is the cheapest way to add external grounding to a reflection step?
- How do we prevent planning from becoming a form of procrastination that delays real work?
- When should a human approve the plan versus approve the final result?
