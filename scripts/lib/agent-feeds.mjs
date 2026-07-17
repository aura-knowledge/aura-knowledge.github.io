import { estimateTokens } from "./token-estimate.mjs";

function articleUrl(article, site) {
  return new URL(article.artifact.canonicalPath, site).toString();
}

export function buildClaimFeeds(articles, site) {
  const lines = [];
  for (const article of articles) {
    if (article.artifact.status !== "published") continue;
    const url = articleUrl(article, site);
    for (const claim of article.artifact.claims) {
      const assessedDates = claim.evidence
        .map((packet) => packet.assessedAt)
        .filter(Boolean)
        .sort();
      lines.push({
        articleId: article.artifact.id,
        slug: article.slug,
        claimId: `${article.artifact.id}:${claim.id}`,
        localClaimId: claim.id,
        claim: claim.claim,
        confidence: claim.confidence,
        status: claim.status,
        verificationStatus: claim.verification?.status ?? "draft",
        asOf: assessedDates.length > 0 ? assessedDates[assessedDates.length - 1] : null,
        evidenceCount: claim.evidence.length,
        counterevidenceCount: claim.counterevidence.length,
        articleUrl: url
      });
    }
  }
  return lines;
}

export function buildSourceFeeds(articles, site) {
  const lines = [];
  for (const article of articles) {
    if (article.artifact.status !== "published") continue;
    const url = articleUrl(article, site);
    for (const source of article.artifact.sources) {
      lines.push({
        articleId: article.artifact.id,
        slug: article.slug,
        sourceId: source.id,
        title: source.title,
        type: source.type,
        url: source.url,
        accessed: source.accessed,
        articleUrl: url
      });
    }
  }
  return lines;
}

export function buildRoadmapFeeds(roadmaps) {
  const lines = [];
  for (const roadmap of roadmaps) {
    if (roadmap.status !== "published") continue;
    const phaseByIdea = new Map();
    for (const phase of roadmap.phases ?? []) {
      for (const ideaId of phase.ideaIds ?? []) {
        phaseByIdea.set(ideaId, phase.id);
      }
    }
    for (const idea of roadmap.ideas ?? []) {
      lines.push({
        roadmapId: roadmap.id,
        ideaId: idea.id,
        title: idea.title,
        priority: idea.priority,
        category: idea.category,
        phaseId: phaseByIdea.get(idea.id) ?? null
      });
    }
  }
  return lines;
}

export function buildEdgeFeeds(edges) {
  return edges.map((edge) => ({
    from: edge.from,
    to: edge.to,
    type: edge.type
  }));
}

export function buildFeedManifest(feeds, site, base, generatedAt) {
  const files = {};
  for (const [name, lines] of Object.entries(feeds)) {
    files[name] = {
      path: `/agents/feeds/${name}.jsonl`,
      count: lines.length
    };
  }
  return {
    schemaVersion: 1,
    generatedAt,
    site,
    base,
    counts: {
      claims: feeds.claims.length,
      sources: feeds.sources.length,
      roadmap: feeds.roadmap.length,
      edges: feeds.edges.length
    },
    files
  };
}

export function buildArticleIndexWithTokens(article) {
  return {
    ...article,
    tokenEstimate: estimateTokens(article.agentBody)
  };
}

export function addTokenEstimateToPacket(packet, agentBody) {
  return {
    ...packet,
    tokenEstimate: estimateTokens(agentBody)
  };
}
