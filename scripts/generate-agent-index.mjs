import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  loadArticles,
  loadRoadmaps,
  publicRoot,
  rootDir,
  toPosix,
  writeJson
} from "./lib/content-utils.mjs";

const site = "https://v-i-s-h-a-l.github.io";
const base = "/knowledge";
let generatedAt = "";

function publicPath(...parts) {
  return path.join(publicRoot, ...parts);
}

function siteUrl(localPath) {
  return new URL(`${base}${localPath}`, site).toString();
}

function articlePacket(article) {
  return {
    ...article.artifact,
    contentHash: article.contentHash,
    generatedAt,
    articleUrl: siteUrl(article.artifact.canonicalPath),
    agentJsonPath: `/agents/articles/${article.slug}.json`,
    agentMarkdownPath: `/agents/articles/${article.slug}.md`,
    sourceRepoPath: article.sourcePath,
    sourceGitHubUrl: `https://github.com/v-i-s-h-a-l/knowledge/blob/main/${article.sourcePath}`,
    sectionOutline: Array.from(article.articleBody.matchAll(/<h2 id="([^"]+)">([^<]+)<\/h2>/g)).map(
      (match) => ({
        id: match[1],
        title: match[2]
      })
    )
  };
}

function indexEntry(article) {
  return {
    id: article.artifact.id,
    slug: article.slug,
    title: article.artifact.title,
    summary: article.articleFrontmatter.summary,
    status: article.artifact.status,
    maturity: article.artifact.maturity,
    topics: article.artifact.topics,
    tags: article.articleFrontmatter.tags,
    canonicalPath: article.artifact.canonicalPath,
    articleUrl: siteUrl(article.artifact.canonicalPath),
    agentJsonPath: `/agents/articles/${article.slug}.json`,
    agentMarkdownPath: `/agents/articles/${article.slug}.md`,
    updatedAt: article.artifact.updatedAt,
    claimCount: article.artifact.claims.length,
    sourceCount: article.artifact.sources.length,
    contentHash: article.contentHash
  };
}

function buildGraph(articles) {
  const nodes = new Map();
  const edges = new Map();

  const addNode = (node) => {
    if (!nodes.has(node.id)) {
      nodes.set(node.id, node);
    }
  };

  const addEdge = (from, to, type) => {
    edges.set(`${from}:${type}:${to}`, { from, to, type });
  };

  for (const article of articles) {
    const artifact = article.artifact;
    addNode({
      id: artifact.id,
      type: "article",
      label: artifact.title,
      path: artifact.canonicalPath,
      maturity: artifact.maturity
    });

    for (const topic of artifact.topics) {
      const topicId = `topic:${topic}`;
      addNode({ id: topicId, type: "topic", label: topic });
      addEdge(artifact.id, topicId, "covers");
    }

    for (const claim of artifact.claims) {
      addNode({
        id: claim.id,
        type: "claim",
        label: claim.claim,
        confidence: claim.confidence,
        status: claim.status
      });
      addEdge(artifact.id, claim.id, "argues");

      for (const sourceId of claim.evidence) {
        addEdge(claim.id, sourceId, "supported-by");
      }
    }

    for (const source of artifact.sources) {
      addNode({
        id: source.id,
        type: "source",
        label: source.title,
        url: source.url,
        sourceType: source.type
      });
    }

    for (const relation of artifact.related) {
      addEdge(artifact.id, relation.id, relation.type);
    }
  }

  return {
    nodes: Array.from(nodes.values()).sort((left, right) => left.id.localeCompare(right.id)),
    edges: Array.from(edges.values()).sort((left, right) =>
      `${left.from}:${left.type}:${left.to}`.localeCompare(`${right.from}:${right.type}:${right.to}`)
    )
  };
}

const allArticles = await loadArticles();
const articles = allArticles.filter((article) =>
  article.articleFrontmatter.status === "published" && article.artifact.status === "published"
);
const allRoadmaps = await loadRoadmaps();
const roadmaps = allRoadmaps.filter((roadmap) => roadmap.status === "published");
generatedAt = `${articles
  .map((article) => article.artifact.updatedAt)
  .concat(roadmaps.map((roadmap) => roadmap.updatedAt))
  .sort()
  .at(-1) ?? "1970-01-01"}T00:00:00.000Z`;
