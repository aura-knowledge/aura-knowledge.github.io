---
schemaVersion: 1
id: article:formal-logic-to-computation
slug: formal-logic-to-computation
title: "From Formal Logic to Computation: The Mathematical Road to AI"
dek: "How symbols, rules, circuits, and information theory turned reasoning into something machines could represent — without making AI inevitable."
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
  - logic
  - turing
  - computation
  - information-theory
summary: "A readable walk from Boole and Frege through computability, switching circuits, information theory, and cybernetics, showing how formal ideas made later computing and AI legible."
readingTime: 11 min
agentArtifact: /agents/articles/formal-logic-to-computation.json
sourcePath: content/articles/2026/formal-logic-to-computation/article.md
---

<p class="article-kicker">The Long Human Road to AI, article 3 of 8</p>

Before a machine could follow a rule, humans had to make rule-following into something you could write down, check, and hand to someone else. That transformation — from reasoning that lived in minds and speech to reasoning on paper, then in circuits — is the thread of this article.

It is not a straight line, and it does not end with an inevitable artificial intelligence. It is a set of bridges. Symbolic notation made reasoning inspectable. Computability made procedure precise. Switching circuits made logic physical. Information theory made signals measurable. Feedback and control gave researchers a language for purposeful machine behavior. Each bridge made later ideas easier to think about; none of them, alone, built the computers or AI systems we know today.

<aside class="impact-callout" data-claim="claim-001">
  <strong>Impact:</strong> Formal symbols turned private reasoning into a public object that could be copied, taught, and eventually engineered.
</aside>

<h2 id="the-problem">The problem: reasoning is hard to share</h2>

Reasoning is fragile when it stays in memory or conversation. A good argument can be forgotten, misquoted, or bent by the teller. One remedy is to write it down as a set of public steps, like a recipe.

<span id="claim-001" class="claim-marker" data-claim="claim-001">Claim C1</span> Algebraic and symbolic treatments of logic helped make reasoning inspectable and manipulable as formal symbol systems.

A recipe turns a cook’s private sequence into steps anyone can follow. Formal notation does something similar for parts of reasoning: it exposes the moves so they can be checked, copied, and taught. In <a href="https://archive.org/details/investigationofl01bool"><em>An Investigation of the Laws of Thought</em></a> (1854), George Boole showed that some logical relations could be treated algebraically. Decades later, Gottlob Frege’s 1879 <em>Begriffsschrift</em> pushed symbolic logic toward modern quantificational logic, though the story of modern logic also includes work by Boole, De Morgan, Schröder, Peirce, Venn, and others.

<p class="analogy-limit">
  <strong>Where the recipe analogy breaks:</strong> A recipe tolerates judgment and variation; a formal system has strict syntax and inference rules, and not every human judgment can be reduced to a formal recipe.
</p>

<h2 id="logic-becomes-algebra">Logic becomes algebra and notation</h2>

Boole did not invent the computer, and Frege did not invent AI. Their narrower and more defensible contribution was to make parts of reasoning more formal, inspectable, and manipulable. Alfred North Whitehead and Bertrand Russell’s <a href="https://archive.org/details/cu31924001575244"><em>Principia Mathematica</em></a> (1910) then became a landmark of the logicist ambition: the idea that mathematics could be built from explicit logical foundations.

This was not the only tradition, and it was not free of limits. But it created a shared language in which rules, propositions, and inferences could be written as symbol manipulations. That language would later help engineers and computer scientists describe what a machine should do.

<h2 id="the-dream-of-complete-method">The dream of a complete formal method</h2>

By the early twentieth century, mathematicians such as David Hilbert wanted to put mathematics on firm formal foundations. Hilbert’s 1900 address on mathematical problems, and the later <em>Entscheidungsproblem</em>, asked whether there could be a general decision method for logical validity.

<span id="claim-003" class="claim-marker" data-claim="claim-003">Claim C3</span> The formalist ambition around mathematical foundations and decision procedures created the problem setting in which computability could be made precise.

The dream mattered even when it failed. It focused attention on what a “method” actually is. Once you ask that question precisely, you can also ask which problems have methods and which do not. Hilbert’s 1900 problems are not identical to the later <em>Entscheidungsproblem</em>; the gap between them is part of the real history, not a single compressed slogan.

<h2 id="limits-become-discoverable">Limits become discoverable</h2>

In 1931, Kurt Gödel published incompleteness results showing that any consistent, effectively axiomatized formal system strong enough for elementary arithmetic has statements it cannot prove or disprove. That is a boundary, not a failure of logic.

<span id="claim-004" class="claim-marker" data-claim="claim-004">Claim C4</span> Gödel’s incompleteness theorems showed that consistent formal systems strong enough for arithmetic have intrinsic limits, complicating the dream of complete formal foundations.

