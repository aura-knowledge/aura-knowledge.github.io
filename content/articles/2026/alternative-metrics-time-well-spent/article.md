---
schemaVersion: 1
id: article:alternative-metrics-time-well-spent
slug: alternative-metrics-time-well-spent
title: "Alternative Metrics: Time Well Spent, Sustainability, Learning, Civic Value"
dek: "What platforms optimize for is what they become. The metrics can be changed, but only if we agree on what to measure."
date: 2026-07-05
updated: 2026-07-05
status: published
maturity: seed
topic: attention-economy
tags:
  - attention-economy
  - india
  - digital-wellbeing
  - metrics
  - design
  - platform-governance
  - civic-tech
summary: "Surveys proposed alternatives to engagement-based metrics and their tradeoffs: time well spent, learning outcomes, civic value, and sustainability."
readingTime: 9 min
agentArtifact: /agents/articles/alternative-metrics-time-well-spent.json
sourcePath: content/articles/2026/alternative-metrics-time-well-spent/article.md
---


Every platform has a dashboard. Somewhere, a team watches numbers move: daily active users, watch time, scroll depth, retention, ad impressions. Those numbers are treated as truth, but they are choices. What gets measured gets made.

<span id="claim-001" class="claim-marker" data-claim="claim-001">Claim C1</span> Engagement metrics are not neutral; they encode a business model and a theory of user value. A feed that optimizes for minutes watched will design for minutes watched, even when those minutes come at the cost of sleep, learning, or calm. The metric is not just a ruler. It is the message.

<h2 id="the-metric-is-the-message">The Metric Is the Message</h2>

In the advertising-driven attention economy, the user is both customer and product. Platforms sell advertisers the ability to place messages in front of people who are paying attention. The longer and more frequently people pay attention, the more valuable the platform becomes. That is not a hidden conspiracy; it is the business model, and it is reflected in every metric that product teams chase.

The Center for Humane Technology and early critics like Tristan Harris have argued that this optimization logic shapes design at a deep level: autoplay, infinite scroll, variable rewards, and notification badges are not random features; they are instruments tuned to a single target. YouTube's responsibility research team has acknowledged that optimizing purely for watch time can surface content that keeps people watching but that they later regret. The metric of engagement assumes that more time equals more value. Often it does not.

This does not mean that all engagement is bad. A student who keeps returning to a math app because she is learning is engaged in a genuine sense. A farmer who returns to a weather advisory because it saves his crop is engaged. The problem is that the same word—engagement—is used to describe both deep learning and mindless scrolling. When platforms optimize for the measurable kind, they tend to favor the shallow kind because it scales.

<h2 id="what-counts-as-time-well-spent">What Counts as Time Well Spent?</h2>

If minutes watched is the wrong target, what is the right one? Several alternatives have been proposed, each with its own definition of user value.

<span id="claim-002" class="claim-marker" data-claim="claim-002">Claim C2</span> Proposed alternatives include time well spent, meaningful social interaction, learning outcomes, and civic participation. They are not perfect substitutes, but together they describe a healthier set of targets than raw attention capture.

```mermaid
radar-beta
    title "Engagement vs. alternative metrics: two design profiles"
    axis "Raw engagement" "Time well spent" "Learning" "Civic value" "Sustainability"
    curve "Ad-supported attention feed" [0.95, 0.30, 0.20, 0.15, 0.25]
    curve "Substance-first design" [0.40, 0.80, 0.85, 0.75, 0.80]
```

*A radar comparison of two idealized platform designs. The ad-supported attention feed maximizes raw engagement while scoring low on longer-term value; the substance-first design trades reach for learning, civic value, and sustainability. Values are illustrative, based on the design logics described in the Center for Humane Technology's work and Adam Mosseri's 2018 "Defining Time Well Spent" post.*

Adam Mosseri, then head of Instagram, wrote in 2018 that the company wanted to focus on "time well spent"—time that people feel good about after spending it. The idea is simple but hard to operationalize: instead of asking how long someone stayed, ask whether they would choose to stay again if they knew in advance what the session would cost them.

