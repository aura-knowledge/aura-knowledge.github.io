import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadArticles, publicRoot, readJson, rootDir, toPosix } from "./content-utils.mjs";

export const ALLOWED_MATURITIES = new Set([
  "seed",
  "sprout",
  "evergreen",
  "contested",
  "superseded"
]);

export const ALLOWED_STATUSES = new Set(["draft", "review", "published", "archived"]);

export const CLAIM_STATES = new Set([
  "verified",
  "contested",
  "stale",
  "needs-evidence",
  "missing-counterevidence",
  "draft"
]);

export async function loadGardenData() {
  const verificationReportPath = path.join(publicRoot, "agents", "verification-report.json");
  const [index, articles, verificationReport, edgesPacket] = await Promise.all([
    readJson(path.join(publicRoot, "agents", "index.json")),
    loadArticles(),
    readJson(verificationReportPath).catch((error) => {
      throw new Error(
        `Cannot serve verification data: failed to read ${toPosix(path.relative(rootDir, verificationReportPath))} (${error.message}). Run npm run generate to rebuild agent outputs.`
      );
    }),
    readJson(path.join(publicRoot, "graph", "edges.json")).catch(() => ({ edges: [] }))
  ]);

  if (
    verificationReport == null ||
    ((index.articles?.length ?? 0) > 0 && (verificationReport.articles ?? []).length === 0)
  ) {
    throw new Error(
      `Cannot serve verification data: ${toPosix(path.relative(rootDir, verificationReportPath))} contains no usable verification data. Run npm run generate to rebuild agent outputs.`
    );
  }

  const edges = edgesPacket.edges ?? edgesPacket ?? [];
  return { index, articles, verificationReport, edges };
}

function buildArticleIndex(articles) {
  const bySlug = new Map();
  const byId = new Map();
  for (const article of articles) {
    bySlug.set(article.slug, article);
    byId.set(article.artifact.id, article);
  }
  return { bySlug, byId };
}

function buildClaimStateMap(verificationReport) {
  const map = new Map();
  for (const entry of verificationReport.articles ?? []) {
    const states = new Map();
    for (const claim of entry.claims ?? []) {
      states.set(claim.id, claim.state);
    }
    map.set(entry.slug, states);
  }
  return map;
}

function buildRelatedSet(targetArticle, articles, edges) {
  const related = new Set();
  const targetId = targetArticle.artifact.id;

  for (const article of articles) {
    if (article.slug === targetArticle.slug) continue;

    const sharesTopic = article.artifact.topics.some((topic) =>
      targetArticle.artifact.topics.includes(topic)
    );
    if (sharesTopic) {
      related.add(article.slug);
      continue;
    }

    const hasRelation = article.artifact.related.some(
      (relation) => relation.id === targetId || relation.id === targetArticle.slug
    );
    if (hasRelation) {
      related.add(article.slug);
    }
  }

  for (const edge of edges) {
    if (edge.type === "argues" || edge.type === "covers") continue;
    const isTarget = edge.from === targetId || edge.to === targetId;
    if (!isTarget) continue;
    const otherId = edge.from === targetId ? edge.to : edge.from;
    const other = articles.find((article) => article.artifact.id === otherId);
    if (other) {
      related.add(other.slug);
    }
  }

  return related;
}