A rulebook can make a game playable and fair, but it may not answer every meaningful question about the game from inside itself. Gödel’s theorems are precise mathematical results about formal systems containing arithmetic, not a vague claim that “logic cannot know everything” or that machines are impossible.

<p class="analogy-limit">
  <strong>Where the rulebook analogy breaks:</strong> Gödel’s theorems are precise mathematical results, not a general claim that every set of rules is incomplete.
</p>

<h2 id="a-method-a-machine-could-imitate">A method a machine could imitate</h2>

Once “method” became a precise question, several mathematicians answered it at nearly the same time. In 1936 and 1937, Alonzo Church, Alan Turing, and Emil Post gave different but converging formalizations of effective procedure or symbolic process.

Turing imagined an idealized machine that reads and writes symbols on a tape according to fixed rules. Church approached the same territory through functions and substitution in the lambda calculus. Post offered an independent formulation of symbol manipulation. The word “computer” still referred, in part, to human beings carrying out calculations; these models abstracted what it means to follow a rule with symbols, memory, and finite steps.

<span id="claim-005" class="claim-marker" data-claim="claim-005">Claim C5</span> Church, Turing, and Post offered different formalizations of effective procedure, helping turn computation into a mathematical subject before modern computers were common.

<span id="claim-006" class="claim-marker" data-claim="claim-006">Claim C6</span> The Church-Turing thesis concerns effective methods and is often misunderstood when treated as a claim about all physical machines or minds.

The convergence became known as the Church-Turing thesis: anything that can be computed by an effective method can be computed by a Turing machine. The thesis is about effective methods, not about every physical process or every mental capacity.

<aside class="impact-callout" data-claim="claim-005">
  <strong>Impact:</strong> Computability made procedure into an object you could study mathematically before you could buy a computer in a store.
</aside>

<table>
  <caption>Three roads to the same idea</caption>
  <thead>
    <tr><th>Model</th><th>Core metaphor</th><th>What it helps explain</th><th>Reader caveat</th></tr>
  </thead>
  <tbody>
    <tr><td>Church / lambda calculus</td><td>Functions and substitution</td><td>Computation without hardware</td><td>It is not a machine story.</td></tr>
    <tr><td>Turing machine</td><td>A reader/writer over symbols</td><td>Mechanical rule-following</td><td>It is an idealized model.</td></tr>
    <tr><td>Post formulation</td><td>Symbol processes</td><td>Independent convergence</td><td>Keep details light in main prose.</td></tr>
  </tbody>
</table>

<p class="analogy-limit">
  <strong>Where the dance-card analogy breaks:</strong> A dance card specifies steps independent of a dancer, but real computers have time, memory, faults, power use, and engineering constraints that computability models set aside.
</p>

<h2 id="switches-implement-logic">Switches implement logic</h2>

Formal logic stayed on paper until someone showed how to build it. In 1938, Claude Shannon published <a href="https://doi.org/10.1109/T-AIEE.1938.5057767">“A Symbolic Analysis of Relay and Switching Circuits,”</a> applying Boolean algebra to the design of relay and switching circuits. The bridge was direct: an on/off switch could represent a yes/no value, and networks of switches could express more complicated logical conditions.

<span id="claim-007" class="claim-marker" data-claim="claim-007">Claim C7</span> Shannon’s switching-circuit work connected Boolean algebra to relay and switching circuit design, helping make logic part of digital engineering.

This did not mean circuits “thought.” It meant that parts of logical structure could be implemented with physical switching systems. A light switch is a physical yes/no; a network of switches is a physical network of yes/no conditions. Logic gates implement operations; they do not understand propositions.

<p class="analogy-limit">
  <strong>Where the switch-network analogy breaks:</strong> Switches do not have beliefs or reasons; they are engineered electrical behavior that can implement formal operations.
</p>

<h2 id="messages-noise-and-feedback">Messages, noise, and feedback</h2>

Computation is not only symbol manipulation; it is also transmission, storage, compression, and recovery. In 1948, Shannon published <a href="https://doi.org/10.1002/j.1538-7305.1948.tb01338.x">“A Mathematical Theory of Communication,”</a> giving a mathematical treatment of messages, channels, noise, and information. The same year, Norbert Wiener published <em>Cybernetics: Or Control and Communication in the Animal and the Machine</em>, offering a vocabulary of feedback, control, and communication.

<span id="claim-008" class="claim-marker" data-claim="claim-008">Claim C8</span> Shannon’s communication theory provided a mathematical treatment of messages, channels, noise, and information, but it is not a theory of semantic meaning.

<span id="claim-009" class="claim-marker" data-claim="claim-009">Claim C9</span> Cybernetics supplied a language of feedback, control, and communication for thinking about machines and organisms, but feedback alone is not intelligence.

