import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { buildVerificationReport, computeClaimState } from "../lib/verification-report.mjs";

function makeClaim(id, over = {}) {
  return {
    id,
    claim: `A sufficiently long claim text for ${id}`,
    confidence: "medium",
    status: "core",
    evidence: [],
    counterevidence: [],
    ...over
  };
}

function realEvidence(sourceId, over = {}) {
  return { sourceId, snippet: "A real evidence snippet of adequate length.", supports: "direct", ...over };
}

function makeSource(id, over = {}) {
  return { id, type: "paper", title: `Source ${id}`, url: "https://example.com", accessed: "2026-05-01", ...over };
}

function makeArticle({
  slug = "test-article",
  year = "2026",
  claims = [],
  sources = [],
  markers = null,
  artifactStatus = "draft",
  updatedAt = "2026-06-01",
  provenance = { reviews: [], agents: [] }
} = {}) {
  const ids = markers ?? claims.map((claim) => claim.id);
  return {
    year,
    slug,
    articleBody: ids.map((id) => `<span id="${id}" class="claim-marker"></span>`).join("\n"),
    articleFrontmatter: { status: artifactStatus },
    contentHash: "0".repeat(64),
    artifact: {
      id: `article:${slug}`,
      title: `Title ${slug}`,
      status: artifactStatus,
      updatedAt,
      topics: [],
      related: [],
      maturity: "seed",
      canonicalPath: `/articles/${slug}/`,
      sources,
      claims,
      provenance
    }
  };
}

describe("computeClaimState precedence", () => {
  const staleFinding = { rule: "stale-source", severity: "warning", claimId: "claim-001", message: "p: claim-001 evidence source s is 900 days old." };
  const emptyFinding = { rule: "empty-evidence", severity: "error", claimId: "claim-001", message: "p: claim-001 has no evidence packets." };
  const counterFinding = { rule: "missing-counterevidence", severity: "warning", claimId: "claim-001", message: "p: claim-001 ... no counterevidence." };

  test("explicit verification status wins over any findings", () => {
    for (const status of ["verified", "contested", "stale"]) {
      const claim = makeClaim("claim-001", { verification: { status, reviewedAt: "2026-01-01", reviewer: "r" } });
      assert.equal(computeClaimState(claim, [emptyFinding, counterFinding, staleFinding]), status);
    }
  });

  test("finding rules map to states with documented priority order", () => {
    const claim = makeClaim("claim-001");
    assert.equal(computeClaimState(claim, [emptyFinding]), "needs-evidence");
    assert.equal(
      computeClaimState(claim, [{ rule: "missing-evidence-snippet", severity: "warning", claimId: "claim-001", message: "p: claim-001 lacks a snippet." }]),
      "needs-evidence"
    );
    assert.equal(computeClaimState(claim, [counterFinding]), "missing-counterevidence");
    assert.equal(computeClaimState(claim, [staleFinding]), "stale");
    assert.equal(computeClaimState(claim, []), "draft");
    // needs-evidence beats missing-counterevidence beats stale.
    assert.equal(computeClaimState(claim, [counterFinding, emptyFinding, staleFinding]), "needs-evidence");
    assert.equal(computeClaimState(claim, [counterFinding, staleFinding]), "missing-counterevidence");
  });

  test("state-changing rules from unrelated findings do not leak in", () => {
    const claim = makeClaim("claim-001");
    const foreign = { rule: "empty-evidence", severity: "error", claimId: "claim-002", message: "p: claim-002 has no evidence packets." };
    assert.equal(computeClaimState(claim, [foreign]), "draft");
  });

  test("orphan-claim findings still match by message (they carry no claimId)", () => {
    const claim = makeClaim("claim-001");
    const orphan = { rule: "orphan-claim", severity: "error", message: "p: claim-001 is missing a visible article marker." };
    // orphan-claim does not influence state, but must remain attributable.
    assert.equal(computeClaimState(claim, [orphan]), "draft");
  });
});

