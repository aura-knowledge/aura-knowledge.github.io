---
schemaVersion: 1
id: article:foundation-models
slug: foundation-models
title: Foundation Models and the Return of General-Purpose AI Systems
dek: How the transformer, scale, and post-training revived a decades-old ambition—and why broad capability is not the same as reliable understanding.
date: 2026-06-20
updated: 2026-06-20
status: published
maturity: seed
topic: long-human-road-to-ai
tags:
  - ai-history
  - computing-history
  - human-progress
  - education
  - transformers
  - scaling
  - pretraining
  - multimodality
summary: Foundation models revived the ambition of general-purpose AI. This article traces the transformer, pretraining, scaling, post-training, multimodality, and tool use—and why broad capability is not reliable understanding.
readingTime: 10 min
agentArtifact: /agents/articles/foundation-models.json
sourcePath: content/articles/2026/foundation-models/article.md
---

<p class="article-kicker">Part of <a href="/articles/long-human-road-to-ai/">The Long Human Road to AI</a>, Season 1.</p>

In the summer of 1956, a small group of researchers gathered at Dartmouth College with a sweeping bet: that every feature of intelligence could be so precisely described that a machine could be made to simulate it. Language, abstraction, problem solving, self-improvement—nothing was off the table. The bet did not pay off on schedule, and for most of the next sixty years AI advanced by narrowing its scope. Programs that mastered chess did not translate Japanese. Systems that recognized faces did not write essays. The broad ambition went dormant.

Then, in the early 2020s, a new kind of system began to feel different. One model could summarize a contract, draft an email, explain a poem, help debug code, and answer questions in dozens of languages. It was not reliable at all of those things, and it often made mistakes that a child would not, but its range was unmistakably broad. The old ambition had returned—not as a finished machine mind, but as a family of systems called foundation models.

<aside class="impact-callout" data-claim="claim-002">
  <strong>Impact:</strong> foundation models revived the dream of general-purpose AI, but broad behavior is not the same as understanding or trustworthy agency.
</aside>

<h2 id="what-a-foundation-model-is">What a foundation model is</h2>

The term sounds technical, but the idea is simple. A foundation model is a broadly trained model, usually trained with self-supervision at scale, that can be adapted to many downstream tasks.

<span id="claim-001" class="claim-marker" data-claim="claim-001">Claim C1</span> A foundation model is a broadly trained model, generally trained with self-supervision at scale, that can be adapted to many downstream tasks.

Think of it as a shared base material for many products. One large model is trained once on enormous amounts of text, images, audio, or code. Then smaller teams, sometimes with modest resources, adapt it through prompts, fine-tuning, or retrieval systems to do something specific. The same base can become a medical-question assistant, a coding companion, a translation tool, or an interactive tutor.

<aside class="analogy-limit" data-claim="claim-001">
  <strong>Analogy limit:</strong> a foundation model is like a shared base material for many products, but it is not neutral raw material. Its training data, objectives, filters, and deployment context shape downstream behavior.
</aside>

The phrase was introduced and examined in depth in a 2021 Stanford report, which also warned that this "homogenization" of AI capabilities carries concentrated risk: flaws in the base can propagate across many applications. That caution is part of the definition, not an afterthought.

<h2 id="the-old-dream-returns">The old dream returns in a new form</h2>

The 1955 Dartmouth proposal framed AI as a broad program involving language, abstraction, problem solving, and self-improvement. The language was optimistic, but the ambition was real: intelligence as a general competence, not a collection of narrow tricks.

<span id="claim-002" class="claim-marker" data-claim="claim-002">Claim C2</span> Foundation models revive general-purpose AI ambition by supporting many tasks from a shared base, but this should not be equated with humanlike understanding.

For decades, the field moved in the opposite direction. Expert systems succeeded when the rules were narrow. Machine-learning classifiers succeeded when the problem was well-defined. Progress came from tightening the scope, not expanding it. Foundation models reversed that pattern. They are not evidence that machines understand the world the way humans do, but they do show that a single trained base can be stretched across a surprising range of tasks.

<h2 id="the-transformer">The transformer made scale easier to use</h2>

No single paper caused the modern wave, but one architecture became impossible to ignore. In 2017, researchers introduced the Transformer, a design for sequence transduction that replaced recurrence and convolution with attention.