A message sent across a noisy room needs redundancy or correction; so does a signal sent through a channel. A thermostat compares sensed temperature to a target and acts to reduce the difference. Shannon information measures uncertainty and communication capacity, not whether a sentence is wise, true, or meaningful. Feedback control is a pattern of regulation, not intelligence by itself.

<aside class="impact-callout" data-claim="claim-008">
  <strong>Impact:</strong> Information theory and feedback control gave researchers measurable ways to talk about signals and adjustment without treating machine behavior as magic.
</aside>

<p class="analogy-limit">
  <strong>Where the noisy-room analogy breaks:</strong> Shannon information measures uncertainty and capacity, not whether a sentence is meaningful, true, or important to a person.
</p>

<p class="analogy-limit">
  <strong>Where the thermostat analogy breaks:</strong> Feedback control is not intelligence by itself; it is one pattern of regulation that can appear inside larger intelligent or automated systems.
</p>

<h2 id="what-this-made-possible">What this made possible, not inevitable</h2>

By the middle of the twentieth century, several ideas that once seemed separate had become linkable: formal symbols, effective procedures, switching circuits, information measures, and feedback loops. That linkage made computing and AI more legible. It did not make them inevitable.

The stored-program architecture described in John von Neumann’s 1945 <a href="https://web.mit.edu/STS.035/www/PDFs/edvac.pdf">“First Draft of a Report on the EDVAC”</a> shows how formal instructions could be treated as reusable machine data, but the idea has contested attribution and is only a small part of this story.

What still mattered: hardware engineering, programming practice, institutions, funding, labor, data, and culture. The bridges in this article made AI thinkable; the human road to AI also ran through workshops, laboratories, governments, universities, markets, and countless ordinary decisions. The next article, <a href="/articles/birth-of-ai/">“The Birth of AI,”</a> picks up that road at the 1956 Dartmouth workshop and the first wave of symbolic AI optimism. The previous article, <a href="/articles/before-machines/">“Before Machines,”</a> looks at the longer prehistory of calculation, automata, and mechanical reasoning.

<aside class="series-context">
  <strong>Series context:</strong> This article is part of <a href="/articles/long-human-road-to-ai/">“The Long Human Road to AI.”</a> You can read the whole series as a sequence, or stop at any article that matches your curiosity.
</aside>

<h2 id="technical-companion">Technical companion</h2>

<table>
  <caption>Concepts in plain language</caption>
  <thead>
    <tr><th>Concept</th><th>Reader version</th><th>Technical note</th></tr>
  </thead>
  <tbody>
    <tr><td>Formal system</td><td>A rulebook for symbol manipulation</td><td>Explicit alphabet, grammar, axioms, and inference rules.</td></tr>
    <tr><td>Boolean algebra</td><td>Yes/no rules combined like arithmetic</td><td>Algebra over truth values with operations such as AND, OR, NOT.</td></tr>
    <tr><td>Predicate / quantificational logic</td><td>Logic that talks about “all” or “some”</td><td>Extends propositional logic with quantifiers, relations, and functions.</td></tr>
    <tr><td>Entscheidungsproblem</td><td>The decision problem: can a single method answer every valid logical formula?</td><td>Later answered negatively by Church and Turing.</td></tr>
    <tr><td>Effective procedure</td><td>A method that can be followed mechanically</td><td>Finiteness, determinacy, and executability by an unskilled agent.</td></tr>
    <tr><td>Turing machine</td><td>An idealized rule-follower</td><td>Tape, symbols, states, and transition rules.</td></tr>
    <tr><td>Lambda calculus</td><td>Functions applied to inputs</td><td>Formal function abstraction and application.</td></tr>
    <tr><td>Undecidability</td><td>Some well-defined problems have no general method</td><td>Proved for the Entscheidungsproblem via computability theory.</td></tr>
    <tr><td>Information theory</td><td>A way to measure messages and noise</td><td>Entropy, channel capacity, coding; not semantic meaning.</td></tr>
    <tr><td>Feedback loop</td><td>Act on the sensed difference from a target</td><td>Control loop with sensor, comparator, actuator, and environment.</td></tr>
  </tbody>
</table>

<h3 id="same-word-different-meaning">Same word, different meaning</h3>

<ul>
  <li><strong>Computation</strong> once meant human calculation; now it can mean anything from a Turing-machine model to a spreadsheet formula to a neural-network update.</li>
  <li><strong>Information</strong> in Shannon’s sense measures uncertainty reduction, not understanding or truth.</li>
  <li><strong>Mechanical</strong> can mean “made of gears,” “following fixed rules,” or “without understanding,” depending on the context.</li>
  <li><strong>Intelligence</strong> in AI is a contested, moving target; this article does not assume a single definition.</li>
</ul>
