import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { loadGardenData, queryArticles } from "./garden-queries.mjs";
import { readJson, rootDir, toPosix, writeJson } from "./content-utils.mjs";

const execFileAsync = promisify(execFile);

const SLUG_PATTERN = "^[a-z0-9-]+$";

function assertSafeSlug(value, label) {
  if (!value || typeof value !== "string") {
    throw new Error(`${label} is required.`);
  }
  if (!/^[a-z0-9-]+$/.test(value)) {
    throw new Error(`${label} must be lowercase letters, numbers, and hyphens only.`);
  }
}

function assertSafePath(value, label) {
  if (!value || typeof value !== "string") {
    throw new Error(`${label} is required.`);
  }
  if (path.isAbsolute(value)) {
    throw new Error(`${label} must be a relative path.`);
  }
  if (value.includes("..") || value.includes("~")) {
    throw new Error(`${label} must not traverse outside the repo.`);
  }
  const lower = value.toLowerCase();
  if (lower.startsWith(".env") || lower.includes("/.env") || lower === ".git") {
    throw new Error(`${label} points to a sensitive path.`);
  }
}

async function getCurrentBranch() {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: rootDir
    });
    return stdout.trim();
  } catch {
    return "unknown";
  }
}

async function assertNotMainBranch(operation) {
  const branch = await getCurrentBranch();
  if (branch === "main") {
    throw new Error(
      `${operation} refused: you are on the main branch. Create a feature branch or worktree first.`
    );
  }
}

