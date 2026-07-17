import path from "node:path";
import { loadArticles, writeJson } from "./lib/content-utils.mjs";
import { assessArticle } from "./lib/evidence-diagnostics.mjs";

function parseArgs(argv) {
  const args = {};
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--slug") {
      args.slug = argv[index + 1];
      index += 1;
    } else if (arg === "--check") {
      args.check = true;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (!args.slug) {
      args.slug = arg;
    }
  }
  return args;
}

function extractClaimId(message) {
  const match = message.match(/(claim-[0-9]{3})/);
  return match?.[1];
}

function buildAudit(article) {
  const findings = assessArticle(article, article.articleBody, {
    prefix: `${article.year}/${article.slug}`
  });

  const suggestions = findings.map((finding) => ({
    rule: finding.rule,
    severity: finding.severity,
    message: finding.message,
    ...(extractClaimId(finding.message) ? { claimId: extractClaimId(finding.message) } : {})
  }));

  return {
    schemaVersion: 1,
    articleId: article.artifact.id,
    slug: article.slug,
    generatedAt: new Date().toISOString(),
    suggestions
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const articles = await loadArticles();
  const targets = args.slug ? articles.filter((article) => article.slug === args.slug) : articles;

  if (args.slug && targets.length === 0) {
    console.error(`Article not found: ${args.slug}`);
    process.exit(1);
  }

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const article of targets) {
    const audit = buildAudit(article);
    const errorCount = audit.suggestions.filter((s) => s.severity === "error").length;
    const warningCount = audit.suggestions.filter((s) => s.severity === "warning").length;
    totalErrors += errorCount;
    totalWarnings += warningCount;

    if (args.check) {
      if (errorCount + warningCount > 0) {
        console.log(
          `${article.year}/${article.slug}: ${errorCount} error(s), ${warningCount} warning(s)`
        );
        for (const suggestion of audit.suggestions.filter((s) => s.severity === "error")) {
          console.log(`  - ${suggestion.message}`);
        }
      }
      continue;
    }

    const auditPath = path.join(article.articleDir, "workspace", "audit.json");
    await writeJson(auditPath, audit);
    console.log(
      `${article.year}/${article.slug}: wrote workspace/audit.json (${errorCount} error(s), ${warningCount} warning(s))`
    );
  }

  if (args.check) {
    console.log(
      `Audit check: ${totalErrors} error(s), ${totalWarnings} warning(s) across ${targets.length} article(s).`
    );
    if (totalErrors > 0) {
      process.exit(1);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
