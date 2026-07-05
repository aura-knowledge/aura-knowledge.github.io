import { readdir } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

const baseDir = path.join(process.cwd(), "content", "articles", "2026");
const slugs = await readdir(baseDir);

for (const slug of slugs) {
  const artifactPath = path.join(baseDir, slug, "artifact.json");
  try {
    const artifact = JSON.parse(await (await import("node:fs/promises")).readFile(artifactPath, "utf8"));
    if (artifact.series && artifact.series.slug === "attention-substance-ai-moment") {
      console.log(`Finalizing ${slug}...`);
      execFileSync("node", ["scripts/attention-expansion/finalize-article.mjs", slug], {
        stdio: "inherit",
        cwd: process.cwd()
      });
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(`Error processing ${slug}: ${error.message}`);
    }
  }
}