async function runNode(scriptRelativePath, args, options = {}) {
  const scriptPath = path.join(rootDir, scriptRelativePath);
  const { stdout, stderr } = await execFileAsync("node", [scriptPath, ...args], {
    cwd: rootDir,
    timeout: options.timeout ?? 120000,
    ...options.execOptions
  });
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

async function recordAgentRun({ articleDir, role, model, inputs, output, notes }) {
  const args = [
    "--dir",
    articleDir,
    "--role",
    role,
    "--model",
    model,
    ...inputs.flatMap((input) => ["--input", input]),
    "--output",
    output
  ];
  if (notes) {
    args.push("--notes", notes);
  }
  return runNode("scripts/record-agent-run.mjs", args);
}

async function findCandidate(candidateId) {
  const scoutDir = path.join(rootDir, "content", "scout", "candidates");
  let dateDirs = [];
  try {
    const entries = await (await import("node:fs/promises")).readdir(scoutDir, {
      withFileTypes: true
    });
    dateDirs = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return null;
  }
  for (const dateDir of dateDirs) {
    const candidatePath = path.join(scoutDir, dateDir, `${candidateId}.json`);
    try {
      const candidate = await readJson(candidatePath);
      if (candidate.id === candidateId) {
        return { candidate, candidatePath };
      }
    } catch {
      // ignore
    }
  }
  return null;
}

function buildArgs(input, mapping) {
  const args = [];
  for (const [cliFlag, key] of Object.entries(mapping)) {
    const value = input[key];
    if (value !== undefined && value !== null && value !== "") {
      args.push(cliFlag, String(value));
    }
  }
  return args;
}

const createWorkspace = {
  name: "createWorkspace",
  description:
    "Scaffold a new article workspace with article.md, agent.md, artifact.json, and workspace notes/sources.",
  category: "authoring",
  write: true,
  dryRunSupported: true,
  inputSchema: {
    type: "object",
    required: ["slug"],
    additionalProperties: false,
    properties: {
      slug: {
        type: "string",
        pattern: SLUG_PATTERN,
        description: "Article slug, e.g. agentic-commerce-update"
      },
      year: {
        type: "string",
        pattern: "^\\d{4}$",
        description: "Publication year. Defaults to current year."
      },
      topic: {
        type: "string",
        pattern: SLUG_PATTERN,
        description: "Primary topic slug. Defaults to the article slug."
      },
      title: { type: "string" },
      dek: { type: "string" },
      summary: { type: "string" },
      thesis: { type: "string" },
      seed: { type: "string", description: "Optional path to a seed notes file." }
    }
  },
  outputSchema: {
    type: "object",
    properties: {
      stdout: { type: "string" },
      articleDir: { type: "string" },
      recorded: { type: "boolean" }
    }
  },
  examples: [
    {
      slug: "agentic-commerce-update",
      topic: "agentic-commerce",
      title: "Agentic Commerce Update"
    }
  ]
};

async function executeCreateWorkspace(input, { dryRun, confirm }) {
  assertSafeSlug(input.slug, "slug");
  if (input.topic) assertSafeSlug(input.topic, "topic");
  if (input.year) {
    if (!/^\d{4}$/.test(input.year)) throw new Error("year must be YYYY.");
  }
  if (input.seed) assertSafePath(input.seed, "seed");

  const year = input.year ?? new Date().getFullYear().toString();
  const args = [input.slug];
  const mapping = {
    "--year": "year",
    "--topic": "topic",
    "--title": "title",
    "--dek": "dek",
    "--summary": "summary",
    "--thesis": "thesis",
    "--seed": "seed"
  };
  args.push(...buildArgs(input, mapping));
  if (dryRun) args.push("--dry-run");

  if (!dryRun && !confirm) {
    const preview = await runNode("scripts/create-workspace.mjs", [...args, "--dry-run"]);
    return { preview: preview.stdout, confirmed: false };
  }

  if (!dryRun) {
    await assertNotMainBranch("createWorkspace");
  }

  const result = await runNode("scripts/create-workspace.mjs", args);
  const articleDir = path.join(rootDir, "content", "articles", year, input.slug);

  if (!dryRun && confirm) {
    try {
      await recordAgentRun({
        articleDir,
        role: "orchestrator:workspace",
        model: "agent",
        inputs: [path.join(articleDir, "workspace", "plan.md")],
        output: path.join(articleDir, "article.md"),
        notes: `Created workspace for ${input.slug}`
      });
      return { stdout: result.stdout, articleDir: toPosix(path.relative(rootDir, articleDir)), recorded: true };
    } catch (recordError) {
      return {
        stdout: result.stdout,
        articleDir: toPosix(path.relative(rootDir, articleDir)),
        recorded: false,
        recordWarning: recordError.message
      };
    }
  }

  return { stdout: result.stdout, articleDir: toPosix(path.relative(rootDir, articleDir)), recorded: false };
}

const importSource = {
  name: "importSource",
  description: "Import a URL, arXiv ID, DOI, or GitHub repo as a source candidate.",
  category: "authoring",
  write: true,
  dryRunSupported: true,
  inputSchema: {
    type: "object",
    required: ["value"],
    additionalProperties: false,
    properties: {
      value: {
        type: "string",
        description: "URL, arXiv ID, DOI, or github.com/owner/repo"
      },
      kind: {
        type: "string",
        enum: ["url", "arxiv", "doi", "github"],
        description: "Input kind. Auto-detected if omitted."
      },
      type: {
        type: "string",
        description: "Source type label, e.g. paper, article, repository."
      },
      title: { type: "string" },
      notes: { type: "string" }
    }
  },
  outputSchema: {
    type: "object",
    properties: {
      stdout: { type: "string" }
    }
  },
  examples: [
    { value: "https://arxiv.org/abs/2505.13246" },
    { value: "10.1234/example", kind: "doi" }
  ]
};

async function executeImportSource(input, { dryRun, confirm }) {
  if (!input.value) throw new Error("value is required.");
  const args = buildArgs(input, {
    "--value": "value",
    "--kind": "kind",
    "--type": "type",
    "--title": "title",
    "--notes": "notes"
  });
  if (dryRun) args.push("--dry-run");

  if (!dryRun && !confirm) {
    const preview = await runNode("scripts/source-importer.mjs", [...args, "--dry-run"]);
    return { preview: preview.stdout, confirmed: false };
  }

  if (!dryRun) {
    await assertNotMainBranch("importSource");
  }

  const result = await runNode("scripts/source-importer.mjs", args);
  return { stdout: result.stdout };
}

const promoteSource = {
  name: "promoteSource",
  description: "Promote a scout candidate into an article's source ledger.",
  category: "authoring",
  write: true,
  dryRunSupported: true,
  inputSchema: {
    type: "object",
    required: ["candidateId", "article"],
    additionalProperties: false,
    properties: {
      candidateId: {
        type: "string",
        description: "Candidate ID, e.g. candidate-source-abc123"
      },
      article: {
        type: "string",
        pattern: SLUG_PATTERN,
        description: "Target article slug."
      },
      year: {
        type: "string",
        pattern: "^\\d{4}$",
        description: "Target article year. Defaults to current year."
      }
    }
  },
  outputSchema: {
    type: "object",
    properties: {
      stdout: { type: "string" },
      recorded: { type: "boolean" }
    }
  },
  examples: [{ candidateId: "candidate-source-abc123", article: "agentic-commerce-product-truth" }]
};

async function executePromoteSource(input, { dryRun, confirm }) {
  if (!input.candidateId) throw new Error("candidateId is required.");
  assertSafeSlug(input.article, "article");
  const year = input.year ?? new Date().getFullYear().toString();

  const found = await findCandidate(input.candidateId);
  if (!found) {
    throw new Error(`Candidate not found: ${input.candidateId}`);
  }
  const { candidate, candidatePath } = found;

  const { loadArticles } = await import("./content-utils.mjs");
  const articles = await loadArticles();
  const article = articles.find((a) => a.year === year && a.slug === input.article);
  if (!article) {
    throw new Error(`Article not found: ${year}/${input.article}`);
  }

  const sourceId = candidate.id.replace(/^candidate-/, "");
  const alreadyExists = article.artifact.sources.some((source) => source.id === sourceId);
  if (alreadyExists) {
    throw new Error(`Source ${sourceId} already exists in ${year}/${input.article}.`);
  }

  const preview = {
    candidateId: candidate.id,
    sourceId,
    article: `${year}/${input.article}`,
    source: {
      id: sourceId,
      title: candidate.title,
      url: candidate.url,
      type: candidate.type,
      accessed: candidate.accessed
    }
  };

  if (!confirm) {
    return { preview, confirmed: false };
  }

  await assertNotMainBranch("promoteSource");

  const result = await runNode("scripts/promote-source.mjs", [input.candidateId, "--article", input.article, "--year", year]);

  try {
    await recordAgentRun({
      articleDir: article.articleDir,
      role: "orchestrator:promote-source",
      model: "agent",
      inputs: [candidatePath],
      output: article.artifactPath,
      notes: `Promoted ${candidate.id} to ${sourceId}`
    });
    return { stdout: result.stdout, recorded: true };
  } catch (recordError) {
    return { stdout: result.stdout, recorded: false, recordWarning: recordError.message };
  }
}

const auditDraft = {
  name: "auditDraft",
  description: "Run evidence diagnostics on one or all draft articles and write workspace/audit.json.",
  category: "governance",
  write: true,
  dryRunSupported: false,
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      slug: {
        type: "string",
        pattern: SLUG_PATTERN,
        description: "Article slug to audit. Audits all articles if omitted."
      }
    }
  },
  outputSchema: {
    type: "object",
    properties: {
      stdout: { type: "string" }
    }
  },
  examples: [{ slug: "agentic-commerce-product-truth" }]
};

