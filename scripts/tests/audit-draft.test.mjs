import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../audit-draft.mjs", import.meta.url));

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function makeRoot(t) {
  const root = mkdtempSync(path.join(tmpdir(), "audit-draft-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function cleanClaims() {
  return [
    {
      id: "claim-001",
      claim: "A testable claim with enough length to be realistic.",
      confidence: "medium",
      status: "core",
      evidence: [
        { sourceId: "source-alpha", snippet: "Evidence snippet from alpha.", supports: "direct" },
        { sourceId: "source-beta", snippet: "Evidence snippet from beta.", supports: "indirect" }
      ],
      counterevidence: []
    }
  ];
}

function cleanSources() {
  return [
    { id: "source-alpha", title: "Alpha Paper", url: "https://example.com/alpha", type: "paper", accessed: today() },
    { id: "source-beta", title: "Beta Dataset", url: "https://example.com/beta", type: "dataset", accessed: today() }
  ];
}

// Writes a garden article that produces zero findings by default; spec fields
// override pieces to create specific diagnostics.
function writeArticle(root, spec) {
  const year = spec.year ?? "2026";
  const slug = spec.slug;
  const dir = path.join(root, "content", "articles", year, slug);
  mkdirSync(dir, { recursive: true });

  const claims = spec.claims ?? cleanClaims();
  const sources = spec.sources ?? cleanSources();
  const markers = spec.markers ?? claims.map((claim) => claim.id);
  const body = spec.body ?? `${markers.map((id) => `<span id="${id}" class="claim-marker"></span>`).join("\n")}\n\nArticle body text.\n`;

  const articleMd = [
    "---",
    "schemaVersion: 1",
    `id: article:${slug}`,
    `slug: ${slug}`,
    "title: A Test Article Title",
    "dek: A dek that is comfortably long enough.",
    `date: ${today()}`,
    `updated: ${today()}`,
    `status: ${spec.status ?? "draft"}`,
    "maturity: seed",
    "topic: testing",
    "tags:",
    "  - testing",
    "summary: A summary that is long enough to be plausible for the schema.",
    "readingTime: 1 min",
    `agentArtifact: /agents/articles/${slug}.json`,
    `sourcePath: content/articles/${year}/${slug}/article.md`,
    "---",
    body
  ].join("\n");

  const agentMd = [
    "---",
    "schemaVersion: 1",
    `id: agent-brief:${slug}`,
    `articleId: article:${slug}`,
    `slug: ${slug}`,
    "title: Agent Brief for Testing",
    "tokenBudget: 2000",
    `status: ${spec.status ?? "draft"}`,
    `updated: ${today()}`,
    "---",
    "",
    "Brief body text.",
    ""
  ].join("\n");

  const artifact = {
    schemaVersion: 3,
    id: `article:${slug}`,
    slug,
    title: "A Test Article Title",
    canonicalPath: `/articles/${slug}/`,
    sourcePath: `content/articles/${year}/${slug}/article.md`,
    agentBriefPath: `content/articles/${year}/${slug}/agent.md`,
    thesis: "A thesis statement that is long enough to satisfy the schema minimum length requirement.",
    status: spec.status ?? "draft",
    maturity: "seed",
    publishedAt: today(),
    updatedAt: today(),
    audiences: ["testers"],
    topics: ["testing"],
    claims,
    sources,
    related: [],
    agentInstructions: [],
    provenance: spec.provenance === undefined
      ? {
          createdAt: today(),
          createdBy: "test",
          agents: [
            { role: "drafter", model: "test-model", invokedAt: today(), inputHash: `sha256:${sha256("input")}`, outputHash: `sha256:${sha256("output")}` }
          ],
          reviews: [],
          policy: { id: "policy:default", version: "1.0.0" }
        }
      : spec.provenance,
    contentHash: sha256(articleMd)
  };

  writeFileSync(path.join(dir, "article.md"), articleMd);
  writeFileSync(path.join(dir, "agent.md"), agentMd);
  writeFileSync(path.join(dir, "artifact.json"), JSON.stringify(artifact, null, 2));
  return dir;
}

function runAudit(root, args = []) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: root, encoding: "utf8" });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function runAuditAsync(root, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SCRIPT, ...args], { cwd: root, encoding: "utf8" });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

