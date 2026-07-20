import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  ALLOWED_MATURITIES,
  ALLOWED_STATUSES,
  CLAIM_STATES,
  buildQueryCatalog,
  formatResults,
  loadGardenData,
  queryArticles
} from "../lib/garden-queries.mjs";

const SITE = "https://example.test";
const GENERATED_AT = "2026-01-15T00:00:00.000Z";

// ---------- in-memory fixtures ----------

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

function makeArticle({ slug, ...options }) {
  const {
    topics = [],
    tags = [],
    status = "published",
    maturity = "seed",
    claims = [],
    sources = [],
    related = [],
    summary = `Summary of ${slug}`,
    thesis = `Thesis of ${slug}`,
    title = `Title of ${slug}`
  } = options;
  return {
    year: "2026",
    slug,
    articleFrontmatter: { status, tags, summary },
    artifact: {
      id: `article:${slug}`,
      title,
      canonicalPath: `/articles/${slug}/`,
      topics,
      maturity,
      status,
      thesis,
      claims,
      sources,
      related,
      updatedAt: "2026-01-10"
    }
  };
}

function makeData({ articles = [], verificationReport, edges = [], index } = {}) {
  return {
    index: index ?? { site: SITE },
    articles,
    verificationReport: verificationReport ?? { articles: [] },
    edges
  };
}

// ---------- temp-garden helpers for loadGardenData ----------

const gardenQueriesUrl = new URL("../lib/garden-queries.mjs", import.meta.url).href;

async function makeTempGarden(t, { index, verificationReport, edgesRaw, withContent = true } = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "garden-queries-"));
  t.after(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });
  if (withContent) {
    await fs.mkdir(path.join(dir, "content", "articles"), { recursive: true });
  }
  await fs.mkdir(path.join(dir, "public", "agents"), { recursive: true });
  await fs.mkdir(path.join(dir, "public", "graph"), { recursive: true });
  if (index !== undefined) {
    await fs.writeFile(path.join(dir, "public", "agents", "index.json"), index);
  }
  if (verificationReport !== undefined) {
    await fs.writeFile(
      path.join(dir, "public", "agents", "verification-report.json"),
      verificationReport
    );
  }
  if (edgesRaw !== undefined) {
    await fs.writeFile(path.join(dir, "public", "graph", "edges.json"), edgesRaw);
  }
  return dir;
}

function runLoadGarden(cwd) {
  const script = `
    import { loadGardenData } from ${JSON.stringify(gardenQueriesUrl)};
    try {
      const data = await loadGardenData();
      console.log(JSON.stringify({
        ok: true,
        articleCount: data.articles.length,
        indexArticles: (data.index.articles ?? []).length,
        edges: data.edges
      }));
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  `;
  return spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd,
    encoding: "utf8"
  });
}

// ---------- loadGardenData ----------

describe("loadGardenData real corpus smoke", () => {
  test("loads the real garden from the worktree root", async () => {
    // Tests run with cwd = worktree root, so this exercises the real public/ outputs.
    const data = await loadGardenData();
    assert.ok(data.index.articles.length > 0);
    assert.ok(data.articles.length > 0);
    assert.ok(Array.isArray(data.edges));
  });
});