function articleMatchesKeyword(article, phrase) {
  const needle = phrase.toLowerCase();
  const haystack = [
    article.artifact.title,
    article.articleFrontmatter.summary,
    article.artifact.thesis,
    ...article.artifact.topics,
    ...article.articleFrontmatter.tags,
    ...article.artifact.claims.map((claim) => claim.claim),
    ...article.artifact.sources.map((source) => source.title)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

function toResultEntry(article, site) {
  return {
    articleId: article.artifact.id,
    slug: article.slug,
    articleUrl: new URL(article.artifact.canonicalPath, site).toString(),
    agentJsonPath: `/agents/articles/${article.slug}.json`
  };
}

export function queryArticles(options, data) {
  const { index, articles, verificationReport, edges } = data;
  const site = index?.site ?? "https://aura-knowledge.github.io";
  const { bySlug } = buildArticleIndex(articles);
  const claimStateMap = buildClaimStateMap(verificationReport);

  let results = articles.slice();

  if (options.topic) {
    results = results.filter((article) => article.artifact.topics.includes(options.topic));
  }

  if (options.tag) {
    results = results.filter((article) => article.articleFrontmatter.tags.includes(options.tag));
  }

  if (options.maturity) {
    results = results.filter((article) => article.artifact.maturity === options.maturity);
  }

  if (options.status) {
    results = results.filter((article) => article.artifact.status === options.status);
  }

  if (options.citesSourceType) {
    results = results.filter((article) =>
      article.artifact.sources.some((source) => source.type === options.citesSourceType)
    );
  }

  if (options.claimState) {
    results = results.filter((article) => {
      const states = claimStateMap.get(article.slug);
      if (!states) return false;
      return Array.from(states.values()).some((state) => state === options.claimState);
    });
  }

  if (options.keyword) {
    results = results.filter((article) => articleMatchesKeyword(article, options.keyword));
  }

  if (options.relatedTo) {
    const target = bySlug.get(options.relatedTo);
    if (!target) {
      return [];
    }
    const related = buildRelatedSet(target, articles, edges);
    results = results.filter((article) => related.has(article.slug));
  }

  if (typeof options.limit === "number" && options.limit > 0) {
    results = results.slice(0, options.limit);
  }

  return results.map((article) => toResultEntry(article, site));
}

export function formatResults(results, format) {
  switch (format) {
    case "ids":
      return results.map((entry) => entry.slug).join("\n") + (results.length ? "\n" : "");
    case "jsonl":
      return results.map((entry) => JSON.stringify(entry)).join("\n") + (results.length ? "\n" : "");
    case "markdown": {
      if (results.length === 0) return "No results.\n";
      return results
        .map((entry) => `- [${entry.slug}](${entry.articleUrl})`)
        .join("\n") + "\n";
    }
    case "json":
    default:
      return JSON.stringify(results, null, 2) + "\n";
  }
}

export function buildQueryCatalog(data, site, base, generatedAt) {
  const { articles, verificationReport } = data;
  const publishedArticles = articles.filter((article) => article.artifact.status === "published");
  const { bySlug } = buildArticleIndex(articles);
  const schemaUrl = new URL(
    toPosix(path.relative(rootDir, path.join(rootDir, "schemas", "garden-queries.schema.json"))),
    site
  ).toString();

  function articleEntry(article) {
    return {
      articleId: article.artifact.id,
      slug: article.slug,
      articleUrl: new URL(article.artifact.canonicalPath, site).toString(),
      agentJsonPath: `/agents/articles/${article.slug}.json`
    };
  }

  function claimEntry(article, claim) {
    return {
      ...articleEntry(article),
      claimId: claim.id,
      claim: claim.claim,
      confidence: claim.confidence,
      status: claim.status
    };
  }

  function sourceEntry(article, source) {
    return {
      ...articleEntry(article),
      sourceId: source.id,
      sourceTitle: source.title,
      sourceType: source.type,
      sourceUrl: source.url
    };
  }

  const topicGroups = new Map();
  for (const article of publishedArticles) {
    for (const topic of article.artifact.topics) {
      if (!topicGroups.has(topic)) topicGroups.set(topic, []);
      topicGroups.get(topic).push(articleEntry(article));
    }
  }
  const articlesByTopic = [];
  for (const [topic, results] of Array.from(topicGroups.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    articlesByTopic.push(...results.map((entry) => ({ ...entry, topic })));
  }

  const typeGroups = new Map();
  for (const article of publishedArticles) {
    for (const source of article.artifact.sources) {
      if (!typeGroups.has(source.type)) typeGroups.set(source.type, []);
      typeGroups.get(source.type).push(sourceEntry(article, source));
    }
  }
  const sourcesByType = [];
  for (const [sourceType, results] of Array.from(typeGroups.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    sourcesByType.push(...results.map((entry) => ({ ...entry, sourceType })));
  }

  const claimsNeedingEvidence = [];
  const claimsContestedOrStale = [];
  const highConfidenceClaims = [];
  const articlesWithDraftClaims = [];

  for (const article of publishedArticles) {
    let hasDraftClaim = false;
    const report = verificationReport.articles?.find((entry) => entry.slug === article.slug);
    const stateByClaimId = new Map();
    if (report) {
      for (const claim of report.claims ?? []) {
        stateByClaimId.set(claim.id, claim.state);
      }
    }

    for (const claim of article.artifact.claims) {
      const state = stateByClaimId.get(claim.id);
      if (state === "needs-evidence") {
        claimsNeedingEvidence.push(claimEntry(article, claim));
      }
      if (state === "contested" || state === "stale") {
        claimsContestedOrStale.push(claimEntry(article, claim));
      }
      if (claim.confidence === "high") {
        highConfidenceClaims.push(claimEntry(article, claim));
      }
      if (state === "draft") {
        hasDraftClaim = true;
      }
    }

    if (hasDraftClaim) {
      articlesWithDraftClaims.push(articleEntry(article));
    }
  }

  const allTopicValues = Array.from(topicGroups.keys()).sort();
  const allTagValues = Array.from(
    new Set(publishedArticles.flatMap((article) => article.articleFrontmatter.tags ?? []))
  ).sort();
  const allSourceTypes = Array.from(typeGroups.keys()).sort();

  const queries = [
    {
      name: "articles-by-topic",
      description: "Published articles grouped by topic.",
      params: { groupBy: "topic" },
      resultType: "articles",
      resultCount: articlesByTopic.length,
      results: articlesByTopic
    },
    {
      name: "claims-needing-evidence",
      description: "Claims whose computed verification state is needs-evidence.",
      params: { claimState: "needs-evidence" },
      resultType: "claims",
      resultCount: claimsNeedingEvidence.length,
      results: claimsNeedingEvidence
    },
    {
      name: "claims-contested-or-stale",
      description: "Claims whose computed verification state is contested or stale.",
      params: { claimState: ["contested", "stale"] },
      resultType: "claims",
      resultCount: claimsContestedOrStale.length,
      results: claimsContestedOrStale
    },
    {
      name: "high-confidence-claims",
      description: "Claims with confidence high.",
      params: { confidence: "high" },
      resultType: "claims",
      resultCount: highConfidenceClaims.length,
      results: highConfidenceClaims
    },
    {
      name: "sources-by-type",
      description: "Sources grouped by source type.",
      params: { groupBy: "sourceType" },
      resultType: "sources",
      resultCount: sourcesByType.length,
      results: sourcesByType
    },
    {
      name: "articles-with-draft-claims",
      description: "Published articles that contain at least one draft-state claim.",
      params: { claimState: "draft", status: "published" },
      resultType: "articles",
      resultCount: articlesWithDraftClaims.length,
      results: articlesWithDraftClaims
    }
  ];

  const totalResults = queries.reduce((sum, query) => sum + query.resultCount, 0);

  return {
    schemaVersion: 1,
    schema: schemaUrl,
    site,
    base,
    generatedAt,
    catalogSize: {
      queryCount: queries.length,
      totalResults
    },
    dimensions: [
      {
        name: "topic",
        description: "Article topic.",
        values: allTopicValues
      },
      {
        name: "tag",
        description: "Article tag.",
        values: allTagValues
      },
      {
        name: "maturity",
        description: "Article maturity.",
        values: Array.from(ALLOWED_MATURITIES)
      },
      {
        name: "status",
        description: "Article publication status.",
        values: Array.from(ALLOWED_STATUSES)
      },
      {
        name: "citesSourceType",
        description: "Source type cited by the article.",
        values: allSourceTypes
      },
      {
        name: "claimState",
        description: "Computed verification state of a claim.",
        values: Array.from(CLAIM_STATES)
      },
      {
        name: "keyword",
        description: "Case-insensitive phrase match across title, summary, thesis, claims, sources, tags, and topics."
      },
      {
        name: "relatedTo",
        description: "Articles related by shared topic or graph edge to the given slug."
      }
    ],
    queries
  };
}
