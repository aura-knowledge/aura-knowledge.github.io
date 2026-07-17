import { access, readFile, readdir } from "node:fs/promises";
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
import { assessArticle, summarizeFindings } from "./lib/evidence-diagnostics.mjs";

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
const policySchema = await readJson(path.join(rootDir, "schemas", "policy.schema.json"));
const gardenQueriesSchema = await readJson(path.join(rootDir, "schemas", "garden-queries.schema.json"));
const agentFeedsSchema = await readJson(path.join(rootDir, "schemas", "agent-feeds.schema.json"));
const briefEvalSetSchema = await readJson(path.join(rootDir, "schemas", "brief-eval-set.schema.json"));
const evalReportSchema = await readJson(path.join(rootDir, "schemas", "eval-report.schema.json"));
const validateArticle = ajv.compile(articleSchema);
const validateAgent = ajv.compile(agentSchema);
const validateArtifact = ajv.compile(artifactSchema);
const validateRoadmap = ajv.compile(roadmapSchema);
const validatePolicy = ajv.compile(policySchema);
const validateGardenQueries = ajv.compile(gardenQueriesSchema);
const validateAgentFeeds = ajv.compile(agentFeedsSchema);
const validateBriefEvalSet = ajv.compile(briefEvalSetSchema);
const validateEvalReport = ajv.compile(evalReportSchema);