describe("loadGardenData adversarial disk state", () => {
  test("broken verification-report JSON rejects with actionable guidance", async (t) => {
    const dir = await makeTempGarden(t, {
      index: JSON.stringify({ articles: [] }),
      verificationReport: "{ not json !!"
    });
    const result = runLoadGarden(dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Cannot serve verification data/);
    assert.match(result.stderr, /npm run generate/);
  });

  test("verification-report containing JSON null rejects as unusable", async (t) => {
    const dir = await makeTempGarden(t, {
      index: JSON.stringify({ articles: [] }),
      verificationReport: "null"
    });
    const result = runLoadGarden(dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /contains no usable verification data/);
  });

  test("non-empty index with empty verification report rejects", async (t) => {
    const dir = await makeTempGarden(t, {
      index: JSON.stringify({ articles: [{ slug: "a" }] }),
      verificationReport: JSON.stringify({ articles: [] })
    });
    const result = runLoadGarden(dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /contains no usable verification data/);
  });

  test("empty index plus empty verification report resolves", async (t) => {
    const dir = await makeTempGarden(t, {
      index: JSON.stringify({ articles: [] }),
      verificationReport: JSON.stringify({ articles: [] })
    });
    const result = runLoadGarden(dir);
    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, true);
    assert.equal(payload.articleCount, 0);
  });

  test("missing or malformed edges.json falls back to an empty edge list instead of crashing", async (t) => {
    const missing = await makeTempGarden(t, {
      index: JSON.stringify({ articles: [] }),
      verificationReport: JSON.stringify({ articles: [] })
    });
    const absent = runLoadGarden(missing);
    assert.equal(absent.status, 0, absent.stderr);
    assert.deepEqual(JSON.parse(absent.stdout).edges, []);

    const broken = await makeTempGarden(t, {
      index: JSON.stringify({ articles: [] }),
      verificationReport: JSON.stringify({ articles: [] }),
      edgesRaw: "[[[broken"
    });
    const malformed = runLoadGarden(broken);
    assert.equal(malformed.status, 0, malformed.stderr);
    assert.deepEqual(JSON.parse(malformed.stdout).edges, []);
  });

  test("edges.json as a bare array is accepted", async (t) => {
    const dir = await makeTempGarden(t, {
      index: JSON.stringify({ articles: [] }),
      verificationReport: JSON.stringify({ articles: [] }),
      edgesRaw: JSON.stringify([{ from: "a", to: "b", type: "supports" }])
    });
    const result = runLoadGarden(dir);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).edges.length, 1);
  });

  test("broken index.json rejects", async (t) => {
    const dir = await makeTempGarden(t, {
      index: "not json at all",
      verificationReport: JSON.stringify({ articles: [] })
    });
    const result = runLoadGarden(dir);
    assert.equal(result.status, 1);
  });

  test("missing content directory rejects rather than serving a phantom garden", async (t) => {
    const dir = await makeTempGarden(t, {
      withContent: false,
      index: JSON.stringify({ articles: [] }),
      verificationReport: JSON.stringify({ articles: [] })
    });
    const result = runLoadGarden(dir);
    assert.equal(result.status, 1);
  });
});

// ---------- queryArticles ----------