await rm(publicPath("agents"), { recursive: true, force: true });
await rm(publicPath("graph"), { recursive: true, force: true });
await mkdir(publicPath("agents", "articles"), { recursive: true });
await mkdir(publicPath("agents", "roadmap"), { recursive: true });
await mkdir(publicPath("graph"), { recursive: true });

for (const article of allArticles) {
  if (article.artifact.contentHash !== article.contentHash) {
    article.artifact.contentHash = article.contentHash;
    await writeJson(article.artifactPath, article.artifact);
  }
}

for (const article of articles) {
  await writeJson(publicPath("agents", "articles", `${article.slug}.json`), articlePacket(article));
  await writeFile(publicPath("agents", "articles", `${article.slug}.md`), article.agentRaw);
}

for (const roadmap of roadmaps) {
  const packet = {
    ...roadmap,
    generatedAt,
    pageUrl: siteUrl(`/roadmap/`),
    agentJsonPath: `/agents/roadmap/${roadmap.slug}.json`,
    sourceRepoPath: roadmap.sourcePath,
    sourceGitHubUrl: `https://github.com/v-i-s-h-a-l/knowledge/blob/main/${roadmap.sourcePath}`
  };
  delete packet.filePath;
  delete packet.sourcePath;
  await writeJson(publicPath("agents", "roadmap", `${roadmap.slug}.json`), packet);
}

const entries = articles.map(indexEntry);
await writeJson(publicPath("agents", "index.json"), {
  schemaVersion: 1,
  generatedAt,
  site,
  base,
  articles: entries,
  roadmaps: roadmaps.map((roadmap) => ({
    id: roadmap.id,
    slug: roadmap.slug,
    title: roadmap.title,
    summary: roadmap.summary,
    status: roadmap.status,
    updatedAt: roadmap.updatedAt,
    priorityCounts: roadmap.priorityCounts,
    pageUrl: siteUrl("/roadmap/"),
    agentJsonPath: `/agents/roadmap/${roadmap.slug}.json`,
    sourceRepoPath: roadmap.sourcePath
  }))
});

await writeFile(
  publicPath("agents", "index.jsonl"),
  `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`
);

const graph = buildGraph(articles);
await writeJson(publicPath("graph", "nodes.json"), graph.nodes);
await writeJson(publicPath("graph", "edges.json"), graph.edges);

const llms = [
  "# Knowledge Garden",
  "",
  "> Focused essays for humans, backed by compact agent-auditable research packets.",
  "",
  "## Primary Pages",
  `- [Home](${siteUrl("/")})`,
  `- [Roadmap](${siteUrl("/roadmap/")})`,
  `- [Agent Entry](${siteUrl("/agents/")})`,
  `- [Knowledge Graph](${siteUrl("/graph/")})`,
  "",
  "## Articles",
  ...entries.map((entry) => `- [${entry.title}](${entry.articleUrl})`),
  "",
  "## Agent Artifacts",
  `- [Agent Index JSON](${siteUrl("/agents/index.json")})`,
  `- [Agent Index JSONL](${siteUrl("/agents/index.jsonl")})`,
  `- [Graph Nodes](${siteUrl("/graph/nodes.json")})`,
  `- [Graph Edges](${siteUrl("/graph/edges.json")})`,
  ...roadmaps.map((roadmap) => `- [${roadmap.slug} roadmap JSON](${siteUrl(`/agents/roadmap/${roadmap.slug}.json`)})`),
  ...entries.flatMap((entry) => [
    `- [${entry.slug} JSON](${siteUrl(entry.agentJsonPath)})`,
    `- [${entry.slug} Markdown](${siteUrl(entry.agentMarkdownPath)})`
  ]),
  "",
  "## Use",
  "Use article packets as the retrieval unit. Treat maturity values as uncertainty markers. Prefer claim IDs and source IDs over inferred citations.",
  ""
].join("\n");

await writeFile(publicPath("llms.txt"), llms);

console.log(`Generated ${entries.length} article packet(s), ${roadmaps.length} roadmap packet(s), ${graph.nodes.length} graph node(s), and ${graph.edges.length} edge(s).`);
