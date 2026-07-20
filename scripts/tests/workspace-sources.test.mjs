import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const scriptPath = (name) => path.join(repoRoot, "scripts", name);

const CREATE_WORKSPACE = scriptPath("create-workspace.mjs");
const SOURCE_IMPORTER = scriptPath("source-importer.mjs");
const PROMOTE_SOURCE = scriptPath("promote-source.mjs");

// Run a CLI script and capture its exit behavior instead of throwing.
async function run(bin, args, { cwd, timeout = 60000 } = {}) {
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

async function tempDir(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ak-ws-src-"));
  t.after(async () => {
    await rm(dir, { recursive: true, force: true });
  });
  return dir;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

// Mirror of the module's normalizeUrl + candidateId so tests can assert the
// exact deterministic id a given URL must produce.
function expectedCandidateId(rawUrl) {
  const parsed = new URL(rawUrl);
  parsed.hash = "";
  parsed.search = "";
  const normalized = parsed.toString().replace(/\/$/, "");
  return `candidate-source-${sha256(normalized).slice(0, 12)}`;
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

const FRONTMATTER = "---\ntitle: Fixture\n---\n\nFixture body.\n";

async function makeArticle(dir, { year = "2020", slug = "demo-article", sources = [], extraArtifact = {} } = {}) {
  const articleDir = path.join(dir, "content", "articles", year, slug);
  await mkdir(articleDir, { recursive: true });
  await writeFile(path.join(articleDir, "article.md"), FRONTMATTER);
  await writeFile(path.join(articleDir, "agent.md"), FRONTMATTER);
  const artifact = {
    schemaVersion: 3,
    id: `article:${slug}`,
    slug,
    title: "Fixture",
    canonicalPath: `/articles/${slug}/`,
    status: "draft",
    maturity: "seed",
    topics: [],
    claims: [],
    sources,
    related: [],
    provenance: { createdAt: "2020-01-01", createdBy: "test", agents: [], reviews: [] },
    ...extraArtifact
  };
  const artifactPath = path.join(articleDir, "artifact.json");
  await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  return { articleDir, artifactPath };
}

async function makeCandidate(dir, { dateDir = "2020-01-01", id = "candidate-source-abc123abc123", fields = {} } = {}) {
  const candidateDir = path.join(dir, "content", "scout", "candidates", dateDir);
  await mkdir(candidateDir, { recursive: true });
  const candidate = {
    schemaVersion: 1,
    id,
    url: "https://example.com/paper",
    title: "Example Paper",
    type: "paper",
    accessed: "2020-01-01",
    status: "candidate",
    ...fields
  };
  const candidatePath = path.join(candidateDir, `${id}.json`);
  await writeFile(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
  return { candidatePath };
}

describe("create-workspace.mjs", () => {
  test("scaffolds a workspace whose artifact contentHash matches article.md", async (t) => {
    const dir = await tempDir(t);
    const result = await run(CREATE_WORKSPACE, ["my-topic", "--year", "2026", "--title", "My Topic"], { cwd: dir });
    assert.equal(result.code, 0, result.stderr);

    const articleDir = path.join(dir, "content", "articles", "2026", "my-topic");
    for (const rel of ["article.md", "agent.md", "artifact.json", "workspace/plan.md", "workspace/notes.md"]) {
      await readFile(path.join(articleDir, rel), "utf8"); // throws if missing
    }

    const articleRaw = await readFile(path.join(articleDir, "article.md"), "utf8");
    assert.match(articleRaw, /My Topic/);

    const artifact = await readJson(path.join(articleDir, "artifact.json"));
    assert.equal(artifact.slug, "my-topic");
    assert.equal(artifact.id, "article:my-topic");
    assert.deepEqual(artifact.topics, ["my-topic"]); // topic defaults to slug
    assert.equal(artifact.contentHash, sha256(articleRaw));
  });

  test("rejects invalid slugs and never writes anything", async (t) => {
    const dir = await tempDir(t);
    for (const slug of ["Bad_Slug", "../evil", "café", "UPPER", "with space", "dot.name"]) {
      const result = await run(CREATE_WORKSPACE, [slug, "--year", "2026"], { cwd: dir });
      assert.equal(result.code, 1, `slug ${slug} should fail`);
      assert.match(result.stderr, /Invalid slug/, `slug ${slug} should report the slug error`);
    }
    await assert.rejects(readFile(path.join(dir, "content", "articles", "2026", "x"), "utf8"), /ENOENT/);
  });

  test("enforces the YYYY year boundary: 0000/9999 valid, 5-digit and date-like invalid", async (t) => {
    const dir = await tempDir(t);
    for (const badYear of ["202", "10000", "abcd", "2026-02-30", " 2026"]) {
      const result = await run(CREATE_WORKSPACE, ["year-check", "--year", badYear, "--dry-run"], { cwd: dir });
      assert.equal(result.code, 1, `year ${badYear} should fail`);
      assert.match(result.stderr, /Invalid year/);
    }
    for (const goodYear of ["0000", "9999"]) {
      const result = await run(CREATE_WORKSPACE, ["year-check", "--year", goodYear, "--dry-run"], { cwd: dir });
      assert.equal(result.code, 0, `year ${goodYear} should be accepted: ${result.stderr}`);
    }
  });

  test("--dry-run prints the plan and writes nothing", async (t) => {
    const dir = await tempDir(t);
    const result = await run(CREATE_WORKSPACE, ["dry-topic", "--year", "2026", "--dry-run"], { cwd: dir });
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Dry run: would create workspace/);
    await assert.rejects(readFile(path.join(dir, "content"), "utf8"), /ENOENT/);
  });

  test("refuses to overwrite an existing workspace unless --force, and --force restores files", async (t) => {
    const dir = await tempDir(t);
    const first = await run(CREATE_WORKSPACE, ["dupe-topic", "--year", "2026"], { cwd: dir });
    assert.equal(first.code, 0, first.stderr);

    const second = await run(CREATE_WORKSPACE, ["dupe-topic", "--year", "2026"], { cwd: dir });
    assert.equal(second.code, 1);
    assert.match(second.stderr, /already exists/);

    const articlePath = path.join(dir, "content", "articles", "2026", "dupe-topic", "article.md");
    await writeFile(articlePath, "corrupted");
    const forced = await run(CREATE_WORKSPACE, ["dupe-topic", "--year", "2026", "--force"], { cwd: dir });
    assert.equal(forced.code, 0, forced.stderr);
    assert.match(await readFile(articlePath, "utf8"), /dupe-topic/);
  });

  test("--seed copies the seed file verbatim (plus newline) into workspace/notes.md", async (t) => {
    const dir = await tempDir(t);
    const seedPath = path.join(dir, "seed.md");
    const seedContent = "Seeded notes — café ☕\nsecond line";
    await writeFile(seedPath, seedContent);
    const result = await run(CREATE_WORKSPACE, ["seeded-topic", "--year", "2026", "--seed", seedPath], { cwd: dir });
    assert.equal(result.code, 0, result.stderr);
    const notes = await readFile(path.join(dir, "content", "articles", "2026", "seeded-topic", "workspace", "notes.md"), "utf8");
    assert.equal(notes, `${seedContent}\n`);
  });

  test("fails cleanly for an unreadable seed file", async (t) => {
    const dir = await tempDir(t);
    const result = await run(CREATE_WORKSPACE, ["seeded-topic", "--year", "2026", "--seed", path.join(dir, "nope.md")], { cwd: dir });
    assert.equal(result.code, 1);
    assert.match(result.stderr, /Cannot read seed file/);
    await assert.rejects(readFile(path.join(dir, "content"), "utf8"), /ENOENT/);
  });

  test("preserves non-ASCII title/dek in markdown and valid JSON artifact", async (t) => {
    const dir = await tempDir(t);
    const title = "Café ☕ — naïve façade";
    const result = await run(CREATE_WORKSPACE, ["unicode-topic", "--year", "2026", "--title", title, "--dek", "dék ☕"], { cwd: dir });
    assert.equal(result.code, 0, result.stderr);
    const articleDir = path.join(dir, "content", "articles", "2026", "unicode-topic");
    const artifact = await readJson(path.join(articleDir, "artifact.json")); // must still be valid JSON
    assert.equal(artifact.title, title);
    assert.match(await readFile(path.join(articleDir, "article.md"), "utf8"), /Café ☕/);
  });

  test("rejects unknown options and a missing slug with usage on stderr", async (t) => {
    const dir = await tempDir(t);
    const unknown = await run(CREATE_WORKSPACE, ["some-topic", "--bogus"], { cwd: dir });
    assert.equal(unknown.code, 1);
    assert.match(unknown.stderr, /Unknown option: --bogus/);

    const missing = await run(CREATE_WORKSPACE, [], { cwd: dir });
    assert.equal(missing.code, 1);
    assert.match(missing.stderr, /Usage:/);
  });

  test("concurrent scaffolds of different slugs all succeed intact", async (t) => {
    const dir = await tempDir(t);
    const slugs = ["race-a", "race-b", "race-c", "race-d"];
    const results = await Promise.all(
      slugs.map((slug) => run(CREATE_WORKSPACE, [slug, "--year", "2026"], { cwd: dir }))
    );
    for (const [index, result] of results.entries()) {
      assert.equal(result.code, 0, `${slugs[index]} failed: ${result.stderr}`);
      const articleRaw = await readFile(path.join(dir, "content", "articles", "2026", slugs[index], "article.md"), "utf8");
      const artifact = await readJson(path.join(dir, "content", "articles", "2026", slugs[index], "artifact.json"));
      assert.equal(artifact.contentHash, sha256(articleRaw));
    }
  });
});

describe("source-importer.mjs", () => {
  const HTML = (body) => `<!doctype html><html><head>${body}</head><body>page</body></html>`;

  function pageServer(routes) {
    return (req, res) => {
      const pathname = new URL(req.url, "http://x").pathname;
      const route = routes[pathname] ?? routes[pathname.replace(/\/$/, "")];
      if (!route) {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("not found");
        return;
      }
      res.writeHead(route.status ?? 200, { "content-type": route.contentType ?? "text/html; charset=utf-8" });
      res.end(route.body);
    };
  }

  async function candidateDirForToday(dir) {
    const today = new Date().toISOString().slice(0, 10);
    return path.join(dir, "content", "scout", "candidates", today);
  }

  test("imports an HTML page: extracts title/description and writes a deterministic candidate", async (t) => {
    const dir = await tempDir(t);
    const port = await startServer(
      t,
      pageServer({
        "/paper": {
          body: HTML(`<title>Attention Is\n   All   You Need</title><meta name="description" content="A  paper   about attention.">`)
        }
      })
    );
    const url = `http://127.0.0.1:${port}/paper`;
    const result = await run(SOURCE_IMPORTER, ["--value", url, "--kind", "url"], { cwd: dir });
    assert.equal(result.code, 0, result.stderr);

    const id = expectedCandidateId(url);
    const candidate = await readJson(path.join(await candidateDirForToday(dir), `${id}.json`));
    assert.equal(candidate.id, id);
    assert.match(candidate.id, /^candidate-source-[0-9a-f]{12}$/);
    assert.equal(candidate.title, "Attention Is All You Need"); // whitespace collapsed
    assert.equal(candidate.notes, "A  paper   about attention."); // description is trimmed, not collapsed
    assert.equal(candidate.url, url);
    assert.equal(candidate.type, "article"); // default type for web pages
    assert.equal(candidate.status, "candidate");
    assert.equal(candidate.accessed, new Date().toISOString().slice(0, 10));
    assert.deepEqual(candidate.input, { kind: "url", value: url });
  });

  test("uses the final URL as title for non-HTML content and keeps notes empty", async (t) => {
    const dir = await tempDir(t);
    const port = await startServer(
      t,
      pageServer({ "/file.txt": { contentType: "text/plain", body: "plain text body" } })
    );
    const url = `http://127.0.0.1:${port}/file.txt`;
    const result = await run(SOURCE_IMPORTER, [url], { cwd: dir });
    assert.equal(result.code, 0, result.stderr);
    const candidate = await readJson(path.join(await candidateDirForToday(dir), `${expectedCandidateId(url)}.json`));
    assert.equal(candidate.title, url);
    assert.equal(candidate.notes, "");
  });

  test("fails cleanly on HTTP errors and writes no candidate", async (t) => {
    const dir = await tempDir(t);
    const port = await startServer(t, pageServer({}));
    const result = await run(SOURCE_IMPORTER, [`http://127.0.0.1:${port}/missing`], { cwd: dir });
    assert.equal(result.code, 1);
    assert.match(result.stderr, /Fetch failed: 404/);
    await assert.rejects(readFile(path.join(dir, "content"), "utf8"), /ENOENT/);
  });

  test("preserves non-ASCII titles from UTF-8 pages", async (t) => {
    const dir = await tempDir(t);
    const port = await startServer(t, pageServer({ "/uni": { body: HTML("<title>Café — naïve ☕</title>") } }));
    const url = `http://127.0.0.1:${port}/uni`;
    const result = await run(SOURCE_IMPORTER, [url], { cwd: dir });
    assert.equal(result.code, 0, result.stderr);
    const candidate = await readJson(path.join(await candidateDirForToday(dir), `${expectedCandidateId(url)}.json`));
    assert.equal(candidate.title, "Café — naïve ☕");
  });

  test("URL normalization dedupes query/hash/trailing-slash variants into one candidate", async (t) => {
    const dir = await tempDir(t);
    const port = await startServer(t, pageServer({ "/page": { body: HTML("<title>Same Page</title>") } }));
    const variants = [
      `http://127.0.0.1:${port}/page?a=1#frag`,
      `http://127.0.0.1:${port}/page`,
      `http://127.0.0.1:${port}/page/`
    ];
    for (const variant of variants) {
      const result = await run(SOURCE_IMPORTER, [variant], { cwd: dir });
      assert.equal(result.code, 0, `${variant}: ${result.stderr}`);
    }
    const files = await readdir(await candidateDirForToday(dir));
    assert.deepEqual(files, [`${expectedCandidateId(`http://127.0.0.1:${port}/page`)}.json`]);
  });

  test("--dry-run prints the candidate JSON and writes nothing", async (t) => {
    const dir = await tempDir(t);
    const port = await startServer(t, pageServer({ "/dry": { body: HTML("<title>Dry</title>") } }));
    const result = await run(SOURCE_IMPORTER, [`http://127.0.0.1:${port}/dry`, "--dry-run"], { cwd: dir });
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Dry run: would write/);
    const printed = JSON.parse(result.stdout.slice(result.stdout.indexOf("{")));
    assert.equal(printed.title, "Dry");
    await assert.rejects(readFile(path.join(dir, "content"), "utf8"), /ENOENT/);
  });

  test("rejects malformed arxiv/doi/github identifiers before any network access", async (t) => {
    const dir = await tempDir(t);
    const cases = [
      [["--kind", "arxiv", "--value", "totally-not-an-id"], /Cannot parse arXiv ID/],
      [["--kind", "doi", "--value", "not-a-doi"], /Cannot parse DOI/],
      [["--kind", "github", "--value", "!!!"], /Cannot parse GitHub repo/]
    ];
    for (const [args, pattern] of cases) {
      const result = await run(SOURCE_IMPORTER, args, { cwd: dir });
      assert.equal(result.code, 1, args.join(" "));
      assert.match(result.stderr, pattern, args.join(" "));
    }
  });

  test("rejects an unknown --kind instead of silently treating it as a URL", async (t) => {
    const dir = await tempDir(t);
    // "2505.13246" is a valid arXiv-looking value; with kind "bogus" the module
    // must complain about the kind, not fall through to a URL fetch.
    const result = await run(SOURCE_IMPORTER, ["--kind", "bogus", "--value", "2505.13246"], { cwd: dir });
    assert.equal(result.code, 1);
    assert.match(result.stderr, /[Ii]nvalid kind/);
  });

  test("requires a value and rejects unknown options", async (t) => {
    const dir = await tempDir(t);
    const missing = await run(SOURCE_IMPORTER, [], { cwd: dir });
    assert.equal(missing.code, 1);
    assert.match(missing.stderr, /Usage:/);

    const unknown = await run(SOURCE_IMPORTER, ["https://example.com", "--bogus"], { cwd: dir });
    assert.equal(unknown.code, 1);
    assert.match(unknown.stderr, /Unknown option: --bogus/);
  });

  test("handles a bounded multi-megabyte HTML page without choking", async (t) => {
    const dir = await tempDir(t);
    const hugeBody = `${HTML("<title>Huge Page</title>")}${"<p>padding</p>".repeat(150_000)}`; // ~2 MB
    const port = await startServer(t, pageServer({ "/huge": { body: hugeBody } }));
    const url = `http://127.0.0.1:${port}/huge`;
    const result = await run(SOURCE_IMPORTER, [url], { cwd: dir });
    assert.equal(result.code, 0, result.stderr);
    const candidate = await readJson(path.join(await candidateDirForToday(dir), `${expectedCandidateId(url)}.json`));
    assert.equal(candidate.title, "Huge Page");
  });

  test("concurrent imports of distinct URLs all land; same URL stays a single valid file", async (t) => {
    const dir = await tempDir(t);
    const routes = {};
    for (let index = 0; index < 4; index += 1) {
      routes[`/p${index}`] = { body: HTML(`<title>Page ${index}</title>`) };
    }
    const port = await startServer(t, pageServer(routes));

    const distinct = await Promise.all(
      [0, 1, 2, 3].map((index) => run(SOURCE_IMPORTER, [`http://127.0.0.1:${port}/p${index}`], { cwd: dir }))
    );
    for (const result of distinct) assert.equal(result.code, 0, result.stderr);
    assert.equal((await readdir(await candidateDirForToday(dir))).length, 4);

    const same = await Promise.all(
      [0, 1].map(() => run(SOURCE_IMPORTER, [`http://127.0.0.1:${port}/p0`], { cwd: dir }))
    );
    for (const result of same) assert.equal(result.code, 0, result.stderr);
    const files = await readdir(await candidateDirForToday(dir));
    assert.equal(files.length, 4); // identical content, last write wins
    await readJson(path.join(await candidateDirForToday(dir), files.find((f) => f.includes(expectedCandidateId(`http://127.0.0.1:${port}/p0`)))));
  });
});

describe("promote-source.mjs", () => {
  test("promotes a candidate into the article ledger and marks it promoted", async (t) => {
    const dir = await tempDir(t);
    await makeArticle(dir, { year: "2020", slug: "demo-article" });
    const { candidatePath } = await makeCandidate(dir);

    const result = await run(PROMOTE_SOURCE, ["candidate-source-abc123abc123", "--article", "demo-article", "--year", "2020"], { cwd: dir });
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Promoted candidate-source-abc123abc123 to source-abc123abc123/);

    const artifact = await readJson(path.join(dir, "content", "articles", "2020", "demo-article", "artifact.json"));
    assert.deepEqual(artifact.sources, [
      {
        id: "source-abc123abc123",
        title: "Example Paper",
        url: "https://example.com/paper",
        type: "paper",
        accessed: "2020-01-01"
      }
    ]);

    const candidate = await readJson(candidatePath);
    assert.equal(candidate.status, "promoted");
  });

  test("routes by --year: default year misses, explicit year hits", async (t) => {
    const dir = await tempDir(t);
    await makeArticle(dir, { year: "2020", slug: "old-article" });
    await makeCandidate(dir);

    const defaultYear = await run(PROMOTE_SOURCE, ["candidate-source-abc123abc123", "--article", "old-article"], { cwd: dir });
    assert.equal(defaultYear.code, 1);
    assert.match(defaultYear.stderr, /Article not found/);

    const explicit = await run(PROMOTE_SOURCE, ["candidate-source-abc123abc123", "--article", "old-article", "--year", "2020"], { cwd: dir });
    assert.equal(explicit.code, 0, explicit.stderr);
  });

  test("reports candidate-not-found for unknown, malformed, or id-mismatched candidate files", async (t) => {
    const dir = await tempDir(t);
    await makeArticle(dir);

    // 1. No scout directory at all.
    const missingDir = await run(PROMOTE_SOURCE, ["candidate-source-abc123abc123", "--article", "demo-article", "--year", "2020"], { cwd: dir });
    assert.equal(missingDir.code, 1);
    assert.match(missingDir.stderr, /Candidate not found: candidate-source-abc123abc123/);

    // 2. Malformed JSON where the candidate file would live.
    const candidateDir = path.join(dir, "content", "scout", "candidates", "2020-01-01");
    await mkdir(candidateDir, { recursive: true });
    await writeFile(path.join(candidateDir, "candidate-source-broken00.json"), "{ not json");
    const broken = await run(PROMOTE_SOURCE, ["candidate-source-broken00", "--article", "demo-article", "--year", "2020"], { cwd: dir });
    assert.equal(broken.code, 1);
    assert.match(broken.stderr, /Candidate not found: candidate-source-broken00/);

    // 3. File name matches but the inner id does not (renamed/stale file).
    await makeCandidate(dir, { id: "candidate-source-outer999", fields: { id: "candidate-source-inner999" } });
    const mismatched = await run(PROMOTE_SOURCE, ["candidate-source-outer999", "--article", "demo-article", "--year", "2020"], { cwd: dir });
    assert.equal(mismatched.code, 1);
    assert.match(mismatched.stderr, /Candidate not found: candidate-source-outer999/);
  });

  test("a second promotion of the same source is refused without duplicating it", async (t) => {
    const dir = await tempDir(t);
    await makeArticle(dir);
    await makeCandidate(dir);

    const first = await run(PROMOTE_SOURCE, ["candidate-source-abc123abc123", "--article", "demo-article", "--year", "2020"], { cwd: dir });
    assert.equal(first.code, 0, first.stderr);
    const second = await run(PROMOTE_SOURCE, ["candidate-source-abc123abc123", "--article", "demo-article", "--year", "2020"], { cwd: dir });
    assert.equal(second.code, 1);
    assert.match(second.stderr, /already exists/);

    const artifact = await readJson(path.join(dir, "content", "articles", "2020", "demo-article", "artifact.json"));
    assert.equal(artifact.sources.filter((source) => source.id === "source-abc123abc123").length, 1);
  });

  test("rejects a path-traversal candidate id before touching the filesystem", async (t) => {
    const dir = await tempDir(t);
    await makeArticle(dir);
    // Plant a file that a "../" traversal could reach outside the date dir.
    const outsideDir = path.join(dir, "content", "scout", "candidates");
    await mkdir(outsideDir, { recursive: true });
    const outsidePath = path.join(outsideDir, "escape.json");
    await writeFile(outsidePath, JSON.stringify({ id: "../escape", title: "x" }));

    const result = await run(PROMOTE_SOURCE, ["../escape", "--article", "demo-article", "--year", "2020"], { cwd: dir });
    assert.equal(result.code, 1);
    assert.match(result.stderr, /[Ii]nvalid candidate id/);
    assert.equal((await readJson(outsidePath)).status, undefined); // untouched
    const artifact = await readJson(path.join(dir, "content", "articles", "2020", "demo-article", "artifact.json"));
    assert.equal(artifact.sources.length, 0);
  });

  test("requires candidate id and --article", async (t) => {
    const dir = await tempDir(t);
    const missing = await run(PROMOTE_SOURCE, [], { cwd: dir });
    assert.equal(missing.code, 1);
    assert.match(missing.stderr, /Usage:/);

    const noArticle = await run(PROMOTE_SOURCE, ["candidate-source-abc123abc123"], { cwd: dir });
    assert.equal(noArticle.code, 1);
    assert.match(noArticle.stderr, /Usage:/);
  });

  test("a malformed article artifact fails without corrupting the file", async (t) => {
    const dir = await tempDir(t);
    const { artifactPath } = await makeArticle(dir, { extraArtifact: { sources: null } });
    const before = await readFile(artifactPath, "utf8");
    await makeCandidate(dir);

    const result = await run(PROMOTE_SOURCE, ["candidate-source-abc123abc123", "--article", "demo-article", "--year", "2020"], { cwd: dir });
    assert.equal(result.code, 1);
    assert.equal(await readFile(artifactPath, "utf8"), before); // no partial write
  });

  test("concurrent promotions of the same candidate succeed exactly once", async (t) => {
    const dir = await tempDir(t);
    // Pad the artifact so the read-modify-write window is wide enough to make a
    // lost update near-certain without mutual exclusion.
    await makeArticle(dir, { extraArtifact: { padding: "x".repeat(4 * 1024 * 1024) } });
    await makeCandidate(dir);

    const results = await Promise.all([
      run(PROMOTE_SOURCE, ["candidate-source-abc123abc123", "--article", "demo-article", "--year", "2020"], { cwd: dir }),
      run(PROMOTE_SOURCE, ["candidate-source-abc123abc123", "--article", "demo-article", "--year", "2020"], { cwd: dir })
    ]);
    assert.deepEqual(results.map((r) => r.code).sort(), [0, 1], JSON.stringify(results.map((r) => r.stderr)));
    const artifact = await readJson(path.join(dir, "content", "articles", "2020", "demo-article", "artifact.json"));
    assert.equal(artifact.sources.filter((source) => source.id === "source-abc123abc123").length, 1);
  });

  test("concurrent promotions of different candidates never lose an update", async (t) => {
    const dir = await tempDir(t);
    await makeArticle(dir, { extraArtifact: { padding: "x".repeat(4 * 1024 * 1024) } });
    const ids = [];
    for (let index = 0; index < 6; index += 1) {
      const id = `candidate-source-race${String(index).padStart(5, "0")}`;
      ids.push(id);
      await makeCandidate(dir, { id, fields: { title: `Race ${index}` } });
    }

    const results = await Promise.all(
      ids.map((id) => run(PROMOTE_SOURCE, [id, "--article", "demo-article", "--year", "2020"], { cwd: dir }))
    );
    for (const result of results) assert.equal(result.code, 0, result.stderr);

    const artifact = await readJson(path.join(dir, "content", "articles", "2020", "demo-article", "artifact.json"));
    assert.equal(artifact.padding.length, 4 * 1024 * 1024); // unrelated fields survive intact
    assert.deepEqual(
      artifact.sources.map((source) => source.id).sort(),
      ids.map((id) => id.replace(/^candidate-/, "")).sort()
    );
    for (const id of ids) {
      const candidate = await readJson(path.join(dir, "content", "scout", "candidates", "2020-01-01", `${id}.json`));
      assert.equal(candidate.status, "promoted");
    }
  });

  test("atomic publish replaces a symlinked candidate file instead of writing through it (documents the module's symlink posture)", async (t) => {
    // promote-source writes via writeJson (temp file + rename). A rename
    // REPLACES the symlink rather than following it, so a symlinked candidate
    // can no longer redirect the status write to a file outside the garden.
    const dir = await tempDir(t);
    await makeArticle(dir);
    const outsideDir = path.join(dir, "outside");
    await mkdir(outsideDir, { recursive: true });
    const realPath = path.join(outsideDir, "candidate-source-sym123456.json");
    const candidate = {
      schemaVersion: 1,
      id: "candidate-source-sym123456",
      url: "https://example.com/sym",
      title: "Symlinked",
      type: "article",
      accessed: "2020-01-01",
      status: "candidate"
    };
    await writeFile(realPath, JSON.stringify(candidate));
    const linkDir = path.join(dir, "content", "scout", "candidates", "2020-01-01");
    await mkdir(linkDir, { recursive: true });
    const linkPath = path.join(linkDir, "candidate-source-sym123456.json");
    await symlink(realPath, linkPath);

    const result = await run(PROMOTE_SOURCE, ["candidate-source-sym123456", "--article", "demo-article", "--year", "2020"], { cwd: dir });
    assert.equal(result.code, 0, result.stderr);
    assert.equal((await readJson(linkPath)).status, "promoted"); // regular file at the link path
    assert.equal((await readJson(realPath)).status, "candidate"); // outside file untouched
  });
});
