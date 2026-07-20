import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../validate-content.mjs", import.meta.url));
const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function writeFile(root, relative, contents) {
  const filePath = path.join(root, relative);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
}

function writeJson(root, relative, data) {
  writeFile(root, relative, `${JSON.stringify(data, null, 2)}\n`);
}

function readJson(root, relative) {
  return JSON.parse(readFileSync(path.join(root, relative), "utf8"));
}

function defaultClaims() {
  return [
    {
      id: "claim-001",
      claim: "A testable claim with enough length to be realistic.",
      confidence: "medium",
      status: "core",
      verification: { reviewedAt: today(), reviewer: "human", status: "verified" },
      evidence: [
        { sourceId: "source-alpha", snippet: "Evidence snippet from alpha.", supports: "direct" },
        { sourceId: "source-beta", snippet: "Evidence snippet from beta.", supports: "indirect" }
      ],
      counterevidence: []
    }
  ];
}

function defaultSources() {
  return [
    { id: "source-alpha", title: "Alpha Paper", url: "https://example.com/alpha", type: "paper", accessed: today() },
    { id: "source-beta", title: "Beta Dataset", url: "https://example.com/beta", type: "dataset", accessed: today() }
  ];
}

// Describes one garden article; buildGarden turns specs into a fully
// consistent content/ + public/ tree that passes validation by default.
function draftSpec(overrides = {}) {
  return { slug: "sample-draft", status: "draft", ...overrides };
}

function publishedSpec(overrides = {}) {
  return { slug: "pub-one", status: "published", ...overrides };
}

function roadmapSpec(overrides = {}) {
  return {
    schemaVersion: 1,
    id: "roadmap:tooling",
    slug: "tooling",
    title: "Tooling Roadmap",
    summary: "A roadmap for tooling work.",
    status: "published",
    updatedAt: today(),
    sourceRepo: { name: "tooling", url: "https://example.com/tooling", commit: "abc1234", commitDate: today(), reviewedAt: today() },
    thesis: "Tooling matters for the garden.",
    priorityCounts: { P0: 1, P1: 0, P2: 0 },
    phases: [{ id: "phase-1", name: "First", horizon: "now", outcome: "done", ideaIds: ["idea-one"] }],
    ideas: [
      {
        id: "idea-one",
        title: "First idea",
        priority: "P0",
        category: "evidence",
        sourcePaths: ["src/README.md"],
        pattern: "A pattern.",
        gardenMapping: "A mapping.",
        firstImplementation: "An implementation.",
        risks: ["A risk."]
      }
    ],
    principles: ["Keep it simple."],
    crossAgentReview: { status: "complete", reviewedAt: today(), reviewers: ["agent-a"], notes: "Looks good." },
    agentInstructions: ["Maintain the roadmap."],
    ...overrides
  };
}

