import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { TOOL_DEFINITIONS, TOOL_EXECUTORS, buildToolsManifest } from "../lib/agent-tools.mjs";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const AGENT_TOOL = path.join(repoRoot, "scripts", "agent-tool.mjs");
const AGENT_TOOLS_LIB = path.join(repoRoot, "scripts", "lib", "agent-tools.mjs");

async function run(bin, args, { cwd = repoRoot, timeout = 60000 } = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [bin, ...args], {
      cwd,
      timeout,
      maxBuffer: 64 * 1024 * 1024
    });
    return { code: 0, stdout, stderr };
  } catch (error) {
    if (typeof error.code !== "number") {
      throw new Error(`Could not run ${path.basename(bin)}: ${error.message}`);
    }
    return { code: error.code, stdout: error.stdout ?? "", stderr: error.stderr ?? "" };
  }
}

// Run agent-tool and parse its structured stdout envelope.
async function runTool(args, options) {
  const result = await run(AGENT_TOOL, args, options);
  let body;
  try {
    body = JSON.parse(result.stdout);
  } catch {
    assert.fail(`agent-tool did not emit JSON on stdout (code ${result.code}): ${result.stdout.slice(0, 200)}`);
  }
  return { ...result, body };
}

async function tempDir(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ak-agent-tools-"));
  t.after(async () => {
    await rm(dir, { recursive: true, force: true });
  });
  return dir;
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function git(cwd, args) {
  await execFileAsync("git", args, { cwd });
}

describe("agent-tool.mjs CLI contract", () => {
  test("--help prints usage and exits 0", async () => {
    const result = await run(AGENT_TOOL, ["--help"]);
    assert.equal(result.code, 0);
    assert.match(result.stdout, /Usage: node scripts\/agent-tool\.mjs/);
  });

  test("requires --tool and rejects unknown tools with the available list", async () => {
    const missing = await runTool([]);
    assert.equal(missing.code, 1);
    assert.equal(missing.body.ok, false);
    assert.match(missing.body.error, /--tool is required/);

    const unknown = await runTool(["--tool", "nonsenseTool"]);
    assert.equal(unknown.code, 1);
    assert.equal(unknown.body.ok, false);
    assert.match(unknown.body.error, /Unknown tool: nonsenseTool/);
    assert.match(unknown.body.error, /queryGarden/); // lists the real tools
  });

  test("rejects malformed --input JSON with a clear error", async () => {
    const result = await runTool(["--tool", "queryGarden", "--input", "{not json"]);
    assert.equal(result.code, 1);
    assert.match(result.body.error, /--input must be valid JSON/);
  });

  test("rejects well-formed JSON inputs of the wrong top-level type", async () => {
    for (const input of ['"just a string"', "42", "null", "[1,2]", "true"]) {
      const result = await runTool(["--tool", "queryGarden", "--input", input]);
      assert.equal(result.code, 1, input);
      assert.match(result.body.error, /Invalid input for queryGarden/, input);
    }
  });

  test("enforces additionalProperties: unknown keys are rejected", async () => {
    const result = await runTool(["--tool", "queryGarden", "--input", '{"bogus":1}']);
    assert.equal(result.code, 1);
    assert.match(result.body.error, /Invalid input for queryGarden/);
  });

  test("enforces the limit boundary: 0, negatives, and fractions rejected; 1 accepted", async () => {
    for (const limit of [0, -3, 1.5]) {
      const result = await runTool(["--tool", "queryGarden", "--input", JSON.stringify({ limit })]);
      assert.equal(result.code, 1, `limit ${limit} should fail`);
      assert.match(result.body.error, /Invalid input for queryGarden/);
    }
    const ok = await runTool(["--tool", "queryGarden", "--input", '{"limit":1}']);
    assert.equal(ok.code, 0, ok.body.error);
    assert.equal(ok.body.ok, true);
    assert.ok(Array.isArray(ok.body.result));
    assert.ok(ok.body.result.length <= 1);
  });

  test("schema blocks hostile createWorkspace inputs before any executor runs", async () => {
    const cases = [
      { slug: "../evil" },
      { slug: "UPPER-CASE" },
      { slug: "ok-slug", year: "10000" },
      { slug: "ok-slug", topic: "bad topic" },
      { slug: "ok-slug", unexpected: "key" }
    ];
    for (const input of cases) {
      const result = await runTool(["--tool", "createWorkspace", "--input", JSON.stringify(input), "--dry-run"]);
      assert.equal(result.code, 1, JSON.stringify(input));
      assert.match(result.body.error, /Invalid input for createWorkspace/, JSON.stringify(input));
    }
  });

  test("importSource schema rejects a kind outside the documented enum", async () => {
    const result = await runTool(["--tool", "importSource", "--input", '{"value":"https://example.com","kind":"bogus"}', "--dry-run"]);
    assert.equal(result.code, 1);
    assert.match(result.body.error, /Invalid input for importSource/);
  });

  test("inspectPacket requires mode/target and rejects an unknown mode", async () => {
    const badMode = await runTool(["--tool", "inspectPacket", "--input", '{"mode":"bogus","target":"x"}']);
    assert.equal(badMode.code, 1);
    assert.match(badMode.body.error, /Invalid input for inspectPacket/);

    const missingTarget = await runTool(["--tool", "inspectPacket", "--input", '{"mode":"article"}']);
    assert.equal(missingTarget.code, 1);
    assert.match(missingTarget.body.error, /Invalid input for inspectPacket/);
  });

  test("a dry-run-capable write tool without --confirm returns a preview and writes nothing", async () => {
    const slug = "adv-preview-noop-9z";
    const targetDir = path.join(repoRoot, "content", "articles", new Date().getFullYear().toString(), slug);
    assert.equal(await pathExists(targetDir), false, "slug must not already exist in the real garden");

    const result = await runTool(["--tool", "createWorkspace", "--input", JSON.stringify({ slug })]);
    assert.equal(result.code, 0, result.body.error);
    assert.equal(result.body.ok, true);
    assert.equal(result.body.confirmed, false);
    assert.match(result.body.message, /dry-run preview/);
    assert.match(result.body.preview.stdout, /Dry run: would create workspace/);

    assert.equal(await pathExists(targetDir), false, "preview must not write into the real garden");
  });

  test("--dry-run on a write tool executes the dry run and writes nothing", async () => {
    const slug = "adv-dryrun-noop-8y";
    const targetDir = path.join(repoRoot, "content", "articles", new Date().getFullYear().toString(), slug);

    const result = await runTool(["--tool", "createWorkspace", "--input", JSON.stringify({ slug }), "--dry-run"]);
    assert.equal(result.code, 0, result.body.error);
    assert.equal(result.body.dryRun, true);
    assert.match(result.body.result.stdout, /Dry run: would create workspace/);
    assert.equal(await pathExists(targetDir), false);
  });

  test("write tools without dry-run support refuse to run without --confirm", async () => {
    const result = await runTool(["--tool", "auditDraft", "--input", '{"slug":"agent-auditable-research"}']);
    assert.equal(result.code, 1);
    assert.match(result.body.error, /without a dry-run preview/);
  });

  test("queryGarden answers real-garden queries: no-match topic yields [], huge and non-ASCII inputs complete", async () => {
    const noMatch = await runTool(["--tool", "queryGarden", "--input", '{"topic":"definitely-not-a-topic-zzz"}']);
    assert.equal(noMatch.code, 0, noMatch.body.error);
    assert.deepEqual(noMatch.body.result, []);

    const huge = await runTool(["--tool", "queryGarden", "--input", JSON.stringify({ keyword: "x".repeat(100_000) })]);
    assert.equal(huge.code, 0, huge.body.error);
    assert.deepEqual(huge.body.result, []);

    const unicode = await runTool(["--tool", "queryGarden", "--input", JSON.stringify({ keyword: "café ☕" })]);
    assert.equal(unicode.code, 0, unicode.body.error);
    assert.ok(Array.isArray(unicode.body.result));
  });

  test("rejects unknown arguments", async () => {
    const result = await runTool(["--tool", "queryGarden", "--bogus"]);
    assert.equal(result.code, 1);
    assert.match(result.body.error, /Unknown argument: --bogus/);
  });
});

describe("agent-tool.mjs branch guard (createWorkspace --confirm in a scratch git repo)", () => {
  const slug = "branch-guard-x";

  async function assertRefused(dir, label) {
    const result = await runTool(
      ["--tool", "createWorkspace", "--input", JSON.stringify({ slug }), "--confirm"],
      { cwd: dir }
    );
    assert.equal(result.code, 1, `${label}: should be refused`);
    assert.match(result.body.error, /main branch/, label);
    assert.equal(await pathExists(path.join(dir, "content")), false, `${label}: nothing may be written`);
  }

  test("refuses on main — including an unborn main branch — and proceeds on a feature branch", async (t) => {
    const dir = await tempDir(t);
    // agent-tool spawns the workspace script from process.cwd(), so expose the
    // repo's scripts inside the scratch repo.
    await symlink(path.join(repoRoot, "scripts"), path.join(dir, "scripts"), "dir");
    await git(dir, ["init", "-q", "-b", "main"]);

    // Unborn branch: rev-parse fails, so a naive guard sees "unknown" and lets the write through.
    await assertRefused(dir, "unborn main");

    await git(dir, ["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "--allow-empty", "-m", "init"]);
    await assertRefused(dir, "committed main");

    await git(dir, ["checkout", "-q", "-b", "feature"]);
    const result = await runTool(
      ["--tool", "createWorkspace", "--input", JSON.stringify({ slug }), "--confirm"],
      { cwd: dir }
    );
    assert.equal(result.code, 0, `feature branch should proceed: ${result.body.error}`);
    assert.equal(result.body.ok, true);
    assert.equal(result.body.result.recorded, true); // agent run recorded into provenance
    const artifact = JSON.parse(
      await readFile(path.join(dir, "content", "articles", new Date().getFullYear().toString(), slug, "artifact.json"), "utf8")
    );
    assert.equal(artifact.provenance.agents.length, 1);
    assert.equal(artifact.provenance.agents[0].role, "orchestrator:workspace");
  });
});

describe("lib/agent-tools.mjs definitions and manifest", () => {
  test("every definition has exactly one executor and vice versa; tool names are unique", () => {
    const names = TOOL_DEFINITIONS.map((tool) => tool.name);
    assert.equal(new Set(names).size, names.length, "duplicate tool names would break dispatch");
    for (const name of names) {
      assert.equal(typeof TOOL_EXECUTORS[name], "function", `missing executor for ${name}`);
    }
    assert.deepEqual(Object.keys(TOOL_EXECUTORS).sort(), names.sort());
  });

  test("definitions are self-consistent: object schemas, and examples cover required keys", () => {
    for (const tool of TOOL_DEFINITIONS) {
      assert.equal(tool.inputSchema.type, "object", tool.name);
      assert.ok(tool.description.length > 10, tool.name);
      for (const example of tool.examples ?? []) {
        for (const requiredKey of tool.inputSchema.required ?? []) {
          assert.ok(requiredKey in example, `${tool.name} example missing required key ${requiredKey}`);
        }
      }
    }
  });

  test("buildToolsManifest emits the documented envelope and all tools", () => {
    const manifest = buildToolsManifest();
    assert.equal(manifest.schemaVersion, 1);
    assert.equal(manifest.site, "https://aura-knowledge.github.io");
    assert.ok(!Number.isNaN(Date.parse(manifest.generatedAt)), "generatedAt must be an ISO timestamp");
    assert.match(manifest.note, /not remotely callable/); // contract for external agents
    assert.equal(manifest.tools.length, TOOL_DEFINITIONS.length);
    assert.deepEqual(
      manifest.tools.map((tool) => tool.name).sort(),
      TOOL_DEFINITIONS.map((tool) => tool.name).sort()
    );
  });
});

describe("lib/agent-tools.mjs executor input validation (pure, no subprocess)", () => {
  test("createWorkspace rejects bad slug/topic/year/seed shapes before spawning anything", async () => {
    const executor = TOOL_EXECUTORS.createWorkspace;
    const flags = { dryRun: true, confirm: false };
    await assert.rejects(executor({}, flags), /slug is required/);
    await assert.rejects(executor({ slug: 123 }, flags), /slug is required/);
    await assert.rejects(executor({ slug: "Bad Slug" }, flags), /lowercase letters, numbers, and hyphens/);
    await assert.rejects(executor({ slug: "ok", topic: "Bad_Topic" }, flags), /lowercase letters, numbers, and hyphens/);
    await assert.rejects(executor({ slug: "ok", year: "202" }, flags), /year must be YYYY/);
    await assert.rejects(executor({ slug: "ok", year: "10000" }, flags), /year must be YYYY/);
    await assert.rejects(executor({ slug: "ok", seed: "/abs/path.md" }, flags), /relative path/);
    await assert.rejects(executor({ slug: "ok", seed: "../outside.md" }, flags), /traverse/);
    await assert.rejects(executor({ slug: "ok", seed: "~/notes.md" }, flags), /traverse/);
    await assert.rejects(executor({ slug: "ok", seed: ".env" }, flags), /sensitive path/);
    await assert.rejects(executor({ slug: "ok", seed: "config/.env.local" }, flags), /sensitive path/);
  });

  test("importSource requires a value", async () => {
    await assert.rejects(TOOL_EXECUTORS.importSource({}, { dryRun: true, confirm: false }), /value is required/);
  });

  test("promoteSource requires candidateId and a safe article slug", async () => {
    const executor = TOOL_EXECUTORS.promoteSource;
    const flags = { dryRun: true, confirm: false };
    await assert.rejects(executor({}, flags), /candidateId is required/);
    await assert.rejects(executor({ candidateId: "candidate-source-x" }, flags), /article is required/);
    await assert.rejects(executor({ candidateId: "candidate-source-x", article: "../evil" }, flags), /lowercase letters, numbers, and hyphens/);
    await assert.rejects(executor({ candidateId: "../escape", article: "ok" }, flags), /[Ii]nvalid candidate id/);
  });

  test("inspectPacket executor defends itself against an unknown mode", async () => {
    await assert.rejects(
      TOOL_EXECUTORS.inspectPacket({ mode: "bogus", target: "x" }, { dryRun: false, confirm: false }),
      /Unknown inspect mode: bogus/
    );
  });

  test("auditDraft and scoutSources validate their optional inputs", async () => {
    await assert.rejects(TOOL_EXECUTORS.auditDraft({ slug: "Bad Slug" }, {}), /lowercase letters, numbers, and hyphens/);
    await assert.rejects(TOOL_EXECUTORS.scoutSources({ config: "/abs/scout.json" }, {}), /relative path/);
    await assert.rejects(TOOL_EXECUTORS.scoutSources({ config: ".env" }, {}), /sensitive path/);
  });

  test("createWorkspace dry-run through the executor reaches the real script without writing", async () => {
    const slug = "adv-exec-dryrun-z9";
    const year = new Date().getFullYear().toString();
    const targetDir = path.join(repoRoot, "content", "articles", year, slug);
    assert.equal(await pathExists(targetDir), false);

    const result = await TOOL_EXECUTORS.createWorkspace({ slug }, { dryRun: true, confirm: false });
    assert.match(result.stdout, /Dry run: would create workspace/);
    assert.equal(result.recorded, false);
    assert.equal(result.articleDir, `content/articles/${year}/${slug}`);
    assert.equal(await pathExists(targetDir), false);
  });

  test("queryGarden executor returns real garden results and honors limit", async () => {
    const all = await TOOL_EXECUTORS.queryGarden({});
    assert.ok(Array.isArray(all));
    assert.ok(all.length > 0, "real garden should have articles");
    for (const entry of all) {
      assert.ok(entry.slug && entry.articleId && entry.articleUrl && entry.agentJsonPath);
    }
    const limited = await TOOL_EXECUTORS.queryGarden({ limit: 1 });
    assert.equal(limited.length, 1);
  });
});

describe("lib/agent-tools.mjs promoteSource executor against a scratch garden", () => {
  const FRONTMATTER = "---\ntitle: Fixture\n---\n\nFixture body.\n";

  async function makeScratchGarden(dir, { sources = [] } = {}) {
    const articleDir = path.join(dir, "content", "articles", "2020", "demo-article");
    await mkdir(articleDir, { recursive: true });
    await writeFile(path.join(articleDir, "article.md"), FRONTMATTER);
    await writeFile(path.join(articleDir, "agent.md"), FRONTMATTER);
    const artifact = {
      schemaVersion: 3,
      id: "article:demo-article",
      slug: "demo-article",
      sources,
      topics: [],
      claims: [],
      related: []
    };
    await writeFile(path.join(articleDir, "artifact.json"), `${JSON.stringify(artifact, null, 2)}\n`);
    return path.join(articleDir, "artifact.json");
  }

  async function makeCandidate(dir, { dateDir = "2020-01-02", id = "candidate-source-feedbeef42", fields = {} } = {}) {
    const candidateDir = path.join(dir, "content", "scout", "candidates", dateDir);
    await mkdir(candidateDir, { recursive: true });
    await writeFile(
      path.join(candidateDir, `${id}.json`),
      JSON.stringify({
        schemaVersion: 1,
        id,
        url: "https://example.com/feed",
        title: "Feed Item",
        type: "article",
        accessed: "2020-01-02",
        status: "candidate",
        ...fields
      })
    );
  }

  // The executor resolves rootDir from process.cwd() at import time, so run it in
  // a child process whose cwd is the scratch garden.
  async function callExecutor(cwd, toolName, input, flags = { dryRun: false, confirm: false }) {
    const code = `
      const { TOOL_EXECUTORS } = await import(${JSON.stringify(AGENT_TOOLS_LIB)});
      try {
        const result = await TOOL_EXECUTORS[${JSON.stringify(toolName)}](${JSON.stringify(input)}, ${JSON.stringify(flags)});
        console.log(JSON.stringify({ ok: true, result }));
      } catch (error) {
        console.log(JSON.stringify({ ok: false, error: error.message }));
      }
    `;
    const { stdout } = await execFileAsync(process.execPath, ["--input-type=module", "-e", code], { cwd });
    return JSON.parse(stdout);
  }

  test("preview (no --confirm) returns the planned source and writes nothing", async (t) => {
    const dir = await tempDir(t);
    const artifactPath = await makeScratchGarden(dir);
    // Put the candidate in a later date dir with an unrelated earlier dir present,
    // exercising the sorted date-dir scan.
    await mkdir(path.join(dir, "content", "scout", "candidates", "2020-01-01"), { recursive: true });
    await makeCandidate(dir);
    const before = await readFile(artifactPath, "utf8");

    const response = await callExecutor(dir, "promoteSource", {
      candidateId: "candidate-source-feedbeef42",
      article: "demo-article",
      year: "2020"
    });
    assert.equal(response.ok, true, response.error);
    assert.equal(response.result.confirmed, false);
    assert.equal(response.result.preview.sourceId, "source-feedbeef42");
    assert.equal(response.result.preview.article, "2020/demo-article");
    assert.equal(response.result.preview.source.title, "Feed Item");
    assert.equal(await readFile(artifactPath, "utf8"), before, "preview must not modify the artifact");
  });

  test("unknown candidate and duplicate source are reported before any write", async (t) => {
    const dir = await tempDir(t);
    const artifactPath = await makeScratchGarden(dir, {
      sources: [{ id: "source-feedbeef42", title: "Feed Item", url: "https://example.com/feed", type: "article", accessed: "2020-01-02" }]
    });
    await makeCandidate(dir);
    const before = await readFile(artifactPath, "utf8");

    const unknown = await callExecutor(dir, "promoteSource", { candidateId: "candidate-source-nope99999", article: "demo-article", year: "2020" });
    assert.equal(unknown.ok, false);
    assert.match(unknown.error, /Candidate not found: candidate-source-nope99999/);

    const duplicate = await callExecutor(dir, "promoteSource", { candidateId: "candidate-source-feedbeef42", article: "demo-article", year: "2020" });
    assert.equal(duplicate.ok, false);
    assert.match(duplicate.error, /already exists/);

    const missingArticle = await callExecutor(dir, "promoteSource", { candidateId: "candidate-source-feedbeef42", article: "other-article", year: "2020" });
    assert.equal(missingArticle.ok, false);
    assert.match(missingArticle.error, /Article not found: 2020\/other-article/);

    assert.equal(await readFile(artifactPath, "utf8"), before);
  });
});
