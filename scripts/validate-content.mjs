import { access, readFile } from "node:fs/promises";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import {
  loadArticles,
  loadRoadmaps,
  publicRoot,
  readJson,
  rootDir,
  toPosix
} from "./lib/content-utils.mjs";

const ajv = new Ajv2020({ allErrors: true, strict: false });
ajv.addFormat("uri", {
  type: "string",
  validate(value) {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }
});

const articleSchema = await readJson(path.join(rootDir, "schemas", "article.schema.json"));
const agentSchema = await readJson(path.join(rootDir, "schemas", "agent.schema.json"));
const artifactSchema = await readJson(path.join(rootDir, "schemas", "artifact.schema.json"));
const roadmapSchema = await readJson(path.join(rootDir, "schemas", "roadmap.schema.json"));
const validateArticle = ajv.compile(articleSchema);
const validateAgent = ajv.compile(agentSchema);
const validateArtifact = ajv.compile(artifactSchema);
const validateRoadmap = ajv.compile(roadmapSchema);
const errors = [];

function report(message) {
  errors.push(message);
}

function formatAjvErrors(prefix, validator) {
  for (const error of validator.errors ?? []) {
    report(`${prefix}: ${error.instancePath || "/"} ${error.message}`);
  }
}

async function assertExists(filePath) {
  try {
    await access(filePath);
  } catch {
    report(`Missing generated file: ${toPosix(path.relative(rootDir, filePath))}`);
  }
}

function claimMarkers(articleBody) {
  const markers = new Set();
  const spans = articleBody.match(/<span[^>]*class="[^"]*claim-marker[^"]*"[^>]*>/g) ?? [];
  for (const span of spans) {
    const id = span.match(/id="(claim-[0-9]{3})"/)?.[1];
    if (id) markers.add(id);
  }
  return markers;
}

function reportDuplicates(prefix, label, values) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      report(`${prefix}: duplicate ${label} ${value}.`);
    }
    seen.add(value);
  }
}

const articles = await loadArticles();
const roadmaps = await loadRoadmaps();
const publishedArticles = articles.filter((article) =>
  article.articleFrontmatter.status === "published" && article.artifact.status === "published"
);
const publishedRoadmaps = roadmaps.filter((roadmap) => roadmap.status === "published");
const knownIds = new Set();

for (const article of articles) {
  knownIds.add(article.artifact.id);
  for (const topic of article.artifact.topics) {
    knownIds.add(`topic:${topic}`);
  }
  for (const claim of article.artifact.claims) {
    knownIds.add(claim.id);
  }
  for (const source of article.artifact.sources) {
    knownIds.add(source.id);
  }
}

for (const roadmap of roadmaps) {
  const prefix = `roadmap/${roadmap.slug}`;
  const { filePath: _filePath, sourcePath: _sourcePath, ...roadmapForSchema } = roadmap;

  if (!validateRoadmap(roadmapForSchema)) {
    formatAjvErrors(`${prefix} roadmap`, validateRoadmap);
  }

  if (roadmap.id !== `roadmap:${roadmap.slug}`) {
    report(`${prefix}: id must be roadmap:${roadmap.slug}.`);
  }

  const ideaIds = roadmap.ideas?.map((idea) => idea.id) ?? [];
  reportDuplicates(prefix, "idea id", ideaIds);
  const knownIdeaIds = new Set(ideaIds);

  const priorityCounts = { P0: 0, P1: 0, P2: 0 };
  for (const idea of roadmap.ideas ?? []) {
    if (idea.priority in priorityCounts) {
      priorityCounts[idea.priority] += 1;
    }

    for (const sourcePath of idea.sourcePaths ?? []) {
      if (!sourcePath.endsWith("README.md") && !sourcePath.endsWith("SKILL.md") && !sourcePath.endsWith(".py")) {
        report(`${prefix}: ${idea.id} has a source path that is not a README, skill, or code reference: ${sourcePath}.`);
      }
    }
  }

  for (const [priority, count] of Object.entries(priorityCounts)) {
    if (roadmap.priorityCounts?.[priority] !== count) {
      report(`${prefix}: priorityCounts.${priority} is ${roadmap.priorityCounts?.[priority]}; expected ${count}.`);
    }
  }

  for (const phase of roadmap.phases ?? []) {
    for (const ideaId of phase.ideaIds ?? []) {
      if (!knownIdeaIds.has(ideaId)) {
        report(`${prefix}: ${phase.id} references unknown idea ${ideaId}.`);
      }
    }
  }

  if (roadmap.status === "published") {
    await assertExists(path.join(publicRoot, "agents", "roadmap", `${roadmap.slug}.json`));
  }
}

