---
schemaVersion: 1
id: article:agentic-commerce-product-truth
slug: agentic-commerce-product-truth
title: Agentic Commerce and the Product Truth Layer
dek: As AI agents begin shopping for people, commerce may shift from capturing human attention to earning delegated, evidence-aware product assurance.
date: 2026-06-18
updated: 2026-06-18
status: review
maturity: seed
topic: agentic-commerce
tags:
  - ai-agents
  - commerce
  - product-truth
  - open-protocols
  - consumer-behavior
summary: A seed thesis on how AI shopping agents could weaken passive brand loyalty, increase product exploration, and create demand for privacy-preserving, adversarially tested product assurance infrastructure.
readingTime: 17 min
agentArtifact: /agents/articles/agentic-commerce-product-truth.json
sourcePath: content/articles/2026/agentic-commerce-product-truth/article.md
---

<p class="article-kicker">Seed thesis on agentic commerce, retail behavior, and incumbent-adjacent product design.</p>

Most commerce interfaces still assume that the buyer is a human looking at a screen.

That assumption shaped the modern stack: packaging, product photography, influencer ads, star ratings, marketplace ranking, search ads, review summaries, coupons, urgency, recommendation feeds, and brand memory. These systems are not only about product quality. They are also about getting through the narrow gate of human attention.

<span id="claim-001" class="claim-marker" data-claim="claim-001">Claim C1</span> Modern online commerce is still largely organized around human attention, even when AI is used behind the scenes for targeting, ranking, and recommendation.

That creates a familiar distortion. A product can win because it is easier to notice, easier to trust, or easier to keep buying, not because it is the best fit. A customer may keep buying the same shower gel because the old one is fine, not because it is the best available option. Exploring the category is annoying. Packaging is noisy. Ingredient claims are hard to compare. Reviews are uneven. Switching carries small risk. So the customer repeats the known choice.

This is not laziness in a moral sense. It is a rational response to evaluation cost.

<h2 id="brand-loyalty-friction">Brand loyalty as exploration friction</h2>

A concrete example makes the point sharper. A buyer may routinely purchase a familiar shower gel because the job is simple: clean the body, smell acceptable, avoid irritation, stay within budget. Then they try another household's shower gel and discover a product with a better scent profile or skin feel. The better product was already on the market. The customer was not opposed to improvement. They simply lacked a low-friction path to discover it.

<span id="claim-002" class="claim-marker" data-claim="claim-002">Claim C2</span> Some brand loyalty is actually status quo bias plus choice overload: the customer sticks with a known product because the market has made exploration expensive.

This matters for innovation. If customers repeat old choices, brands receive a false signal: do not change too much, because habit is working. But the user's loyalty may be thin. It may be preference by default rather than preference by inspection.

AI agents can change this because they do not experience product exploration the way humans do. An agent can monitor a category, compare ingredients, normalize price per unit, read complaint patterns, track recalls, parse return policies, and remember personal preferences without making the human browse twenty product cards.

<aside class="impact-callout" data-claim="claim-002">
  <strong>Impact:</strong> the agent does not have to replace human taste. It can reduce the cost of discovering where taste has changed or where the market has improved.
</aside>

<h2 id="delegated-intent">From browsing to delegated intent</h2>

The old flow is:

```text
Human sees signal -> human browses -> human compares manually -> human buys or repeats old brand
```

The agentic flow is:

```text
Human states preference -> agent explores category -> agent compares evidence -> human approves a meaningful switch
```

<span id="claim-003" class="claim-marker" data-claim="claim-003">Claim C3</span> One plausible next commerce shift is from the attention economy to delegated-intent commerce: agents will increasingly translate user preferences into product discovery and purchase decisions.

This shift has already started. Adobe reported that traffic from AI sources to U.S. retail sites grew 393% year over year in the first three months of 2026, and that AI traffic converted 42% better than non-AI traffic in March 2026. A 2025 Adobe report also found that consumers used generative AI for research, recommendations, deals, gift ideas, unique products, and shopping lists. Google is publishing Universal Commerce Protocol for agentic actions and AP2 for agent-authorized payments. OpenAI is building shopping discovery and Instant Checkout around merchant participation. Amazon's Rufus was trained on product catalog, reviews, community Q&A, and web data to answer shopping questions.

The first wave is "AI helps humans shop." The deeper wave is "products become legible to buyer agents."

