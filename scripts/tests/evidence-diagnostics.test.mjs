import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  assessArticle,
  assessClaim,
  assessProvenance,
  summarizeFindings
} from "../lib/evidence-diagnostics.mjs";

// Factories build schema-valid shapes; each test then mutates one aspect
// into the adversarial variant under scrutiny.

function makeSource(overrides = {}) {
  return {
    id: "source-alpha",
    title: "Alpha source title",
    url: "https://example.com/alpha",
    type: "paper",
    accessed: "2026-01-01",
    ...overrides
  };
}

function makePacket(overrides = {}) {
  return {
    sourceId: "source-alpha",
    snippet: "A sufficiently long evidence snippet.",
    supports: "direct",
    ...overrides
  };
}

function makeClaim(overrides = {}) {
  return {
    id: "claim-001",
    claim: "A claim with enough characters to be valid.",
    confidence: "medium",
    status: "core",
    evidence: [makePacket()],
    counterevidence: [],
    ...overrides
  };
}

function makeProvenance(overrides = {}) {
  return {
    createdAt: "2026-01-01",
    createdBy: "tester",
    agents: [],
    reviews: [],
    policy: { id: "policy:main", version: "1.0.0" },
    ...overrides
  };
}

function makeArticle({ artifact: artifactOverrides = {}, ...overrides } = {}) {
  return {
    year: "2026",
    slug: "test-article",
    articleFrontmatter: { status: "draft", tags: ["testing"] },
    contentHash: "a".repeat(64),
    artifact: {
      id: "article:test-article",
      status: "draft",
      updatedAt: "2026-01-15",
      sources: [makeSource()],
      claims: [makeClaim()],
      provenance: makeProvenance(),
      ...artifactOverrides
    },
    ...overrides
  };
}

const TODAY = "2026-01-15";

function rules(findings) {
  return findings.map((finding) => finding.rule);
}

describe("assessClaim evidence boundaries", () => {
  test("clean draft claim produces no findings", () => {
    const article = makeArticle({
      artifact: {
        sources: [makeSource(), makeSource({ id: "source-beta", type: "report" })],
        claims: [
          makeClaim({
            evidence: [
              makePacket(),
              makePacket({ sourceId: "source-beta", snippet: "A second valid snippet here." })
            ]
          })
        ]
      }
    });
    const findings = assessClaim(article.artifact.claims[0], article, { today: TODAY });
    assert.deepEqual(findings, []);
  });

  test("zero evidence packets is an empty-evidence error", () => {
    const article = makeArticle({ artifact: { claims: [makeClaim({ evidence: [] })] } });
    const findings = assessClaim(article.artifact.claims[0], article, { today: TODAY });
    const finding = findings.find((f) => f.rule === "empty-evidence");
    assert.equal(finding.severity, "error");
    assert.equal(finding.claimId, "claim-001");
  });

  test("high-confidence or risk-status claims without counterevidence warn; with counterevidence do not", () => {
    const bare = makeArticle({
      artifact: { claims: [makeClaim({ confidence: "high" })] }
    });
    assert.ok(
      rules(assessClaim(bare.artifact.claims[0], bare, { today: TODAY })).includes(
        "missing-counterevidence"
      )
    );

    // risk status triggers the same warning independently of confidence.
    const risk = makeArticle({ artifact: { claims: [makeClaim({ status: "risk" })] } });
    assert.ok(
      rules(assessClaim(risk.artifact.claims[0], risk, { today: TODAY })).includes(
        "missing-counterevidence"
      )
    );

    const covered = makeArticle({
      artifact: {
        claims: [
          makeClaim({
            confidence: "high",
            counterevidence: [
              { sourceId: "source-alpha", summary: "A real qualification of the claim." }
            ]
          })
        ]
      }
    });
    assert.ok(
      !rules(assessClaim(covered.artifact.claims[0], covered, { today: TODAY })).includes(
        "missing-counterevidence"
      )
    );
  });

  test("unsupported confidence and status values are flagged but do not crash", () => {
    const article = makeArticle({
      artifact: { claims: [makeClaim({ confidence: "very-high", status: "Contested" })] }
    });
    const found = rules(assessClaim(article.artifact.claims[0], article, { today: TODAY }));
    assert.ok(found.includes("unsupported-confidence-value"));
    assert.ok(found.includes("unsupported-claim-status"));
  });

  test("snippet length boundaries: 11 warns, 12 passes, 300 passes, 301 warns", () => {
    const at = (length) => {
      const article = makeArticle({
        artifact: { claims: [makeClaim({ evidence: [makePacket({ snippet: "x".repeat(length) })] })] }
      });
      return rules(assessClaim(article.artifact.claims[0], article, { today: TODAY }));
    };
    assert.ok(at(11).includes("missing-evidence-snippet"));
    assert.ok(!at(12).includes("missing-evidence-snippet"));
    assert.ok(!at(300).includes("snippet-too-long"));
    assert.ok(at(301).includes("snippet-too-long"));
  });

  test("missing or whitespace-only snippet is treated as missing without crashing", () => {
    const whitespace = makeArticle({
      artifact: { claims: [makeClaim({ evidence: [makePacket({ snippet: " ".repeat(20) })] })] }
    });
    assert.ok(
      rules(assessClaim(whitespace.artifact.claims[0], whitespace, { today: TODAY })).includes(
        "missing-evidence-snippet"
      )
    );

    // The snippet field absent entirely: malformed input must warn, not crash.
    const absent = makeArticle({
      artifact: { claims: [makeClaim({ evidence: [{ sourceId: "source-alpha" }] })] }
    });
    assert.ok(
      rules(assessClaim(absent.artifact.claims[0], absent, { today: TODAY })).includes(
        "missing-evidence-snippet"
      )
    );
  });
});

