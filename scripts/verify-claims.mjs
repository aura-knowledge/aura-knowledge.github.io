import { loadArticles } from "./lib/content-utils.mjs";
import { buildVerificationReport } from "./lib/verification-report.mjs";

const args = process.argv.slice(2);
const format = args.includes("--json") ? "json" : "text";
const failOnDraft = args.includes("--fail-on-draft");
const allArticles = await loadArticles();
const report = buildVerificationReport(allArticles);

if (format === "json") {
  console.log(JSON.stringify(report, null, 2));
} else if (!failOnDraft) {
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

if (failOnDraft) {
  const offenders = [];
  for (const article of report.articles) {
    if (article.status !== "published") continue;
    const draftClaims = article.claims.filter((claim) => claim.state === "draft");
    if (draftClaims.length > 0) {
      offenders.push({ slug: article.slug, count: draftClaims.length });
    }
  }
  if (offenders.length > 0) {
    const total = offenders.reduce((sum, entry) => sum + entry.count, 0);
    console.error(
      `\n${total} draft-state claim(s) across ${offenders.length} published article(s):`
    );
    for (const entry of offenders) {
      console.error(`- ${entry.slug}: ${entry.count} draft claim(s)`);
    }
    process.exit(1);
  }
}
