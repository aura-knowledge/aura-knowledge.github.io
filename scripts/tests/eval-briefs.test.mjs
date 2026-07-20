import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { buildEvalReport, runEvalCase } from "../lib/eval-briefs.mjs";

function stubArticle(slug, artifactOver = {}) {
  return {
    slug,
    articleFrontmatter: { summary: `Summary ${slug}`, tags: [], status: "published" },
    artifact: {
      id: `article:${slug}`,
      title: `Title ${slug}`,
      status: "published",
      maturity: "seed",
      canonicalPath: `/articles/${slug}/`,
      topics: [],
      thesis: `Thesis ${slug}`,
      sources: [],
      claims: [],
      related: [],
      ...artifactOver
    }
  };
}

function stubData(slugs) {
  return {
    index: { site: "https://example.test" },
    articles: slugs.map((slug) => stubArticle(slug)),
    verificationReport: { articles: [] },
    edges: []
  };
}

function stubPackets(entries) {
  return new Map(entries.map(([slug, packet]) => [slug, packet]));
}

function makeCase(over = {}) {
  return { id: "case-1", description: "desc", query: {}, expected: {}, ...over };
}

describe("runEvalCase", () => {
  test("passes when all expectation dimensions are satisfied and echoes the case", () => {
    const data = stubData(["alpha", "beta"]);
    const packets = stubPackets([["alpha", { id: "article:alpha", claims: [{ id: "claim-001" }] }]]);
    const evalCase = makeCase({
      expected: { slugs: ["alpha"], notSlugs: ["gamma"], maxResults: 5, claimIds: ["article:alpha:claim-001"] }
    });
    const result = runEvalCase(evalCase, data, packets);
    assert.equal(result.passed, true);
    assert.deepEqual(result.failures, []);
    assert.equal(result.id, "case-1");
    assert.deepEqual(result.actual.slugs, ["alpha", "beta"]);
    assert.deepEqual(result.actual.claimIds, ["article:alpha:claim-001"]);
    assert.equal(result.expected, evalCase.expected);
  });

  test("reports each missing and unexpected slug by name", () => {
    const result = runEvalCase(
      makeCase({ expected: { slugs: ["gamma"], notSlugs: ["alpha"] } }),
      stubData(["alpha"]),
      new Map()
    );
    assert.equal(result.passed, false);
    assert.deepEqual(result.failures, ["missing slug gamma", "unexpected slug alpha"]);
  });

  test("maxResults boundary: exact count passes, zero with results fails with counts", () => {
    const data = stubData(["alpha", "beta"]);
    const exact = runEvalCase(makeCase({ expected: { maxResults: 2 } }), data, new Map());
    assert.equal(exact.passed, true);
    const zero = runEvalCase(makeCase({ expected: { maxResults: 0 } }), data, new Map());
    assert.equal(zero.passed, false);
    assert.deepEqual(zero.failures, ["result count 2 exceeds expected maxResults 0"]);
  });

  test("maxResults of the wrong type throws instead of silently skipping the check (regression)", () => {
    const data = stubData(["alpha"]);
    assert.throws(
      () => runEvalCase(makeCase({ id: "bad-bound", expected: { maxResults: "1" } }), data, new Map()),
      /bad-bound: expected\.maxResults must be a finite number/
    );
    assert.throws(
      () => runEvalCase(makeCase({ expected: { maxResults: NaN } }), data, new Map()),
      /must be a finite number/
    );
  });

  test("claimIds come from result packets only; a missing packet fails the expectation", () => {
    const result = runEvalCase(
      makeCase({ expected: { claimIds: ["article:beta:claim-001"] } }),
      stubData(["beta"]),
      new Map() // no packet loaded for beta
    );
    assert.equal(result.passed, false);
    assert.deepEqual(result.failures, ["missing claimId article:beta:claim-001"]);
  });

  test("claimIds are composite packet-id:claim-id and deduplicated", () => {
    const packets = stubPackets([
      ["alpha", { id: "article:alpha", claims: [{ id: "claim-001" }, { id: "claim-001" }] }],
      ["beta", { id: "article:beta", claims: [{ id: "claim-001" }] }]
    ]);
    const result = runEvalCase(
      makeCase({ expected: { claimIds: ["article:alpha:claim-001", "article:beta:claim-001"] } }),
      stubData(["alpha", "beta"]),
      packets
    );
    assert.equal(result.passed, true);
    assert.deepEqual(result.actual.claimIds, ["article:alpha:claim-001", "article:beta:claim-001"]);
  });

  test("a packet without a claims array is tolerated", () => {
    const result = runEvalCase(
      makeCase({ expected: {} }),
      stubData(["alpha"]),
      stubPackets([["alpha", { id: "article:alpha" }]])
    );
    assert.equal(result.passed, true);
    assert.deepEqual(result.actual.claimIds, []);
  });

  test("empty or null expectations are vacuous passes", () => {
    const data = stubData(["alpha"]);
    assert.equal(runEvalCase(makeCase({ expected: {} }), data, new Map()).passed, true);
    assert.equal(
      runEvalCase(makeCase({ expected: { slugs: null, notSlugs: null, claimIds: null, maxResults: null } }), data, new Map()).passed,
      true
    );
  });

  test("fails loudly when the case has no expected object at all", () => {
    assert.throws(() => runEvalCase(makeCase({ expected: undefined }), stubData(["alpha"]), new Map()), TypeError);
  });
});

describe("buildEvalReport", () => {
  test("summarizes pass/fail counts and preserves case order", async () => {
    const evalSet = {
      schemaVersion: 1,
      cases: [
        makeCase({ id: "pass-1", expected: { slugs: ["alpha"] } }),
        makeCase({ id: "fail-1", expected: { slugs: ["ghost"] } }),
        makeCase({ id: "pass-2", expected: { notSlugs: ["ghost"] } })
      ]
    };
    const report = await buildEvalReport(evalSet, stubData(["alpha"]), new Map(), "2026-07-01T00:00:00.000Z");
    assert.equal(report.schemaVersion, 1);
    assert.equal(report.generatedAt, "2026-07-01T00:00:00.000Z");
    assert.deepEqual(report.summary, { total: 3, passed: 2, failed: 1 });
    assert.deepEqual(report.cases.map((c) => c.id), ["pass-1", "fail-1", "pass-2"]);
    assert.equal(report.cases[1].passed, false);
  });

  test("an empty eval set yields a zeroed summary", async () => {
    const report = await buildEvalReport({ schemaVersion: 1, cases: [] }, stubData([]), new Map(), "t");
    assert.deepEqual(report.summary, { total: 0, passed: 0, failed: 0 });
    assert.deepEqual(report.cases, []);
  });

  test("5000 cases over 50 articles complete in bounded time", async () => {
    const slugs = Array.from({ length: 50 }, (_, i) => `article-${i}`);
    const cases = Array.from({ length: 5000 }, (_, i) =>
      makeCase({ id: `case-${i}`, expected: { slugs: [slugs[i % 50]], maxResults: 50 } })
    );
    const report = await buildEvalReport({ schemaVersion: 1, cases }, stubData(slugs), new Map(), "t");
    assert.deepEqual(report.summary, { total: 5000, passed: 5000, failed: 0 });
  });
});
