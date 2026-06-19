import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const articlesDir = path.join(rootDir, "content", "articles");
const errors = [];

async function loadArticleArtifacts() {
  const articles = [];
  const years = await readdir(articlesDir, { withFileTypes: true });

  for (const yearEntry of years.filter((entry) => entry.isDirectory())) {
    const yearDir = path.join(articlesDir, yearEntry.name);
    const slugs = await readdir(yearDir, { withFileTypes: true });

    for (const slugEntry of slugs.filter((entry) => entry.isDirectory())) {
      const artifactPath = path.join(yearDir, slugEntry.name, "artifact.json");
      const raw = await readFile(artifactPath, "utf8");

      articles.push({
        path: path.relative(rootDir, artifactPath),
        artifact: JSON.parse(raw)
      });
    }
  }

  return articles;
}

function validateSeriesMetadata(article) {
  const { artifact } = article;
  if (!artifact.series) {
    return;
  }

  const { slug, title, order, role } = artifact.series;
  if (!/^[a-z0-9-]+$/.test(slug ?? "")) {
    errors.push(`${article.path}: series.slug must be a safe slug.`);
  }
  if (typeof title !== "string" || title.length < 8) {
    errors.push(`${article.path}: series.title must be a readable title.`);
  }
  if (!Number.isInteger(order) || order < 0) {
    errors.push(`${article.path}: series.order must be a non-negative integer.`);
  }
  if (!["guide", "chapter", "companion", "appendix"].includes(role)) {
    errors.push(`${article.path}: series.role must be guide, chapter, companion, or appendix.`);
  }
}

function validateLongHumanRoadToAi(articles) {
  const seriesArticles = articles
    .filter((article) => article.artifact.series?.slug === "long-human-road-to-ai")
    .sort((left, right) => left.artifact.series.order - right.artifact.series.order);

  if (seriesArticles.length !== 8) {
    errors.push(
      `long-human-road-to-ai series must contain 8 entries; found ${seriesArticles.length}.`
    );
    return;
  }

  const expectedSlugs = [
    "long-human-road-to-ai",
    "before-machines",
    "formal-logic-to-computation",
    "birth-of-ai",
    "ai-winters-expert-systems",
    "learning-machines",
    "foundation-models",
    "human-systems"
  ];
  const actualSlugs = seriesArticles.map((article) => article.artifact.slug);
  if (actualSlugs.join(",") !== expectedSlugs.join(",")) {
    errors.push(
      `long-human-road-to-ai order is ${actualSlugs.join(", ")}; expected ${expectedSlugs.join(", ")}.`
    );
  }

  const orders = seriesArticles.map((article) => article.artifact.series.order);
  if (new Set(orders).size !== orders.length) {
    errors.push("long-human-road-to-ai series orders must be unique.");
  }

  const guide = seriesArticles[0]?.artifact;
  if (guide?.slug !== "long-human-road-to-ai" || guide?.series?.role !== "guide") {
    errors.push("long-human-road-to-ai reader guide must be first with role guide.");
  }
}

const articles = await loadArticleArtifacts();
for (const article of articles) {
  validateSeriesMetadata(article);
}
validateLongHumanRoadToAi(articles);

if (errors.length > 0) {
  console.error("Article series check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Article series check passed.");
