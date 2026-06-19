import { access, readFile } from "node:fs/promises";
import path from "node:path";

const distRoot = path.join(process.cwd(), "dist");
const requiredRoutes = [
  "/index.html",
  "/topics/index.html",
  "/articles/index.html",
  "/roadmap/index.html",
  "/organization/index.html",
  "/graph/index.html",
  "/agents/index.html"
];

for (const route of requiredRoutes) {
  const filePath = path.join(distRoot, route);
  try {
    await access(filePath);
  } catch {
    throw new Error(`Required route missing from build: ${route}`);
  }
}

const graphPath = path.join(distRoot, "graph", "index.html");
const indexPath = path.join(process.cwd(), "public", "agents", "index.json");
const graphHtml = await readFile(graphPath, "utf8");
const agentIndex = JSON.parse(await readFile(indexPath, "utf8"));

const branchMatches = graphHtml.matchAll(/<section class="graph-branch"[^>]*>[\s\S]*?<h3>\s*<a href="([^"]+)">([^<]+)<\/a>/g);
const articleBranchCounts = new Map();

for (const match of branchMatches) {
  const key = `${match[1]}|${match[2]}`;
  articleBranchCounts.set(key, (articleBranchCounts.get(key) ?? 0) + 1);
}

const duplicates = Array.from(articleBranchCounts.entries()).filter(([, count]) => count > 1);
const missing = agentIndex.articles.filter((article) => {
  const path = new URL(article.articleUrl).pathname;
  const key = `${path}|${article.title}`;
  return !articleBranchCounts.has(key);
});

if (duplicates.length > 0) {
  const details = duplicates
    .map(([key, count]) => {
      const [href, title] = key.split("|");
      return `- ${title} (${href}) rendered ${count} times`;
    })
    .join("\n");
  throw new Error(`Graph page repeats full article branches:\n${details}`);
}

if (missing.length > 0) {
  const details = missing.map((article) => `- ${article.title} (${new URL(article.articleUrl).pathname})`).join("\n");
  throw new Error(`Graph page is missing article branches:\n${details}`);
}

console.log(`Validated graph page article branches: ${articleBranchCounts.size} unique branch(es).`);