async function loadPolicies() {
  const knownPolicies = new Map();
  const policyDir = path.join(rootDir, "policies");
  let entries = [];
  try {
    entries = await readdir(policyDir);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  for (const file of entries.filter((name) => name.endsWith(".json"))) {
    const policyPath = path.join(policyDir, file);
    const policy = await readJson(policyPath);
    if (!validatePolicy(policy)) {
      formatAjvErrors(`policies/${file}`, validatePolicy);
    } else {
      knownPolicies.set(policy.id, policy.version);
    }
  }

  return knownPolicies;
}

const knownPolicies = await loadPolicies();
const errors = [];
const warnings = [];

const TEMPLATE_PLACEHOLDER_MARKERS = [
  /replace with the first claim/i,
  /replace with source title/i,
  /replace with a short summary/i,
  /replace with a direct quote or excerpt/i,
  /^\s*[-*]\s*primary audience member\.?\s*$/im
];

const AGENT_CLAIM_LINE_PATTERN = /^\s*[-*]\s*`(claim-\d{3})`:\s*(.+?)\s*$/gm;

function normalizeClaimText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function report(message) {
  errors.push(message);
}

function reportWarning(message) {
  warnings.push(message);
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

  const policyId = article.artifact.provenance?.policy?.id;
  const policyVersion = article.artifact.provenance?.policy?.version;
  if (policyId) {
    const knownVersion = knownPolicies.get(policyId);
    if (!knownVersion) {
      report(`${prefix}: provenance references unknown policy ${policyId}.`);
    } else if (policyVersion && knownVersion !== policyVersion) {
      report(`${prefix}: provenance policy version ${policyVersion} does not match ${policyId} v${knownVersion}.`);
    }
  }

  const claimIds = article.artifact.claims.map((claim) => claim.id);
  const sourceIdsList = article.artifact.sources.map((source) => source.id);
  reportDuplicates(prefix, "claim id", claimIds);
  reportDuplicates(prefix, "source id", sourceIdsList);

  const findings = assessArticle(article, article.articleBody, { prefix, knownPolicies });
  for (const finding of findings) {
    if (finding.severity === "error") {
      report(finding.message);
    } else {
      reportWarning(finding.message);
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
    for (const marker of TEMPLATE_PLACEHOLDER_MARKERS) {
      if (marker.test(article.agentBody)) {
        report(
          `${prefix}: agent.md contains template placeholder text matching ${marker}. Regenerate the agent brief from real article content.`
        );
      }
    }

    const briefClaimLines = new Map();
    for (const match of article.agentBody.matchAll(AGENT_CLAIM_LINE_PATTERN)) {
      briefClaimLines.set(match[1], match[2]);
    }
    if (briefClaimLines.size > 0) {
      for (const [claimId, briefText] of briefClaimLines) {
        const artifactClaim = article.artifact.claims.find((claim) => claim.id === claimId);
        if (!artifactClaim) {
          report(`${prefix}: agent.md states ${claimId}, which is not present in artifact claims.`);
        } else if (normalizeClaimText(briefText) !== normalizeClaimText(artifactClaim.claim)) {
          report(
            `${prefix}: agent.md ${claimId} text does not match the artifact claim text. Sync the brief to the artifact.`
          );
        }
      }
      for (const claim of article.artifact.claims) {
        if (!briefClaimLines.has(claim.id)) {
          reportWarning(`${prefix}: agent.md enumerates claims but omits ${claim.id}.`);
        }
      }
    }

    await assertExists(path.join(publicRoot, "agents", "articles", `${article.slug}.json`));
    await assertExists(path.join(publicRoot, "agents", "articles", `${article.slug}.md`));
  }
}

await assertExists(path.join(publicRoot, "agents", "index.json"));
await assertExists(path.join(publicRoot, "agents", "index.jsonl"));
await assertExists(path.join(publicRoot, "agents", "garden-queries.json"));
await assertExists(path.join(publicRoot, "agents", "feeds", "manifest.json"));
await assertExists(path.join(publicRoot, "agents", "feeds", "claims.jsonl"));
await assertExists(path.join(publicRoot, "agents", "feeds", "sources.jsonl"));
await assertExists(path.join(publicRoot, "agents", "feeds", "roadmap.jsonl"));
await assertExists(path.join(publicRoot, "agents", "feeds", "edges.jsonl"));
await assertExists(path.join(rootDir, "content", "eval", "brief-eval-set.json"));
await assertExists(path.join(publicRoot, "agents", "eval-report.json"));
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

let nodeIds = new Set();
let indexArticleIds = new Set();

try {
  const nodes = await readJson(path.join(publicRoot, "graph", "nodes.json"));
  const edgesPacket = await readJson(path.join(publicRoot, "graph", "edges.json"));
  const edges = edgesPacket.edges ?? edgesPacket;
  if (edgesPacket.schemaVersion && edgesPacket.schemaVersion !== 2) {
    report(`graph: edges.json schemaVersion ${edgesPacket.schemaVersion} is not the expected v2.`);
  }
  nodeIds = new Set(nodes.map((node) => node.id));
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
  const catalog = await readJson(path.join(publicRoot, "agents", "garden-queries.json"));
  if (!validateGardenQueries(catalog)) {
    formatAjvErrors("garden-queries", validateGardenQueries);
  }
  if (catalog.schemaVersion !== 1) {
    report(`garden-queries: unexpected schemaVersion ${catalog.schemaVersion}.`);
  }

  const index = await readJson(path.join(publicRoot, "agents", "index.json"));
  indexArticleIds = new Set(index.articles?.map((entry) => entry.id) ?? []);
  for (const query of catalog.queries ?? []) {
    for (const result of query.results ?? []) {
      if (!indexArticleIds.has(result.articleId)) {
        report(`garden-queries/${query.name}: result references unknown article ${result.articleId}.`);
      }
    }
  }
} catch (error) {
  report(`Generated garden query catalog is invalid: ${error.message}`);
}

try {
  const manifest = await readJson(path.join(publicRoot, "agents", "feeds", "manifest.json"));
  if (!validateAgentFeeds(manifest)) {
    formatAjvErrors("agent-feeds/manifest", validateAgentFeeds);
  }

  const knownSourceIds = new Set(publishedArticles.flatMap((article) => article.artifact.sources.map((source) => source.id)));
  const knownClaimIds = new Set(
    publishedArticles.flatMap((article) =>
      article.artifact.claims.map((claim) => `${article.artifact.id}:${claim.id}`)
    )
  );

  async function validateJsonlFeed(name, requiredFields, validateLine) {
    const filePath = path.join(publicRoot, "agents", "feeds", `${name}.jsonl`);
    const raw = await readFile(filePath, "utf8");
    const lines = raw.trim().split("\n").filter(Boolean);
    const expectedCount = manifest.counts[name] ?? manifest.files[name]?.count;
    if (lines.length !== expectedCount) {
      report(`agent-feeds/${name}: line count ${lines.length} does not match manifest ${expectedCount}.`);
    }
    for (let i = 0; i < lines.length; i += 1) {
      let line;
      try {
        line = JSON.parse(lines[i]);
      } catch {
        report(`agent-feeds/${name}:${i + 1}: invalid JSON.`);
        continue;
      }
      for (const field of requiredFields) {
        if (!(field in line)) {
          report(`agent-feeds/${name}:${i + 1}: missing ${field}.`);
        }
      }
      if (validateLine) {
        validateLine(line, i + 1);
      }
    }
  }

  await validateJsonlFeed("claims", ["articleId", "slug", "claimId"], (line, row) => {
    if (!indexArticleIds.has(line.articleId)) {
      report(`agent-feeds/claims:${row}: unknown articleId ${line.articleId}.`);
    }
    if (!knownClaimIds.has(line.claimId)) {
      report(`agent-feeds/claims:${row}: unknown claimId ${line.claimId}.`);
    }
  });

  await validateJsonlFeed("sources", ["articleId", "slug", "sourceId"], (line, row) => {
    if (!indexArticleIds.has(line.articleId)) {
      report(`agent-feeds/sources:${row}: unknown articleId ${line.articleId}.`);
    }
    if (!knownSourceIds.has(line.sourceId)) {
      report(`agent-feeds/sources:${row}: unknown sourceId ${line.sourceId}.`);
    }
  });

  await validateJsonlFeed("roadmap", ["roadmapId", "ideaId", "title", "priority", "category"]);
  await validateJsonlFeed("edges", ["from", "to", "type"], (line, row) => {
    if (!nodeIds.has(line.from)) {
      report(`agent-feeds/edges:${row}: unknown from node ${line.from}.`);
    }
    if (!nodeIds.has(line.to)) {
      report(`agent-feeds/edges:${row}: unknown to node ${line.to}.`);
    }
  });
} catch (error) {
  report(`Generated agent feeds are invalid: ${error.message}`);
}

try {
  const evalSet = await readJson(path.join(rootDir, "content", "eval", "brief-eval-set.json"));
  if (!validateBriefEvalSet(evalSet)) {
    formatAjvErrors("content/eval/brief-eval-set", validateBriefEvalSet);
  }

  const evalReport = await readJson(path.join(publicRoot, "agents", "eval-report.json"));
  if (!validateEvalReport(evalReport)) {
    formatAjvErrors("agents/eval-report", validateEvalReport);
  }
  if (evalReport.schemaVersion !== 1) {
    report(`agents/eval-report: unexpected schemaVersion ${evalReport.schemaVersion}.`);
  }
  if (evalReport.summary.total !== evalSet.cases.length) {
    report(`agents/eval-report: case count ${evalReport.summary.total} does not match eval set ${evalSet.cases.length}.`);
  }
  const evalIds = new Set(evalSet.cases.map((c) => c.id));
  for (const result of evalReport.cases) {
    if (!evalIds.has(result.id)) {
      report(`agents/eval-report: result id ${result.id} is not in eval set.`);
    }
  }
} catch (error) {
  report(`Generated eval report is invalid: ${error.message}`);
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

if (warnings.length > 0) {
  console.warn("Content validation warnings:");
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}

if (errors.length > 0) {
  console.error("Content validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Validated ${articles.length} source article(s), ${publishedArticles.length} published article packet(s), ${publishedRoadmaps.length} published roadmap packet(s), and graph artifacts.`);