function buildGarden(t, { articles = [draftSpec()], roadmaps = [] } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "validate-content-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  cpSync(path.join(REPO_ROOT, "schemas"), path.join(root, "schemas"), { recursive: true });

  writeJson(root, "policies/default-1.0.0.json", {
    id: "policy:default",
    version: "1.0.0",
    name: "Default Test Policy",
    effectiveAt: "2026-01-01",
    rules: [{ id: "rule-one", scope: "publication", requirement: "A requirement that is long enough." }]
  });

  const loaded = articles.map((spec) => {
    const year = spec.year ?? "2026";
    const slug = spec.slug;
    const folderSlug = spec.folderSlug ?? slug;
    const status = spec.status ?? "draft";
    const claims = spec.claims ?? defaultClaims();
    const sources = spec.sources ?? defaultSources();
    const markers = spec.markers ?? claims.map((claim) => claim.id);
    const body = spec.body ?? `${markers.map((id) => `<span id="${id}" class="claim-marker"></span>`).join("\n")}\n\nArticle body text.\n`;
    const sourcePath = `content/articles/${year}/${folderSlug}/article.md`;
    const agentBriefPath = `content/articles/${year}/${folderSlug}/agent.md`;

    const frontmatter = {
      schemaVersion: 1,
      id: `article:${slug}`,
      slug,
      title: spec.title ?? "A Sample Article Title",
      dek: "A dek that is comfortably long enough.",
      date: today(),
      updated: today(),
      status,
      maturity: "seed",
      topic: "testing",
      tags: ["testing"],
      summary: "A summary that is long enough to be plausible for the schema.",
      readingTime: "1 min",
      agentArtifact: `/agents/articles/${slug}.json`,
      sourcePath,
      ...(spec.frontmatterOverrides ?? {})
    };
    const frontmatterYaml = Object.entries(frontmatter)
      .map(([key, value]) => {
        if (Array.isArray(value)) return `${key}:\n${value.map((item) => `  - ${item}`).join("\n")}`;
        return `${key}: ${typeof value === "number" ? value : JSON.stringify(value)}`;
      })
      .join("\n");
    const articleMd = `---\n${frontmatterYaml}\n---\n${body}`;

    const contentHash = sha256(articleMd);
    const provenance = spec.provenance !== undefined
      ? spec.provenance
      : {
          createdAt: today(),
          createdBy: "test",
          agents: [
            { role: "drafter", model: "test-model", invokedAt: today(), inputHash: `sha256:${sha256(`${slug}-input`)}`, outputHash: `sha256:${sha256(`${slug}-output`)}` }
          ],
          reviews: status === "published"
            ? [{ reviewer: "human", reviewedAt: today(), status: "approved", scope: ["article"], notes: "Approved for test.", contentHash }]
            : [],
          policy: { id: "policy:default", version: "1.0.0" }
        };

    const artifact = {
      schemaVersion: 3,
      id: `article:${slug}`,
      slug,
      title: spec.title ?? "A Sample Article Title",
      canonicalPath: `/articles/${slug}/`,
      sourcePath,
      agentBriefPath,
      thesis: "A thesis statement that is long enough to satisfy the schema minimum length requirement.",
      status,
      maturity: "seed",
      publishedAt: today(),
      updatedAt: today(),
      audiences: ["testers"],
      topics: ["testing"],
      claims,
      sources,
      related: [],
      agentInstructions: [],
      provenance,
      contentHash,
      ...(spec.artifactOverrides ?? {})
    };

    const claimLines = spec.agentClaimLines !== undefined
      ? spec.agentClaimLines
      : status === "published"
        ? claims.map((claim) => `- \`${claim.id}\`: ${claim.claim}`).join("\n")
        : "";
    const agentFrontmatter = {
      schemaVersion: 1,
      id: `agent-brief:${slug}`,
      articleId: `article:${slug}`,
      slug,
      title: "Agent Brief for Testing",
      tokenBudget: 2000,
      status,
      updated: today(),
      ...(spec.agentFrontmatterOverrides ?? {})
    };
    const agentYaml = Object.entries(agentFrontmatter)
      .map(([key, value]) => `${key}: ${typeof value === "number" ? value : JSON.stringify(value)}`)
      .join("\n");
    const agentMd = `---\n${agentYaml}\n---\n\nBrief body text.\n${claimLines}\n${spec.agentBodyExtra ?? ""}\n`;

    writeFile(root, sourcePath, articleMd);
    writeFile(root, agentBriefPath, agentMd);
    writeJson(root, `content/articles/${year}/${folderSlug}/artifact.json`, artifact);

    return { spec, year, slug, folderSlug, status, claims, sources, artifact, contentHash };
  });

  const published = loaded.filter((article) => article.status === "published");
  const publishedRoadmaps = roadmaps.filter((roadmap) => roadmap.status === "published");

  for (const roadmap of roadmaps) {
    writeJson(root, `content/roadmap/${roadmap.slug}.json`, roadmap);
  }

  // Generated agent index.
  writeJson(root, "public/agents/index.json", {
    articles: published.map((article) => ({ id: `article:${article.slug}`, slug: article.slug, status: "published" })),
    roadmaps: publishedRoadmaps.map((roadmap) => ({ id: `roadmap:${roadmap.slug}`, slug: roadmap.slug, status: "published" }))
  });
  writeFile(
    root,
    "public/agents/index.jsonl",
    published.map((article) => JSON.stringify({ id: `article:${article.slug}`, slug: article.slug, status: "published" })).join("\n") + (published.length > 0 ? "\n" : "")
  );

  // Per-article and per-roadmap packets.
  for (const article of published) {
    writeJson(root, `public/agents/articles/${article.slug}.json`, {
      id: `article:${article.slug}`,
      slug: article.slug,
      sourceRepoPath: `content/articles/${article.year}/${article.folderSlug}/article.md`
    });
    writeFile(root, `public/agents/articles/${article.slug}.md`, "Generated packet brief.\n");
  }
  for (const roadmap of publishedRoadmaps) {
    writeJson(root, `public/agents/roadmap/${roadmap.slug}.json`, {
      slug: roadmap.slug,
      sourceRepoPath: `content/roadmap/${roadmap.slug}.json`,
      ideas: roadmap.ideas
    });
  }

  // Feeds.
  const claimLines2 = published.flatMap((article) =>
    article.claims.map((claim) => JSON.stringify({ articleId: `article:${article.slug}`, slug: article.slug, claimId: `article:${article.slug}:${claim.id}` }))
  );
  const sourceLines = published.flatMap((article) =>
    article.sources.map((source) => JSON.stringify({ articleId: `article:${article.slug}`, slug: article.slug, sourceId: source.id }))
  );
  writeFile(root, "public/agents/feeds/claims.jsonl", claimLines2.length > 0 ? `${claimLines2.join("\n")}\n` : "");
  writeFile(root, "public/agents/feeds/sources.jsonl", sourceLines.length > 0 ? `${sourceLines.join("\n")}\n` : "");
  writeFile(root, "public/agents/feeds/roadmap.jsonl", "");
  writeFile(root, "public/agents/feeds/edges.jsonl", "");
  writeJson(root, "public/agents/feeds/manifest.json", {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    site: "https://example.com",
    base: "/",
    counts: { claims: claimLines2.length, sources: sourceLines.length, roadmap: 0, edges: 0 },
    files: {
      claims: { path: "agents/feeds/claims.jsonl", count: claimLines2.length },
      sources: { path: "agents/feeds/sources.jsonl", count: sourceLines.length },
      roadmap: { path: "agents/feeds/roadmap.jsonl", count: 0 },
      edges: { path: "agents/feeds/edges.jsonl", count: 0 }
    }
  });

  // Garden queries, eval artifacts, graph, llms.txt.
  writeJson(root, "public/agents/garden-queries.json", {
    schemaVersion: 1,
    schema: "https://example.com/schemas/garden-queries.json",
    site: "https://example.com",
    base: "/",
    generatedAt: new Date().toISOString(),
    dimensions: [],
    queries: []
  });
  writeJson(root, "content/eval/brief-eval-set.json", { schemaVersion: 1, cases: [] });
  writeJson(root, "public/agents/eval-report.json", {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    summary: { total: 0, passed: 0, failed: 0 },
    cases: []
  });
  writeJson(root, "public/graph/nodes.json", published.map((article) => ({ id: `article:${article.slug}` })));
  writeJson(root, "public/graph/edges.json", { schemaVersion: 2, edges: [] });
  writeFile(root, "public/llms.txt", "llms\n");

  return { root, articles: loaded };
}

