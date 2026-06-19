import path from "node:path";
import { loadGardenData } from "./lib/garden-queries.mjs";
import { readJson, rootDir, writeJson } from "./lib/content-utils.mjs";
import { buildEvalReport } from "./lib/eval-briefs.mjs";

const evalSetPath = path.join(rootDir, "content", "eval", "brief-eval-set.json");
const outputPath = path.join(rootDir, "public", "agents", "eval-report.json");

async function main() {
  const evalSet = await readJson(evalSetPath);
  const data = await loadGardenData();
  const generatedAt = data.index.generatedAt ?? new Date().toISOString();

  const articlePacketsBySlug = new Map();
  for (const entry of data.index.articles ?? []) {
    const packet = await readJson(
      path.join(rootDir, "public", "agents", "articles", `${entry.slug}.json`)
    );
    articlePacketsBySlug.set(entry.slug, packet);
  }

  const report = await buildEvalReport(evalSet, data, articlePacketsBySlug, generatedAt);
  await writeJson(outputPath, report);

  console.log(
    `Evaluated ${report.summary.total} case(s): ${report.summary.passed} passed, ${report.summary.failed} failed.`
  );

  if (report.summary.failed > 0) {
    for (const result of report.cases) {
      if (!result.passed) {
        console.error(`- ${result.id}: ${result.failures.join("; ")}`);
      }
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