if (articles.length === 0) {
  report("No articles found under content/articles/<yyyy>/<slug>.");
}

for (const article of articles) {
  const prefix = `${article.year}/${article.slug}`;
  const expectedSource = `content/articles/${article.year}/${article.slug}/article.md`;
  const expectedAgent = `content/articles/${article.year}/${article.slug}/agent.md`;

  if (!validateArticle(article.articleFrontmatter)) {
    formatAjvErrors(`${prefix} article frontmatter`, validateArticle);
  }

  if (!validateArtifact(article.artifact)) {
    formatAjvErrors(`${prefix} artifact`, validateArtifact);
  }

  if (!validateAgent(article.agentFrontmatter)) {
    formatAjvErrors(`${prefix} agent frontmatter`, validateAgent);
  }

  if (article.articleFrontmatter.slug !== article.slug) {
    report(`${prefix}: frontmatter slug does not match folder slug.`);
  }

  if (article.articleFrontmatter.id !== `article:${article.slug}`) {
    report(`${prefix}: frontmatter id must be article:${article.slug}.`);
  }

  if (article.articleFrontmatter.sourcePath !== expectedSource) {
    report(`${prefix}: frontmatter sourcePath must be ${expectedSource}.`);
  }

  if (article.artifact.slug !== article.slug) {
    report(`${prefix}: artifact slug does not match folder slug.`);
  }

  if (article.artifact.id !== article.articleFrontmatter.id) {
    report(`${prefix}: artifact id does not match article id.`);
  }

  if (article.agentFrontmatter.articleId !== article.articleFrontmatter.id) {
    report(`${prefix}: agent articleId does not match article id.`);
  }

  if (article.agentFrontmatter.slug !== article.slug) {
    report(`${prefix}: agent slug does not match folder slug.`);
  }

  if (article.agentFrontmatter.status !== article.articleFrontmatter.status) {
    report(`${prefix}: agent status does not match article status.`);
  }

  if (article.artifact.status !== article.articleFrontmatter.status) {
    report(`${prefix}: artifact status does not match article status.`);
  }

  if (article.artifact.sourcePath !== expectedSource) {
    report(`${prefix}: artifact sourcePath must be ${expectedSource}.`);
  }

  if (article.artifact.agentBriefPath !== expectedAgent) {
    report(`${prefix}: artifact agentBriefPath must be ${expectedAgent}.`);
  }

  if (article.artifact.contentHash !== article.contentHash) {
    report(`${prefix}: artifact contentHash is stale. Run npm run generate.`);
  }

  const markers = claimMarkers(article.articleBody);
  const claimIds = article.artifact.claims.map((claim) => claim.id);
  const sourceIdsList = article.artifact.sources.map((source) => source.id);
  reportDuplicates(prefix, "claim id", claimIds);
  reportDuplicates(prefix, "source id", sourceIdsList);

  const artifactClaims = new Set(article.artifact.claims.map((claim) => claim.id));

  for (const claimId of artifactClaims) {
    if (!markers.has(claimId)) {
      report(`${prefix}: claim ${claimId} is missing a visible article marker.`);
    }
  }

  for (const marker of markers) {
    if (!artifactClaims.has(marker)) {
      report(`${prefix}: article marker ${marker} is not present in artifact claims.`);
    }
  }

  const sourceIds = new Set(article.artifact.sources.map((source) => source.id));
  for (const claim of article.artifact.claims) {
    for (const sourceId of claim.evidence) {
      if (!sourceIds.has(sourceId)) {
        report(`${prefix}: ${claim.id} references missing source ${sourceId}.`);
      }
    }
  }

  for (const relation of article.artifact.related) {
    if (!knownIds.has(relation.id)) {
      report(`${prefix}: related ${relation.id} is not present in article, topic, claim, or source IDs.`);
    }
  }

  const tokenBudget = Number(article.agentFrontmatter.tokenBudget ?? 0);
  const estimatedTokens = Math.ceil(article.agentBody.trim().split(/\s+/).length * 1.35);
  if (tokenBudget > 0 && estimatedTokens > tokenBudget) {
    report(`${prefix}: agent.md estimate ${estimatedTokens} tokens exceeds budget ${tokenBudget}.`);
  }

  if (article.articleFrontmatter.status === "published" && article.artifact.status === "published") {
    await assertExists(path.join(publicRoot, "agents", "articles", `${article.slug}.json`));
    await assertExists(path.join(publicRoot, "agents", "articles", `${article.slug}.md`));
  }
}

