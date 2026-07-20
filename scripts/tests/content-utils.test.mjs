import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, readdir, readFile, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import vm from "node:vm";

import {
  normalizeDates,
  parseFrontmatter,
  readJson,
  sha256,
  toDateString,
  toPosix,
  writeJson
} from "../lib/content-utils.mjs";

const worktreeRoot = path.resolve(import.meta.dirname, "..", "..");
const moduleUrl = pathToFileURL(path.join(worktreeRoot, "scripts", "lib", "content-utils.mjs")).href;

// content-utils resolves contentRoot/roadmapRoot from process.cwd() at import
// time, so filesystem-bound functions are exercised in a child process whose
// cwd is a temp fixture garden. The child prints a JSON result envelope.
function runModule(cwd, body) {
  const script = `
import * as cu from ${JSON.stringify(moduleUrl)};
try {
  const out = await (async () => { ${body} })();
  console.log(JSON.stringify({ ok: true, out }));
} catch (error) {
  console.log(JSON.stringify({ ok: false, name: error.name, code: error.code, message: error.message }));
}
`;
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
    cwd,
    encoding: "utf8",
    timeout: 30000
  });
  assert.equal(result.status, 0, `child process failed: ${result.stderr}`);
  return JSON.parse(result.stdout.trim().split("\n").pop());
}

async function tmpdir() {
  return mkdtemp(path.join(os.tmpdir(), "ak-content-utils-"));
}

async function makeArticle(root, year, slug, { artifact = {}, articleFm = "title: T", agentFm = "role: tester" } = {}) {
  const dir = path.join(root, "content", "articles", year, slug);
  await mkdir(dir, { recursive: true });
  const fullArtifact = {
    id: `article:${slug}`,
    title: `Title ${slug}`,
    status: "draft",
    updatedAt: "2026-01-01",
    topics: [],
    sources: [],
    claims: [],
    ...artifact
  };
  await writeFile(path.join(dir, "article.md"), `---\n${articleFm}\n---\nBody of ${slug}.\n`);
  await writeFile(path.join(dir, "agent.md"), `---\n${agentFm}\n---\nAgent brief of ${slug}.\n`);
  await writeFile(path.join(dir, "artifact.json"), JSON.stringify(fullArtifact, null, 2) + "\n");
  return dir;
}

describe("toPosix", () => {
  test("converts platform separators to forward slashes", () => {
    assert.equal(toPosix(path.join("content", "articles", "2026", "x")), "content/articles/2026/x");
    assert.equal(toPosix("already/posix"), "already/posix");
  });
});

describe("toDateString", () => {
  test("formats Date instances as YYYY-MM-DD", () => {
    assert.equal(toDateString(new Date(Date.UTC(2026, 0, 5))), "2026-01-05");
    assert.equal(toDateString(new Date(Date.UTC(999, 11, 31))), "0999-12-31");
  });

  test("accepts cross-realm Date objects via toStringTag", () => {
    const foreign = vm.runInNewContext("new Date(Date.UTC(2026, 0, 5))");
    assert.equal(foreign instanceof Date, false);
    assert.equal(toDateString(foreign), "2026-01-05");
  });

  test("does not truncate signed six-digit years (regression: year 10000 produced '+010000-01')", () => {
    assert.equal(toDateString(new Date(Date.UTC(10000, 0, 1))), "+010000-01-01");
  });

  test("passes strings through as a 10-char prefix without validating realness", () => {
    assert.equal(toDateString("2026-02-30"), "2026-02-30");
    assert.equal(toDateString("2026-01-05T10:00:00Z"), "2026-01-05");
  });

  test("throws RangeError on an invalid Date instead of returning garbage", () => {
    assert.throws(() => toDateString(new Date("not-a-date")), RangeError);
  });
});

