import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  loadArticles,
  loadRoadmaps,
  publicRoot,
  readJson,
  rootDir,
  toPosix,
  writeJson
} from "./lib/content-utils.mjs";
import { assessArticle, summarizeFindings } from "./lib/evidence-diagnostics.mjs";
import { buildVerificationReport } from "./lib/verification-report.mjs";
import { buildQueryCatalog } from "./lib/garden-queries.mjs";
import {
  buildClaimFeeds,
  buildEdgeFeeds,
  buildFeedManifest,
  buildRoadmapFeeds,
  buildSourceFeeds
} from "./lib/agent-feeds.mjs";
import { estimateTokens } from "./lib/token-estimate.mjs";
import { buildEvalReport } from "./lib/eval-briefs.mjs";

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
    tokenEstimate: article.tokenEstimate,
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
    tokenEstimate: article.tokenEstimate,
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

  const addEdge = (from, to, type, provenance) => {
    edges.set(`${from}:${type}:${to}`, { from, to, type, ...(provenance ? { provenance } : {}) });
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

    const machineProvenance = {
      reviewedAt: artifact.updatedAt,
      reviewer: "generator",
      status: "machine-generated"
    };

    for (const topic of artifact.topics) {
      const topicId = `topic:${topic}`;
      addNode({ id: topicId, type: "topic", label: topic });
      addEdge(artifact.id, topicId, "covers", machineProvenance);
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
      addEdge(artifact.id, claimNodeId, "argues", machineProvenance);

      for (const packet of claim.evidence) {
        addEdge(packet.sourceId, claimNodeId, "supports", {
          reviewedAt: packet.assessedAt ?? artifact.updatedAt,
          reviewer: "generator",
          status: "machine-generated"
        });
      }

      for (const packet of claim.counterevidence) {
        const sourceId = packet.sourceId;
        if (sourceId) {
          addEdge(sourceId, claimNodeId, "contests", {
            reviewedAt: packet.assessedAt ?? artifact.updatedAt,
            reviewer: "generator",
            status: "machine-generated"
          });
        }
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
      addEdge(artifact.id, relation.id, relation.type, machineProvenance);
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
for (const article of allArticles) {
  article.tokenEstimate = estimateTokens(article.agentBody);
}
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

// Preserve the agent-tools manifest so its generatedAt stays stable across runs.
let preservedToolsManifest = null;
try {
  preservedToolsManifest = await readJson(publicPath("agents", "tools.json"));
} catch {
  // Manifest does not exist yet.
}

await rm(publicPath("agents"), { recursive: true, force: true });
await rm(publicPath("graph"), { recursive: true, force: true });
await mkdir(publicPath("agents", "articles"), { recursive: true });
await mkdir(publicPath("agents", "roadmap"), { recursive: true });
await mkdir(publicPath("agents", "topics"), { recursive: true });
await mkdir(publicPath("agents", "feeds"), { recursive: true });
await mkdir(publicPath("graph"), { recursive: true });

if (preservedToolsManifest) {
  await writeJson(publicPath("agents", "tools.json"), preservedToolsManifest);
}

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
  schemaVersion: 3,
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
await writeJson(publicPath("graph", "edges.json"), {
  schemaVersion: 2,
  generatedAt,
  edges: graph.edges
});

const llms = [
  "# Aura Knowledge",
  "",
  "> Focused essays for humans, backed by compact agent-auditable research packets.",
  "",
  "## Primary Pages",
  `- [Home](${siteUrl("/")})`,
  `- [Roadmap](${siteUrl("/roadmap/")})`,
  `- [Evidence Canvas](${siteUrl("/evidence-canvas/")})`,
  `- [Agent Entry](${siteUrl("/agents/")})`,
  `- [Knowledge Graph](${siteUrl("/graph/")})`,
  "",
  "## Articles",
  ...entries.map((entry) => `- [${entry.title}](${entry.articleUrl})`),
  "",
  "## Agent Artifacts",
  `- [Agent Index JSON](${siteUrl("/agents/index.json")})`,
  `- [Agent Index JSONL](${siteUrl("/agents/index.jsonl")})`,
  `- [Garden Query Catalog](${siteUrl("/agents/garden-queries.json")})`,
  `- [Brief Eval Report](${siteUrl("/agents/eval-report.json")})`,
  `- [Claim Verification Report](${siteUrl("/agents/verification-report.json")})`,
  `- [Graph Nodes](${siteUrl("/graph/nodes.json")})`,
  `- [Graph Edges](${siteUrl("/graph/edges.json")})`,
  ...roadmaps.map((roadmap) => `- [${roadmap.slug} roadmap JSON](${siteUrl(`/agents/roadmap/${roadmap.slug}.json`)})`),
  ...entries.flatMap((entry) => [
    `- [${entry.slug} JSON](${siteUrl(entry.agentJsonPath)})`,
    `- [${entry.slug} Markdown](${siteUrl(entry.agentMarkdownPath)})`
  ]),
  ...topicsIndex.map((topic) => `- [${topic.topic} topic JSON](${siteUrl(topic.agentJsonPath)})`),
  `- [Agent Feeds Manifest](${siteUrl("/agents/feeds/manifest.json")})`,
  `- [Claims Feed JSONL](${siteUrl("/agents/feeds/claims.jsonl")})`,
  `- [Sources Feed JSONL](${siteUrl("/agents/feeds/sources.jsonl")})`,
  `- [Roadmap Feed JSONL](${siteUrl("/agents/feeds/roadmap.jsonl")})`,
  `- [Edges Feed JSONL](${siteUrl("/agents/feeds/edges.jsonl")})`,
  "",
  "## Use",
  "Use article packets as the retrieval unit. Treat maturity values as uncertainty markers. Prefer claim IDs and source IDs over inferred citations. Article artifacts use schemaVersion 3 with a provenance block (agents, reviews, policy) and typed evidence/counterevidence packets. Trust a published packet only when its provenance contains a human-approved review whose contentHash matches the current article.md hash.",
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

const verificationReport = buildVerificationReport(allArticles, generatedAt);
await writeJson(publicPath("agents", "verification-report.json"), verificationReport);

const queryCatalog = buildQueryCatalog(
  { index: { site, base }, articles: allArticles, verificationReport, edges: graph.edges },
  site,
  base,
  generatedAt
);
await writeJson(publicPath("agents", "garden-queries.json"), queryCatalog);

const feeds = {
  claims: buildClaimFeeds(articles, site),
  sources: buildSourceFeeds(articles, site),
  roadmap: buildRoadmapFeeds(roadmaps),
  edges: buildEdgeFeeds(graph.edges)
};
const feedManifest = buildFeedManifest(feeds, site, base, generatedAt);
await writeJson(publicPath("agents", "feeds", "manifest.json"), feedManifest);
for (const [name, lines] of Object.entries(feeds)) {
  await writeFile(
    publicPath("agents", "feeds", `${name}.jsonl`),
    `${lines.map((line) => JSON.stringify(line)).join("\n")}\n`
  );
}

const evalSet = await readJson(path.join(rootDir, "content", "eval", "brief-eval-set.json"));
const articlePacketsBySlug = new Map(articles.map((article) => [article.slug, article.artifact]));
const evalReport = await buildEvalReport(
  evalSet,
  { index: { site, base }, articles: allArticles, verificationReport, edges: graph.edges },
  articlePacketsBySlug,
  generatedAt
);
await writeJson(publicPath("agents", "eval-report.json"), evalReport);

await writeFile(publicPath("llms.txt"), llms);

console.log(`Generated ${entries.length} article packet(s), ${roadmaps.length} roadmap packet(s), ${graph.nodes.length} graph node(s), ${graph.edges.length} edge(s), ${queryCatalog.queries.length} query catalog(s), ${feedManifest.counts.claims} claim feed(s), ${feedManifest.counts.sources} source feed(s), ${feedManifest.counts.roadmap} roadmap feed row(s), ${feedManifest.counts.edges} edge feed(s), ${evalReport.summary.total} eval case(s) (${evalReport.summary.passed} passed), and ${allFindings.length} diagnostic finding(s).`);
