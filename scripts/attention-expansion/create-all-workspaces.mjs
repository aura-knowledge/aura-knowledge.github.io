import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const specPath = path.join(process.cwd(), "scripts", "attention-expansion", "articles-spec.json");
const spec = JSON.parse(await readFile(specPath, "utf8"));

for (const article of spec.articles) {
  const args = [
    "run", "workspace:create", "--",
    article.slug,
    "--year", spec.year,
    "--topic", spec.topic,
    "--title", article.title,
    "--dek", article.dek,
    "--summary", article.summary,
    "--thesis", article.thesis
  ];
  console.log(`Creating workspace for ${article.slug}...`);
  try {
    execFileSync("npm", args, { stdio: "inherit", cwd: process.cwd() });
  } catch (error) {
    console.error(`Failed to create workspace for ${article.slug}: ${error.message}`);
    process.exit(1);
  }
}

console.log("All workspaces created.");
