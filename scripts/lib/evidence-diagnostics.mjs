import { readFile } from "node:fs/promises";
import path from "node:path";

const CONFIDENCE_VALUES = new Set(["low", "medium", "medium-high", "high"]);
const CLAIM_STATUS_VALUES = new Set([
  "core",
  "landscape",
  "forecast",
  "proposal",
  "normative",
  "risk",
  "argument",
  "design",
  "strategy",
  "framing",
  "behavioral"
]);
const SOURCE_TYPES = new Set([
  "paper",
  "article",
  "report",
  "book",
  "dataset",
  "protocol",
  "tool",
  "standard",
  "newsletter",
  "blog",
  "repository",
  "documentation",
  "inline"
]);

function daysBetween(left, right) {
  const leftDate = new Date(left);
  const rightDate = new Date(right);
  return Math.floor((rightDate - leftDate) / (1000 * 60 * 60 * 24));
}

export function assessClaim(claim, article, options = {}) {
  const findings = [];
  const prefix = options.prefix ?? `${article.year}/${article.slug}`;
  const articleUpdatedAt = article.artifact.updatedAt;
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const sourceIds = new Set(article.artifact.sources.map((source) => source.id));
  const sourceById = new Map(article.artifact.sources.map((source) => [source.id, source]));

  function add(rule, severity, message) {
    findings.push({ rule, severity, message: `${prefix}: ${message}` });
  }

  // orphan-claim is checked outside this function because it needs article body.

  if (claim.evidence.length === 0) {
    add("empty-evidence", "error", `${claim.id} has no evidence packets.`);
  }

  if (
    claim.confidence === "high" ||
    claim.status === "contested" ||
    claim.status === "risk"
  ) {
    if (claim.counterevidence.length === 0) {
      add(
        "missing-counterevidence",
        "warning",
        `${claim.id} is high-confidence, contested, or risk-status but has no counterevidence.`
      );
    }
  }

  if (!CONFIDENCE_VALUES.has(claim.confidence)) {
    add(
      "unsupported-confidence-value",
      "warning",
      `${claim.id} uses unsupported confidence "${claim.confidence}".`
    );
  }

  if (!CLAIM_STATUS_VALUES.has(claim.status)) {
    add(
      "unsupported-claim-status",
      "warning",
      `${claim.id} uses unsupported status "${claim.status}".`
    );
  }

  if (claim.verification?.status === "draft" && article.artifact.status === "published") {
    add(
      "published-article-with-draft-claim",
      "warning",
      `${claim.id} is draft-verified but the article is published.`
    );
  }

  const seenEvidenceSources = new Set();
  for (const packet of claim.evidence) {
    if (packet.sourceId && !sourceIds.has(packet.sourceId)) {
      add(
        "dangling-graph-edge",
        "error",
        `${claim.id} evidence references missing source ${packet.sourceId}.`
      );
    }

    if (!packet.snippet || packet.snippet.trim().length < 12) {
      add("missing-evidence-snippet", "warning", `${claim.id} evidence packet lacks a snippet.`);
    }

    if (packet.snippet && packet.snippet.length > 300) {
      add("snippet-too-long", "warning", `${claim.id} evidence snippet exceeds 300 characters.`);
    }

    if (packet.sourceId) {
      if (seenEvidenceSources.has(packet.sourceId)) {
        add(
          "duplicate-evidence-source",
          "warning",
          `${claim.id} cites source ${packet.sourceId} more than once in evidence.`
        );
      }
      seenEvidenceSources.add(packet.sourceId);

      const source = sourceById.get(packet.sourceId);
      if (source) {
        const ageDays = daysBetween(source.accessed, articleUpdatedAt);
        if (ageDays > 365) {
          add(
            "stale-source",
            "warning",
            `${claim.id} evidence source ${packet.sourceId} was accessed ${ageDays} days before article update.`
          );
        }
        const totalAgeDays = daysBetween(source.accessed, today);
        if (totalAgeDays > 730) {
          add(
            "stale-source",
            "warning",
            `${claim.id} evidence source ${packet.sourceId} is ${totalAgeDays} days old.`
          );
        }
      }
    }
  }

  if (claim.evidence.length > 0) {
    const evidenceSources = claim.evidence
      .map((packet) => packet.sourceId)
      .filter(Boolean);
    if (new Set(evidenceSources).size === 1) {
      add(
        "low-source-diversity",
        "warning",
        `${claim.id} relies on a single source for evidence.`
      );
    }

    const evidenceTypes = new Set(
      claim.evidence
        .map((packet) => packet.sourceId && sourceById.get(packet.sourceId)?.type)
        .filter(Boolean)
    );
    if (evidenceTypes.size === 1) {
      add(
        "low-source-diversity",
        "warning",
        `${claim.id} relies on a single source type for evidence.`
      );
    }
  }

  for (const packet of claim.counterevidence) {
    if (packet.sourceId && !sourceIds.has(packet.sourceId)) {
      add(
        "dangling-graph-edge",
        "error",
        `${claim.id} counterevidence references missing source ${packet.sourceId}.`
      );
    }

    if (!packet.summary || packet.summary.trim().length < 12) {
      add(
        "counterevidence-missing-qualification",
        "warning",
        `${claim.id} counterevidence lacks a summary/qualification.`
      );
    }
  }

  return findings;
}

