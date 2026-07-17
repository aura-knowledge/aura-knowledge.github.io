import { queryArticles } from "./garden-queries.mjs";

export function runEvalCase(evalCase, data, articlePacketsBySlug) {
  const results = queryArticles(evalCase.query, data);
  const resultSlugs = results.map((entry) => entry.slug);
  const failures = [];

  for (const slug of evalCase.expected.slugs ?? []) {
    if (!resultSlugs.includes(slug)) {
      failures.push(`missing slug ${slug}`);
    }
  }

  for (const slug of evalCase.expected.notSlugs ?? []) {
    if (resultSlugs.includes(slug)) {
      failures.push(`unexpected slug ${slug}`);
    }
  }

  if (
    typeof evalCase.expected.maxResults === "number" &&
    resultSlugs.length > evalCase.expected.maxResults
  ) {
    failures.push(
      `result count ${resultSlugs.length} exceeds expected maxResults ${evalCase.expected.maxResults}`
    );
  }

  const resultClaimIds = new Set();
  for (const entry of results) {
    const packet = articlePacketsBySlug.get(entry.slug);
    if (packet) {
      for (const claim of packet.claims ?? []) {
        resultClaimIds.add(`${packet.id}:${claim.id}`);
      }
    }
  }

  for (const claimId of evalCase.expected.claimIds ?? []) {
    if (!resultClaimIds.has(claimId)) {
      failures.push(`missing claimId ${claimId}`);
    }
  }

  return {
    id: evalCase.id,
    description: evalCase.description,
    passed: failures.length === 0,
    query: evalCase.query,
    expected: evalCase.expected,
    actual: {
      slugs: resultSlugs,
      claimIds: Array.from(resultClaimIds)
    },
    failures
  };
}

export async function buildEvalReport(evalSet, data, articlePacketsBySlug, generatedAt) {
  const caseResults = evalSet.cases.map((evalCase) =>
    runEvalCase(evalCase, data, articlePacketsBySlug)
  );
  const passed = caseResults.filter((result) => result.passed).length;

  return {
    schemaVersion: 1,
    generatedAt,
    summary: {
      total: caseResults.length,
      passed,
      failed: caseResults.length - passed
    },
    cases: caseResults
  };
}