describe("normalizeDates", () => {
  test("normalizes all six known date keys and leaves other keys untouched", () => {
    const input = {
      date: new Date(Date.UTC(2026, 0, 1)),
      updated: "2026-01-02T09:30:00Z",
      publishedAt: "2026-01-03",
      updatedAt: "2026-01-04",
      accessed: "2026-01-05",
      reviewedAt: "2026-01-06",
      created: "2026-01-07T00:00:00Z",
      title: "untouched"
    };
    const out = normalizeDates(input);
    assert.deepEqual(
      [out.date, out.updated, out.publishedAt, out.updatedAt, out.accessed, out.reviewedAt],
      ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05", "2026-01-06"]
    );
    assert.equal(out.created, "2026-01-07T00:00:00Z");
    assert.equal(out.title, "untouched");
  });

  test("leaves falsy date values as-is and does not mutate the input", () => {
    const input = { date: "", updated: null, accessed: 0 };
    const out = normalizeDates(input);
    assert.deepEqual(out, { date: "", updated: null, accessed: 0 });
    assert.deepEqual(input, { date: "", updated: null, accessed: 0 });
    assert.notEqual(out, input);
  });
});

describe("parseFrontmatter", () => {
  test("parses frontmatter and returns the body verbatim", () => {
    const raw = "---\ntitle: Héllo\n---\n\n# Body — ünïcode ✓\nline2\n";
    const { data, body } = parseFrontmatter(raw, "x.md");
    assert.equal(data.title, "Héllo");
    assert.equal(body, "\n# Body — ünïcode ✓\nline2\n");
  });

  test("handles CRLF line endings", () => {
    const { data, body } = parseFrontmatter("---\r\ntitle: X\r\n---\r\nBody\r\n", "x.md");
    assert.equal(data.title, "X");
    assert.equal(body, "Body\r\n");
  });

  test("treats blank-line frontmatter as an empty mapping", () => {
    // The fence regex requires a newline before the closing fence, so the
    // minimal "---\n---" form is rejected while the blank-line form parses.
    assert.deepEqual(parseFrontmatter("---\n\n---\nbody", "x.md").data, {});
    assert.throws(() => parseFrontmatter("---\n---\nbody", "x.md"), /Missing YAML frontmatter/);
  });

  test("accepts a closing fence without trailing newline", () => {
    const { data, body } = parseFrontmatter("---\ntitle: X\n---", "x.md");
    assert.equal(data.title, "X");
    assert.equal(body, "");
  });

  test("normalizes YAML timestamp values to date strings", () => {
    const { data } = parseFrontmatter("---\ndate: 2026-01-05\nupdated: 2026-01-06T10:00:00Z\n---\nx", "x.md");
    assert.equal(data.date, "2026-01-05");
    assert.equal(data.updated, "2026-01-06");
  });

  test("throws a named error when frontmatter is missing, including the file path", () => {
    assert.throws(() => parseFrontmatter("no frontmatter here", "dir/x.md"), /Missing YAML frontmatter: dir\/x\.md/);
  });

  test("rejects a document not starting at offset 0 (e.g. BOM-prefixed)", () => {
    assert.throws(() => parseFrontmatter("﻿---\ntitle: X\n---\nbody", "x.md"), /Missing YAML frontmatter/);
  });

  test("fails loudly on malformed YAML and on duplicate mapping keys", () => {
    assert.throws(() => parseFrontmatter("---\n: :\n---\nbody", "x.md"), { name: "YAMLException" });
    assert.throws(() => parseFrontmatter("---\ntitle: a\ntitle: b\n---\nbody", "x.md"), { name: "YAMLException" });
  });

  test("throws a clear error for scalar frontmatter instead of silently corrupting it (regression)", () => {
    // Previously `yaml.load` returned "just a string" and normalizeDates spread
    // it into { 0: "j", 1: "u", ... } — a garbage frontmatter object.
    assert.throws(() => parseFrontmatter("---\njust a string\n---\nbody", "x.md"), /must be a YAML mapping/);
    assert.throws(() => parseFrontmatter("---\n42\n---\nbody", "x.md"), /must be a YAML mapping/);
  });

  test("throws a clear error for array frontmatter (regression)", () => {
    assert.throws(() => parseFrontmatter("---\n- a\n- b\n---\nbody", "x.md"), /must be a YAML mapping/);
  });

  test("parses a 1 MB body without truncation or regex blowup", () => {
    const big = "x".repeat(1024 * 1024);
    const { body } = parseFrontmatter(`---\ntitle: X\n---\n${big}`, "x.md");
    assert.equal(body, big);
  });
});