await assertExists(path.join(publicRoot, "agents", "index.json"));
await assertExists(path.join(publicRoot, "agents", "index.jsonl"));
await assertExists(path.join(publicRoot, "graph", "nodes.json"));
await assertExists(path.join(publicRoot, "graph", "edges.json"));
await assertExists(path.join(publicRoot, "llms.txt"));

try {
  const index = await readJson(path.join(publicRoot, "agents", "index.json"));
  if (index.articles?.length !== publishedArticles.length) {
    report(`Agent index has ${index.articles?.length ?? 0} article(s); expected ${publishedArticles.length}.`);
  }

  if (index.roadmaps?.length !== publishedRoadmaps.length) {
    report(`Agent index has ${index.roadmaps?.length ?? 0} roadmap(s); expected ${publishedRoadmaps.length}.`);
  }

  for (const entry of index.articles ?? []) {
    if (entry.status !== "published") {
      report(`Agent index includes non-published article ${entry.slug}.`);
    }
  }

  for (const entry of index.roadmaps ?? []) {
    if (entry.status !== "published") {
      report(`Agent index includes non-published roadmap ${entry.slug}.`);
    }
  }

  const jsonl = await readFile(path.join(publicRoot, "agents", "index.jsonl"), "utf8");
  const lines = jsonl.trim().split("\n").filter(Boolean);
  if (lines.length !== publishedArticles.length) {
    report(`Agent JSONL has ${lines.length} line(s); expected ${publishedArticles.length}.`);
  }
  for (const line of lines) {
    JSON.parse(line);
  }
} catch (error) {
  report(`Generated agent index is invalid: ${error.message}`);
}

try {
  const nodes = await readJson(path.join(publicRoot, "graph", "nodes.json"));
  const edges = await readJson(path.join(publicRoot, "graph", "edges.json"));
  const nodeIds = new Set(nodes.map((node) => node.id));
  reportDuplicates("graph", "node id", nodes.map((node) => node.id));
  reportDuplicates("graph", "edge", edges.map((edge) => `${edge.from}:${edge.type}:${edge.to}`));

  for (const edge of edges) {
    if (!nodeIds.has(edge.from)) {
      report(`graph: edge ${edge.from}:${edge.type}:${edge.to} has missing from node.`);
    }
    if (!nodeIds.has(edge.to)) {
      report(`graph: edge ${edge.from}:${edge.type}:${edge.to} has missing to node.`);
    }
  }

  for (const article of publishedArticles) {
    if (!nodeIds.has(article.artifact.id)) {
      report(`graph: published article ${article.artifact.id} is missing from nodes.`);
    }
  }
} catch (error) {
  report(`Generated graph is invalid: ${error.message}`);
}

try {
  for (const article of publishedArticles) {
    const packet = await readJson(path.join(publicRoot, "agents", "articles", `${article.slug}.json`));
    if ("sourceMarkdownPath" in packet) {
      report(`${article.year}/${article.slug}: generated packet uses deprecated sourceMarkdownPath.`);
    }
    if (packet.sourceRepoPath !== article.sourcePath) {
      report(`${article.year}/${article.slug}: generated packet sourceRepoPath is incorrect.`);
    }
  }
} catch (error) {
  report(`Generated article packet is invalid: ${error.message}`);
}

try {
  for (const roadmap of publishedRoadmaps) {
    const packet = await readJson(path.join(publicRoot, "agents", "roadmap", `${roadmap.slug}.json`));
    if ("filePath" in packet || "sourcePath" in packet) {
      report(`roadmap/${roadmap.slug}: generated packet exposes internal loader paths.`);
    }
    if (packet.sourceRepoPath !== roadmap.sourcePath) {
      report(`roadmap/${roadmap.slug}: generated packet sourceRepoPath is incorrect.`);
    }
    if (packet.ideas?.length !== roadmap.ideas.length) {
      report(`roadmap/${roadmap.slug}: generated packet idea count is incorrect.`);
    }
  }
} catch (error) {
  report(`Generated roadmap packet is invalid: ${error.message}`);
}

if (errors.length > 0) {
  console.error("Content validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Validated ${articles.length} source article(s), ${publishedArticles.length} published article packet(s), ${publishedRoadmaps.length} published roadmap packet(s), and graph artifacts.`);