describe("assessClaim graph and diversity rules", () => {
  test("dangling evidence and counterevidence source references are errors", () => {
    const article = makeArticle({
      artifact: {
        claims: [
          makeClaim({
            evidence: [makePacket({ sourceId: "source-ghost" })],
            counterevidence: [{ sourceId: "source-phantom", summary: "Qualification text here." }]
          })
        ]
      }
    });
    const findings = assessClaim(article.artifact.claims[0], article, { today: TODAY });
    const dangling = findings.filter((f) => f.rule === "dangling-graph-edge");
    assert.equal(dangling.length, 2);
    assert.ok(dangling.every((f) => f.severity === "error"));
    assert.ok(dangling.some((f) => f.message.includes("source-ghost")));
    assert.ok(dangling.some((f) => f.message.includes("source-phantom")));
  });

  test("counterevidence without sourceId is allowed and does not flag dangling", () => {
    const article = makeArticle({
      artifact: {
        claims: [
          makeClaim({
            confidence: "high",
            counterevidence: [{ summary: "No source, but a real qualification." }]
          })
        ]
      }
    });
    assert.ok(
      !rules(assessClaim(article.artifact.claims[0], article, { today: TODAY })).includes(
        "dangling-graph-edge"
      )
    );
  });

  test("citing the same source twice warns once per repeat", () => {
    const article = makeArticle({
      artifact: {
        claims: [
          makeClaim({
            evidence: [makePacket(), makePacket({ snippet: "Another sufficiently long snippet." })]
          })
        ]
      }
    });
    const findings = assessClaim(article.artifact.claims[0], article, { today: TODAY });
    assert.equal(findings.filter((f) => f.rule === "duplicate-evidence-source").length, 1);
  });

  test("single source and single source type both trigger low-source-diversity", () => {
    const single = makeArticle();
    const singleRules = rules(
      assessClaim(single.artifact.claims[0], single, { today: TODAY })
    );
    assert.equal(singleRules.filter((r) => r === "low-source-diversity").length, 2);

    const diverse = makeArticle({
      artifact: {
        sources: [makeSource(), makeSource({ id: "source-beta", type: "report" })],
        claims: [
          makeClaim({
            evidence: [
              makePacket(),
              makePacket({ sourceId: "source-beta", snippet: "A second valid snippet here." })
            ]
          })
        ]
      }
    });
    assert.ok(
      !rules(assessClaim(diverse.artifact.claims[0], diverse, { today: TODAY })).includes(
        "low-source-diversity"
      )
    );
  });

  test("two sources of the same type trigger single-type diversity warning", () => {
    const article = makeArticle({
      artifact: {
        sources: [makeSource(), makeSource({ id: "source-beta" })],
        claims: [
          makeClaim({
            evidence: [
              makePacket(),
              makePacket({ sourceId: "source-beta", snippet: "A second valid snippet here." })
            ]
          })
        ]
      }
    });
    const findings = assessClaim(article.artifact.claims[0], article, { today: TODAY });
    const diversity = findings.filter((f) => f.rule === "low-source-diversity");
    assert.equal(diversity.length, 1);
    assert.ok(diversity[0].message.includes("single source type"));
  });
});