describe("sha256", () => {
  test("matches known vectors and is stable on non-ASCII and large inputs", () => {
    assert.equal(sha256(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    assert.equal(sha256("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    const unicode = "héllo — ✓".repeat(1000);
    assert.equal(sha256(unicode), createHash("sha256").update(unicode).digest("hex"));
    const big = "y".repeat(10 * 1024 * 1024);
    assert.match(sha256(big), /^[0-9a-f]{64}$/);
  });
});

describe("readJson / writeJson", () => {
  test("round-trips nested non-ASCII data through a temp file", async () => {
    const dir = await tmpdir();
    const file = path.join(dir, "data.json");
    const data = { title: "Héllo ✓", items: [1, { nested: ["ü", null, true] }] };
    await writeJson(file, data);
    assert.deepEqual(await readJson(file), data);
  });

  test("writeJson creates missing parent directories", async () => {
    const dir = await tmpdir();
    const file = path.join(dir, "a", "b", "c", "data.json");
    await writeJson(file, { ok: true });
    assert.deepEqual(await readJson(file), { ok: true });
  });

  test("writeJson emits two-space-indented JSON with a trailing newline", async () => {
    const dir = await tmpdir();
    const file = path.join(dir, "data.json");
    await writeJson(file, { a: 1 });
    assert.equal(await readFile(file, "utf8"), '{\n  "a": 1\n}\n');
  });

  test("writeJson rejects non-serializable values without creating a file (regression)", async () => {
    // Previously JSON.stringify(undefined) yielded undefined and the literal
    // text "undefined\n" was written — a corrupt JSON file produced silently.
    const dir = await tmpdir();
    const file = path.join(dir, "data.json");
    await assert.rejects(() => writeJson(file, undefined), TypeError);
    await assert.rejects(() => writeJson(file, () => {}), TypeError);
    assert.equal(existsSync(file), false);
  });

  test("writeJson fails loudly on circular structures", async () => {
    const dir = await tmpdir();
    const circular = {};
    circular.self = circular;
    await assert.rejects(() => writeJson(path.join(dir, "data.json"), circular), TypeError);
  });

  test("readJson rejects malformed or BOM-prefixed JSON with a SyntaxError", async () => {
    const dir = await tmpdir();
    const broken = path.join(dir, "broken.json");
    await writeFile(broken, "{ not json", "utf8");
    await assert.rejects(() => readJson(broken), SyntaxError);
    const bom = path.join(dir, "bom.json");
    await writeFile(bom, "﻿{}", "utf8");
    await assert.rejects(() => readJson(bom), SyntaxError);
  });

  test("readJson surfaces ENOENT for missing files", async () => {
    const dir = await tmpdir();
    await assert.rejects(() => readJson(path.join(dir, "nope.json")), { code: "ENOENT" });
  });

  test("readJson names the file path in parse errors (regression)", async () => {
    // Previously a corrupt file among 94 articles was unidentifiable from the
    // bare JSON.parse error message.
    const dir = await tmpdir();
    const file = path.join(dir, "identifiable-name.json");
    await writeFile(file, "{ nope", "utf8");
    await assert.rejects(
      () => readJson(file),
      (error) => {
        assert.ok(error instanceof SyntaxError);
        assert.match(error.message, /identifiable-name\.json/);
        return true;
      }
    );
  });

  test("writeJson publishes atomically: a concurrent reader never sees torn JSON (regression)", async () => {
    // Previously writeFile truncated in place, so a concurrent reader could
    // parse a half-written document (observed as flaky SyntaxErrors in the
    // race tests). The temp-file + rename publish must make reads tear-proof.
    const dir = await tmpdir();
    const file = path.join(dir, "data.json");
    const big = Array.from({ length: 20000 }, (_, i) => ({ id: i, pad: "x".repeat(40) }));
    await writeJson(file, big);
    const iterations = 40;
    let iterationsDone = 0;
    const writer = (async () => {
      for (let i = 0; i < iterations; i += 1) {
        await writeJson(file, { version: i, items: big });
        iterationsDone = i + 1;
      }
    })();
    const reader = (async () => {
      const deadline = Date.now() + 30000;
      while (iterationsDone < iterations && Date.now() < deadline) {
        const parsed = await readJson(file); // must always parse: either pre- or post-rename
        assert.ok(typeof parsed === "object" && parsed !== null);
      }
    })();
    await Promise.all([writer, reader]);
    assert.equal(iterationsDone, iterations);
  });

  test("writeJson leaves no temp files behind on success or failure", async () => {
    const dir = await tmpdir();
    const file = path.join(dir, "data.json");
    await writeJson(file, { ok: true });
    const circular = {};
    circular.self = circular;
    await assert.rejects(() => writeJson(file, circular), TypeError);
    const leftovers = (await readdir(dir)).filter((entry) => entry.endsWith(".tmp"));
    assert.deepEqual(leftovers, []);
    assert.deepEqual(await readJson(file), { ok: true });
  });

  test("round-trips a 10k-item document in bounded time", async () => {
    const dir = await tmpdir();
    const file = path.join(dir, "big.json");
    const data = Array.from({ length: 10000 }, (_, i) => ({ id: `claim-${i}`, ok: i % 2 === 0 }));
    await writeJson(file, data);
    const parsed = await readJson(file);
    assert.equal(parsed.length, 10000);
    assert.deepEqual(parsed[9999], { id: "claim-9999", ok: false });
  });
});

describe("findArticleDirs (fixture garden)", () => {
  test("returns year/slug directories sorted, ignoring stray files", async () => {
    const dir = await tmpdir();
    await makeArticle(dir, "2025", "delta");
    await makeArticle(dir, "2024", "beta");
    await makeArticle(dir, "2024", "alpha");
    await writeFile(path.join(dir, "content", "articles", "README.md"), "stray");
    await writeFile(path.join(dir, "content", "articles", "2024", "stray.txt"), "stray");
    const res = runModule(dir, "return (await cu.findArticleDirs()).map((p) => p.split('/').slice(-2).join('/'));");
    assert.deepEqual(res, {
      ok: true,
      out: ["2024/alpha", "2024/beta", "2025/delta"]
    });
  });

  test("does not follow symlinked year or slug directories", async () => {
    const dir = await tmpdir();
    await makeArticle(dir, "2024", "real");
    const outside = path.join(dir, "outside");
    await makeArticle(outside, "2024", "ghost");
    await symlink(path.join(outside, "content", "articles", "2024"), path.join(dir, "content", "articles", "2099"), "dir");
    await symlink(path.join(outside, "content", "articles", "2024", "ghost"), path.join(dir, "content", "articles", "2024", "linked"), "dir");
    const res = runModule(dir, "return (await cu.findArticleDirs()).map((p) => p.split('/').slice(-2).join('/'));");
    assert.deepEqual(res, { ok: true, out: ["2024/real"] });
  });

  test("fails loudly with ENOENT when the articles root is missing", async () => {
    const dir = await tmpdir();
    const res = runModule(dir, "return await cu.findArticleDirs();");
    assert.equal(res.ok, false);
    assert.equal(res.code, "ENOENT");
  });
});

describe("loadArticle / loadArticles (fixture garden)", () => {
  test("derives identity, paths, frontmatter, and content hash from disk", async () => {
    const dir = await tmpdir();
    await makeArticle(dir, "2024", "alpha", { artifact: { claims: [{ id: "claim-001" }] } });
    const res = runModule(
      dir,
      `const a = await cu.loadArticle((await cu.findArticleDirs())[0]);
       return {
         year: a.year, slug: a.slug, sourcePath: a.sourcePath, agentBriefPath: a.agentBriefPath,
         contentHash: a.contentHash, expectedHash: cu.sha256(a.articleRaw),
         body: a.articleBody, fm: a.articleFrontmatter, claims: a.artifact.claims
       };`
    );
    assert.equal(res.ok, true);
    assert.equal(res.out.year, "2024");
    assert.equal(res.out.slug, "alpha");
    assert.equal(res.out.sourcePath, "content/articles/2024/alpha/article.md");
    assert.equal(res.out.agentBriefPath, "content/articles/2024/alpha/agent.md");
    assert.equal(res.out.contentHash, res.out.expectedHash);
    assert.equal(res.out.body, "Body of alpha.\n");
    assert.equal(res.out.fm.title, "T");
    assert.deepEqual(res.out.claims, [{ id: "claim-001" }]);
  });

  test("loadArticles rejects loudly when any artifact.json is malformed — no silent partial load", async () => {
    const dir = await tmpdir();
    await makeArticle(dir, "2024", "good");
    const bad = await makeArticle(dir, "2024", "bad");
    await writeFile(path.join(bad, "artifact.json"), "{ broken", "utf8");
    const res = runModule(dir, "return await cu.loadArticles();");
    assert.equal(res.ok, false);
    assert.equal(res.name, "SyntaxError");
  });

  test("loadArticles rejects when a required file is missing", async () => {
    const dir = await tmpdir();
    const articleDir = await makeArticle(dir, "2024", "alpha");
    await writeFile(path.join(articleDir, "agent.md"), "");
    const res = runModule(dir, "return await cu.loadArticles();");
    assert.equal(res.ok, false);
    assert.match(res.message, /Missing YAML frontmatter/);
  });
});

describe("roadmap loading (fixture garden)", () => {
  test("missing roadmap directory yields empty results, not an error", async () => {
    const dir = await tmpdir();
    const res = runModule(
      dir,
      "return { files: (await cu.findRoadmapFiles()).length, roadmaps: (await cu.loadRoadmaps()).length };"
    );
    assert.deepEqual(res, { ok: true, out: { files: 0, roadmaps: 0 } });
  });

  test("only .json files are listed; directories named *.json are ignored", async () => {
    const dir = await tmpdir();
    const roadmapDir = path.join(dir, "content", "roadmap");
    await mkdir(path.join(roadmapDir, "trap.json"), { recursive: true });
    await writeFile(path.join(roadmapDir, "b.json"), '{"slug":"b"}');
    await writeFile(path.join(roadmapDir, "a.txt"), "ignored");
    await writeFile(path.join(roadmapDir, "a.json"), '{"slug":"a"}');
    const res = runModule(
      dir,
      `const files = (await cu.findRoadmapFiles()).map((p) => p.split('/').pop());
       const roadmaps = (await cu.loadRoadmaps()).map((r) => ({ slug: r.slug, sourcePath: r.sourcePath }));
       return { files, roadmaps };`
    );
    assert.deepEqual(res.out.files, ["a.json", "b.json"]);
    assert.deepEqual(res.out.roadmaps, [
      { slug: "a", sourcePath: "content/roadmap/a.json" },
      { slug: "b", sourcePath: "content/roadmap/b.json" }
    ]);
  });

  test("a malformed roadmap file fails the whole load loudly", async () => {
    const dir = await tmpdir();
    const roadmapDir = path.join(dir, "content", "roadmap");
    await mkdir(roadmapDir, { recursive: true });
    await writeFile(path.join(roadmapDir, "broken.json"), "{ nope");
    const res = runModule(dir, "return await cu.loadRoadmaps();");
    assert.equal(res.ok, false);
    assert.equal(res.name, "SyntaxError");
  });
});
