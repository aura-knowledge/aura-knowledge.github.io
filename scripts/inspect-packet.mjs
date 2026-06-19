import { readJson } from "./lib/content-utils.mjs";
import { loadGardenData } from "./lib/garden-queries.mjs";

function usage() {
  console.log(`Usage: node scripts/inspect-packet.mjs [options]

Read-only inspector for garden artifacts. Returns compact slices of articles,
claims, sources, or graph neighbors. No write operations; no MCP server.

Options:
  --article <slug>        Inspect an article packet.
  --claim <slug:claimId>  Inspect a specific claim (e.g., agent-auditable-research:claim-001).
  --source <sourceId>     Inspect a source and its citations.
  --graph-slice <nodeId>  Inspect first-hop graph neighbors of a node.
  --format <json|markdown>  Output format (default: json).
  --help                  Show this message.

Examples:
  node scripts/inspect-packet.mjs --article agent-auditable-research
  node scripts/inspect-packet.mjs --claim agent-auditable-research:claim-001 --format markdown
  node scripts/inspect-packet.mjs --source source-agentic-publications-2025
  node scripts/inspect-packet.mjs --graph-slice article:agent-auditable-research
`);
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--help":
        usage();
        process.exit(0);
        break;
      case "--article":
        options.article = argv[++i];
        break;
      case "--claim":
        options.claim = argv[++i];
        break;
      case "--source":
        options.source = argv[++i];
        break;
      case "--graph-slice":
        options.graphSlice = argv[++i];
        break;
      case "--format":
        options.format = argv[++i];
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function validateOptions(options) {
  const modes = [options.article, options.claim, options.source, options.graphSlice].filter(Boolean);
  if (modes.length === 0) {
    throw new Error("Specify one of --article, --claim, --source, or --graph-slice.");
  }
  if (modes.length > 1) {
    throw new Error("Specify only one inspection mode at a time.");
  }
  if (options.format && !["json", "markdown"].includes(options.format)) {
    throw new Error(`Invalid format: ${options.format}`);
  }
}

async function loadArticlePacket(slug, data) {
  const entry = data.index.articles.find((article) => article.slug === slug);
  if (!entry) {
    throw new Error(`Article not found: ${slug}`);
  }
  return readJson(entry.agentJsonPath.replace(/^\//, "public/"));
}

function inspectArticle(packet) {
  return {
    id: packet.id,
    slug: packet.slug,
    title: packet.title,
    status: packet.status,
    maturity: packet.maturity,
    topics: packet.topics,
    thesis: packet.thesis,
    articleUrl: packet.articleUrl,
    tokenEstimate: packet.tokenEstimate,
    claimCount: packet.claims.length,
    sourceCount: packet.sources.length,
    claims: packet.claims.map((claim) => ({
      id: claim.id,
      claim: claim.claim,
      confidence: claim.confidence,
      status: claim.status
    })),
    sources: packet.sources.map((source) => ({
      id: source.id,
      title: source.title,
      type: source.type,
      url: source.url
    }))
  };
}

function inspectClaim(packet, localClaimId) {
  const claim = packet.claims.find((c) => c.id === localClaimId);
  if (!claim) {
    throw new Error(`Claim not found: ${localClaimId}`);
  }
  return {
    articleId: packet.id,
    slug: packet.slug,
    articleUrl: packet.articleUrl,
    claimId: `${packet.id}:${claim.id}`,
    localClaimId: claim.id,
    claim: claim.claim,
    confidence: claim.confidence,
    status: claim.status,
    evidence: claim.evidence,
    counterevidence: claim.counterevidence
  };
}

function inspectSource(sourceId, data) {
  const results = [];
  for (const entry of data.index.articles) {
    const packet = data.articlePacketsBySlug?.get(entry.slug);
    if (!packet) continue;
    const source = packet.sources.find((s) => s.id === sourceId);
    if (!source) continue;

    const supporting = [];
    const contesting = [];
    for (const claim of packet.claims) {
      if (claim.evidence.some((packet) => packet.sourceId === sourceId)) {
        supporting.push(`${packet.id}:${claim.id}`);
      }
      if (claim.counterevidence.some((packet) => packet.sourceId === sourceId)) {
        contesting.push(`${packet.id}:${claim.id}`);
      }
    }

    results.push({
      articleId: packet.id,
      slug: entry.slug,
      articleUrl: packet.articleUrl,
      source,
      supportingClaimIds: supporting,
      contestingClaimIds: contesting
    });
  }

  if (results.length === 0) {
    throw new Error(`Source not found: ${sourceId}`);
  }

  return {
    sourceId,
    occurrences: results
  };
}

function inspectGraphSlice(nodeId, data) {
  const node = data.nodes.find((n) => n.id === nodeId);
  if (!node) {
    throw new Error(`Graph node not found: ${nodeId}`);
  }

  const outgoing = data.edges
    .filter((edge) => edge.from === nodeId)
    .map((edge) => ({ type: edge.type, nodeId: edge.to, label: data.nodeById.get(edge.to)?.label ?? edge.to }));
  const incoming = data.edges
    .filter((edge) => edge.to === nodeId)
    .map((edge) => ({ type: edge.type, nodeId: edge.from, label: data.nodeById.get(edge.from)?.label ?? edge.from }));

  return {
    node: {
      id: node.id,
      type: node.type,
      label: node.label
    },
    outgoing,
    incoming
  };
}

function formatJson(value) {
  return JSON.stringify(value, null, 2) + "\n";
}

function formatMarkdownArticle(slice) {
  return `# ${slice.title}\n\n- **Slug:** ${slice.slug}\n- **Status:** ${slice.status}\n- **Maturity:** ${slice.maturity}\n- **Topics:** ${slice.topics.join(", ")}\n- **Claims:** ${slice.claimCount}\n- **Sources:** ${slice.sourceCount}\n- **URL:** ${slice.articleUrl}\n`;
}

function formatMarkdownClaim(slice) {
  return `# ${slice.localClaimId}\n\n${slice.claim}\n\n- **Confidence:** ${slice.confidence}\n- **Status:** ${slice.status}\n- **Evidence packets:** ${slice.evidence.length}\n- **Counterevidence packets:** ${slice.counterevidence.length}\n`;
}

function formatMarkdownSource(slice) {
  const lines = [`# ${slice.sourceId}`, ""];
  for (const occurrence of slice.occurrences) {
    lines.push(`## ${occurrence.slug}`);
    lines.push(`- **Title:** ${occurrence.source.title}`);
    lines.push(`- **Type:** ${occurrence.source.type}`);
    lines.push(`- **URL:** ${occurrence.source.url}`);
    lines.push(`- **Supporting claims:** ${occurrence.supportingClaimIds.length}`);
    lines.push(`- **Contesting claims:** ${occurrence.contestingClaimIds.length}`);
    lines.push("");
  }
  return lines.join("\n") + "\n";
}

function formatMarkdownGraphSlice(slice) {
  const lines = [`# ${slice.node.id}`, `**Type:** ${slice.node.type}`, ""];
  if (slice.outgoing.length > 0) {
    lines.push("## Outgoing");
    for (const edge of slice.outgoing) {
      lines.push(`- ${edge.type} → ${edge.nodeId}`);
    }
    lines.push("");
  }
  if (slice.incoming.length > 0) {
    lines.push("## Incoming");
    for (const edge of slice.incoming) {
      lines.push(`- ${edge.type} ← ${edge.nodeId}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function formatOutput(slice, mode, format) {
  if (format === "markdown") {
    if (mode === "article") return formatMarkdownArticle(slice);
    if (mode === "claim") return formatMarkdownClaim(slice);
    if (mode === "source") return formatMarkdownSource(slice);
    if (mode === "graphSlice") return formatMarkdownGraphSlice(slice);
  }
  return formatJson(slice);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  validateOptions(options);

  const data = await loadGardenData();
  const articlePacketsBySlug = new Map();
  for (const entry of data.index.articles) {
    articlePacketsBySlug.set(
      entry.slug,
      await readJson(entry.agentJsonPath.replace(/^\//, "public/"))
    );
  }
  data.articlePacketsBySlug = articlePacketsBySlug;
  data.nodes = await readJson("public/graph/nodes.json");
  data.edges = (await readJson("public/graph/edges.json")).edges ?? [];
  data.nodeById = new Map(data.nodes.map((node) => [node.id, node]));

  let slice;
  let mode;
  if (options.article) {
    mode = "article";
    const packet = await loadArticlePacket(options.article, data);
    slice = inspectArticle(packet);
  } else if (options.claim) {
    mode = "claim";
    const [slug, localClaimId] = options.claim.split(":");
    if (!slug || !localClaimId) {
      throw new Error("--claim must be in the form slug:claimId.");
    }
    const packet = await loadArticlePacket(slug, data);
    slice = inspectClaim(packet, localClaimId);
  } else if (options.source) {
    mode = "source";
    slice = inspectSource(options.source, data);
  } else if (options.graphSlice) {
    mode = "graphSlice";
    slice = inspectGraphSlice(options.graphSlice, data);
  }

  process.stdout.write(formatOutput(slice, mode, options.format ?? "json"));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
