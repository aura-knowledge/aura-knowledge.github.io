---
schemaVersion: 1
id: article:{{slug}}
slug: {{slug}}
title: {{title}}
dek: {{dek}}
date: {{date}}
updated: {{date}}
status: draft
maturity: seed
topic: {{topic}}
tags:
  - {{topic}}
summary: {{summary}}
readingTime: 5 min
agentArtifact: /agents/articles/{{slug}}.json
sourcePath: content/articles/{{year}}/{{slug}}/article.md
---

## Opening

Write the human-readable essay here. Replace this paragraph with the central argument.

<span id="claim-001" class="claim-marker" data-claim="claim-001">Point C1</span> State the point in one plain sentence.

## Context

Add background, framing, and the landscape that the claim sits in.

## Source notes

- Capture sources in `workspace/sources/`.
- Summarize each source in `workspace/notes.md`.
- Record sources and counterpoints in `artifact.json`.

## Next steps

1. Fill `workspace/plan.md` with the research plan.
2. Add sources to `workspace/sources/`.
3. Draft the article body in this file.
4. Update `artifact.json` points, sources, and review details.
5. Run `npm run generate` and `npm run check`.