function readAudit(root, slug, year = "2026") {
  return JSON.parse(readFileSync(path.join(root, "content", "articles", year, slug, "workspace", "audit.json"), "utf8"));
}

describe("audit-draft write mode", () => {
  test("writes a well-formed audit.json for a clean article", (t) => {
    const root = makeRoot(t);
    writeArticle(root, { slug: "clean-one" });
    const { status, stdout, stderr } = runAudit(root);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /2026\/clean-one: wrote workspace\/audit\.json \(0 error\(s\), 0 warning\(s\)\)/);

    const audit = readAudit(root, "clean-one");
    assert.equal(audit.schemaVersion, 1);
    assert.equal(audit.articleId, "article:clean-one");
    assert.equal(audit.slug, "clean-one");
    assert.ok(Array.isArray(audit.suggestions));
    assert.equal(audit.suggestions.length, 0);
    assert.ok(!Number.isNaN(Date.parse(audit.generatedAt)), "generatedAt must be a parseable timestamp");
  });

  test("records error findings with extracted claimId", (t) => {
    const root = makeRoot(t);
    writeArticle(root, { slug: "orphan", markers: [] });
    const { status, stderr } = runAudit(root);
    assert.equal(status, 0, stderr);

    const audit = readAudit(root, "orphan");
    const orphan = audit.suggestions.find((suggestion) => suggestion.rule === "orphan-claim");
    assert.ok(orphan, "expected an orphan-claim suggestion");
    assert.equal(orphan.severity, "error");
    assert.equal(orphan.claimId, "claim-001");
    assert.match(orphan.message, /2026\/orphan: claim-001 is missing a visible article marker/);
  });

  test("non-ASCII claim text and body produce no spurious findings", (t) => {
    const root = makeRoot(t);
    const claims = cleanClaims();
    claims[0].claim = "この主張は検証可能な十分な長さの文章です 🚀 — avec des accents.";
    writeArticle(root, { slug: "unicode-article", claims, body: '<span id="claim-001" class="claim-marker"></span>\n\n身体検査 🚀\n' });
    const { status, stderr } = runAudit(root);
    assert.equal(status, 0, stderr);
    const audit = readAudit(root, "unicode-article");
    assert.equal(audit.suggestions.length, 0);
  });
});

describe("audit-draft --check mode", () => {
  test("exits 0 on a clean garden and writes nothing", (t) => {
    const root = makeRoot(t);
    const dir = writeArticle(root, { slug: "clean-one" });
    const { status, stdout, stderr } = runAudit(root, ["--check"]);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /Audit check: 0 error\(s\), 0 warning\(s\) across 1 article\(s\)\./);
    assert.equal(existsSync(path.join(dir, "workspace", "audit.json")), false, "--check must not write audit.json");
  });

  test("exits 1 and lists error findings", (t) => {
    const root = makeRoot(t);
    writeArticle(root, { slug: "orphan", markers: [] });
    const { status, stdout, stderr } = runAudit(root, ["--check"]);
    assert.equal(status, 1, stderr);
    assert.match(stdout, /2026\/orphan: 1 error\(s\), 0 warning\(s\)/);
    assert.match(stdout, /- 2026\/orphan: claim-001 is missing a visible article marker/);
  });

  test("warning-only findings do not fail the check", (t) => {
    const root = makeRoot(t);
    writeArticle(root, { slug: "warn-only", provenance: null });
    const { status, stdout, stderr } = runAudit(root, ["--check"]);
    assert.equal(status, 0, stderr);
    assert.match(stdout, /Audit check: 0 error\(s\), 1 warning\(s\)/);
  });
});