async function executeAuditDraft(input) {
  if (input.slug) assertSafeSlug(input.slug, "slug");
  const args = input.slug ? [input.slug] : [];
  const result = await runNode("scripts/audit-draft.mjs", args);
  return { stdout: result.stdout };
}

const scoutSources = {
  name: "scoutSources",
  description: "Fetch configured RSS/Atom feeds and write source candidates and a daily report.",
  category: "authoring",
  write: true,
  dryRunSupported: true,
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      config: {
        type: "string",
        description: "Path to scout config. Defaults to scout.config.json."
      }
    }
  },
  outputSchema: {
    type: "object",
    properties: {
      stdout: { type: "string" }
    }
  },
  examples: [{}]
};

async function executeScoutSources(input, { dryRun, confirm }) {
  if (input.config) assertSafePath(input.config, "config");
  const args = buildArgs(input, { "--config": "config" });
  if (dryRun) args.push("--dry-run");

  if (!dryRun && !confirm) {
    const preview = await runNode("scripts/scout-sources.mjs", [...args, "--dry-run"]);
    return { preview: preview.stdout, confirmed: false };
  }

  if (!dryRun) {
    await assertNotMainBranch("scoutSources");
  }

  const result = await runNode("scripts/scout-sources.mjs", args);
  return { stdout: result.stdout };
}

const queryGarden = {
  name: "queryGarden",
  description: "Query articles by topic, tag, maturity, status, claim state, keyword, or relatedness.",
  category: "retrieval",
  write: false,
  dryRunSupported: false,
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      topic: { type: "string" },
      tag: { type: "string" },
      maturity: { type: "string" },
      status: { type: "string" },
      citesSourceType: { type: "string" },
      claimState: { type: "string" },
      keyword: { type: "string" },
      relatedTo: { type: "string" },
      limit: { type: "integer", minimum: 1 }
    }
  },
  outputSchema: {
    type: "array",
    items: {
      type: "object",
      properties: {
        articleId: { type: "string" },
        slug: { type: "string" },
        articleUrl: { type: "string" },
        agentJsonPath: { type: "string" }
      }
    }
  },
  examples: [{ topic: "product-truth" }, { keyword: "agent", limit: 5 }]
};