describe("assessClaim staleness boundaries", () => {
  const articleWithAccess = (accessed) =>
    makeArticle({
      artifact: {
        updatedAt: "2026-01-15",
        sources: [makeSource({ accessed })],
        claims: [makeClaim({ evidence: [makePacket()] })]
      }
    });

  test("source exactly 365 days before update is not stale; 366 days is", () => {
    const at365 = articleWithAccess("2025-01-15"); // 365 days before 2026-01-15
    assert.ok(
      !rules(assessClaim(at365.artifact.claims[0], at365, { today: TODAY })).includes("stale-source")
    );

    const at366 = articleWithAccess("2025-01-14"); // 366 days before 2026-01-15
    const findings = assessClaim(at366.artifact.claims[0], at366, { today: TODAY });
    const stale = findings.find((f) => f.rule === "stale-source");
    assert.ok(stale.message.includes("366 days before article update"));
  });

  test("source exactly 730 days old today is not stale; 731 days is", () => {
    // updatedAt equals accessed here so only the total-age rule can fire.
    const make = (accessed) =>
      makeArticle({
        artifact: {
          updatedAt: accessed,
          sources: [makeSource({ accessed })],
          claims: [makeClaim({ evidence: [makePacket()] })]
        }
      });
    const at730 = make("2024-01-16"); // 730 days before 2026-01-15 (2024 is a leap year)
    assert.ok(
      !rules(assessClaim(at730.artifact.claims[0], at730, { today: TODAY })).includes("stale-source")
    );

    const at731 = make("2024-01-15"); // 731 days before 2026-01-15
    const findings = assessClaim(at731.artifact.claims[0], at731, { today: TODAY });
    assert.ok(findings.some((f) => f.rule === "stale-source" && f.message.includes("731 days old")));
  });

  test("source accessed after article update (negative age) is not stale", () => {
    const article = articleWithAccess("2026-01-20");
    assert.ok(
      !rules(assessClaim(article.artifact.claims[0], article, { today: "2026-01-31" })).includes(
        "stale-source"
      )
    );
  });

  test("invalid-calendar date 2026-02-30 does not crash and never leaks NaN into messages", () => {
    const article = articleWithAccess("2026-02-30");
    const findings = assessClaim(article.artifact.claims[0], article, { today: TODAY });
    assert.ok(Array.isArray(findings));
    for (const finding of findings) {
      assert.ok(!finding.message.includes("NaN"), `NaN leaked into message: ${finding.message}`);
    }
  });
});