describe("buildVerificationReport", () => {
  test("computes one entry per state and an exact summary", () => {
    const article = makeArticle({
      claims: [
        makeClaim("claim-001", { verification: { status: "verified", reviewedAt: "2026-01-01", reviewer: "r" }, evidence: [realEvidence("source-a")] }),
        makeClaim("claim-002", { verification: { status: "contested", reviewedAt: "2026-01-01", reviewer: "r" }, evidence: [realEvidence("source-a")], counterevidence: [{ summary: "A real counter consideration." }] }),
        makeClaim("claim-003", { verification: { status: "stale", reviewedAt: "2026-01-01", reviewer: "r" }, evidence: [realEvidence("source-a")] }),
        makeClaim("claim-004"),
        makeClaim("claim-005", { confidence: "high", evidence: [realEvidence("source-a")] }),
        makeClaim("claim-006", { evidence: [realEvidence("source-a")] })
      ],
      sources: [makeSource("source-a")]
    });
    const report = buildVerificationReport([article], "2026-07-01T00:00:00.000Z");
    assert.equal(report.schemaVersion, 1);
    assert.equal(report.generatedAt, "2026-07-01T00:00:00.000Z");
    assert.equal(report.articles.length, 1);
    const entry = report.articles[0];
    assert.deepEqual(entry.claims.map((c) => c.state), [
      "verified",
      "contested",
      "stale",
      "needs-evidence",
      "missing-counterevidence",
      "draft"
    ]);
    assert.deepEqual(entry.summary, {
      verified: 1,
      contested: 1,
      stale: 1,
      "needs-evidence": 1,
      "missing-counterevidence": 1,
      draft: 1
    });
    assert.equal(entry.claims[0].evidenceCount, 1);
    assert.equal(entry.claims[1].counterevidenceCount, 1);
  });

  test("finding attribution uses exact claimId, not message substrings (regression)", () => {
    // claim-002 cites a stale source whose schema-legal id embeds claim-001's id.
    // Substring matching used to taint claim-001's state with claim-002's finding.
    const article = makeArticle({
      claims: [
        makeClaim("claim-001", { evidence: [realEvidence("source-fresh-a"), realEvidence("source-fresh-b")] }),
        makeClaim("claim-002", { evidence: [realEvidence("source-claim-001-replication"), realEvidence("source-fresh-b")] })
      ],
      sources: [
        makeSource("source-fresh-a", { accessed: "2026-05-01" }),
        makeSource("source-fresh-b", { type: "report", accessed: "2026-05-01" }),
        makeSource("source-claim-001-replication", { accessed: "2024-01-01" })
      ]
    });
    const [entry] = buildVerificationReport([article], "2026-07-01T00:00:00.000Z").articles;
    const [first, second] = entry.claims;
    assert.equal(second.state, "stale");
    assert.ok(second.findings.some((f) => f.rule === "stale-source"));
    assert.equal(first.state, "draft");
    assert.deepEqual(first.findings, []);
    assert.deepEqual(entry.summary, {
      verified: 0,
      contested: 0,
      stale: 1,
      "needs-evidence": 0,
      "missing-counterevidence": 0,
      draft: 1
    });
  });

  test("article-level provenance findings are not attributed to claims", () => {
    const article = makeArticle({
      claims: [makeClaim("claim-001", { evidence: [realEvidence("source-a"), realEvidence("source-b")] })],
      sources: [makeSource("source-a"), makeSource("source-b", { type: "report" })],
      provenance: { reviews: [], agents: [{ role: "claim-001-bot", inputHash: `sha256:${"0".repeat(64)}` }] }
    });
    const [entry] = buildVerificationReport([article], "2026-07-01T00:00:00.000Z").articles;
    assert.deepEqual(entry.claims[0].findings, []);
  });

  test("orphan-claim findings stay attached to the affected claim", () => {
    const article = makeArticle({ claims: [makeClaim("claim-001")], markers: [] });
    const [entry] = buildVerificationReport([article], "2026-07-01T00:00:00.000Z").articles;
    assert.ok(entry.claims[0].findings.some((f) => f.rule === "orphan-claim" && f.message.includes("claim-001")));
  });

  test("identical claim ids in different articles stay independent", () => {
    const dirty = makeArticle({ slug: "dirty", claims: [makeClaim("claim-001")] });
    const clean = makeArticle({ slug: "clean", claims: [makeClaim("claim-001", { evidence: [realEvidence("source-a")] })], sources: [makeSource("source-a")] });
    const report = buildVerificationReport([dirty, clean], "2026-07-01T00:00:00.000Z");
    assert.equal(report.articles[0].claims[0].state, "needs-evidence");
    assert.equal(report.articles[1].claims[0].state, "draft");
  });

  test("an article with zero claims yields a zeroed summary", () => {
    const article = makeArticle({ claims: [], markers: [] });
    const [entry] = buildVerificationReport([article], "2026-07-01T00:00:00.000Z").articles;
    assert.deepEqual(entry.claims, []);
    assert.deepEqual(entry.summary, {
      verified: 0,
      contested: 0,
      stale: 0,
      "needs-evidence": 0,
      "missing-counterevidence": 0,
      draft: 0
    });
  });

  test("fails loudly on an artifact without a claims array", () => {
    const article = makeArticle({ claims: [makeClaim("claim-001")] });
    delete article.artifact.claims;
    assert.throws(() => buildVerificationReport([article], "2026-07-01T00:00:00.000Z"), TypeError);
  });

  test("handles 2000 claims with 2000 findings in bounded time", () => {
    const claims = Array.from({ length: 2000 }, (_, i) => makeClaim(`claim-${String(i).padStart(3, "0")}`));
    const article = makeArticle({ claims });
    const report = buildVerificationReport([article], "2026-07-01T00:00:00.000Z");
    assert.equal(report.articles[0].summary["needs-evidence"], 2000);
    assert.equal(report.articles[0].claims.length, 2000);
  });
});