<span id="claim-003" class="claim-marker" data-claim="claim-003">Claim C3</span> The Transformer replaced recurrence and convolution with attention for sequence transduction and made training more parallelizable.

The practical effect was important. Earlier sequence models processed words one step at a time, which made training on large datasets slow and expensive. Attention allowed the model to relate different positions in a sequence directly, which meant the computation could be spread more efficiently across modern hardware. The Transformer became the practical base for later large language models.

But it is easy to overstate this. Architecture alone does not explain the modern AI wave. Data, compute, engineering practice, and product deployment all converged. The transformer was a door that many other developments pushed open.

<h2 id="pretraining">Pretraining turned unlabeled data into a reusable base</h2>

Before foundation models, the default was to train a separate model for each task. If you wanted a sentiment classifier, you collected labeled reviews and trained a classifier. If you wanted a translator, you collected parallel sentences and trained a translator. Each task needed its own dataset and its own architecture.

<span id="claim-004" class="claim-marker" data-claim="claim-004">Claim C4</span> Broad pretraining enabled models such as BERT and GPT-3 to be adapted or prompted across many tasks.

BERT, introduced in 2018, showed how deep bidirectional pretraining on unlabeled text could support many downstream language tasks with small task-specific additions. A year later, GPT-3 showed that scaling autoregressive language models could improve few-shot performance through text prompts: the model could attempt a new task after seeing only a handful of examples embedded in a prompt.

These are different model styles—bidirectional versus autoregressive—but both shifted the default from task-specific models toward reusable base models. Instead of building a new model from scratch, practitioners increasingly asked: how do I get a large pretrained model to do what I want?

<aside class="impact-callout" data-claim="claim-004">
  <strong>Impact:</strong> pretraining moved AI from a collection of bespoke tools toward a shared base that can be specialized after the fact.
</aside>

<h2 id="scaling">Scaling became a research program and an industrial strategy</h2>

Once pretrained bases became valuable, the relationship among model size, data, and compute became a central object of study. Empirical scaling laws mapped how loss improved as models, datasets, and training budgets grew.

<span id="claim-005" class="claim-marker" data-claim="claim-005">Claim C5</span> Scaling research made model size, data, and compute explicit variables, while later work emphasized compute-optimal allocation rather than model size alone.

The framing was powerful: scale could be treated as a method, a budgeting discipline, and an infrastructure requirement. But it was never a complete theory of intelligence. Later work, such as the Chinchilla study, argued that many models were undertrained for their size and that data scale must grow alongside model scale. More capacity does not automatically produce judgment, truth, or safety.

<aside class="analogy-limit" data-claim="claim-005">
  <strong>Analogy limit:</strong> scaling is like increasing the size of an engine and fuel supply, but more capacity does not guarantee judgment, truth, or safety.
</aside>

This is where the industrial story intersects with the scientific one. Training the largest models requires clusters of specialized processors, energy budgets measured in megawatts, and teams that span research, systems engineering, and data curation. Scale became both a research finding and a capability that only a few organizations could afford to push to the frontier.

<h2 id="post-training">Post-training made models more usable</h2>

A large pretrained model is a predictor of likely text. It is not, by default, a helpful assistant. Left to itself, it may continue a prompt rather than answer it, produce fluent nonsense, or echo biases in its training data.

<span id="claim-006" class="claim-marker" data-claim="claim-006">Claim C6</span> Instruction tuning and RLHF can improve usefulness and intent-following, but do not eliminate mistakes or alignment limits.

Instruction tuning and reinforcement learning from human feedback showed that model behavior could be steered after pretraining. Humans rate or rank outputs, and the model is adjusted to produce more useful, more cautious, or more honest-seeming responses. The result is often a better interactive experience, but post-training does not remove hallucinations, bias, or misuse risk. It changes the surface behavior of a system whose underlying limitations remain.

<h2 id="multimodality">Multimodality widened the idea of a foundation model</h2>

The first wave of large language models worked mostly with text. The next wave widened the interface. CLIP used natural-language supervision to learn visual models that could connect images and captions.

<span id="claim-007" class="claim-marker" data-claim="claim-007">Claim C7</span> Natural-language supervision and multimodal training widened foundation-model behavior beyond text-only tasks.

