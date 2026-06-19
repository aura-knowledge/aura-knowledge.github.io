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
import { assessArticle, summarizeFindings } from "./lib/evidence-diagnostics.mjs";

const site = "https://aura-knowledge.github.io";
const base = "";
const repoUrl = "https://github.com/aura-knowledge/aura-knowledge.github.io";
let generatedAt = "";

function publicPath(...parts) {
  return path.join(publicRoot, ...parts);
}

function siteUrl(localPath) {
  return new URL(localPath, site).toString();
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
    sourceGitHubUrl: `${repoUrl}/blob/main/${article.sourcePath}`,
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
      const claimNodeId = `${artifact.id}:${claim.id}`;
      addNode({
        id: claimNodeId,
        type: "claim",
        label: claim.claim,
        localId: claim.id,
        confidence: claim.confidence,
        status: claim.status
      });
      addEdge(artifact.id, claimNodeId, "argues");

      for (const packet of claim.evidence) {
        addEdge(claimNodeId, packet.sourceId, "supported-by");
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
await mkdir(publicPath("agents", "topics"), { recursive: true });
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
    sourceGitHubUrl: `${repoUrl}/blob/main/${roadmap.sourcePath}`
  };
  delete packet.filePath;
  delete packet.sourcePath;
  await writeJson(publicPath("agents", "roadmap", `${roadmap.slug}.json`), packet);
}

const entries = articles.map(indexEntry);

const topicGroups = new Map();
const yearGroups = new Map();
const yearMonthGroups = new Map();

for (const entry of entries) {
  for (const topic of entry.topics) {
    if (!topicGroups.has(topic)) {
      topicGroups.set(topic, []);
    }
    topicGroups.get(topic).push(entry.id);
  }

  const year = entry.updatedAt.slice(0, 4);
  if (!yearGroups.has(year)) {
    yearGroups.set(year, []);
  }
  yearGroups.get(year).push(entry.id);

  const yearMonth = entry.updatedAt.slice(0, 7);
  if (!yearMonthGroups.has(yearMonth)) {
    yearMonthGroups.set(yearMonth, []);
  }
  yearMonthGroups.get(yearMonth).push(entry.id);
}

const topicsIndex = Array.from(topicGroups.entries())
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([topic, articleIds]) => ({
    topic,
    label: topic.replaceAll("-", " "),
    articleIds,
    pageUrl: siteUrl(`/topics/${topic}/`),
    agentJsonPath: `/agents/topics/${topic}.json`
  }));

const archivesIndex = Array.from(yearGroups.entries())
  .sort(([left], [right]) => right.localeCompare(left))
  .map(([year, articleIds]) => ({
    year,
    articleIds,
    pageUrl: siteUrl(`/articles/${year}/`),
    months: Array.from(yearMonthGroups.entries())
      .filter(([yearMonth]) => yearMonth.startsWith(year))
      .sort(([left], [right]) => right.localeCompare(left))
      .map(([yearMonth, monthArticleIds]) => {
        const [, month] = yearMonth.split("-");
        const date = new Date(Number(year), Number(month) - 1, 1);
        return {
          yearMonth,
          monthName: date.toLocaleString("en-US", { month: "long" }),
          articleIds: monthArticleIds,
          pageUrl: siteUrl(`/articles/${year}/${month}/`)
        };
      })
  }));

await writeJson(publicPath("agents", "index.json"), {
  schemaVersion: 2,
  generatedAt,
  site,
  base,
  articles: entries,
  topics: topicsIndex,
  archives: archivesIndex,
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

for (const { topic, articleIds, pageUrl, agentJsonPath } of topicsIndex) {
  await writeJson(publicPath("agents", "topics", `${topic}.json`), {
    schemaVersion: 1,
    topic,
    articleIds,
    pageUrl,
    agentJsonPath,
    articles: entries.filter((entry) => articleIds.includes(entry.id))
  });
}

await writeFile(
  publicPath("agents", "index.jsonl"),
  `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`
);

const graph = buildGraph(articles);
await writeJson(publicPath("graph", "nodes.json"), graph.nodes);
await writeJson(publicPath("graph", "edges.json"), graph.edges);

const llms = [
  "# Aura Knowledge",
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
  ...topicsIndex.map((topic) => `- [${topic.topic} topic JSON](${siteUrl(topic.agentJsonPath)})`),
  "",
  "## Use",
  "Use article packets as the retrieval unit. Treat maturity values as uncertainty markers. Prefer claim IDs and source IDs over inferred citations. Article artifacts use schemaVersion 2; evidence and counterevidence are typed packets, not bare source IDs.",
  ""
].join("\n");

const allFindings = [];
for (const article of allArticles) {
  const findings = assessArticle(article, article.articleBody, {
    prefix: `${article.year}/${article.slug}`
  });
  allFindings.push(...findings);
}
const diagnosticsSummary = summarizeFindings(allFindings);
await writeJson(publicPath("agents", "diagnostics.json"), {
  schemaVersion: 1,
  generatedAt,
  summary: {
    errors: diagnosticsSummary.errors.length,
    warnings: diagnosticsSummary.warnings.length,
    total: diagnosticsSummary.total
  },
  findings: allFindings
});

await writeFile(publicPath("llms.txt"), llms);

console.log(`Generated ${entries.length} article packet(s), ${roadmaps.length} roadmap packet(s), ${graph.nodes.length} graph node(s), ${graph.edges.length} edge(s), and ${allFindings.length} diagnostic finding(s).`);
