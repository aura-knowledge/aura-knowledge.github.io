import { writeFile } from "node:fs/promises";
import path from "node:path";
import { loadArticles, rootDir } from "./lib/content-utils.mjs";

const CONCURRENCY = 8;
const TIMEOUT_MS = 12000;
const args = process.argv.slice(2);
const write = args.includes("--write");
const today = new Date().toISOString().slice(0, 10);

async function checkUrl(url) {
  let lastResult = { ok: false, status: 0, error: "unreachable" };
  for (const method of ["HEAD", "GET"]) {
    try {
      const response = await fetch(url, {
        method,
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "user-agent": "aura-knowledge-source-liveness/1.0" }
      });
      if (response.status < 400) {
        return { ok: true, status: response.status };
      }
      lastResult = { ok: false, status: response.status };
    } catch (error) {
      lastResult = { ok: false, status: 0, error: error.message };
    }
  }
  return lastResult;
}

const articles = await loadArticles();
const published = articles.filter(
  (article) => article.articleFrontmatter.status === "published" && article.artifact.status === "published"
);

const jobs = [];
for (const article of published) {
  for (const source of article.artifact.sources) {
    jobs.push({ article, source });
  }
}

const results = [];
for (let index = 0; index < jobs.length; index += CONCURRENCY) {
  const batch = jobs.slice(index, index + CONCURRENCY);
  const settled = await Promise.all(
    batch.map(async ({ article, source }) => ({
      article,
      source,
      result: await checkUrl(source.url)
    }))
  );
  results.push(...settled);
}

let dead = 0;
const deadLines = [];
for (const { article, source, result } of results) {
  if (!result.ok) {
    dead++;
    deadLines.push(
      `  ${article.slug} ${source.id}: ${source.url} -> ${result.status || result.error}`
    );
  }
}

console.log(
  `Checked ${results.length} source URL(s) across ${published.length} published article(s): ${results.length - dead} live, ${dead} dead/unreachable.`
);
for (const line of deadLines) {
  console.log(line);
}

if (write) {
  const touched = new Map();
  for (const { article } of results) {
    touched.set(article.slug, article);
  }
  for (const article of touched.values()) {
    for (const source of article.artifact.sources) {
      source.lastChecked = today;
    }
    const artifactPath = path.join(
      rootDir, "content", "articles", String(article.year), article.slug, "artifact.json"
    );
    await writeFile(artifactPath, JSON.stringify(article.artifact, null, 2) + "\n");
  }
  console.log(`Stamped lastChecked=${today} on sources in ${touched.size} artifact(s). Run npm run generate to refresh outputs.`);
}