export function assessProvenance(article, options = {}) {
  const findings = [];
  const prefix = options.prefix ?? `${article.year}/${article.slug}`;
  const isPublished =
    article.articleFrontmatter?.status === "published" && article.artifact.status === "published";
  const provenance = article.artifact.provenance;

  function add(rule, severity, message) {
    findings.push({ rule, severity, message: `${prefix}: ${message}` });
  }

  if (!provenance) {
    add("provenance-missing", isPublished ? "error" : "warning", "artifact is missing provenance.");
    return findings;
  }

  const knownPolicyIds = options.knownPolicyIds;
  if (knownPolicyIds && provenance.policy?.id && !knownPolicyIds.has(provenance.policy.id)) {
    add(
      "provenance-policy-missing",
      isPublished ? "error" : "warning",
      `provenance references unknown policy ${provenance.policy.id}.`
    );
  }

  const humanReviews = provenance.reviews?.filter(
    (review) => review.reviewer === "human" && review.status === "approved"
  );

  if (isPublished && (!humanReviews || humanReviews.length === 0)) {
    add(
      "unapproved-publication",
      "error",
      "published article has no human review with status approved in provenance."
    );
  }

  if (humanReviews && humanReviews.length > 0) {
    const latest = humanReviews[humanReviews.length - 1];
    if (!latest.contentHash) {
      add(
        "provenance-contentHash-missing",
        isPublished ? "error" : "warning",
        "latest approved review is missing contentHash."
      );
    } else if (latest.contentHash !== article.contentHash) {
      add(
        "provenance-contentHash-mismatch",
        "error",
        `latest approved review contentHash does not match current article.md hash. Run npm run generate to refresh or re-approve.`
      );
    }
  }

  return findings;
}

export function assessArticle(article, body, options = {}) {
  const findings = [];
  const prefix = options.prefix ?? `${article.year}/${article.slug}`;

  findings.push(...assessProvenance(article, options));

  const markerPattern = /<span(?:\s+[^>]*?)?\s+id="(claim-[0-9]{3})"(?:\s+[^>]*?)?\s+class="[^"]*claim-marker[^"]*"(?:\s+[^>]*?)?>|<span(?:\s+[^>]*?)?\s+class="[^"]*claim-marker[^"]*"(?:\s+[^>]*?)?\s+id="(claim-[0-9]{3})"(?:\s+[^>]*?)?>/g;
  const markers = new Set();
  let match;
  while ((match = markerPattern.exec(body)) !== null) {
    markers.add(match[1] ?? match[2]);
  }

  const artifactClaims = new Set(article.artifact.claims.map((claim) => claim.id));

  for (const claimId of artifactClaims) {
    if (!markers.has(claimId)) {
      findings.push({
        rule: "orphan-claim",
        severity: "error",
        message: `${prefix}: ${claimId} is missing a visible article marker.`
      });
    }
  }

  for (const marker of markers) {
    if (!artifactClaims.has(marker)) {
      findings.push({
        rule: "orphan-claim",
        severity: "error",
        message: `${prefix}: article marker ${marker} is not present in artifact claims.`
      });
    }
  }

  for (const claim of article.artifact.claims) {
    findings.push(...assessClaim(claim, article, options));
  }

  return findings;
}

export function summarizeFindings(findings) {
  const errors = findings.filter((f) => f.severity === "error");
  const warnings = findings.filter((f) => f.severity === "warning");
  return { errors, warnings, total: findings.length };
}
