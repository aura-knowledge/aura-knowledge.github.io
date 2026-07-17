import { loadArticles } from "./lib/content-utils.mjs";
import { buildVerificationReport } from "./lib/verification-report.mjs";

const args = process.argv.slice(2);
const format = args.includes("--json") ? "json" : "text";
const failOnDraft = args.includes("--fail-on-draft");
const maxDraftArg = args.find((arg) => /^--max-draft($|=)/.test(arg));
let maxDraft = null;
if (maxDraftArg) {
  const raw = maxDraftArg.includes("=") ? maxDraftArg.split("=")[1] : args[args.indexOf(maxDraftArg) + 1];
  if (!/^\d+$/.test(raw ?? "")) {
    console.error(`Invalid --max-draft value: ${raw ?? "(missing)"}`);
    process.exit(2);
  }
  maxDraft = Number(raw);
}
const allArticles = await loadArticles();
const report = buildVerificationReport(allArticles);

if (format === "json") {
  console.log(JSON.stringify(report, null, 2));
} else if (!failOnDraft && maxDraft === null) {
  for (const article of report.articles) {
    console.log(`\n${article.title} (${article.slug})`);
    console.log(`  Status: ${article.status}`);
    console.log(
      `  Summary: ${article.summary.verified} verified, ${article.summary["needs-evidence"]} needs-evidence, ${article.summary["missing-counterevidence"]} missing-counterevidence, ${article.summary.stale} stale, ${article.summary.contested} contested, ${article.summary.draft} draft`
    );
    for (const claim of article.claims) {
      const icon =
        claim.state === "verified"
          ? "✓"
          : claim.state === "draft"
            ? "○"
            : claim.state === "contested"
              ? "!"
              : "✗";
      console.log(`    ${icon} ${claim.id} [${claim.state}] ${claim.claim.slice(0, 70)}...`);
      for (const finding of claim.findings) {
        console.log(`       - ${finding.severity}: ${finding.rule}`);
      }
    }
  }
}

if (failOnDraft || maxDraft !== null) {
  const offenders = [];
  for (const article of report.articles) {
    if (article.status !== "published") continue;
    const draftClaims = article.claims.filter((claim) => claim.state === "draft");
    if (draftClaims.length > 0) {
      offenders.push({ slug: article.slug, count: draftClaims.length });
    }
  }
  const total = offenders.reduce((sum, entry) => sum + entry.count, 0);
  const exceeded = failOnDraft ? total > 0 : total > maxDraft;
  if (exceeded) {
    const limit = failOnDraft ? 0 : maxDraft;
    console.error(
      `\n${total} draft-state claim(s) across ${offenders.length} published article(s) exceeds the allowed backlog of ${limit}:`
    );
    for (const entry of offenders) {
      console.error(`- ${entry.slug}: ${entry.count} draft claim(s)`);
    }
    process.exit(1);
  }
  console.error(`Draft-claim backlog: ${total} (allowed: ${failOnDraft ? 0 : maxDraft}).`);
}