describe("audit-draft argument handling", () => {
  test("--slug and a positional slug both audit only the matching article", (t) => {
    for (const args of [["--slug", "target"], ["target"]]) {
      const root = makeRoot(t);
      writeArticle(root, { slug: "target" });
      const otherDir = writeArticle(root, { slug: "bystander" });
      const { status, stdout, stderr } = runAudit(root, args);
      assert.equal(status, 0, `${args.join(" ")}: ${stderr}`);
      assert.match(stdout, /2026\/target: wrote workspace\/audit\.json/, args.join(" "));
      assert.doesNotMatch(stdout, /bystander/, args.join(" "));
      assert.equal(existsSync(path.join(otherDir, "workspace", "audit.json")), false, args.join(" "));
    }
  });

  test("exits 1 for an unknown slug", (t) => {
    const root = makeRoot(t);
    writeArticle(root, { slug: "target" });
    const { status, stderr } = runAudit(root, ["--slug", "ghost"]);
    assert.equal(status, 1);
    assert.match(stderr, /Article not found: ghost/);
  });

  test("exits 1 for an unknown option", (t) => {
    const root = makeRoot(t);
    writeArticle(root, { slug: "target" });
    const { status, stderr } = runAudit(root, ["--bogus"]);
    assert.equal(status, 1);
    assert.match(stderr, /Unknown option: --bogus/);
  });

  test("exits 1 when --slug is given without a value and audits nothing", (t) => {
    const root = makeRoot(t);
    const dirA = writeArticle(root, { slug: "one" });
    const dirB = writeArticle(root, { slug: "two" });
    const { status, stderr } = runAudit(root, ["--slug"]);
    assert.equal(status, 1);
    assert.match(stderr, /--slug requires a value/);
    assert.equal(existsSync(path.join(dirA, "workspace", "audit.json")), false, "must not audit all articles on a dangling --slug");
    assert.equal(existsSync(path.join(dirB, "workspace", "audit.json")), false, "must not audit all articles on a dangling --slug");
  });
});

describe("audit-draft malformed input handling", () => {
  test("exits 1 with an error message on broken artifact JSON", (t) => {
    const root = makeRoot(t);
    const dir = path.join(root, "content", "articles", "2026", "broken");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "article.md"), "---\nstatus: draft\n---\nBody.\n");
    writeFileSync(path.join(dir, "agent.md"), "---\nstatus: draft\n---\nBrief.\n");
    writeFileSync(path.join(dir, "artifact.json"), "{ truncated");
    const { status, stderr } = runAudit(root);
    assert.equal(status, 1);
    assert.ok(stderr.trim().length > 0, "expected an error message on stderr");
    assert.doesNotMatch(stderr, /^\s+at\s/m, "error should be reported without a stack trace");
  });

  test("exits 1 when the artifact shape cannot be assessed", (t) => {
    const root = makeRoot(t);
    const dir = path.join(root, "content", "articles", "2026", "shapeless");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "article.md"), "---\nstatus: draft\n---\nBody.\n");
    writeFileSync(path.join(dir, "agent.md"), "---\nstatus: draft\n---\nBrief.\n");
    writeFileSync(path.join(dir, "artifact.json"), JSON.stringify({ id: "article:shapeless", slug: "shapeless", claims: "not-an-array", sources: [] }));
    const { status, stderr } = runAudit(root);
    assert.equal(status, 1);
    assert.ok(stderr.trim().length > 0, "expected an error message on stderr");
  });
});

describe("audit-draft concurrency and scale", () => {
  test("two concurrent write-mode runs both succeed and leave valid JSON", async (t) => {
    const root = makeRoot(t);
    writeArticle(root, { slug: "one" });
    writeArticle(root, { slug: "two" });
    const [first, second] = await Promise.all([runAuditAsync(root), runAuditAsync(root)]);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(second.status, 0, second.stderr);
    for (const slug of ["one", "two"]) {
      const audit = readAudit(root, slug);
      assert.equal(audit.schemaVersion, 1);
      assert.equal(audit.slug, slug);
    }
  });

  test("audits a few hundred articles in one run", (t) => {
    const root = makeRoot(t);
    const count = 250;
    for (let index = 0; index < count; index += 1) {
      writeArticle(root, { slug: `bulk-${String(index).padStart(4, "0")}` });
    }
    const { status, stdout, stderr } = runAudit(root, ["--check"]);
    assert.equal(status, 0, stderr);
    assert.match(stdout, new RegExp(`Audit check: 0 error\\(s\\), 0 warning\\(s\\) across ${count} article\\(s\\)\\.`));
  });
});
