import Ajv2020 from "ajv/dist/2020.js";
import { TOOL_DEFINITIONS, TOOL_EXECUTORS } from "./lib/agent-tools.mjs";

const ajv = new Ajv2020({ allErrors: true, strict: false });

function usage() {
  console.log(`Usage: node scripts/agent-tool.mjs --tool <name> --input '<json>' [--dry-run] [--confirm]

Dispatch a named agent tool and return JSON results.

Options:
  --tool <name>     Tool name. See public/agents/tools.json.
  --input <json>    JSON input object for the tool.
  --dry-run         Run the tool in dry-run mode if supported.
  --confirm         Approve a write tool; required for any mutation.
  --help            Show this message.

Examples:
  node scripts/agent-tool.mjs --tool queryGarden --input '{"topic":"product-truth"}'
  node scripts/agent-tool.mjs --tool createWorkspace --input '{"slug":"test-topic"}' --dry-run
  node scripts/agent-tool.mjs --tool createWorkspace --input '{"slug":"test-topic","title":"Test"}' --confirm
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
      case "--tool":
        options.tool = argv[++i];
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
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function validateInput(tool, input) {
  const validate = ajv.compile(tool.inputSchema);
  if (!validate(input)) {
    const messages = validate.errors?.map((error) => `${error.instancePath || "/"} ${error.message}`) ?? [];
    throw new Error(`Invalid input for ${tool.name}: ${messages.join("; ")}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.tool) {
    throw new Error("--tool is required.");
  }

  const tool = TOOL_DEFINITIONS.find((definition) => definition.name === options.tool);
  if (!tool) {
    throw new Error(`Unknown tool: ${options.tool}. Available tools: ${TOOL_DEFINITIONS.map((t) => t.name).join(", ")}`);
  }

  let input = {};
  if (options.input) {
    try {
      input = JSON.parse(options.input);
    } catch {
      throw new Error("--input must be valid JSON.");
    }
  }

  validateInput(tool, input);

  if (tool.write && !options.dryRun && !options.confirm) {
    if (!tool.dryRunSupported) {
      throw new Error(
        `${tool.name} is a write tool without a dry-run preview. Pass --confirm to execute it, or run a read tool first to inspect the state.`
      );
    }
    const preview = await TOOL_EXECUTORS[tool.name](input, { dryRun: true, confirm: false });
    process.stdout.write(
      JSON.stringify(
        {
          ok: true,
          tool: tool.name,
          confirmed: false,
          message: "This is a dry-run preview. Pass --confirm to execute the write.",
          preview
        },
        null,
        2
      ) + "\n"
    );
    return;
  }

  const result = await TOOL_EXECUTORS[tool.name](input, {
    dryRun: options.dryRun ?? false,
    confirm: options.confirm ?? false
  });

  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        tool: tool.name,
        confirmed: tool.write ? options.confirm || options.dryRun : true,
        dryRun: options.dryRun ?? false,
        result
      },
      null,
      2
    ) + "\n"
  );
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