That distinction matters. A marketplace-owned assistant can help, but it is still shaped by the marketplace's incentives. A buyer-owned or buyer-aligned agent can ask a more direct question:

```text
Given this user's constraints, preferences, history, and risk tolerance, what product should they try next?
```

<h2 id="the-product-truth-layer">The product truth layer</h2>

If agents become serious shopping delegates, product pages need more than persuasive copy. They need product truth in a form agents can inspect.

For shower gel, that could include:

- actual ingredient list and concentration ranges where legally possible
- fragrance profile and expected persistence
- skin sensitivity warnings
- certifications and what they actually certify
- price per use, not only price per bottle
- packaging reliability and leakage complaints
- return/refund experience
- verified post-purchase sentiment by user type
- comparable alternatives and known tradeoffs

<span id="claim-004" class="claim-marker" data-claim="claim-004">Claim C4</span> Agentic commerce requires a product-truth layer richer than current product structured data, because agents need evidence, constraints, provenance, and user-fit signals rather than only titles, offers, ratings, and images.

Current structured data, merchant feeds, and product identity standards are a beginning, not the destination. They help machines identify a product, price, offer, rating, barcode, or product identity. But they do not fully answer why this product fits this buyer better than another product, which claims are independently supported, or which feedback came from users with similar needs.

The useful object is not just a product listing. It is a structured product evidence packet.

<h2 id="product-assurance">From product truth to product assurance</h2>

"Product truth" is useful shorthand, but it can also overstate the ambition. The system should not become a central oracle that declares which product is true, good, or best. A more precise framing is product assurance for agents: evidence interoperability for signed, scoped, contestable product claims.

The atomic unit is not a review, product page, or star rating. It is a scoped claim:

```text
Issuer X asserts claim Y about product identity Z
under scope S, supported by evidence E,
valid during time window T, challengeable through process C.
```

<span id="claim-014" class="claim-marker" data-claim="claim-014">Claim C14</span> Agentic product assurance should be built around signed, scoped, contestable claims about specific product identities, not aggregate reviews or universal truth labels.

That means a claim about a body wash should specify whether it applies to a GTIN, SKU, formula version, batch, package size, region, or time window. A claim about a USB cable may need model, connector, wattage, certification, and manufacturing revision. A claim about a cleaning concentrate may need dilution ratio, surface compatibility, safety data sheet, certification, and jurisdiction.

A buyer agent does not need perfect truth. It needs auditable reliance: what did it trust, what did it ignore, what was contested, what was fresh, what had liability behind it, and what uncertainty remained?

<h2 id="open-not-owned">Open, not owned</h2>

The product-truth layer should not be owned by one platform.

If a single marketplace, search engine, or assistant defines the ranking logic, the system will recreate the old problem in a new form. Sellers will optimize for that gatekeeper. Agencies will sell "agent optimization." Fake structured data will spread. Paid placement will try to disguise itself as objective advice.

<span id="claim-005" class="claim-marker" data-claim="claim-005">Claim C5</span> The healthiest version of agentic commerce is an open product-truth commons: a contestable, forkable, provenance-rich vocabulary for product claims, evidence, reviews, and buyer-agent preferences.

Open does not mean naive. A seller can claim. A buyer can report. A lab can test. A marketplace can observe returns. A brand can publish certifications. A buyer agent can explain which sources it trusted and why. Multiple systems can implement the vocabulary, and the market can compare their trust models.

The point is not to remove judgment. The point is to make judgment inspectable.

Buyer-aligned comparison also needs privacy discipline. A useful agent may know skin sensitivity, budget constraints, dietary rules, health context, household composition, or purchasing anxiety. That preference memory should not become a portable ad profile. The product-truth layer should support data minimization, selective disclosure, and buyer-side control so agents can match preferences without exposing more than a transaction requires.

<aside class="impact-callout" data-claim="claim-005">
  <strong>Risk:</strong> if product truth becomes closed ranking infrastructure, agentic commerce may become SEO with more expensive words.
</aside>

<h2 id="experience-packets">From reviews to experience packets</h2>

The review system also changes.

Free-form reviews are useful but noisy. Some are fake. Some are emotional. Some are honest but unhelpful. Some users never leave reviews at all. A four-star rating rarely says whether the product worked for someone like you. The FTC's 2024 rule on consumer reviews and testimonials is a regulatory signal that review integrity is already a marketplace problem, especially when AI-generated or otherwise false reviews can distort trust.