describe("queryArticles filters", () => {
  test("no filters returns all articles in order with the result entry shape", () => {
    const data = makeData({
      articles: [makeArticle({ slug: "b" }), makeArticle({ slug: "a" })]
    });
    const results = queryArticles({}, data);
    assert.deepEqual(
      results.map((r) => r.slug),
      ["b", "a"]
    );
    assert.deepEqual(results[0], {
      articleId: "article:b",
      slug: "b",
      articleUrl: `${SITE}/articles/b/`,
      agentJsonPath: "/agents/articles/b.json"
    });
  });

  test("falls back to the default site when index.site is absent", () => {
    const data = makeData({ articles: [makeArticle({ slug: "a" })], index: {} });
    const results = queryArticles({}, data);
    assert.equal(results[0].articleUrl, "https://aura-knowledge.github.io/articles/a/");
  });

  test("topic and tag filters combine with AND logic", () => {
    const data = makeData({
      articles: [
        makeArticle({ slug: "both", topics: ["t1"], tags: ["g1"] }),
        makeArticle({ slug: "topic-only", topics: ["t1"], tags: ["g2"] }),
        makeArticle({ slug: "tag-only", topics: ["t2"], tags: ["g1"] })
      ]
    });
    assert.deepEqual(
      queryArticles({ topic: "t1", tag: "g1" }, data).map((r) => r.slug),
      ["both"]
    );
    assert.deepEqual(
      queryArticles({ topic: "missing" }, data),
      []
    );
  });

  test("maturity, status, and citesSourceType filters", () => {
    const data = makeData({
      articles: [
        makeArticle({
          slug: "a",
          maturity: "evergreen",
          status: "draft",
          sources: [makeSource("source-1", { type: "dataset" })]
        }),
        makeArticle({ slug: "b", maturity: "seed", status: "published" })
      ]
    });
    assert.deepEqual(queryArticles({ maturity: "evergreen" }, data).map((r) => r.slug), ["a"]);
    assert.deepEqual(queryArticles({ status: "draft" }, data).map((r) => r.slug), ["a"]);
    assert.deepEqual(queryArticles({ citesSourceType: "dataset" }, data).map((r) => r.slug), ["a"]);
    assert.deepEqual(queryArticles({ citesSourceType: "paper" }, data), []);
  });

  test("claimState filter matches report state and tolerates missing or null report claims", () => {
    const data = makeData({
      articles: [makeArticle({ slug: "a" }), makeArticle({ slug: "b" }), makeArticle({ slug: "c" })],
      verificationReport: {
        articles: [
          { slug: "a", claims: [{ id: "claim-001", state: "needs-evidence" }] },
          { slug: "b", claims: null }
          // c has no report entry at all
        ]
      }
    });
    assert.deepEqual(queryArticles({ claimState: "needs-evidence" }, data).map((r) => r.slug), ["a"]);
  });

  test("keyword search is case-insensitive and reaches claims, sources, tags, and topics", () => {
    const data = makeData({
      articles: [
        makeArticle({ slug: "in-claim", claims: [makeClaim("claim-001", { claim: "Deep ZQX insight." })] }),
        makeArticle({ slug: "in-source", sources: [makeSource("source-1", { title: "The ZQX Paper" })] }),
        makeArticle({ slug: "in-tags", tags: ["zqx-tag"] }),
        makeArticle({ slug: "in-topics", topics: ["zqx-topic"] }),
        makeArticle({ slug: "unrelated" })
      ]
    });
    assert.deepEqual(
      queryArticles({ keyword: "zqx" }, data).map((r) => r.slug),
      ["in-claim", "in-source", "in-tags", "in-topics"]
    );
  });

  test("keyword search handles non-ASCII phrases", () => {
    const data = makeData({
      articles: [
        makeArticle({ slug: "café", title: "Café Economics" }),
        makeArticle({ slug: "other" })
      ]
    });
    assert.deepEqual(queryArticles({ keyword: "café" }, data).map((r) => r.slug), ["café"]);
  });

  test("limit: 1 keeps the first, 0 means no limit, oversize keeps all", () => {
    const data = makeData({
      articles: [makeArticle({ slug: "a" }), makeArticle({ slug: "b" }), makeArticle({ slug: "c" })]
    });
    assert.deepEqual(queryArticles({ limit: 1 }, data).map((r) => r.slug), ["a"]);
    assert.deepEqual(queryArticles({ limit: 0 }, data).length, 3);
    assert.deepEqual(queryArticles({ limit: 99 }, data).length, 3);
  });
});

describe("queryArticles relatedTo", () => {
  const target = makeArticle({ slug: "target", topics: ["t-shared"] });
  const byTopic = makeArticle({ slug: "by-topic", topics: ["t-shared"] });
  const byRelation = makeArticle({
    slug: "by-relation",
    related: [{ id: "article:target", type: "supports" }]
  });
  const byEdge = makeArticle({ slug: "by-edge" });
  const ignoredEdge = makeArticle({ slug: "ignored-edge" });

  const data = makeData({
    articles: [target, byTopic, byRelation, byEdge, ignoredEdge],
    edges: [
      { from: "article:by-edge", to: "article:target", type: "supports" },
      { from: "article:ignored-edge", to: "article:target", type: "covers" }, // covers/argues are skipped
      { from: "article:ghost", to: "article:target", type: "supports" } // unknown node tolerated
    ]
  });

  test("collects relations by shared topic, artifact.related, and graph edge", () => {
    assert.deepEqual(
      queryArticles({ relatedTo: "target" }, data).map((r) => r.slug),
      ["by-topic", "by-relation", "by-edge"]
    );
  });

  test("unknown slug returns empty rather than every article", () => {
    assert.deepEqual(queryArticles({ relatedTo: "nope" }, data), []);
  });

  test("the target article is never its own neighbor, even with a self-referencing edge", () => {
    const selfLoop = makeData({
      articles: [makeArticle({ slug: "a" }), makeArticle({ slug: "b" })],
      edges: [
        { from: "article:a", to: "article:a", type: "supports" },
        { from: "article:b", to: "article:a", type: "supports" }
      ]
    });
    assert.deepEqual(
      queryArticles({ relatedTo: "a" }, selfLoop).map((r) => r.slug),
      ["b"]
    );
  });

  test("relatedTo intersects with other active filters", () => {
    const filtered = makeData({
      articles: [
        makeArticle({ slug: "target", topics: ["t1"] }),
        makeArticle({ slug: "kin-draft", topics: ["t1"], status: "draft" }),
        makeArticle({ slug: "kin-published", topics: ["t1"] })
      ]
    });
    assert.deepEqual(
      queryArticles({ relatedTo: "target", status: "published" }, filtered).map((r) => r.slug),
      ["kin-published"]
    );
  });
});