describe("assessClaim verification and publication interplay", () => {
  test("published artifact with draft-verified claim warns", () => {
    const article = makeArticle({
      artifact: {
        status: "published",
        claims: [makeClaim({ verification: { reviewedAt: "2026-01-10", reviewer: "human", status: "draft" } })]
      }
    });
    assert.ok(
      rules(assessClaim(article.artifact.claims[0], article, { today: TODAY })).includes(
        "published-article-with-draft-claim"
      )
    );
  });

  test("missing verification is an error only when BOTH frontmatter and artifact are published", () => {
    const claim = makeClaim();
    const bothPublished = makeArticle({
      articleFrontmatter: { status: "published", tags: ["testing"] },
      artifact: { status: "published", claims: [claim] }
    });
    const bothRules = rules(
      assessClaim(bothPublished.artifact.claims[0], bothPublished, { today: TODAY })
    );
    const finding = bothPublished && bothRules.includes("published-claim-missing-verification");
    assert.ok(finding);

    const artifactOnly = makeArticle({
      articleFrontmatter: { status: "draft", tags: ["testing"] },
      artifact: { status: "published", claims: [makeClaim()] }
    });
    assert.ok(
      !rules(assessClaim(artifactOnly.artifact.claims[0], artifactOnly, { today: TODAY })).includes(
        "published-claim-missing-verification"
      )
    );
  });

  test("verified claim with only placeholder snippets is an error; one real snippet clears it", () => {
    const verified = { verification: { reviewedAt: "2026-01-10", reviewer: "human", status: "verified" } };
    const placeholders = makeArticle({
      artifact: {
        claims: [
          makeClaim({
            ...verified,
            evidence: [
              makePacket({ snippet: "Evidence snippet pending." }),
              makePacket({ snippet: "EVIDENCE SNIPPET PENDING review" })
            ]
          })
        ]
      }
    });
    const placeholderFindings = assessClaim(placeholders.artifact.claims[0], placeholders, {
      today: TODAY
    });
    assert.equal(
      placeholderFindings.filter((f) => f.rule === "verified-claim-placeholder-evidence").length,
      1
    );
    assert.equal(placeholderFindings[0].severity, "error");

    const oneReal = makeArticle({
      artifact: {
        claims: [
          makeClaim({
            ...verified,
            evidence: [
              makePacket({ snippet: "Evidence snippet pending." }),
              makePacket({ snippet: "A genuine quote from the source." })
            ]
          })
        ]
      }
    });
    assert.ok(
      !rules(assessClaim(oneReal.artifact.claims[0], oneReal, { today: TODAY })).includes(
        "verified-claim-placeholder-evidence"
      )
    );
  });
});