function runValidate(root) {
  const result = spawnSync(process.execPath, [SCRIPT], { cwd: root, encoding: "utf8" });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe("validate-content happy path", () => {
  test("accepts a minimal draft garden", (t) => {
    const { root } = buildGarden(t);
    const { status, stdout, stderr } = runValidate(root);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /Validated 1 source article\(s\), 0 published article packet\(s\), 0 published roadmap packet\(s\)/);
  });

  test("accepts a garden with a published article and consistent generated files", (t) => {
    const { root } = buildGarden(t, { articles: [publishedSpec()] });
    const { status, stdout, stderr } = runValidate(root);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /Validated 1 source article\(s\), 1 published article packet\(s\), 0 published roadmap packet\(s\)/);
  });

  test("accepts a garden with a published roadmap", (t) => {
    const { root } = buildGarden(t, { roadmaps: [roadmapSpec()] });
    const { status, stdout, stderr } = runValidate(root);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /0 published article packet\(s\), 1 published roadmap packet\(s\)/);
  });

  test("accepts the real repository garden (smoke)", () => {
    const { status, stderr } = runValidate(REPO_ROOT);
    assert.equal(status, 0, stderr);
  });

  test("accepts non-ASCII content throughout an article", (t) => {
    const claims = defaultClaims();
    claims[0].claim = "この主張は検証可能な十分な長さの文章です 🚀 — avec des accents.";
    const { root } = buildGarden(t, {
      articles: [draftSpec({ slug: "unicode-draft", title: "Unicodé Article Title 🚀", claims, body: '<span id="claim-001" class="claim-marker"></span>\n\n内容 🚀 éèê.\n' })]
    });
    const { status, stderr } = runValidate(root);
    assert.equal(status, 0, stderr);
  });

  test("does not choke on calendar-invalid but pattern-valid dates", (t) => {
    const sources = defaultSources().map((source) => ({ ...source, accessed: "2026-02-30" }));
    const { root } = buildGarden(t, {
      articles: [draftSpec({ slug: "bad-date", sources, artifactOverrides: { updatedAt: "2026-02-30", publishedAt: "2026-02-30" } })]
    });
    const { status, stderr } = runValidate(root);
    assert.equal(status, 0, stderr);
  });
});