describe("queryArticles bounded resource use", () => {
  test("10k-article keyword query completes and returns the exact match", () => {
    const articles = [];
    for (let i = 0; i < 10000; i += 1) {
      articles.push(makeArticle({ slug: `filler-${i}`, topics: ["filler"] }));
    }
    articles.push(makeArticle({ slug: "needle", title: "The zqx-needle article" }));
    const results = queryArticles({ keyword: "zqx-needle" }, makeData({ articles }));
    assert.equal(results.length, 1);
    assert.equal(results[0].slug, "needle");
  });
});

// ---------- formatResults ----------

describe("formatResults", () => {
  const entries = [
    {
      articleId: "article:a",
      slug: "a",
      articleUrl: `${SITE}/articles/a/`,
      agentJsonPath: "/agents/articles/a.json"
    },
    {
      articleId: "article:b",
      slug: "b",
      articleUrl: `${SITE}/articles/b/`,
      agentJsonPath: "/agents/articles/b.json"
    }
  ];

  test("ids format: newline per slug, empty string for no results", () => {
    assert.equal(formatResults(entries, "ids"), "a\nb\n");
    assert.equal(formatResults([], "ids"), "");
  });

  test("jsonl format: one parseable JSON object per line", () => {
    const output = formatResults(entries, "jsonl");
    const lines = output.trim().split("\n");
    assert.equal(lines.length, 2);
    assert.deepEqual(JSON.parse(lines[0]), entries[0]);
    assert.equal(formatResults([], "jsonl"), "");
  });

  test("markdown format: link list, or 'No results.' when empty", () => {
    assert.equal(
      formatResults(entries, "markdown"),
      `- [a](${SITE}/articles/a/)\n- [b](${SITE}/articles/b/)\n`
    );
    assert.equal(formatResults([], "markdown"), "No results.\n");
  });

  test("json is the default and also the fallback for unknown formats", () => {
    assert.equal(formatResults(entries, "json"), `${JSON.stringify(entries, null, 2)}\n`);
    assert.equal(formatResults(entries, undefined), formatResults(entries, "json"));
    assert.equal(formatResults(entries, "yaml-ish"), formatResults(entries, "json"));
  });
});

// ---------- buildQueryCatalog ----------