describe("assessProvenance", () => {
  test("missing provenance is an error when published, warning when draft", () => {
    const draft = makeArticle({ artifact: { provenance: null } });
    const draftFindings = assessProvenance(draft, { today: TODAY });
    assert.equal(draftFindings.length, 1);
    assert.equal(draftFindings[0].rule, "provenance-missing");
    assert.equal(draftFindings[0].severity, "warning");

    const published = makeArticle({
      articleFrontmatter: { status: "published", tags: ["testing"] },
      artifact: { status: "published", provenance: null }
    });
    assert.equal(assessProvenance(published, { today: TODAY })[0].severity, "error");
  });

  test("zero hashes and identical non-zero hashes are caught; zero+equal reports zero only", () => {
    const zeroHash = `sha256:${"0".repeat(64)}`;
    const realHash = `sha256:${"a".repeat(64)}`;

    const zero = makeArticle({
      artifact: {
        provenance: makeProvenance({
          agents: [{ role: "drafter", inputHash: zeroHash, outputHash: realHash }]
        })
      }
    });
    assert.ok(rules(assessProvenance(zero)).includes("provenance-hash-zero"));

    const equal = makeArticle({
      artifact: {
        provenance: makeProvenance({
          agents: [{ role: "drafter", inputHash: realHash, outputHash: realHash }]
        })
      }
    });
    const equalFindings = assessProvenance(equal);
    assert.ok(rules(equalFindings).includes("provenance-hash-equal"));
    assert.ok(!rules(equalFindings).includes("provenance-hash-zero"));

    const bothZero = makeArticle({
      artifact: {
        provenance: makeProvenance({
          agents: [{ role: "drafter", inputHash: zeroHash, outputHash: zeroHash }]
        })
      }
    });
    const bothZeroFindings = assessProvenance(bothZero);
    assert.ok(rules(bothZeroFindings).includes("provenance-hash-zero"));
    assert.ok(!rules(bothZeroFindings).includes("provenance-hash-equal"));
  });

  test("published article with no approved human review is an unapproved-publication error", () => {
    const base = {
      articleFrontmatter: { status: "published", tags: ["testing"] },
      artifact: { status: "published" }
    };
    const rejected = makeArticle({
      ...base,
      artifact: {
        ...base.artifact,
        provenance: makeProvenance({
          reviews: [{ reviewer: "human", reviewedAt: "2026-01-10", status: "rejected", scope: [], notes: "no" }]
        })
      }
    });
    assert.ok(rules(assessProvenance(rejected)).includes("unapproved-publication"));

    const botApproved = makeArticle({
      ...base,
      artifact: {
        ...base.artifact,
        provenance: makeProvenance({
          reviews: [{ reviewer: "agent-bot", reviewedAt: "2026-01-10", status: "approved", scope: [], notes: "ok" }]
        })
      }
    });
    assert.ok(rules(assessProvenance(botApproved)).includes("unapproved-publication"));
  });

  test("latest approved review is chosen by reviewedAt regardless of array order", () => {
    const published = {
      articleFrontmatter: { status: "published", tags: ["testing"] },
      artifact: { status: "published" }
    };
    const article = makeArticle({
      ...published,
      artifact: {
        ...published.artifact,
        provenance: makeProvenance({
          reviews: [
            {
              reviewer: "human",
              reviewedAt: "2026-01-01",
              status: "approved",
              scope: [],
              notes: "older",
              contentHash: "b".repeat(64)
            },
            {
              reviewer: "human",
              reviewedAt: "2026-01-05",
              status: "approved",
              scope: [],
              notes: "newer",
              contentHash: "a".repeat(64) // matches article.contentHash
            }
          ]
        })
      }
    });
    // Newest review matches contentHash, so no mismatch despite the stale older one.
    assert.ok(!rules(assessProvenance(article)).includes("provenance-contentHash-mismatch"));

    const reversed = makeArticle({
      ...published,
      artifact: {
        ...published.artifact,
        provenance: makeProvenance({
          reviews: [
            {
              reviewer: "human",
              reviewedAt: "2026-01-05",
              status: "approved",
              scope: [],
              notes: "newer but mismatching",
              contentHash: "c".repeat(64)
            },
            {
              reviewer: "human",
              reviewedAt: "2026-01-01",
              status: "approved",
              scope: [],
              notes: "older matching",
              contentHash: "a".repeat(64)
            }
          ]
        })
      }
    });
    assert.ok(rules(assessProvenance(reversed)).includes("provenance-contentHash-mismatch"));
  });

  test("latest approved review without contentHash is flagged", () => {
    const article = makeArticle({
      articleFrontmatter: { status: "published", tags: ["testing"] },
      artifact: {
        status: "published",
        provenance: makeProvenance({
          reviews: [{ reviewer: "human", reviewedAt: "2026-01-05", status: "approved", scope: [], notes: "ok" }]
        })
      }
    });
    const findings = assessProvenance(article);
    const finding = findings.find((f) => f.rule === "provenance-contentHash-missing");
    assert.equal(finding.severity, "error");
  });

  test("policy checks honor knownPolicies: unknown id and version mismatch", () => {
    const knownPolicies = new Map([["policy:main", "2.0.0"]]);
    const published = {
      articleFrontmatter: { status: "published", tags: ["testing"] },
      artifact: { status: "published" }
    };

    const unknown = makeArticle({
      ...published,
      artifact: { ...published.artifact, provenance: makeProvenance({ policy: { id: "policy:nope", version: "1.0.0" } }) }
    });
    const unknownFinding = assessProvenance(unknown, { knownPolicies }).find(
      (f) => f.rule === "provenance-policy-missing"
    );
    assert.equal(unknownFinding.severity, "error");

    const mismatch = makeArticle(published);
    const mismatchFinding = assessProvenance(mismatch, { knownPolicies }).find(
      (f) => f.rule === "provenance-policy-mismatch"
    );
    assert.equal(mismatchFinding.severity, "error");

    const matching = makeArticle({
      ...published,
      artifact: { ...published.artifact, provenance: makeProvenance({ policy: { id: "policy:main", version: "2.0.0" } }) }
    });
    assert.ok(
      !rules(assessProvenance(matching, { knownPolicies })).includes("provenance-policy-mismatch")
    );

    // Without knownPolicies, policy references are not checked at all.
    assert.ok(!rules(assessProvenance(unknown)).includes("provenance-policy-missing"));
  });
});