Agents make a different review object possible:

```text
Product: shower gel
Buyer context: sensitive skin, prefers fresh fragrance, budget conscious
Outcome: cleaned well, fragrance lasted 4 hours, no irritation, cap leaked once
Would reorder: yes
Agent summary: likely fit for users who want fragrance without dryness
Human consent: explicit post-purchase confirmation
```

<span id="claim-006" class="claim-marker" data-claim="claim-006">Claim C6</span> Post-purchase feedback can evolve from star ratings into structured experience packets that preserve human judgment while making outcomes legible to agents.

This should still require human permission. An agent can draft or structure the feedback, but it should not invent satisfaction. The user owns the experience. The agent only reduces the burden of recording it.

For sellers, this is valuable too. They get better product feedback. Instead of "bad smell," they may learn: "users who prefer mild fragrance found the scent too synthetic after two hours." That is a product signal, not just a reputation score.

<h2 id="private-review-entitlements">Private review entitlements</h2>

The next constraint is privacy. A review system should not require a public link between a person, a receipt, a payment method, a store, an account, or an exact basket. The public object should not say who bought what. It should only prove that one valid purchase or use entitlement exists, that it applies to the relevant product scope, and that it has not already been redeemed for feedback.

One possible flow is:

```text
Purchase or use event -> signed private credential -> on-device check -> delayed use window -> unlinkable one-time feedback token -> structured experience packet
```

<span id="claim-012" class="claim-marker" data-claim="claim-012">Claim C12</span> Private review entitlements should separate purchase or use verification from public identity: the public system should verify an unlinkable, one-time entitlement token rather than linking a review to a user, receipt, store, or account.

The issuer might be a marketplace, point-of-sale provider, payment network, receipt wallet, package QR system, warranty registry, loyalty program, or local merchant. The token can disclose only the minimum useful scope: product category, SKU, formula version, batch, purchase window, or use window where that detail is necessary. A low-risk shower gel review may not need the same disclosure as a medical device, supplement, or enterprise software purchase.

This is where Privacy Pass, verifiable credentials, and selective-disclosure signature work matter as design references. The core pattern is to prove eligibility without turning the buyer into a trackable public identity. A buyer agent can hold the credential locally, wait until the product has plausibly been used, draft a structured experience packet on device, ask for human confirmation, and redeem a one-time token only if the user agrees.

This also reduces friction. The human should not have to manage cryptographic artifacts. The normal experience can be: buy product, use product, answer one short prompt later, approve or decline the agent's structured feedback. The producer gets better signal without asking the user to expose private purchase history.

<h2 id="claim-ledgers">From reviews to claim ledgers</h2>

The harder problem is that structured feedback can also be faked. AI makes fake detail cheap. A review farm can generate plausible buyer contexts, usage windows, fragrance notes, and reorder intent. A competitor can generate detailed negative reviews. A seller can subsidize purchase-backed reviews. A marketplace can privilege signals that support its own economics.

So the product-truth layer should not treat reviews as the core truth object. It should treat them as one input in a claim ledger.

```text
Claim: fragrance persists for 4-6 hours
Claimant: seller
Scope: SKU, formula version, batch where available
Evidence: verified-use reports, return patterns, complaint data, lab test if available
Counter-evidence: short-duration complaints, high return rate, weak-repeat-purchase signal
Risk: seller benefits from exaggeration
Status: weak / supported / contested / expired
```

<span id="claim-009" class="claim-marker" data-claim="claim-009">Claim C9</span> Agentic product trust should shift from review aggregation to adversarial claim ledgers: each product claim should carry source, scope, evidence, counter-evidence, incentive, expiry, and dispute state.

This is closer to truth-discovery research than to star ratings. Truth-discovery work starts from the observation that sources conflict and that source reliability and claim plausibility need to be estimated together. EigenTrust points to a related lesson from peer-to-peer networks: the system has to reason about adversarial actors, not only bad content. Bayesian Truth Serum and peer-prediction research matter for subjective experiences because not every claim has an external lab test; some product outcomes are private signals that need incentive-aware elicitation.

The agentic version is not one recommender. It is a set of agents cross-examining one another:

