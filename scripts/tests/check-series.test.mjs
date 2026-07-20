import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../check-series.mjs", import.meta.url));
const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));

const SERIES_SLUG = "long-human-road-to-ai";
const SERIES_TITLE = "The Long Human Road to AI";
const CANONICAL = [
  ["long-human-road-to-ai", "guide"],
  ["before-machines", "chapter"],
  ["formal-logic-to-computation", "chapter"],
  ["birth-of-ai", "chapter"],
  ["ai-winters-expert-systems", "chapter"],
  ["learning-machines", "chapter"],
  ["foundation-models", "chapter"],
  ["human-systems", "chapter"]
];

function makeRoot(t) {
  const root = mkdtempSync(path.join(tmpdir(), "check-series-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function writeArtifact(root, slug, artifact, year = "2026") {
  const dir = path.join(root, "content", "articles", year, slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "artifact.json"), JSON.stringify(artifact));
  return dir;
}

function canonicalEntries(overrides = {}) {
  return CANONICAL.map(([slug, role], order) => ({
    slug,
    status: "published",
    series: { slug: SERIES_SLUG, title: SERIES_TITLE, order, role },
    ...overrides[slug]
  }));
}

function seedCanonical(root, entries = canonicalEntries()) {
  for (const entry of entries) {
    writeArtifact(root, entry.slug, entry);
  }
}

function runCheck(root) {
  const result = spawnSync(process.execPath, [SCRIPT], { cwd: root, encoding: "utf8" });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe("check-series happy path", () => {
  test("accepts the canonical eight-entry series", (t) => {
    const root = makeRoot(t);
    seedCanonical(root);
    const { status, stdout, stderr } = runCheck(root);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /Article series check passed\./);
  });

  test("accepts the real repository garden (smoke)", () => {
    const { status, stderr } = runCheck(REPO_ROOT);
    assert.equal(status, 0, stderr);
  });

  test("accepts a valid additional published series alongside the canonical one", (t) => {
    const root = makeRoot(t);
    seedCanonical(root);
    const extra = [
      { order: 0, role: "guide" },
      { order: 1, role: "chapter" },
      { order: 2, role: "appendix" }
    ];
    for (const { order, role } of extra) {
      writeArtifact(root, `extra-${order}`, {
        slug: `extra-${order}`,
        status: "published",
        series: { slug: "extra-series", title: "An Extra Series Title", order, role }
      });
    }
    const { status, stderr } = runCheck(root);
    assert.equal(status, 0, stderr);
  });
});

describe("check-series long-human-road-to-ai invariant", () => {
  test("fails when the series has only seven entries", (t) => {
    const root = makeRoot(t);
    seedCanonical(root, canonicalEntries().filter((entry) => entry.slug !== "human-systems"));
    const { status, stderr } = runCheck(root);
    assert.equal(status, 1);
    assert.match(stderr, /must contain 8 entries; found 7/);
  });

  test("fails when two entries swap their order values", (t) => {
    const root = makeRoot(t);
    const entries = canonicalEntries({
      "before-machines": { series: { slug: SERIES_SLUG, title: SERIES_TITLE, order: 2, role: "chapter" } },
      "formal-logic-to-computation": { series: { slug: SERIES_SLUG, title: SERIES_TITLE, order: 1, role: "chapter" } }
    });
    seedCanonical(root, entries);
    const { status, stderr } = runCheck(root);
    assert.equal(status, 1);
    assert.match(stderr, /order is long-human-road-to-ai, formal-logic-to-computation, before-machines/);
  });

  test("fails when order values are duplicated", (t) => {
    const root = makeRoot(t);
    const entries = canonicalEntries({
      "birth-of-ai": { series: { slug: SERIES_SLUG, title: SERIES_TITLE, order: 2, role: "chapter" } }
    });
    seedCanonical(root, entries);
    const { status, stderr } = runCheck(root);
    assert.equal(status, 1);
    assert.match(stderr, /series orders must be unique/);
  });

  test("fails when the reader guide is not the first entry", (t) => {
    const root = makeRoot(t);
    const entries = canonicalEntries({
      "long-human-road-to-ai": { series: { slug: SERIES_SLUG, title: SERIES_TITLE, order: 0, role: "chapter" } }
    });
    seedCanonical(root, entries);
    const { status, stderr } = runCheck(root);
    assert.equal(status, 1);
    assert.match(stderr, /reader guide must be first with role guide/);
  });
});

describe("check-series series metadata validation", () => {
  function seedBadSeriesArticle(root, series) {
    seedCanonical(root);
    writeArtifact(root, "bad-series", { slug: "bad-series", status: "draft", series });
  }

  test("rejects unsafe series slugs, including non-ASCII", (t) => {
    const root = makeRoot(t);
    seedBadSeriesArticle(root, { slug: "Bad_Slug", title: "A Perfectly Fine Title", order: 0, role: "guide" });
    writeArtifact(root, "unicode-series", {
      slug: "unicode-series",
      status: "draft",
      series: { slug: "série-ünïcode", title: "A Perfectly Fine Title", order: 0, role: "guide" }
    });
    const { status, stderr } = runCheck(root);
    assert.equal(status, 1);
    assert.equal(stderr.match(/series\.slug must be a safe slug/g).length, 2);
  });

  test("rejects wrong-typed and out-of-range metadata fields", (t) => {
    const root = makeRoot(t);
    seedCanonical(root);
    writeArtifact(root, "bad-order", {
      slug: "bad-order",
      status: "draft",
      series: { slug: "ok-slug", title: "A Perfectly Fine Title", order: 1.5, role: "chapter" }
    });
    writeArtifact(root, "string-order", {
      slug: "string-order",
      status: "draft",
      series: { slug: "ok-slug", title: "A Perfectly Fine Title", order: "1", role: "chapter" }
    });
    writeArtifact(root, "negative-order", {
      slug: "negative-order",
      status: "draft",
      series: { slug: "ok-slug", title: "A Perfectly Fine Title", order: -1, role: "chapter" }
    });
    writeArtifact(root, "bad-role", {
      slug: "bad-role",
      status: "draft",
      series: { slug: "ok-slug", title: "A Perfectly Fine Title", order: 0, role: "boss" }
    });
    writeArtifact(root, "bad-title", {
      slug: "bad-title",
      status: "draft",
      series: { slug: "ok-slug", title: "short", order: 0, role: "chapter" }
    });
    const { status, stderr } = runCheck(root);
    assert.equal(status, 1);
    assert.equal(stderr.match(/series\.order must be a non-negative integer/g).length, 3);
    assert.match(stderr, /series\.role must be guide, chapter, companion, or appendix/);
    assert.match(stderr, /series\.title must be a readable title/);
  });
});

describe("check-series published series group rules", () => {
  function seedGroup(root, entries, seriesSlug = "group-series") {
    seedCanonical(root);
    for (const entry of entries) {
      writeArtifact(root, entry.slug, {
        slug: entry.slug,
        status: entry.status ?? "published",
        series: { slug: seriesSlug, title: "A Grouped Series Title", order: entry.order, role: entry.role, ...(entry.arc ? { arc: entry.arc } : {}) }
      });
    }
  }

  test("rejects non-contiguous orders", (t) => {
    const root = makeRoot(t);
    seedGroup(root, [
      { slug: "g0", order: 0, role: "guide" },
      { slug: "g2", order: 2, role: "chapter" }
    ]);
    const { status, stderr } = runCheck(root);
    assert.equal(status, 1);
    assert.match(stderr, /group-series: series orders must be contiguous 0\.\.1; found 0, 2/);
  });

  test("rejects duplicate orders within a published group", (t) => {
    const root = makeRoot(t);
    seedGroup(root, [
      { slug: "g0", order: 0, role: "guide" },
      { slug: "g1", order: 1, role: "chapter" },
      { slug: "g1b", order: 1, role: "chapter" }
    ]);
    const { status, stderr } = runCheck(root);
    assert.equal(status, 1);
    assert.match(stderr, /group-series: series orders must be unique; found duplicates in 0, 1, 1/);
  });

  test("rejects a group whose first entry is not exactly one guide at order 0", (t) => {
    // No guide at order 0 at all.
    let root = makeRoot(t);
    seedGroup(root, [
      { slug: "g0", order: 0, role: "chapter" },
      { slug: "g1", order: 1, role: "guide" }
    ]);
    let { status, stderr } = runCheck(root);
    assert.equal(status, 1);
    assert.match(stderr, /group-series: series must start with exactly one entry with role guide at order 0/);

    // Two guides competing for the lead.
    root = makeRoot(t);
    seedGroup(root, [
      { slug: "g0", order: 0, role: "guide" },
      { slug: "g1", order: 1, role: "guide" }
    ]);
    ({ status, stderr } = runCheck(root));
    assert.equal(status, 1);
    assert.match(stderr, /group-series: series must start with exactly one entry with role guide at order 0/);
  });

  test("ignores draft entries when checking group contiguity", (t) => {
    const root = makeRoot(t);
    seedGroup(root, [
      { slug: "g0", order: 0, role: "guide" },
      { slug: "g1", order: 1, role: "chapter" },
      { slug: "g2", order: 5, role: "chapter", status: "draft" }
    ]);
    const { status, stderr } = runCheck(root);
    assert.equal(status, 0, stderr);
  });
});

describe("check-series attention series rules", () => {
  const ATTENTION = "attention-substance-ai-moment";

  function seedAttention(root, entries) {
    seedCanonical(root);
    for (const entry of entries) {
      const dir = writeArtifact(root, entry.slug, {
        slug: entry.slug,
        status: "published",
        series: { slug: ATTENTION, title: "Attention and the Substance of the AI Moment", order: entry.order, role: entry.role, ...(entry.arc ? { arc: entry.arc } : {}) }
      });
      writeFileSync(path.join(dir, "article.md"), entry.body ?? "Plain article body.");
    }
  }

  test("non-guide entries must declare a known arc; the guide is exempt", (t) => {
    const root = makeRoot(t);
    seedAttention(root, [
      { slug: "a0", order: 0, role: "guide" }, // exempt: no arc required
      { slug: "a1", order: 1, role: "chapter", arc: "diagnosis" }, // known arc: accepted
      { slug: "a2", order: 2, role: "chapter" }, // missing arc
      { slug: "a3", order: 3, role: "chapter", arc: "not-a-real-arc" } // unknown arc
    ]);
    const { status, stderr } = runCheck(root);
    assert.equal(status, 1);
    // Exactly two errors proves the guide and the known-arc chapter were accepted.
    assert.equal(stderr.match(/attention series entries must declare series\.arc/g).length, 2);
  });

  test("rejects a hardcoded article-kicker line in article.md", (t) => {
    const root = makeRoot(t);
    seedAttention(root, [
      { slug: "a0", order: 0, role: "guide" },
      { slug: "a1", order: 1, role: "chapter", arc: "synthesis", body: '<p class="article-kicker">Hardcoded.</p>' }
    ]);
    const { status, stderr } = runCheck(root);
    assert.equal(status, 1);
    assert.match(stderr, /hardcoded article-kicker line/);
  });
});

describe("check-series malformed input handling", () => {
  test("reports unreadable artifact JSON instead of crashing", (t) => {
    const root = makeRoot(t);
    seedCanonical(root);
    const dir = path.join(root, "content", "articles", "2026", "broken-json");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "artifact.json"), "{ not valid json");
    const { status, stderr } = runCheck(root);
    assert.equal(status, 1);
    assert.match(stderr, /Article series check failed:/);
    assert.match(stderr, /broken-json\/artifact\.json/);
    assert.doesNotMatch(stderr, /node:internal|^\s+at\s/m);
  });

  test("reports a missing artifact.json instead of crashing", (t) => {
    const root = makeRoot(t);
    seedCanonical(root);
    mkdirSync(path.join(root, "content", "articles", "2026", "no-artifact"), { recursive: true });
    const { status, stderr } = runCheck(root);
    assert.equal(status, 1);
    assert.match(stderr, /Article series check failed:/);
    assert.match(stderr, /no-artifact\/artifact\.json/);
    assert.doesNotMatch(stderr, /node:internal|^\s+at\s/m);
  });

  test("reports non-object artifact payloads instead of crashing", (t) => {
    const root = makeRoot(t);
    seedCanonical(root);
    for (const [slug, payload] of [["null-art", "null"], ["array-art", "[1,2,3]"], ["number-art", "42"]]) {
      const dir = path.join(root, "content", "articles", "2026", slug);
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, "artifact.json"), payload);
    }
    const { status, stderr } = runCheck(root);
    assert.equal(status, 1);
    assert.match(stderr, /Article series check failed:/);
    for (const slug of ["null-art", "array-art", "number-art"]) {
      assert.match(stderr, new RegExp(`${slug}/artifact\\.json`), `expected an error for ${slug}`);
    }
    assert.doesNotMatch(stderr, /node:internal|TypeError/);
  });

  test("does not follow symlinked article directories", (t) => {
    const root = makeRoot(t);
    seedCanonical(root);
    const outside = path.join(root, "outside", "secret-article");
    mkdirSync(outside, { recursive: true });
    writeFileSync(path.join(outside, "artifact.json"), JSON.stringify({
      slug: "secret-article",
      status: "published",
      series: { slug: "secret", title: "A Secret Series Title", order: 0, role: "guide" }
    }));
    symlinkSync(outside, path.join(root, "content", "articles", "2026", "secret-article"), "dir");
    const { status, stderr } = runCheck(root);
    assert.equal(status, 0, stderr);
    assert.doesNotMatch(stderr, /secret/);
  });
});

describe("check-series bounded scale", () => {
  test("handles several hundred articles without series metadata", (t) => {
    const root = makeRoot(t);
    seedCanonical(root);
    for (let index = 0; index < 400; index += 1) {
      writeArtifact(root, `bulk-${String(index).padStart(4, "0")}`, { slug: `bulk-${index}`, status: "draft" });
    }
    const { status, stderr } = runCheck(root);
    assert.equal(status, 0, stderr);
  });
});
