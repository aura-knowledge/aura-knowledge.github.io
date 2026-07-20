import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  addTokenEstimateToPacket,
  buildArticleIndexWithTokens,
  buildClaimFeeds,
  buildEdgeFeeds,
  buildFeedManifest,
  buildRoadmapFeeds,
  buildSourceFeeds
} from "../lib/agent-feeds.mjs";

const SITE = "https://example.test";

function makeClaim(id, overrides = {}) {
  return {
    id,
    claim: `Claim text for ${id}.`,
    confidence: "medium",
    status: "core",
    evidence: [],
    counterevidence: [],
    ...overrides
  };
}

function makeSource(id, overrides = {}) {
  return {
    id,
    title: `Source title ${id}`,
    type: "paper",
    url: `https://example.test/${id}`,
    accessed: "2026-01-01",
    ...overrides
  };
}

function makeArticle(slug, { status = "published", claims = [], sources = [] } = {}) {
  return {
    slug,
    artifact: {
      id: `article:${slug}`,
      canonicalPath: `/articles/${slug}/`,
      status,
      claims,
      sources
    }
  };
}

describe("buildClaimFeeds", () => {
  test("only published articles contribute claim lines", () => {
    const articles = [
      makeArticle("pub", { claims: [makeClaim("claim-001")] }),
      makeArticle("draft", { status: "draft", claims: [makeClaim("claim-001")] }),
      makeArticle("review", { status: "review", claims: [makeClaim("claim-001")] }),
      makeArticle("archived", { status: "archived", claims: [makeClaim("claim-001")] })
    ];
    const lines = buildClaimFeeds(articles, SITE);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].slug, "pub");
  });

  test("line shape: composite claimId, verification fallback, and counts", () => {
    const claim = makeClaim("claim-001", {
      evidence: [{ sourceId: "source-a", snippet: "Long enough snippet." }],
      counterevidence: [{ summary: "A real qualification." }, { summary: "Another qualification." }]
    });
    const lines = buildClaimFeeds([makeArticle("a", { claims: [claim] })], SITE);
    assert.equal(lines.length, 1);
    assert.deepEqual(lines[0], {
      articleId: "article:a",
      slug: "a",
      claimId: "article:a:claim-001",
      localClaimId: "claim-001",
      claim: claim.claim,
      confidence: "medium",
      status: "core",
      verificationStatus: "draft", // verification object absent -> draft fallback
      asOf: null, // no assessedAt anywhere -> null
      evidenceCount: 1,
      counterevidenceCount: 2,
      articleUrl: `${SITE}/articles/a/`
    });
  });

  test("asOf is the lexicographically latest assessedAt, ignoring missing values", () => {
    const claim = makeClaim("claim-001", {
      verification: { reviewedAt: "2026-01-01", reviewer: "human", status: "verified" },
      evidence: [
        { sourceId: "source-a", snippet: "One snippet here.", assessedAt: "2025-06-01" },
        { sourceId: "source-a", snippet: "Two snippet here." }, // no assessedAt
        { sourceId: "source-a", snippet: "Three snippet here.", assessedAt: "2026-01-02" },
        { sourceId: "source-a", snippet: "Four snippet here.", assessedAt: "2026-01-01" }
      ]
    });
    const lines = buildClaimFeeds([makeArticle("a", { claims: [claim] })], SITE);
    assert.equal(lines[0].asOf, "2026-01-02");
    assert.equal(lines[0].verificationStatus, "verified");
  });

  test("claim text with newlines, quotes, and unicode stays one JSONL-safe line", () => {
    const claim = makeClaim("claim-001", {
      claim: "Line one\nLine two with \"quotes\" and unicode café ☕"
    });
    const lines = buildClaimFeeds([makeArticle("a", { claims: [claim] })], SITE);
    const serialized = JSON.stringify(lines[0]);
    assert.ok(!serialized.includes("\n"), "serialized feed line must not contain a raw newline");
    assert.deepEqual(JSON.parse(serialized), lines[0]);
  });

  test("10k claims across articles all produce lines (bounded resource use)", () => {
    const articles = [];
    for (let i = 0; i < 100; i += 1) {
      const claims = [];
      for (let j = 0; j < 100; j += 1) {
        claims.push(makeClaim(`claim-${String(j).padStart(3, "0")}`));
      }
      articles.push(makeArticle(`a-${i}`, { claims }));
    }
    const lines = buildClaimFeeds(articles, SITE);
    assert.equal(lines.length, 10000);
    assert.equal(lines.at(-1).claimId, "article:a-99:claim-099");
  });
});