async function executeQueryGarden(input) {
  const data = await loadGardenData();
  return queryArticles(input, data);
}

const inspectPacket = {
  name: "inspectPacket",
  description: "Return a compact slice of an article, claim, source, or graph node.",
  category: "retrieval",
  write: false,
  dryRunSupported: false,
  inputSchema: {
    type: "object",
    required: ["mode", "target"],
    additionalProperties: false,
    properties: {
      mode: {
        type: "string",
        enum: ["article", "claim", "source", "graphSlice"]
      },
      target: { type: "string" },
      format: {
        type: "string",
        enum: ["json", "markdown"],
        default: "json"
      }
    }
  },
  outputSchema: {
    type: "object",
    properties: {
      stdout: { type: "string" }
    }
  },
  examples: [
    { mode: "article", target: "agent-auditable-research" },
    { mode: "claim", target: "agent-auditable-research:claim-001" }
  ]
};

async function executeInspectPacket(input) {
  const args = [];
  const format = input.format ?? "json";
  switch (input.mode) {
    case "article":
      args.push("--article", input.target);
      break;
    case "claim":
      args.push("--claim", input.target);
      break;
    case "source":
      args.push("--source", input.target);
      break;
    case "graphSlice":
      args.push("--graph-slice", input.target);
      break;
    default:
      throw new Error(`Unknown inspect mode: ${input.mode}`);
  }
  args.push("--format", format);
  const result = await runNode("scripts/inspect-packet.mjs", args);
  return { stdout: result.stdout, format };
}

const runEvaluation = {
  name: "runEvaluation",
  description: "Run the agent brief evaluation harness and regenerate the eval report.",
  category: "governance",
  write: true,
  dryRunSupported: false,
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {}
  },
  outputSchema: {
    type: "object",
    properties: {
      stdout: { type: "string" }
    }
  },
  examples: [{}]
};

async function executeRunEvaluation() {
  const result = await runNode("scripts/eval-briefs.mjs", []);
  return { stdout: result.stdout };
}

const generateArtifacts = {
  name: "generateArtifacts",
  description: "Regenerate all public agent and graph artifacts.",
  category: "build",
  write: true,
  dryRunSupported: false,
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {}
  },
  outputSchema: {
    type: "object",
    properties: {
      stdout: { type: "string" }
    }
  },
  examples: [{}]
};

async function executeGenerateArtifacts() {
  const result = await runNode("scripts/generate-agent-index.mjs", []);
  return { stdout: result.stdout };
}

const validateGarden = {
  name: "validateGarden",
  description: "Run the full CI pipeline: generate, validate, build, and smoke tests.",
  category: "governance",
  write: false,
  dryRunSupported: false,
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {}
  },
  outputSchema: {
    type: "object",
    properties: {
      stdout: { type: "string" }
    }
  },
  examples: [{}]
};

async function executeValidateGarden() {
  const result = await execFileAsync("npm", ["run", "check"], {
    cwd: rootDir,
    timeout: 300000
  });
  return { stdout: result.stdout.trim() };
}

export const TOOL_DEFINITIONS = [
  createWorkspace,
  importSource,
  promoteSource,
  auditDraft,
  scoutSources,
  queryGarden,
  inspectPacket,
  runEvaluation,
  generateArtifacts,
  validateGarden
];

export const TOOL_EXECUTORS = {
  createWorkspace: executeCreateWorkspace,
  importSource: executeImportSource,
  promoteSource: executePromoteSource,
  auditDraft: executeAuditDraft,
  scoutSources: executeScoutSources,
  queryGarden: executeQueryGarden,
  inspectPacket: executeInspectPacket,
  runEvaluation: executeRunEvaluation,
  generateArtifacts: executeGenerateArtifacts,
  validateGarden: executeValidateGarden
};

export function buildToolsManifest() {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    site: "https://aura-knowledge.github.io",
    base: "",
    audience: "contributors",
    note: "These are contributor CLI commands (node scripts/*.mjs) run inside the repository, not remotely callable agent tools. External agents should use the feeds and query catalog instead (see /agents/feeds/manifest.json and /agents/garden-queries.json).",
    tools: TOOL_DEFINITIONS.map((tool) => {
      const { examples, ...rest } = tool;
      return { ...rest, examples };
    })
  };
}