describe("validate-content article consistency checks", () => {
  test("reports slug and id mismatches between folder, frontmatter, and artifact", (t) => {
    const { root } = buildGarden(t, {
      articles: [draftSpec({ slug: "other-slug", folderSlug: "folder-slug" })]
    });
    const { status, stderr } = runValidate(root);
    assert.equal(status, 1);
    assert.match(stderr, /frontmatter slug does not match folder slug/);
    assert.match(stderr, /frontmatter id must be article:folder-slug/);
    assert.match(stderr, /artifact slug does not match folder slug/);
  });

  test("reports a stale artifact contentHash", (t) => {
    const { root } = buildGarden(t, {
      articles: [draftSpec({ artifactOverrides: { contentHash: sha256("something else") } })]
    });
    const { status, stderr } = runValidate(root);
    assert.equal(status, 1);
    assert.match(stderr, /artifact contentHash is stale/);
  });

  test("reports duplicate claim and source ids", (t) => {
    const claims = defaultClaims();
    claims.push({ ...claims[0], claim: "A different claim text that is still long enough." });
    const sources = defaultSources();
    sources.push({ ...sources[0] });
    const { root } = buildGarden(t, {
      articles: [draftSpec({ claims, sources })]
    });
    const { status, stderr } = runValidate(root);
    assert.equal(status, 1);
    assert.match(stderr, /duplicate claim id claim-001/);
    assert.match(stderr, /duplicate source id source-alpha/);
  });

  test("reports related references to unknown ids", (t) => {
    const { root } = buildGarden(t, {
      articles: [draftSpec({ artifactOverrides: { related: [{ type: "topic", id: "topic:ghost" }, { type: "article", id: "article:ghost" }] } })]
    });
    const { status, stderr } = runValidate(root);
    assert.equal(status, 1);
    assert.match(stderr, /related topic:ghost is not present/);
    assert.match(stderr, /related article:ghost is not present/);
  });

  test("reports unknown and version-mismatched provenance policies", (t) => {
    const ghostPolicy = { id: "policy:ghost", version: "1.0.0" };
    const wrongVersion = { id: "policy:default", version: "9.9.9" };
    const provenanceFor = (policy) => ({
      createdAt: today(),
      createdBy: "test",
      agents: [],
      reviews: [],
      policy
    });
    const { root } = buildGarden(t, {
      articles: [
        draftSpec({ slug: "ghost-policy", provenance: provenanceFor(ghostPolicy) }),
        draftSpec({ slug: "wrong-version", provenance: provenanceFor(wrongVersion) })
      ]
    });
    const { status, stderr } = runValidate(root);
    assert.equal(status, 1);
    assert.match(stderr, /ghost-policy: provenance references unknown policy policy:ghost/);
    assert.match(stderr, /wrong-version: provenance policy version 9\.9\.9 does not match policy:default v1\.0\.0/);
  });

  test("reports agent brief token budget overruns", (t) => {
    const words = Array.from({ length: 150 }, (_, index) => `word${index}`).join(" ");
    const { root } = buildGarden(t, {
      articles: [draftSpec({ agentFrontmatterOverrides: { tokenBudget: 100 }, agentBodyExtra: words })]
    });
    const { status, stderr } = runValidate(root);
    assert.equal(status, 1);
    assert.match(stderr, /exceeds budget 100/);
  });
});