- a claim-extraction agent turns descriptions, reviews, labels, videos, and complaints into atomic claims
- a provenance agent checks who made the claim and whether it is signed or receipt-backed
- an adversary agent asks how cheaply the signal could be faked
- a cross-signal agent compares reviews with returns, reorders, refunds, complaints, recalls, and independent tests
- a dispute agent marks contested claims rather than silently deleting inconvenient evidence
- a confidence agent emits dimensions, not a single score

That final output should look more like:

```text
Buyer fit: high
Seller claim strength: medium
Review provenance: high
Manipulation risk: medium
Independent evidence: low
Recommended action: try once, do not subscribe yet
```

The goal is not perfect truth. It is to make cheap lies weak and expensive lies easier to trace.

<h2 id="offline-and-small-sellers">Offline and small sellers</h2>

The system also cannot assume every valid product experience starts in an online marketplace. A buyer may purchase from a local shop, farmers' market, pharmacy, salon, repair store, small DTC brand, neighborhood grocer, or cash-based merchant. If only large platforms can issue review tokens, then the product-truth layer becomes an incumbent moat.

Offline purchases need a different path:

```text
Point-of-sale proof -> private receipt credential -> delayed use window -> buyer-agent experience packet -> public attestation with selective disclosure
```

The proof can come from a card transaction, printed receipt QR code, merchant POS system, product package QR, batch code, warranty registration, loyalty record, or a local merchant attestation. None of these is perfect. A cash receipt can be forged. A merchant can collude. A package QR can be copied. A buyer can resell a review token. The answer is not to reject offline evidence. The answer is to grade it.

<span id="claim-010" class="claim-marker" data-claim="claim-010">Claim C10</span> A fair product-truth commons needs graded evidence tiers so offline buyers and small sellers can participate without pretending every attestation has the same trust weight.

A useful evidence ladder might look like:

```text
Tier 0: seller-declared claim, no external support
Tier 1: buyer report, no purchase proof
Tier 2: receipt-backed buyer report, weak issuer
Tier 3: receipt-backed report from trusted issuer or marketplace
Tier 4: cross-signal support from returns, complaints, reorders, and seller history
Tier 5: independent certification, lab test, regulator record, or audited batch data
```

Small sellers should not be punished for lacking enterprise-grade data. They should be allowed to start with self-declared claims, community attestations, batch photos, local receipt proofs, and low-cost third-party checks. Their agent profile should say "low evidence maturity," not "bad seller." A new seller should be able to earn trust through consistency over time.

The fairness principle is simple: do not give small sellers fake certainty, but do not deny them a path to become legible.

<h2 id="remaining-challenges">What remains hard</h2>

These mechanisms still do not completely solve manipulation.

<span id="claim-011" class="claim-marker" data-claim="claim-011">Claim C11</span> Product-truth infrastructure can reduce the value of fake reviews, but it cannot eradicate manipulation; it moves the battlefield from cheap text generation to collusion, credential abuse, data access, privacy leakage, and governance capture.

The hard challenges are structural:

- <strong>Credential laundering:</strong> attackers can buy real products cheaply to generate real receipt-backed fake reviews.
- <strong>Offline token fraud:</strong> printed receipts, QR codes, and merchant attestations can be copied or sold.
- <strong>Seller-buyer collusion:</strong> small seller communities can coordinate positive attestations; competitors can coordinate negative ones.
- <strong>Platform capture:</strong> the largest marketplaces may expose only the signals that favor their ranking logic.
- <strong>Privacy leakage:</strong> strong personalization can reveal health, income, household, or lifestyle traits unless selective disclosure is built in.
- <strong>Private-token metadata:</strong> even unlinkable tokens can leak through issuer metadata, redemption timing, device fingerprints, or narrow product scopes.
- <strong>Social-proof manipulation:</strong> paid creator content, engagement farms, and edited media can make weak products feel trusted unless sponsorship and provenance are labeled.
- <strong>Small-seller burden:</strong> evidence systems can accidentally become compliance overhead that favors large brands.
- <strong>Lab and auditor capture:</strong> third-party testing can become pay-to-play if auditors compete for seller business.
- <strong>Cold-start unfairness:</strong> new sellers and niche products may be low-confidence for too long.
- <strong>False challenge attacks:</strong> competitors can weaponize dispute systems to slow honest sellers.
- <strong>Preference pluralism:</strong> the same evidence can imply different recommendations for different buyers.

