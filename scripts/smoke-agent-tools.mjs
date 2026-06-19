import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import Ajv2020 from "ajv/dist/2020.js";
import { readJson, rootDir } from "./lib/content-utils.mjs";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ajv = new Ajv2020({ allErrors: true, strict: false });

let failures = 0;

function fail(message) {
  console.error(`FAIL: ${message}`);
  failures += 1;
}

function pass(message) {
  console.log(`PASS: ${message}`);
}

async function runTool(args) {
  const { stdout, stderr } = await execFileAsync("node", [path.join(__dirname, "agent-tool.mjs"), ...args], {
    cwd: rootDir,
    timeout: 60000
  });
  if (stderr) {
    // Ajv emits format warnings to stderr; ignore them if stdout is valid JSON.
    if (!stderr.includes("unknown format")) {
      throw new Error(`Unexpected stderr: ${stderr}`);
    }
  }
  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error(`Tool output is not valid JSON: ${stdout}`);
  }
}

async function runWorkflow(args) {
  const { stdout, stderr } = await execFileAsync("node", [path.join(__dirname, "agent-workflow.mjs"), ...args], {
    cwd: rootDir,
    timeout: 60000
  });
  if (stderr && !stderr.includes("unknown format")) {
    throw new Error(`Unexpected stderr: ${stderr}`);
  }
  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error(`Workflow output is not valid JSON: ${stdout}`);
  }
}

async function main() {
  // Regenerate manifest so the smoke test exercises the full chain.
  await execFileAsync("node", [path.join(__dirname, "generate-agent-tools-manifest.mjs")], {
    cwd: rootDir,
    timeout: 60000
  });

  const toolsPath = path.join(rootDir, "public", "agents", "tools.json");
  const manifest = await readJson(toolsPath);

  if (manifest.schemaVersion !== 1) {
    fail(`Expected schemaVersion 1, got ${manifest.schemaVersion}`);
  } else {
    pass("Manifest schemaVersion is 1");
  }

  if (!Array.isArray(manifest.tools) || manifest.tools.length === 0) {
    fail("Manifest tools array is empty");
  } else {
    pass(`Manifest contains ${manifest.tools.length} tools`);
  }

  const schema = await readJson(path.join(rootDir, "schemas", "agent-tools.schema.json"));
  const validate = ajv.compile(schema);
  if (!validate(manifest)) {
    fail(`Manifest schema validation failed: ${JSON.stringify(validate.errors)}`);
  } else {
    pass("Manifest validates against schema");
  }

  const writeTools = manifest.tools.filter((tool) => tool.write);
  if (writeTools.length === 0) {
    fail("Expected at least one write tool");
  } else {
    pass(`Found ${writeTools.length} write tools`);
  }

  // queryGarden smoke
  const queryResult = await runTool(["--tool", "queryGarden", "--input", '{"limit":5}']);
  if (!queryResult.ok || !Array.isArray(queryResult.result)) {
    fail(`queryGarden returned unexpected result: ${JSON.stringify(queryResult)}`);
  } else {
    pass(`queryGarden returned ${queryResult.result.length} articles`);
  }

  // inspectPacket smoke
  const inspectResult = await runTool([
    "--tool",
    "inspectPacket",
    "--input",
    '{"mode":"article","target":"agent-auditable-research","format":"json"}'
  ]);
  if (!inspectResult.ok || typeof inspectResult.result?.stdout !== "string") {
    fail(`inspectPacket returned unexpected result: ${JSON.stringify(inspectResult)}`);
  } else {
    pass("inspectPacket returned an article packet");
  }

  // createWorkspace dry-run smoke
  const dryRunResult = await runTool([
    "--tool",
    "createWorkspace",
    "--input",
    '{"slug":"smoke-test-topic","title":"Smoke Test Topic"}',
    "--dry-run"
  ]);
  if (!dryRunResult.ok || !dryRunResult.dryRun) {
    fail(`createWorkspace dry-run returned unexpected result: ${JSON.stringify(dryRunResult)}`);
  } else {
    pass("createWorkspace dry-run succeeded");
  }

  // Workflow list smoke
  const listResult = await runWorkflow(["--list"]);
  if (!Array.isArray(listResult) || !listResult.some((w) => w.name === "composeArticle")) {
    fail(`Workflow list missing composeArticle: ${JSON.stringify(listResult)}`);
  } else {
    pass("Workflow list includes composeArticle");
  }

  // composeArticle dry-run smoke
  const composeResult = await runWorkflow([
    "--workflow",
    "composeArticle",
    "--input",
    '{"slug":"smoke-compose-topic","title":"Smoke Compose Topic"}',
    "--dry-run"
  ]);
  if (!composeResult.workflow || composeResult.dryRun !== true) {
    fail(`composeArticle dry-run returned unexpected result: ${JSON.stringify(composeResult)}`);
  } else {
    pass("composeArticle dry-run completed");
  }

  if (failures > 0) {
    console.error(`\n${failures} smoke test(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll agent-tool smoke tests passed.");
}

main().catch((error) => {
  console.error(`Smoke test error: ${error.message}`);
  process.exit(1);
});