describe("validate-content published brief synchronization", () => {
  test("reports placeholder text, claim text drift, and hallucinated claim ids", (t) => {
    const { root } = buildGarden(t, {
      articles: [publishedSpec({
        agentClaimLines: "- `claim-001`: Completely different wording than the artifact carries.\n- `claim-009`: A claim that does not exist anywhere.",
        agentBodyExtra: "Replace with the first claim."
      })]
    });
    const { status, stderr } = runValidate(root);
    assert.equal(status, 1);
    assert.match(stderr, /template placeholder text/);
    assert.match(stderr, /claim-001 text does not match the artifact claim text/);
    assert.match(stderr, /agent\.md states claim-009, which is not present in artifact claims/);
  });

  test("treats a brief that omits an artifact claim as a warning, not an error", (t) => {
    const claims = defaultClaims();
    claims.push({ ...claims[0], id: "claim-002", claim: "A second claim that is long enough to be valid." });
    const { root } = buildGarden(t, {
      articles: [publishedSpec({ claims, agentClaimLines: "- `claim-001`: A testable claim with enough length to be realistic." })]
    });
    const { status, stdout, stderr } = runValidate(root);
    assert.equal(status, 0, stderr);
    assert.match(stderr, /omits claim-002/);
    assert.match(stdout, /Validated 1 source article/);
  });

  test("reports missing generated packets for a published article", (t) => {
    const { root } = buildGarden(t, { articles: [publishedSpec()] });
    rmSync(path.join(root, "public", "agents", "articles"), { recursive: true, force: true });
    const { status, stderr } = runValidate(root);
    assert.equal(status, 1);
    assert.match(stderr, /Missing generated file: public\/agents\/articles\/pub-one\.json/);
    assert.match(stderr, /Missing generated file: public\/agents\/articles\/pub-one\.md/);
  });
});

describe("validate-content generated index and graph checks", () => {
  test("reports index count mismatches and non-published entries", (t) => {
    const { root } = buildGarden(t);
    writeJson(root, "public/agents/index.json", { articles: [{ id: "article:x", slug: "x", status: "draft" }], roadmaps: [] });
    const { status, stderr } = runValidate(root);
    assert.equal(status, 1);
    assert.match(stderr, /Agent index has 1 article\(s\); expected 0/);
    assert.match(stderr, /Agent index includes non-published article x/);
  });

  test("reports a corrupt agent JSONL feed", (t) => {
    const { root } = buildGarden(t, { articles: [publishedSpec()] });
    writeFile(root, "public/agents/index.jsonl", '{"ok":true}\n{bad json\n');
    const { status, stderr } = runValidate(root);
    assert.equal(status, 1);
    assert.match(stderr, /Agent JSONL has 2 line\(s\); expected 1/);
    assert.match(stderr, /Generated agent index is invalid/);
  });

  test("reports graph duplicates, dangling edges, and wrong schemaVersion", (t) => {
    const { root } = buildGarden(t);
    writeJson(root, "public/graph/nodes.json", [{ id: "a" }, { id: "a" }]);
    writeJson(root, "public/graph/edges.json", {
      schemaVersion: 3,
      edges: [
        { from: "a", type: "x", to: "missing" },
        { from: "ghost", type: "x", to: "a" },
        { from: "a", type: "x", to: "missing" }
      ]
    });
    const { status, stderr } = runValidate(root);
    assert.equal(status, 1);
    assert.match(stderr, /graph: duplicate node id a/);
    assert.match(stderr, /graph: duplicate edge a:x:missing/);
    assert.match(stderr, /graph: edge a:x:missing has missing to node/);
    assert.match(stderr, /graph: edge ghost:x:a has missing from node/);
    assert.match(stderr, /edges\.json schemaVersion 3 is not the expected v2/);
  });

  test("reports garden query results referencing unknown articles", (t) => {
    const { root } = buildGarden(t);
    const catalog = readJson(root, "public/agents/garden-queries.json");
    catalog.queries = [
      { name: "q1", description: "demo", params: {}, resultType: "articles", resultCount: 1, results: [{ articleId: "article:ghost", slug: "ghost", articleUrl: "https://example.com/a" }] }
    ];
    writeJson(root, "public/agents/garden-queries.json", catalog);
    const { status, stderr } = runValidate(root);
    assert.equal(status, 1);
    assert.match(stderr, /garden-queries\/q1: result references unknown article article:ghost/);
  });
});

