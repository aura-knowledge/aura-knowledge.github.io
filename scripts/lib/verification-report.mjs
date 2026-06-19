import { assessArticle } from "./evidence-diagnostics.mjs";

export function computeClaimState(claim, findings) {
  const claimFindings = findings.filter((f) => f.message.includes(claim.id));
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
        .filter((f) => f.message.includes(claim.id))
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