describe("assessArticle markers and accepted diagnostics", () => {
  const markerBody = '<p>Text</p><span id="claim-001" class="claim-marker"></span>';

  test("claim without body marker and marker without claim are both orphan errors", () => {
    const article = makeArticle();
    const noMarker = assessArticle(article, "<p>No markers here.</p>", { today: TODAY });
    const orphan = noMarker.find((f) => f.rule === "orphan-claim");
    assert.equal(orphan.severity, "error");
    assert.ok(orphan.message.includes("claim-001"));

    const extraMarker = assessArticle(
      makeArticle(),
      `${markerBody}<span class="claim-marker" id="claim-002"></span>`,
      { today: TODAY }
    );
    const stray = extraMarker.find((f) => f.message.includes("claim-002"));
    assert.equal(stray.rule, "orphan-claim");
    assert.equal(stray.severity, "error");
  });

  test("marker attributes in either order with extra attributes are recognized", () => {
    const article = makeArticle();
    const body =
      '<span class="claim-marker" data-note="x" id="claim-001" hidden></span>';
    assert.ok(!rules(assessArticle(article, body, { today: TODAY })).includes("orphan-claim"));
  });

  test("duplicate claim ids do not crash; shared marker satisfies both", () => {
    const article = makeArticle({
      artifact: { claims: [makeClaim(), makeClaim()] }
    });
    const findings = assessArticle(article, markerBody, { today: TODAY });
    assert.ok(!rules(findings).includes("orphan-claim"));
  });

  test("accepted diagnostics suppress matching warnings only, never errors", () => {
    const claim = makeClaim({
      confidence: "high", // triggers missing-counterevidence warning
      evidence: [], // triggers empty-evidence error
      status: "bogus-status" // triggers unsupported-claim-status warning
    });
    const article = makeArticle({
      artifact: {
        claims: [claim],
        diagnostics: {
          accepted: [
            { rule: "missing-counterevidence", rationale: "ok", documentedAt: "2026-01-01" },
            { rule: "unsupported-claim-status", scope: ["claim-001"], rationale: "ok", documentedAt: "2026-01-01" },
            { rule: "empty-evidence", scope: "article", rationale: "cannot suppress errors", documentedAt: "2026-01-01" }
          ]
        }
      }
    });
    const findings = assessArticle(article, markerBody, { today: TODAY });
    const found = rules(findings);
    assert.ok(!found.includes("missing-counterevidence"), "article-scope warning suppressed");
    assert.ok(!found.includes("unsupported-claim-status"), "claim-scope warning suppressed");
    assert.ok(found.includes("empty-evidence"), "errors are never suppressed");
  });

  test("custom prefix and default prefix shape the finding messages", () => {
    const article = makeArticle({ artifact: { claims: [makeClaim({ evidence: [] })] } });
    const defaulted = assessArticle(article, markerBody, { today: TODAY });
    assert.ok(defaulted.find((f) => f.rule === "empty-evidence").message.startsWith("2026/test-article: "));

    const custom = assessArticle(article, markerBody, { today: TODAY, prefix: "custom-prefix" });
    assert.ok(custom.every((f) => f.message.startsWith("custom-prefix: ")));
  });
});

describe("summarizeFindings", () => {
  test("counts errors, warnings, and total", () => {
    const findings = [
      { rule: "a", severity: "error", message: "m1" },
      { rule: "b", severity: "warning", message: "m2" },
      { rule: "c", severity: "warning", message: "m3" }
    ];
    const summary = summarizeFindings(findings);
    assert.equal(summary.errors.length, 1);
    assert.equal(summary.warnings.length, 2);
    assert.equal(summary.total, 3);
    assert.deepEqual(summarizeFindings([]), { errors: [], warnings: [], total: 0 });
  });
});