describe("validate-content feed and eval checks", () => {
  test("reports feed count drift, broken lines, and unknown claim ids", (t) => {
    const { root } = buildGarden(t, { articles: [publishedSpec()] });
    writeFile(root, "public/agents/feeds/claims.jsonl", 'not json\n{"articleId":"article:pub-one","slug":"pub-one","claimId":"article:pub-one:claim-999"}\n');
    const manifest = readJson(root, "public/agents/feeds/manifest.json");
    manifest.counts.claims = 5;
    delete manifest.files;
    writeJson(root, "public/agents/feeds/manifest.json", manifest);
    const { status, stderr } = runValidate(root);
    assert.equal(status, 1);
    assert.match(stderr, /agent-feeds\/claims: line count 2 does not match manifest 5/);
    assert.match(stderr, /agent-feeds\/claims:1: invalid JSON/);
    assert.match(stderr, /agent-feeds\/claims:2: unknown claimId article:pub-one:claim-999/);
  });

  test("reports eval report drift from the eval set", (t) => {
    const { root } = buildGarden(t);
    writeJson(root, "content/eval/brief-eval-set.json", { schemaVersion: 1, cases: [{ id: "case-1", query: {}, expected: {} }] });
    writeJson(root, "public/agents/eval-report.json", {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      summary: { total: 2, passed: 2, failed: 0 },
      cases: [{ id: "case-2", passed: true, query: {}, expected: {}, actual: {}, failures: [] }]
    });
    const { status, stderr } = runValidate(root);
    assert.equal(status, 1);
    assert.match(stderr, /eval-report: case count 2 does not match eval set 1/);
    assert.match(stderr, /eval-report: result id case-2 is not in eval set/);
  });

  test("reports deprecated and incorrect generated article packets", (t) => {
    const { root } = buildGarden(t, { articles: [publishedSpec()] });
    writeJson(root, "public/agents/articles/pub-one.json", {
      sourceMarkdownPath: "content/articles/2026/pub-one/article.md",
      sourceRepoPath: "content/articles/1999/pub-one/article.md"
    });
    const { status, stderr } = runValidate(root);
    assert.equal(status, 1);
    assert.match(stderr, /generated packet uses deprecated sourceMarkdownPath/);
    assert.match(stderr, /generated packet sourceRepoPath is incorrect/);
  });

  test("reports generated roadmap packets leaking internal paths or wrong idea counts", (t) => {
    const { root } = buildGarden(t, { roadmaps: [roadmapSpec()] });
    writeJson(root, "public/agents/roadmap/tooling.json", {
      filePath: "/abs/internal/path",
      sourceRepoPath: "content/roadmap/tooling.json",
      ideas: []
    });
    const { status, stderr } = runValidate(root);
    assert.equal(status, 1);
    assert.match(stderr, /generated packet exposes internal loader paths/);
    assert.match(stderr, /generated packet idea count is incorrect/);
  });
});

describe("validate-content roadmap semantics", () => {
  test("reports duplicate ideas, wrong counts, bad references, and bad source paths", (t) => {
    const roadmap = roadmapSpec({
      id: "roadmap:wrong",
      priorityCounts: { P0: 5, P1: 0, P2: 0 },
      phases: [{ id: "phase-1", name: "First", horizon: "now", outcome: "done", ideaIds: ["idea-one", "idea-ghost"] }],
      ideas: [
        { id: "idea-one", title: "First", priority: "P0", category: "evidence", sourcePaths: ["src/code.ts"], pattern: "p", gardenMapping: "g", firstImplementation: "f", risks: ["r"] },
        { id: "idea-one", title: "First again", priority: "P0", category: "evidence", sourcePaths: ["src/code.ts"], pattern: "p", gardenMapping: "g", firstImplementation: "f", risks: ["r"] }
      ]
    });
    const { root } = buildGarden(t, { roadmaps: [roadmap] });
    const { status, stderr } = runValidate(root);
    assert.equal(status, 1);
    assert.match(stderr, /roadmap\/tooling: id must be roadmap:tooling/);
    assert.match(stderr, /duplicate idea id idea-one/);
    assert.match(stderr, /priorityCounts\.P0 is 5; expected 2/);
    assert.match(stderr, /phase-1 references unknown idea idea-ghost/);
    assert.equal(stderr.match(/has a source path that is not a README, skill, or code reference/g).length, 2);
  });
});