describe("buildSourceFeeds", () => {
  test("only published articles contribute source lines, with passthrough fields", () => {
    const articles = [
      makeArticle("pub", { sources: [makeSource("source-a"), makeSource("source-b", { type: "dataset" })] }),
      makeArticle("draft", { status: "draft", sources: [makeSource("source-c")] })
    ];
    const lines = buildSourceFeeds(articles, SITE);
    assert.equal(lines.length, 2);
    assert.deepEqual(lines[1], {
      articleId: "article:pub",
      slug: "pub",
      sourceId: "source-b",
      title: "Source title source-b",
      type: "dataset",
      url: "https://example.test/source-b",
      accessed: "2026-01-01",
      articleUrl: `${SITE}/articles/pub/`
    });
  });
});

describe("buildRoadmapFeeds", () => {
  test("only published roadmaps contribute; ideas resolve their phase via ideaIds", () => {
    const roadmaps = [
      {
        id: "roadmap:main",
        status: "published",
        ideas: [
          { id: "idea-1", title: "First", priority: "P0", category: "tooling" },
          { id: "idea-2", title: "Second", priority: "P1", category: "docs" },
          { id: "idea-3", title: "Third", priority: "P2", category: "docs" }
        ],
        phases: [
          { id: "phase-1", ideaIds: ["idea-1", "idea-3"] }
          // idea-2 is in no phase
        ]
      },
      {
        id: "roadmap:draft",
        status: "draft",
        ideas: [{ id: "idea-x", title: "Hidden", priority: "P0", category: "tooling" }],
        phases: []
      }
    ];
    const lines = buildRoadmapFeeds(roadmaps);
    assert.equal(lines.length, 3);
    assert.deepEqual(lines[0], {
      roadmapId: "roadmap:main",
      ideaId: "idea-1",
      title: "First",
      priority: "P0",
      category: "tooling",
      phaseId: "phase-1"
    });
    assert.equal(lines[1].phaseId, null);
    assert.equal(lines[2].phaseId, "phase-1");
  });

  test("roadmap without phases or ideas arrays does not crash", () => {
    assert.deepEqual(buildRoadmapFeeds([{ id: "roadmap:bare", status: "published" }]), []);
    const lines = buildRoadmapFeeds([
      { id: "roadmap:half", status: "published", ideas: [{ id: "idea-1", title: "Solo" }] }
    ]);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].phaseId, null);
  });
});

describe("buildEdgeFeeds", () => {
  test("keeps only from/to/type and drops provenance extras", () => {
    const lines = buildEdgeFeeds([
      {
        from: "article:a",
        to: "topic:t",
        type: "covers",
        provenance: { reviewedAt: "2026-01-01", reviewer: "generator", status: "machine-generated" }
      }
    ]);
    assert.deepEqual(lines, [{ from: "article:a", to: "topic:t", type: "covers" }]);
    assert.deepEqual(buildEdgeFeeds([]), []);
  });
});

describe("buildFeedManifest", () => {
  test("counts and file entries are consistent with the feeds object", () => {
    const feeds = {
      claims: [{ a: 1 }, { a: 2 }],
      sources: [{ b: 1 }],
      roadmap: [],
      edges: [{ c: 1 }, { c: 2 }, { c: 3 }]
    };
    const manifest = buildFeedManifest(feeds, SITE, "base", "2026-01-15T00:00:00.000Z");
    assert.equal(manifest.schemaVersion, 1);
    assert.equal(manifest.site, SITE);
    assert.equal(manifest.base, "base");
    assert.equal(manifest.generatedAt, "2026-01-15T00:00:00.000Z");
    assert.deepEqual(manifest.counts, { claims: 2, sources: 1, roadmap: 0, edges: 3 });
    for (const [name, lines] of Object.entries(feeds)) {
      assert.equal(manifest.files[name].path, `/agents/feeds/${name}.jsonl`);
      assert.equal(manifest.files[name].count, lines.length);
    }
  });
});

describe("token estimate helpers", () => {
  test("buildArticleIndexWithTokens appends an estimate and overrides a stale one", () => {
    const article = { slug: "a", agentBody: "one two three four", tokenEstimate: 9999 };
    const indexed = buildArticleIndexWithTokens(article);
    assert.equal(indexed.slug, "a");
    // 4 words * 1.35 = 5.4 -> ceil 6, and the stale estimate is replaced.
    assert.equal(indexed.tokenEstimate, 6);
    assert.equal(article.tokenEstimate, 9999, "input object is not mutated");
  });

  test("buildArticleIndexWithTokens on a missing body estimates zero", () => {
    const indexed = buildArticleIndexWithTokens({ slug: "a" });
    assert.equal(indexed.tokenEstimate, 0);
  });

  test("addTokenEstimateToPacket leaves the packet untouched and adds the estimate", () => {
    const packet = { id: "article:a", claims: [1, 2, 3] };
    const enriched = addTokenEstimateToPacket(packet, "");
    assert.equal(enriched.tokenEstimate, 0);
    assert.deepEqual(enriched.claims, [1, 2, 3]);
    assert.ok(!("tokenEstimate" in packet), "input packet is not mutated");
  });
});