This means the product-truth layer should avoid a single global "truth score." It should publish an evidence graph and let buyer agents choose weighting policies. A budget-first buyer, allergy-sensitive buyer, sustainability-first buyer, and local-business-first buyer may all make different choices from the same claim ledger.

The root-level design target is not fraud elimination. It is fraud cost asymmetry: honest evidence should become easier to produce over time, while manipulative influence should require more coordination, more spend, more traceable risk, and more exposure to challenge.

<h2 id="secondary-ecosystem-layers">Secondary ecosystem layers</h2>

Some layers that look secondary are actually what make product assurance serious.

<span id="claim-015" class="claim-marker" data-claim="claim-015">Claim C15</span> Robust agentic product assurance needs infrastructure beyond reviews and credentials: product identity/versioning, recall feeds, liability, auditors, decision receipts, dispute propagation, portability, red-team benchmarks, and accessible presentation.

The most important layer is product identity. The unit of truth is not "a product." It is a claim scoped to GTIN, SKU, model, batch, serial number, firmware, formula, package, jurisdiction, time, and use case. Without this, agents will overgeneralize: evidence for one formula, model year, country, or bundle will leak into another.

The next layer is self-invalidating safety and regulator data. A "safe" or "compliant" claim should degrade when a matching CPSC recall, FDA enforcement notice, EU Safety Gate alert, or similar regulator feed appears. Recall matching is messy because notices may omit GTINs or use inconsistent names, but the direction is clear: product assurance should expire, degrade, or become contested when external safety evidence changes.

Liability is another missing layer. Truth without accountability is metadata. High-impact claims may need an accountable party, bond, insurance policy, auditor credential, or dispute venue. This cannot be required for every low-risk product claim, or the system becomes a moat against small sellers. But for safety, certification, origin, allergen, sustainability, and high-value compatibility claims, economic accountability matters.

Buyer agents also need decision receipts:

```text
User intent -> candidate products -> claims relied on -> policy weights -> warnings ignored -> final recommendation -> human approval
```

Those receipts should preserve privacy, but they are essential for audits, disputes, insurance, and correction propagation. If a claim is later challenged or recalled, downstream agents need a way to know which recommendations relied on it.

<h2 id="human-evidence-surface">The human evidence surface</h2>

Even a strong product-truth layer should not flatten buying into a machine score. Humans still care about texture, aesthetics, narrative, community trust, creator demonstrations, and social proof. If an agent recommends three shower gels, the user may still want to see short videos, social posts, long-form reviews, ingredient explainers, before-and-after photos, or community discussions before trying one.

That layer should be explicit rather than smuggled into the confidence score.

<span id="claim-013" class="claim-marker" data-claim="claim-013">Claim C13</span> Agentic commerce should expose a dual evidence surface: machine-readable claim ledgers for agents and human-readable media, social, community, and brand context for final human judgment.

The agent-facing side can answer: what claims are supported, contested, expired, receipt-backed, lab-tested, or weakly evidenced? The human-facing side can answer: what does this product look like in use, who is talking about it, is the content sponsored, does the post match the exact SKU, is there content provenance, and does the creator or community have a history of reliable recommendations?

This social layer is not automatically truth. Sponsored posts, influencer incentives, engagement farms, and edited media can manipulate trust. But hiding that content is also unnatural. A better design is to label it:

```text
Social evidence: useful for visual texture and human context
Sponsorship: disclosed / likely / unknown
Product match: exact SKU / brand-level / unclear
Media provenance: content credentials present / absent / unverifiable
Manipulation risk: low / medium / high
Agent use: do not treat as performance proof without corroboration
```

For producers, the same principle applies: do not create a new paperwork burden if existing artifacts can be repurposed. Catalog data, package identifiers, creator posts, support logs, return reasons, documentation, certifications, and post-purchase prompts can all feed the system if they are signed, scoped, and labeled. The best user experience is not "manage your agent." It is "your agent quietly shortlists, explains, and asks for permission only at the few moments where human judgment matters."

<h2 id="mvp-wedges">MVP wedges: retail narrative, B2B proof</h2>

Retail behavior may shift faster for low-risk categories: food staples, skincare, cleaning supplies, pet food, cables, travel accessories, and household goods. These categories are noisy, comparable, and habit-driven. An agent can help the user try better options without turning every purchase into a research project.

B2B will move differently. Businesses have procurement processes, compliance constraints, switching costs, budgets, integration risk, and multiple stakeholders. But a narrow B2B wedge may actually be a better first proof than broad consumer retail because behavior change is measurable.