describe("validate-content malformed input handling", () => {
  test("fails cleanly on truncated artifact JSON", (t) => {
    const { root } = buildGarden(t);
    writeFile(root, "content/articles/2026/sample-draft/artifact.json", "{ truncated");
    const { status, stderr } = runValidate(root);
    assert.equal(status, 1);
    assert.match(stderr, /Content validation failed:/);
    assert.doesNotMatch(stderr, /node:internal|^\s+at\s+\S+\s+\(/m);
  });

  test("fails cleanly when artifact fields have the wrong types", (t) => {
    const { root } = buildGarden(t);
    const artifact = readJson(root, "content/articles/2026/sample-draft/artifact.json");
    artifact.claims = 42;
    artifact.sources = "nope";
    artifact.topics = 7;
    artifact.related = true;
    writeJson(root, "content/articles/2026/sample-draft/artifact.json", artifact);
    const { status, stderr } = runValidate(root);
    assert.equal(status, 1);
    assert.match(stderr, /Content validation failed:/);
    assert.match(stderr, /sample-draft artifact/);
    assert.doesNotMatch(stderr, /TypeError|node:internal/);
  });

  test("fails cleanly when artifact.json is not an object", (t) => {
    const { root } = buildGarden(t);
    writeFile(root, "content/articles/2026/sample-draft/artifact.json", "null\n");
    const { status, stderr } = runValidate(root);
    assert.equal(status, 1);
    assert.match(stderr, /Content validation failed:/);
    assert.doesNotMatch(stderr, /TypeError|node:internal/);
  });

  test("fails cleanly when a roadmap has wrongly-typed collections", (t) => {
    const roadmap = roadmapSpec({ ideas: "nope", phases: 7 });
    const { root } = buildGarden(t, { roadmaps: [roadmap] });
    const { status, stderr } = runValidate(root);
    assert.equal(status, 1);
    assert.match(stderr, /Content validation failed:/);
    assert.match(stderr, /roadmap\/tooling roadmap/);
    assert.doesNotMatch(stderr, /TypeError|node:internal/);
  });

  test("reports an empty garden instead of crashing", (t) => {
    const { root } = buildGarden(t, { articles: [] });
    mkdirSync(path.join(root, "content", "articles"), { recursive: true });
    const { status, stderr } = runValidate(root);
    assert.equal(status, 1);
    assert.match(stderr, /No articles found under content\/articles\/<yyyy>\/<slug>/);
  });

  test("does not follow symlinked article directories", (t) => {
    const { root } = buildGarden(t, { articles: [] });
    const outside = path.join(root, "outside", "secret");
    mkdirSync(outside, { recursive: true });
    writeFileSync(path.join(outside, "article.md"), "---\nstatus: draft\n---\nSecret body.\n");
    writeFileSync(path.join(outside, "agent.md"), "---\nstatus: draft\n---\nSecret brief.\n");
    writeFileSync(path.join(outside, "artifact.json"), JSON.stringify({ id: "article:secret", slug: "secret" }));
    mkdirSync(path.join(root, "content", "articles", "2026"), { recursive: true });
    symlinkSync(outside, path.join(root, "content", "articles", "2026", "secret"), "dir");
    const { status, stderr } = runValidate(root);
    assert.equal(status, 1);
    assert.match(stderr, /No articles found/);
    assert.doesNotMatch(stderr, /article:secret|Secret/);
  });
});

describe("validate-content bounded scale", () => {
  test("validates a few hundred draft articles", (t) => {
    const articles = [];
    for (let index = 0; index < 300; index += 1) {
      articles.push(draftSpec({ slug: `bulk-${String(index).padStart(4, "0")}` }));
    }
    const { root } = buildGarden(t, { articles });
    const { status, stdout, stderr } = runValidate(root);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /Validated 300 source article\(s\)/);
  });
});
