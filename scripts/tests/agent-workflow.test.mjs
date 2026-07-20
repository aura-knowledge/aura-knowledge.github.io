import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const AGENT_WORKFLOW = path.join(repoRoot, "scripts", "agent-workflow.mjs");

async function run(args, { cwd, timeout = 120000 } = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [AGENT_WORKFLOW, ...args], {
      cwd,
      timeout,
      maxBuffer: 64 * 1024 * 1024
    });
    return { code: 0, stdout, stderr };
  } catch (error) {
    if (typeof error.code !== "number") {
      throw new Error(`Could not run agent-workflow: ${error.message}`);
    }
    return { code: error.code, stdout: error.stdout ?? "", stderr: error.stderr ?? "" };
  }
}

async function runWorkflow(args, options) {
  const result = await run(args, options);
  let body;
  try {
    body = JSON.parse(result.stdout);
  } catch {
    assert.fail(`agent-workflow did not emit JSON on stdout (code ${result.code}): ${result.stdout.slice(0, 300)}`);
  }
  return { ...result, body };
}

async function tempDir(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ak-workflow-"));
  t.after(async () => {
    await rm(dir, { recursive: true, force: true });
  });
  return dir;
}

// agent-tool/agent-workflow resolve the scripts they spawn from process.cwd(),
// so a scratch garden must expose the repo's scripts directory there.
async function scratchGarden(t) {
  const dir = await tempDir(t);
  await symlink(path.join(repoRoot, "scripts"), path.join(dir, "scripts"), "dir");
  return dir;
}

async function pathExists(filePath) {
  try {
    await readFile(filePath, "utf8");
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function startServer(t, handler) {
  const server = http.createServer(handler);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
      })
  );
  return server.address().port;
}

const htmlPage = (title) => `<!doctype html><html><head><title>${title}</title></head><body>page</body></html>`;

describe("agent-workflow.mjs CLI contract", () => {
  test("--list advertises composeArticle", async (t) => {
    const dir = await scratchGarden(t);
    const result = await runWorkflow(["--list"], { cwd: dir });
    assert.equal(result.code, 0);
    assert.ok(Array.isArray(result.body));
    const compose = result.body.find((workflow) => workflow.name === "composeArticle");
    assert.ok(compose, "composeArticle must be listed");
    assert.match(compose.description, /article authoring/i);
  });

  test("--help prints usage and exits 0", async (t) => {
    const dir = await scratchGarden(t);
    const result = await run(["--help"], { cwd: dir });
    assert.equal(result.code, 0);
    assert.match(result.stdout, /Usage: node scripts\/agent-workflow\.mjs/);
  });

  test("requires --workflow and rejects unknown workflows with the available list", async (t) => {
    const dir = await scratchGarden(t);
    const missing = await runWorkflow([], { cwd: dir });
    assert.equal(missing.code, 1);
    assert.equal(missing.body.ok, false);
    assert.match(missing.body.error, /--workflow is required/);

    const unknown = await runWorkflow(["--workflow", "nonsense"], { cwd: dir });
    assert.equal(unknown.code, 1);
    assert.match(unknown.body.error, /Unknown workflow: nonsense/);
    assert.match(unknown.body.error, /composeArticle/);
  });

  test("rejects malformed --input JSON", async (t) => {
    const dir = await scratchGarden(t);
    const result = await runWorkflow(["--workflow", "composeArticle", "--input", "{oops"], { cwd: dir });
    assert.equal(result.code, 1);
    assert.match(result.body.error, /--input must be valid JSON/);
  });

  test("enforces required keys and rejects unknown keys", async (t) => {
    const dir = await scratchGarden(t);
    const missing = await runWorkflow(["--workflow", "composeArticle", "--input", "{}"], { cwd: dir });
    assert.equal(missing.code, 1);
    assert.match(missing.body.error, /Missing required workflow input: slug/);

    const unknown = await runWorkflow(["--workflow", "composeArticle", "--input", '{"slug":"x","bogus":1}'], { cwd: dir });
    assert.equal(unknown.code, 1);
    assert.match(unknown.body.error, /Unknown workflow input: bogus/);
  });

  test("rejects non-array values for array-typed inputs instead of misbehaving downstream", async (t) => {
    const dir = await scratchGarden(t);
    // Pre-fix, a string here was iterated character by character and the workflow
    // died with a confusing "Candidate not found: p" deep in the promote step.
    const badIds = await runWorkflow(
      ["--workflow", "composeArticle", "--input", JSON.stringify({ slug: "arr-type-x", promoteCandidateIds: "pzz", audit: false, generateArtifacts: false }), "--confirm"],
      { cwd: dir }
    );
    assert.equal(badIds.code, 1);
    assert.match(badIds.body.error, /promoteCandidateIds must be an array/);

    const badSources = await runWorkflow(
      ["--workflow", "composeArticle", "--input", JSON.stringify({ slug: "arr-type-y", sources: "nope", audit: false, generateArtifacts: false }), "--confirm"],
      { cwd: dir }
    );
    assert.equal(badSources.code, 1);
    assert.match(badSources.body.error, /sources must be an array/);
  });

  test("rejects a non-string slug through the tool validation layer", async (t) => {
    const dir = await scratchGarden(t);
    const result = await runWorkflow(
      ["--workflow", "composeArticle", "--input", JSON.stringify({ slug: 123 }), "--dry-run"],
      { cwd: dir }
    );
    assert.equal(result.code, 1);
    assert.match(result.body.error, /slug is required/);
  });
});

