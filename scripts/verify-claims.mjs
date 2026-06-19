import { loadArticles } from "./lib/content-utils.mjs";
import { buildVerificationReport } from "./lib/verification-report.mjs";

const args = process.argv.slice(2);
const format = args.includes("--json") ? "json" : "text";
const allArticles = await loadArticles();
const report = buildVerificationReport(allArticles);

if (format === "json") {
  console.log(JSON.stringify(report, null, 2));
} else {
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