Later systems combined text and image inputs and outputs, and the category "foundation model" expanded to include models that reasoned across different kinds of data. This is genuinely useful. It is also easy to misread. Multimodality widens the range of tasks that can be attempted from a shared base; it is not proof that the system has human sensory grounding.

<h2 id="retrieval-tools-agents">Retrieval, tools, and agents move work outside the model</h2>

One of the most important developments of the 2020s was the realization that a model's knowledge does not have to live entirely inside its parameters. Retrieval-augmented generation combined a language model with an external memory store, so the model could ground its output in retrieved documents rather than only in what it had memorized during training.

<span id="claim-008" class="claim-marker" data-claim="claim-008">Claim C8</span> Retrieval, tool use, and reasoning/action loops can extend model behavior by connecting models to external sources, APIs, and environments.

Researchers also explored tool use, in which a model learns to call APIs, run code, or search the web, and ReAct-style systems that interleaved reasoning traces with actions. These designs make systems more capable by moving parts of the task into external systems with state and memory.

<aside class="analogy-limit" data-claim="claim-008">
  <strong>Analogy limit:</strong> tool use is like giving a worker instruments, but the model is not a worker with stable goals or accountability.
</aside>

"Agent" is used here operationally: a system that uses model outputs plus tools, state, and action selection over time. It does not imply autonomy, personhood, or reliable intent.

<aside class="impact-callout" data-claim="claim-008">
  <strong>Impact:</strong> the most capable systems of this era are usually model-plus-scaffolding, not a single model acting alone.
</aside>

<h2 id="evaluation-governance">Evaluation and governance lag the surface impression</h2>

Foundation models can feel uncanny. They write plausible prose, answer obscure questions, and sometimes seem to reason. That surface impression makes it easy to forget how uneven their reliability is. Benchmarks can be gamed by training on their test sets. Accuracy alone hides tradeoffs in calibration, robustness, fairness, bias, toxicity, and efficiency.

<span id="claim-009" class="claim-marker" data-claim="claim-009">Claim C9</span> Language-model evaluation needs multi-metric transparency because accuracy alone hides tradeoffs in calibration, robustness, fairness, bias, toxicity, and efficiency.

The HELM evaluation framework argued for exactly this kind of holistic transparency. It is a useful antidote to single-number leaderboard culture.

As of 2026-06-19, the 2026 AI Index reports rapid changes in AI capabilities, adoption, incidents, and responsible-AI measurement gaps. Those trends are useful context, not evergreen facts.

<span id="claim-010" class="claim-marker" data-claim="claim-010">Claim C10</span> As of 2026-06-19, the 2026 AI Index reports rapid changes in AI capabilities, adoption, incidents, and responsible-AI measurement gaps.

Governance is also moving quickly. As of 2026-06-19, NIST AI 600-1 is the generative AI profile used here for lifecycle risk-management framing.

<span id="claim-011" class="claim-marker" data-claim="claim-011">Claim C11</span> As of 2026-06-19, NIST AI 600-1 is the generative AI profile used here for lifecycle risk-management framing.

And as of 2026-06-19, European Commission pages state that EU general-purpose AI model rules became effective in August 2025 and that the Code of Practice supports compliance.

<span id="claim-012" class="claim-marker" data-claim="claim-012">Claim C12</span> As of 2026-06-19, European Commission pages state that EU general-purpose AI model rules became effective in August 2025 and that the Code of Practice supports compliance.

<aside class="impact-callout" data-claim="claim-012">
  <strong>Impact:</strong> regulation is shifting from general AI ethics language toward lifecycle risk management and general-purpose AI obligations, but specific rules should be rechecked before publication after 2026-12-31.
</aside>

<h2 id="the-human-road-ahead">The human road ahead</h2>

Foundation models are a genuine turning point in the long history of AI. They brought back the ambition of general-purpose systems after decades of narrow success. They made it practical to adapt one trained base to many tasks. They created new interfaces for language, images, code, and tools.

But they also introduced a new kind of overclaim. Broad capability is not understanding. Few-shot prompting is not teaching. Tool use is not agency. Scaling is not a theory of intelligence. The systems are powerful, unreliable, and deeply shaped by the data, objectives, and institutions that produced them.

That combination—capability without reliable understanding, generality without accountability—is why the next part of the road leads through labor, institutions, governance, and meaning. The technology is only half the story. The other half is what humans choose to do with it.