describe("composeArticle dry-run and preview semantics", () => {
  test("--dry-run stops after the workspace step and materializes nothing", async (t) => {
    const dir = await scratchGarden(t);
    const result = await runWorkflow(
      ["--workflow", "composeArticle", "--input", JSON.stringify({ slug: "wf-dry", title: "WF Dry" }), "--dry-run"],
      { cwd: dir }
    );
    assert.equal(result.code, 0, result.body.error);
    assert.equal(result.body.workflow, "composeArticle");
    assert.equal(result.body.dryRun, true);
    assert.equal(result.body.confirmed, false);
    assert.deepEqual(
      result.body.steps.map((step) => step.name),
      ["createWorkspace", "skipDependentSteps"]
    );
    assert.equal(result.body.steps[0].ok, true);
    assert.equal(await pathExists(path.join(dir, "content")), false);
  });

  test("without --confirm the workflow stops after the createWorkspace preview", async (t) => {
    const dir = await scratchGarden(t);
    const result = await runWorkflow(
      ["--workflow", "composeArticle", "--input", JSON.stringify({ slug: "wf-preview" })],
      { cwd: dir }
    );
    assert.equal(result.code, 0, result.body.error);
    assert.equal(result.body.confirmed, false);
    assert.equal(result.body.stoppedAfter, "createWorkspace");
    assert.equal(result.body.steps.length, 1);
    assert.equal(result.body.steps[0].name, "createWorkspace");
    assert.equal(result.body.steps[0].ok, false); // preview only, not yet confirmed
    assert.equal(await pathExists(path.join(dir, "content")), false);
  });
});