describe("buildQueryCatalog", () => {
  test("only published articles contribute to queries and dimensions", () => {
    const data = makeData({
      articles: [
        makeArticle({ slug: "pub", topics: ["t1"], tags: ["g1"] }),
        makeArticle({ slug: "draft", topics: ["t2"], tags: ["g2"], status: "draft" })
      ]
    });
    const catalog = buildQueryCatalog(data, SITE, "", GENERATED_AT);
    const byTopic = catalog.queries.find((q) => q.name === "articles-by-topic");
    assert.deepEqual(byTopic.results.map((r) => r.slug), ["pub"]);
    const topicDimension = catalog.dimensions.find((d) => d.name === "topic");
    assert.deepEqual(topicDimension.values, ["t1"]);
    const tagDimension = catalog.dimensions.find((d) => d.name === "tag");
    assert.deepEqual(tagDimension.values, ["g1"]);
  });

  test("an article appears once per topic even when its topics array repeats a value", () => {
    // artifact.schema.json has no uniqueItems on topics, so this input is schema-valid.
    const data = makeData({
      articles: [makeArticle({ slug: "a", topics: ["alpha", "alpha"] })]
    });
    const catalog = buildQueryCatalog(data, SITE, "", GENERATED_AT);
    const byTopic = catalog.queries.find((q) => q.name === "articles-by-topic");
    assert.equal(
      byTopic.results.filter((r) => r.slug === "a" && r.topic === "alpha").length,
      1
    );
    assert.equal(byTopic.resultCount, 1);
  });

  test("topic and source-type groups are sorted; resultCount matches results", () => {
    const data = makeData({
      articles: [
        makeArticle({ slug: "a", topics: ["beta", "alpha"], sources: [makeSource("source-1", { type: "report" })] }),
        makeArticle({ slug: "b", topics: ["alpha"], sources: [makeSource("source-2", { type: "paper" })] })
      ]
    });
    const catalog = buildQueryCatalog(data, SITE, "", GENERATED_AT);
    const byTopic = catalog.queries.find((q) => q.name === "articles-by-topic");
    assert.deepEqual(
      byTopic.results.map((r) => `${r.topic}:${r.slug}`),
      ["alpha:a", "alpha:b", "beta:a"]
    );
    assert.equal(byTopic.resultCount, byTopic.results.length);
    const byType = catalog.queries.find((q) => q.name === "sources-by-type");
    assert.deepEqual(
      byType.results.map((r) => r.sourceType),
      ["paper", "report"]
    );
  });

  test("claim queries use verification-report state; confidence comes from the artifact", () => {
    const data = makeData({
      articles: [
        makeArticle({
          slug: "a",
          claims: [
            makeClaim("claim-001", { confidence: "high" }),
            makeClaim("claim-002"),
            makeClaim("claim-003")
          ]
        })
      ],
      verificationReport: {
        articles: [
          {
            slug: "a",
            claims: [
              { id: "claim-001", state: "needs-evidence" },
              { id: "claim-002", state: "stale" },
              { id: "claim-003", state: "draft" },
              { id: "claim-ghost", state: "needs-evidence" } // not in artifact: ignored
            ]
          }
        ]
      }
    });
    const catalog = buildQueryCatalog(data, SITE, "", GENERATED_AT);
    const byName = (name) => catalog.queries.find((q) => q.name === name);

    assert.deepEqual(
      byName("claims-needing-evidence").results.map((r) => r.claimId),
      ["claim-001"]
    );
    assert.deepEqual(
      byName("claims-contested-or-stale").results.map((r) => r.claimId),
      ["claim-002"]
    );
    assert.deepEqual(
      byName("high-confidence-claims").results.map((r) => r.claimId),
      ["claim-001"]
    );
    assert.deepEqual(
      byName("articles-with-draft-claims").results.map((r) => r.slug),
      ["a"]
    );
  });

  test("catalogSize sums every query resultCount; dimensions carry the full enums", () => {
    const catalog = buildQueryCatalog(makeData({ articles: [] }), SITE, "base", GENERATED_AT);
    assert.equal(catalog.catalogSize.queryCount, 6);
    assert.equal(catalog.catalogSize.totalResults, 0);
    assert.equal(
      catalog.catalogSize.totalResults,
      catalog.queries.reduce((sum, q) => sum + q.resultCount, 0)
    );
    assert.deepEqual(catalog.dimensions.find((d) => d.name === "maturity").values, Array.from(ALLOWED_MATURITIES));
    assert.deepEqual(catalog.dimensions.find((d) => d.name === "status").values, Array.from(ALLOWED_STATUSES));
    assert.deepEqual(catalog.dimensions.find((d) => d.name === "claimState").values, Array.from(CLAIM_STATES));
    assert.equal(catalog.schemaVersion, 1);
    assert.equal(catalog.base, "base");
    assert.equal(catalog.generatedAt, GENERATED_AT);
    assert.match(catalog.schema, /^https:\/\/example\.test\/schemas\/garden-queries\.schema\.json/);
  });
});
