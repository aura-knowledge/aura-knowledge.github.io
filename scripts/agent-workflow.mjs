import { TOOL_EXECUTORS } from "./lib/agent-tools.mjs";

const WORKFLOWS = {
  composeArticle: {
    description:
      "End-to-end article authoring: scaffold a workspace, import and promote sources, audit the draft, regenerate artifacts, and optionally run the full CI pipeline.",
    inputSchema: {
      type: "object",
      required: ["slug"],
      additionalProperties: false,
      properties: {
        slug: { type: "string" },
        year: { type: "string" },
        topic: { type: "string" },
        title: { type: "string" },
        dek: { type: "string" },
        summary: { type: "string" },
        thesis: { type: "string" },
        seed: { type: "string" },
        sources: {
          type: "array",
          items: {
            type: "object",
            required: ["value"],
            properties: {
              value: { type: "string" },
              kind: { type: "string" },
              type: { type: "string" },
              title: { type: "string" },
              notes: { type: "string" }
            }
          }
        },
        promoteCandidateIds: {
          type: "array",
          items: { type: "string" },
          description:
            "Candidate IDs to promote. If omitted and sources were imported, all newly imported candidates are promoted."
        },
        audit: { type: "boolean", default: true },
        generateArtifacts: { type: "boolean", default: true },
        validate: { type: "boolean", default: false }
      }
    }
  }
};

function usage() {
  console.log(`Usage: node scripts/agent-workflow.mjs --workflow <name> --input '<json>' [--dry-run] [--confirm]

Run a multi-step agent workflow.

Options:
  --workflow <name>   Workflow name. Use --list to see available workflows.
  --input <json>      JSON input object for the workflow.
  --dry-run           Run all write steps in dry-run mode.
  --confirm           Approve all write steps.
  --list              List available workflows.
  --help              Show this message.

Example:
  node scripts/agent-workflow.mjs --workflow composeArticle --input '{"slug":"agentic-commerce-update","title":"Agentic Commerce Update","sources":[{"value":"https://example.com/paper"}]}' --dry-run
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
      case "--workflow":
        options.workflow = argv[++i];
        break;
      case "--input":
        options.input = argv[++i];
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--confirm":
        options.confirm = true;
        break;
      case "--list":
        options.list = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function validateInput(schema, input) {
  if (!schema || !schema.properties) return;
  const required = schema.required ?? [];
  for (const key of required) {
    if (!(key in input)) {
      throw new Error(`Missing required workflow input: ${key}`);
    }
  }
  for (const key of Object.keys(input)) {
    if (!schema.properties[key]) {
      throw new Error(`Unknown workflow input: ${key}`);
    }
  }
}

async function runComposeArticle(input, flags) {
  const steps = [];
  const { dryRun, confirm } = flags;

  // 1. Create workspace
  const workspaceResult = await TOOL_EXECUTORS.createWorkspace(
    {
      slug: input.slug,
      year: input.year,
      topic: input.topic,
      title: input.title,
      dek: input.dek,
      summary: input.summary,
      thesis: input.thesis,
      seed: input.seed
    },
    { dryRun, confirm }
  );
  steps.push({ name: "createWorkspace", ok: !workspaceResult.preview || Boolean(workspaceResult.confirmed), result: workspaceResult });

  if (workspaceResult.preview && !confirm) {
    return { workflow: "composeArticle", confirmed: false, stoppedAfter: "createWorkspace", steps };
  }

  // In dry-run mode the workspace files are not actually created, so skip steps that depend on them.
  if (dryRun) {
    steps.push({ name: "skipDependentSteps", reason: "dry-run: workspace files were not materialized" });
    return { workflow: "composeArticle", confirmed: false, dryRun: true, steps };
  }

  const year = input.year ?? new Date().getFullYear().toString();
  const importedCandidateIds = [];

  // 2. Import sources
  if (Array.isArray(input.sources) && input.sources.length > 0) {
    for (const sourceInput of input.sources) {
      const importResult = await TOOL_EXECUTORS.importSource(sourceInput, { dryRun, confirm });
      steps.push({ name: "importSource", ok: true, result: importResult });
      if (importResult.preview && !confirm) {
        return { workflow: "composeArticle", confirmed: false, stoppedAfter: "importSource", steps };
      }
      const candidateMatch = importResult.stdout?.match(/candidate[-\w]+/);
      if (candidateMatch) {
        importedCandidateIds.push(candidateMatch[0]);
      }
    }
  }

  // 3. Promote sources
  const candidateIdsToPromote = input.promoteCandidateIds ?? importedCandidateIds;
  if (candidateIdsToPromote.length > 0) {
    for (const candidateId of candidateIdsToPromote) {
      const promoteResult = await TOOL_EXECUTORS.promoteSource(
        { candidateId, article: input.slug, year },
        { dryRun, confirm }
      );
      steps.push({ name: "promoteSource", ok: true, result: promoteResult });
      if (promoteResult.preview && !confirm) {
        return { workflow: "composeArticle", confirmed: false, stoppedAfter: "promoteSource", steps };
      }
    }
  }

  // 4. Audit draft
  if (input.audit !== false) {
    const auditResult = await TOOL_EXECUTORS.auditDraft({ slug: input.slug }, { dryRun, confirm });
    steps.push({ name: "auditDraft", ok: true, result: auditResult });
  }

  // 5. Regenerate artifacts
  if (input.generateArtifacts !== false) {
    const generateResult = await TOOL_EXECUTORS.generateArtifacts({}, { dryRun, confirm });
    steps.push({ name: "generateArtifacts", ok: true, result: generateResult });
  }

  // 6. Full CI validation
  if (input.validate) {
    const validateResult = await TOOL_EXECUTORS.validateGarden({}, { dryRun, confirm });
    steps.push({ name: "validateGarden", ok: true, result: validateResult });
  }

  return { workflow: "composeArticle", confirmed: true, dryRun, steps };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.list) {
    process.stdout.write(
      JSON.stringify(
        Object.entries(WORKFLOWS).map(([name, meta]) => ({ name, description: meta.description })),
        null,
        2
      ) + "\n"
    );
    return;
  }

  if (!options.workflow) {
    throw new Error("--workflow is required. Use --list to see available workflows.");
  }

  const workflow = WORKFLOWS[options.workflow];
  if (!workflow) {
    throw new Error(
      `Unknown workflow: ${options.workflow}. Available workflows: ${Object.keys(WORKFLOWS).join(", ")}`
    );
  }

  let input = {};
  if (options.input) {
    try {
      input = JSON.parse(options.input);
    } catch {
      throw new Error("--input must be valid JSON.");
    }
  }

  validateInput(workflow.inputSchema, input);

  const flags = {
    dryRun: options.dryRun ?? false,
    confirm: options.confirm ?? false
  };

  if (options.workflow === "composeArticle") {
    const result = await runComposeArticle(input, flags);
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    return;
  }

  throw new Error(`Workflow ${options.workflow} is declared but not implemented.`);
}

main().catch((error) => {
  process.stdout.write(
    JSON.stringify(
      {
        ok: false,
        error: error.message
      },
      null,
      2
    ) + "\n"
  );
  process.exit(1);
});