describe("composeArticle end-to-end in a scratch garden", () => {
  test("zero sources: only the workspace step runs", async (t) => {
    const dir = await scratchGarden(t);
    const result = await runWorkflow(
      [
        "--workflow", "composeArticle",
        "--input", JSON.stringify({ slug: "wf-zero", year: "2020", audit: false, generateArtifacts: false }),
        "--confirm"
      ],
      { cwd: dir }
    );
    assert.equal(result.code, 0, result.body.error);
    assert.equal(result.body.confirmed, true);
    assert.deepEqual(
      result.body.steps.map((step) => step.name),
      ["createWorkspace"]
    );
    await readJson(path.join(dir, "content", "articles", "2020", "wf-zero", "artifact.json"));
  });

  test("one source: imported candidate is auto-promoted into the new article", async (t) => {
    const dir = await scratchGarden(t);
    const port = await startServer(t, (req, res) => {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(htmlPage("Workflow Paper"));
    });

    const result = await runWorkflow(
      [
        "--workflow", "composeArticle",
        "--input",
        JSON.stringify({
          slug: "wf-e2e",
          year: "2020",
          title: "Workflow E2E",
          sources: [{ value: `http://127.0.0.1:${port}/paper` }],
          audit: false,
          generateArtifacts: false
        }),
        "--confirm"
      ],
      { cwd: dir }
    );
    assert.equal(result.code, 0, `workflow failed: ${result.body.error ?? result.stdout}`);
    assert.equal(result.body.confirmed, true);
    assert.deepEqual(
      result.body.steps.map((step) => step.name),
      ["createWorkspace", "importSource", "promoteSource"]
    );
    for (const step of result.body.steps) assert.equal(step.ok, true, step.name);

    // The imported candidate was discovered from the importer output and promoted.
    const artifact = await readJson(path.join(dir, "content", "articles", "2020", "wf-e2e", "artifact.json"));
    const promoted = artifact.sources.filter((source) => source.title === "Workflow Paper");
    assert.equal(promoted.length, 1, JSON.stringify(artifact.sources));
    assert.match(promoted[0].id, /^source-[0-9a-f]{12}$/);
    assert.equal(promoted[0].url, `http://127.0.0.1:${port}/paper`);

    // The candidate file on disk is marked promoted.
    const today = new Date().toISOString().slice(0, 10);
    const candidateId = promoted[0].id.replace(/^source-/, "candidate-source-");
    const candidate = await readJson(path.join(dir, "content", "scout", "candidates", today, `${candidateId}.json`));
    assert.equal(candidate.status, "promoted");
  });

  test("explicit promoteCandidateIds promotes a pre-existing candidate (bypasses import scraping)", async (t) => {
    const dir = await scratchGarden(t);
    const candidateDir = path.join(dir, "content", "scout", "candidates", "2020-01-01");
    await mkdir(candidateDir, { recursive: true });
    await writeFile(
      path.join(candidateDir, "candidate-source-preexisting.json"),
      JSON.stringify({
        schemaVersion: 1,
        id: "candidate-source-preexisting",
        url: "https://example.com/pre",
        title: "Pre-existing Candidate",
        type: "paper",
        accessed: "2020-01-01",
        status: "candidate"
      })
    );

    const result = await runWorkflow(
      [
        "--workflow", "composeArticle",
        "--input",
        JSON.stringify({
          slug: "wf-explicit",
          year: "2020",
          promoteCandidateIds: ["candidate-source-preexisting"],
          audit: false,
          generateArtifacts: false
        }),
        "--confirm"
      ],
      { cwd: dir }
    );
    assert.equal(result.code, 0, `workflow failed: ${result.body.error ?? result.stdout}`);
    const artifact = await readJson(path.join(dir, "content", "articles", "2020", "wf-explicit", "artifact.json"));
    assert.deepEqual(
      artifact.sources.filter((source) => source.id === "source-preexisting").map((source) => source.title),
      ["Pre-existing Candidate"]
    );
  });

  test("a failing source import aborts the workflow loudly but keeps the scaffolded workspace", async (t) => {
    const dir = await scratchGarden(t);
    const port = await startServer(t, (req, res) => {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("gone");
    });

    const result = await runWorkflow(
      [
        "--workflow", "composeArticle",
        "--input",
        JSON.stringify({
          slug: "wf-fail",
          year: "2020",
          sources: [{ value: `http://127.0.0.1:${port}/missing` }],
          audit: false,
          generateArtifacts: false
        }),
        "--confirm"
      ],
      { cwd: dir }
    );
    assert.equal(result.code, 1);
    assert.equal(result.body.ok, false);
    assert.match(result.body.error, /Fetch failed: 404/);
    // Partial state is visible, not silently rolled back or corrupted.
    const artifact = await readJson(path.join(dir, "content", "articles", "2020", "wf-fail", "artifact.json"));
    assert.equal(artifact.sources.filter((source) => source.id !== "source-example-001").length, 0);
  });

  test("a dozen sources compose end-to-end in bounded time (N-item boundary)", async (t) => {
    const dir = await scratchGarden(t);
    const port = await startServer(t, (req, res) => {
      const index = new URL(req.url, "http://x").pathname.slice(2);
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(htmlPage(`Bulk Paper ${index}`));
    });

    const sources = [];
    for (let index = 0; index < 12; index += 1) {
      sources.push({ value: `http://127.0.0.1:${port}/p${index}` });
    }
    const result = await runWorkflow(
      [
        "--workflow", "composeArticle",
        "--input",
        JSON.stringify({ slug: "wf-bulk", year: "2020", sources, audit: false, generateArtifacts: false }),
        "--confirm"
      ],
      { cwd: dir, timeout: 240000 }
    );
    assert.equal(result.code, 0, `workflow failed: ${result.body.error ?? result.stdout}`);
    assert.equal(result.body.steps.length, 1 + 12 + 12); // create + imports + promotes
    for (const step of result.body.steps) assert.equal(step.ok, true, step.name);

    const artifact = await readJson(path.join(dir, "content", "articles", "2020", "wf-bulk", "artifact.json"));
    const promoted = artifact.sources.filter((source) => source.title.startsWith("Bulk Paper"));
    assert.equal(promoted.length, 12);
    assert.equal(new Set(promoted.map((source) => source.id)).size, 12); // no id collisions
  });
});