```text
What recurring product can we switch to reduce cost, preserve quality, avoid compliance risk, and prove the result through reorder behavior?
```

<span id="claim-007" class="claim-marker" data-claim="claim-007">Claim C7</span> B2B agentic buying may move slower across complex purchases, but narrow recurring procurement categories can be stronger MVP wedges because outcomes are measurable.

Gartner reported in March 2026 that 67% of B2B buyers prefer a rep-free experience and that 45% used AI during a recent purchase. Forrester reported in 2024 that 89% of surveyed B2B buyers used generative AI in at least one area of their purchasing process, and that 87% of those users said it helped them create a better business outcome. Deloitte's 2025 CPO survey points in the same direction from the procurement side: top-quartile "Digital Masters" were allocating up to 24% of procurement budgets to technology, and they reported materially higher GenAI returns than peers. But B2B buyers will still need confidence, validation, and human accountability at the moments where risk becomes real.

One practical wedge is facilities and janitorial procurement: disinfectants, soaps, trash liners, paper towels, gloves, wipes, concentrates, and related supplies. The agent can compare current SKU against recommended SKU, normalize cost per ready-to-use gallon or case, check safety data sheets and certifications, account for dispenser compatibility, route the switch to a human approver, and observe whether the replacement is reordered without more complaints, returns, stockouts, or safety issues.

Consumer body wash remains a strong narrative example because it shows how brand loyalty can be exploration friction. But B2B facilities procurement may be a stronger first product experiment because the proof loop is not just "the user liked it." It is approval, purchase, usage, complaint rate, reorder, and realized savings.

<h2 id="incumbent-adjacent-commerce">Incumbent-adjacent commerce</h2>

This thesis also fits an incumbent-adjacent venture strategy.

The giants already have distribution: Amazon, Google, Shopify, Walmart, Reddit, TikTok, Visa, Mastercard, OpenAI, and others. But their incentives are tangled. Ads, marketplace ranking, merchant relationships, payment rails, existing roadmaps, and internal politics make it hard to build the clean version of product truth.

A small team can move faster. It can define the sharper behavior first: a buyer-aligned comparison layer, a structured feedback packet, a product evidence schema, or a narrow category demo that proves agents can help people discover better products.

<span id="claim-008" class="claim-marker" data-claim="claim-008">Claim C8</span> The strategic opportunity is not necessarily to replace commerce incumbents, but to prove a new agentic behavior that incumbents may later adopt, adapt, or standardize around.

The hard part is avoiding a toy. A useful demo must prove one concrete behavior: in a noisy, low-risk category, a buyer-aligned agent can recommend a non-obvious product switch, show the evidence packet, earn human approval, and later collect structured post-purchase feedback. The standard must be open enough to be trusted and practical enough to be adopted.

The question is not whether agents can recommend products. They already can. The question is whether the market can build a product-truth commons that makes better products easier to discover than better marketing.

<h2 id="evidence-notes">Evidence notes</h2>

The companion agent artifact maps every claim to public sources. The current draft leans on consumer-behavior research for choice overload and status quo bias; Herbert Simon's attention-scarcity frame; Adobe retail reports from 2025 and 2026; Google UCP/AP2, OpenAI/Stripe ACP, and Amazon Rufus for the agentic-commerce landscape; Schema.org, Google product structured data, GS1 Digital Link, W3C PROV-O, and W3C Verifiable Credentials for machine-readable product identity and provenance; the FTC's fake-review rule for review integrity; and Gartner, Forrester, Deloitte, and EPA Safer Choice for B2B buying, procurement, and cleaning-product evidence.

The deeper trust section adds truth-discovery research, EigenTrust, Bayesian Truth Serum, C2PA content provenance, EU Digital Product Passport direction, and Amazon's brand-protection reporting as evidence that source reliability, provenance, incentives, and proactive fraud controls already have adjacent research and infrastructure.

The privacy and human-evidence sections add Privacy Pass, W3C Verifiable Credentials, W3C BBS selective-disclosure cryptosuites, and C2PA content provenance as references for unlinkable entitlements, selective disclosure, and labeled media context. The secondary infrastructure section adds CPSC recall APIs and NIST AI risk-management framing for correction feeds, decision receipts, and accountable agent reliance.

The old commerce stack rewarded attention. The next one may reward legibility, fit, and trust.
