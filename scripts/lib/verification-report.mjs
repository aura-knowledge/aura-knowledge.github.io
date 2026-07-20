import { assessArticle } from "./evidence-diagnostics.mjs";

// Findings produced by assessClaim carry an exact claimId. Matching on
// message substrings misattributes findings whose text merely mentions
// another claim's id (e.g. claim-002 citing a source named
// "source-claim-001-replication" would taint claim-001's state).
// orphan-claim findings carry no claimId, so they keep the message match.
function findingBelongsToClaim(finding, claimId) {
  if (finding.claimId) {
    return finding.claimId === claimId;
  }
  return finding.rule === "orphan-claim" && finding.message.includes(claimId);
}

export function computeClaimState(claim, findings) {
  const claimFindings = findings.filter((f) => findingBelongsToClaim(f, claim.id));
  const rules = new Set(claimFindings.map((f) => f.rule));

  if (claim.verification?.status === "verified") return "verified";
  if (claim.verification?.status === "contested") return "contested";
  if (claim.verification?.status === "stale") return "stale";
  if (rules.has("empty-evidence") || rules.has("missing-evidence-snippet")) return "needs-evidence";
  if (rules.has("missing-counterevidence")) return "missing-counterevidence";
  if (rules.has("stale-source")) return "stale";
  return "draft";
}

export function buildVerificationReport(articles, generatedAt = new Date().toISOString()) {
  const report = {
    schemaVersion: 1,
    generatedAt,
    articles: []
  };

  for (const article of articles) {
    const findings = assessArticle(article, article.articleBody, {
      prefix: `${article.year}/${article.slug}`
    });

    const claims = article.artifact.claims.map((claim) => ({
      id: claim.id,
      claim: claim.claim,
      confidence: claim.confidence,
      status: claim.status,
      state: computeClaimState(claim, findings),
      evidenceCount: claim.evidence.length,
      counterevidenceCount: claim.counterevidence.length,
      findings: findings
        .filter((f) => findingBelongsToClaim(f, claim.id))
        .map((f) => ({ rule: f.rule, severity: f.severity, message: f.message }))
    }));

    report.articles.push({
      slug: article.slug,
      title: article.artifact.title,
      status: article.artifact.status,
      claims,
      summary: {
        verified: claims.filter((c) => c.state === "verified").length,
        contested: claims.filter((c) => c.state === "contested").length,
        stale: claims.filter((c) => c.state === "stale").length,
        "needs-evidence": claims.filter((c) => c.state === "needs-evidence").length,
        "missing-counterevidence": claims.filter((c) => c.state === "missing-counterevidence").length,
        draft: claims.filter((c) => c.state === "draft").length
      }
    });
  }

  return report;
}