Meaningful social interaction is another candidate. Facebook's own researchers have used variants of this metric to distinguish passive scrolling from active connection. A message from a friend is different from a viral outrage clip, even if both generate clicks.

Learning outcomes shift the target from attention to growth. Did the user gain a skill, clarify a concept, or complete a meaningful task? Educational platforms and some professional networks already measure this, though imperfectly.

Civic participation asks whether digital attention translates into offline action: voting, volunteering, attending a meeting, helping a neighbor. This is the hardest to measure and the easiest to fake, but it matters because much of what India needs—from climate adaptation to public-health communication—requires citizens who act rather than scroll.

Sustainability, in this context, means the long-term health of the platform-user relationship. A product that burns out its users will eventually exhaust them. Metrics like churn, reported well-being, and trust may be slower to move than daily active users, but they are better predictors of whether a platform can last.

<h2 id="every-number-can-be-gamed">Every Number Can Be Gamed</h2>

Changing the metric does not automatically change the outcome. Any number that becomes a target becomes a target for gaming.

<span id="claim-003" class="claim-marker" data-claim="claim-003">Claim C3</span> Each alternative metric can be gamed and requires safeguards. Optimizing for "time well spent" can be gamed by content that feels satisfying in the moment but leaves the user worse off. Optimizing for learning outcomes can be gamed by short quizzes that check recall without building understanding. Optimizing for civic participation can be gamed by performative petitions and outrage campaigns.

Mozilla's research on YouTube Regrets showed how a recommendation system optimized for watch time can surface misleading, hateful, or disturbing content because extreme material holds attention. The same risk applies to any new metric: once it is announced, creators and advertisers will learn to produce whatever the metric rewards. The goal is not to find a perfect, ungameable number. It is to build a portfolio of metrics, visible audits, and human judgment that makes gaming harder and less profitable.

Safeguards include qualitative research, user reports, external audits, and sunset clauses that retire metrics that produce harmful side effects. They also include humility: no metric can fully capture human flourishing.

<h2 id="make-metrics-visible-and-debatable">Make Metrics Visible and Debatable</h2>

Before any of these alternatives can work, the public must be able to see what is being measured and argue about it.

<span id="claim-004" class="claim-marker" data-claim="claim-004">Claim C4</span> The first step is to make metrics visible and debatable rather than treating engagement as inevitable. When platforms disclose what their ranking systems reward, researchers, regulators, and users can ask whether those rewards align with public goals. The EU Digital Services Act moves in this direction by requiring large platforms to explain their recommender systems and to offer alternatives such as chronological feeds.

Visibility alone is not enough. Metrics must also be contestable. That means independent audits, academic access to data under appropriate safeguards, and civil-society pressure. It also means that product teams inside platforms must be allowed to raise questions without being overridden by a single north-star metric.

The shift is as much cultural as technical. For a generation, the default assumption has been that if something is popular, it must be good. In an attention economy, popularity is often purchased through design. The alternative is to ask, repeatedly: good for what, good for whom, and good for how long?

<h2 id="sources-and-method">Sources and Method</h2>

This article draws on public statements and research from platform companies (YouTube responsibility research, Adam Mosseri on time well spent), civil-society analysis (Center for Humane Technology, Mozilla Foundation's YouTube Regrets research), and regulatory frameworks (EU Digital Services Act). It is a conceptual survey rather than an empirical study; the goal is to map the landscape of alternative metrics and their known failure modes.

<h2 id="related-in-this-series">Related in This Series</h2>

- [Engagement Is a Design Choice](/articles/engagement-is-a-design-choice/) — why ranking metrics are not inevitable, and what alternative signals could do.
- [Designing for Substance](/articles/designing-for-substance/) — platform incentives and the attention economy: how design chooses what is easy.
- [Public Pressure and Internal Accountability](/articles/public-pressure-and-internal-accountability/) — how researchers, journalists, employees, and users can make platform incentives visible.
- [Attention, Substance, and the AI Moment](/articles/attention-substance-ai-moment/) — the full series guide and reading paths.
