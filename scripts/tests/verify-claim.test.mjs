import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const worktreeRoot = path.resolve(import.meta.dirname, "..", "..");
const verifyClaimPath = path.join(worktreeRoot, "scripts", "verify-claim.mjs");
const TODAY = new Date().toISOString().slice(0, 10);

async function tmpdir() {
  return mkdtemp(path.join(os.tmpdir(), "ak-verify-claim-"));
}

function claim(id, over = {}) {
  return {
    id,
    claim: `A sufficiently long claim text for ${id}.`,
    confidence: "medium",
    status: "core",
    evidence: [],
    counterevidence: [],
    ...over
  };
}

function realEvidence(over = {}) {
  return { sourceId: "source-a", snippet: "A real evidence snippet of adequate length.", supports: "direct", ...over };
}

async function makeGarden(dir, articles) {
  for (const { year = "2026", slug, claims, updatedAt = "2026-01-01", status = "published" } of articles) {
    const articleDir = path.join(dir, "content", "articles", year, slug);
    await mkdir(articleDir, { recursive: true });
    await writeFile(path.join(articleDir, "article.md"), `---\ntitle: ${slug}\nstatus: ${status}\n---\nBody.\n`);
    await writeFile(path.join(articleDir, "agent.md"), `---\nrole: tester\n---\nBrief.\n`);
    const artifact = {
      id: `article:${slug}`,
      title: slug,
      status,
      updatedAt,
      maturity: "seed",
      canonicalPath: `/articles/${slug}/`,
      topics: [],
      related: [],
      sources: [],
      claims
    };
    await writeFile(path.join(articleDir, "artifact.json"), JSON.stringify(artifact, null, 2) + "\n");
  }
}

function artifactPath(dir, slug, year = "2026") {
  return path.join(dir, "content", "articles", year, slug, "artifact.json");
}

async function readArtifact(dir, slug, year = "2026") {
  return JSON.parse(await readFile(artifactPath(dir, slug, year), "utf8"));
}

function runClaim(cwd, args) {
  const result = spawnSync(process.execPath, [verifyClaimPath, ...args], { cwd, encoding: "utf8", timeout: 30000 });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function spawnClaim(cwd, args) {
  const child = spawn(process.execPath, [verifyClaimPath, ...args], { cwd });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => (stdout += chunk));
  child.stderr.on("data", (chunk) => (stderr += chunk));
  const done = new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
  return { child, done };
}

const BASE_ARGS = (slug, claimId, extra = []) => ["--slug", slug, "--claim", claimId, "--status", "draft", "--reviewer", "r", ...extra];

describe("verify-claim happy path", () => {
  test("sets the verification object, bumps updatedAt, and reports the transition", async () => {
    const dir = await tmpdir();
    await makeGarden(dir, [{ slug: "alpha", claims: [claim("claim-001", { evidence: [realEvidence()] })] }]);
    const run = runClaim(dir, BASE_ARGS("alpha", "claim-001", ["--status", "verified", "--reviewer", "ada", "--date", "2026-06-15", "--note", "checked the source"]));
    assert.equal(run.status, 0, run.stderr);
    const artifact = await readArtifact(dir, "alpha");
    assert.deepEqual(artifact.claims[0].verification, {
      status: "verified",
      reviewedAt: "2026-06-15",
      reviewer: "ada",
      note: "checked the source"
    });
    assert.equal(artifact.updatedAt, TODAY);
    assert.match(run.stdout, /alpha claim-001: verification \(none\) -> verified by ada on 2026-06-15\./);
    const raw = await readFile(artifactPath(dir, "alpha"), "utf8");
    assert.ok(raw.endsWith("}\n"), "artifact stays newline-terminated JSON");
  });

  test("replaces an existing verification wholesale, dropping a stale note", async () => {
    const dir = await tmpdir();
    await makeGarden(dir, [
      {
        slug: "alpha",
        claims: [claim("claim-001", { verification: { status: "verified", reviewedAt: "2026-01-01", reviewer: "old", note: "stale note" } })]
      }
    ]);
    const run = runClaim(dir, BASE_ARGS("alpha", "claim-001", ["--status", "contested", "--reviewer", "bob"]));
    assert.equal(run.status, 0, run.stderr);
    const artifact = await readArtifact(dir, "alpha");
    assert.deepEqual(artifact.claims[0].verification, { status: "contested", reviewedAt: TODAY, reviewer: "bob" });
    assert.match(run.stdout, /verified -> contested/);
  });

  test("never rewinds a future updatedAt", async () => {
    const dir = await tmpdir();
    await makeGarden(dir, [{ slug: "alpha", updatedAt: "2099-01-01", claims: [claim("claim-001")] }]);
    const run = runClaim(dir, BASE_ARGS("alpha", "claim-001"));
    assert.equal(run.status, 0, run.stderr);
    assert.equal((await readArtifact(dir, "alpha")).updatedAt, "2099-01-01");
  });

  test("stores non-ASCII reviewer and note verbatim", async () => {
    const dir = await tmpdir();
    await makeGarden(dir, [{ slug: "alpha", claims: [claim("claim-001")] }]);
    const run = runClaim(dir, BASE_ARGS("alpha", "claim-001", ["--reviewer", "赵 ✓", "--note", "déjà vu — ✓"]));
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual((await readArtifact(dir, "alpha")).claims[0].verification, {
      status: "draft",
      reviewedAt: TODAY,
      reviewer: "赵 ✓",
      note: "déjà vu — ✓"
    });
  });
});

describe("verify-claim argument validation (exit 2)", () => {
  test("usage errors: missing flags, positional args, flag-like values", async () => {
    const dir = await tmpdir();
    await makeGarden(dir, [{ slug: "alpha", claims: [claim("claim-001")] }]);
    for (const args of [
      [],
      ["--slug", "alpha"],
      BASE_ARGS("alpha", "claim-001").concat(["stray-positional"]),
      ["--slug", "--claim", "claim-001"],
      ["--slug"]
    ]) {
      const run = runClaim(dir, args);
      assert.equal(run.status, 2, `args ${JSON.stringify(args)}: ${run.stderr}`);
      assert.match(run.stderr, /Usage: node scripts\/verify-claim\.mjs/);
    }
  });

  test("rejects a status outside the controlled vocabulary", async () => {
    const dir = await tmpdir();
    await makeGarden(dir, [{ slug: "alpha", claims: [claim("claim-001")] }]);
    const run = runClaim(dir, ["--slug", "alpha", "--claim", "claim-001", "--status", "confirmed", "--reviewer", "r"]);
    assert.equal(run.status, 2);
    assert.match(run.stderr, /Invalid status "confirmed"\. Expected one of: draft, verified, contested, stale\./);
  });

  test("rejects impossible and malformed dates", async () => {
    const dir = await tmpdir();
    await makeGarden(dir, [{ slug: "alpha", claims: [claim("claim-001")] }]);
    for (const bad of ["2026-02-30", "2026-13-01", "2026-00-10", "10000-01-01", "2026-1-05", "not-a-date", "2026-06-15x"]) {
      const run = runClaim(dir, BASE_ARGS("alpha", "claim-001", ["--date", bad]));
      assert.equal(run.status, 2, `date ${bad} should be rejected`);
      assert.match(run.stderr, new RegExp(`Invalid date "${bad.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
    }
    // The same strict real-date check accepts a legitimate boundary date.
    const ok = runClaim(dir, BASE_ARGS("alpha", "claim-001", ["--date", "0001-01-01"]));
    assert.equal(ok.status, 0, ok.stderr);
  });
});

describe("verify-claim lookup failures (exit 1)", () => {
  test("unknown slugs — including path-traversal attempts — write nothing", async () => {
    const dir = await tmpdir();
    await makeGarden(dir, [{ slug: "alpha", claims: [claim("claim-001")] }]);
    const before = await readFile(artifactPath(dir, "alpha"), "utf8");
    for (const slug of ["ghost", "../../etc", "../2026", "2026/alpha"]) {
      const run = runClaim(dir, BASE_ARGS(slug, "claim-001"));
      assert.equal(run.status, 1, `slug ${slug}`);
      assert.match(run.stderr, new RegExp(`Article not found: ${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
    assert.equal(await readFile(artifactPath(dir, "alpha"), "utf8"), before);
  });

  test("unknown claim id on a known slug", async () => {
    const dir = await tmpdir();
    await makeGarden(dir, [{ slug: "alpha", claims: [claim("claim-001")] }]);
    const run = runClaim(dir, BASE_ARGS("alpha", "claim-999"));
    assert.equal(run.status, 1);
    assert.match(run.stderr, /Claim not found: alpha claim-999/);
  });

  test("with duplicate slugs across years the lexicographically first article wins", async () => {
    const dir = await tmpdir();
    await makeGarden(dir, [
      { slug: "dup", year: "2024", claims: [claim("claim-001")] },
      { slug: "dup", year: "2025", claims: [claim("claim-001")] }
    ]);
    const run = runClaim(dir, BASE_ARGS("dup", "claim-001", ["--status", "stale"]));
    assert.equal(run.status, 0, run.stderr);
    assert.equal((await readArtifact(dir, "dup", "2024")).claims[0].verification.status, "stale");
    assert.equal((await readArtifact(dir, "dup", "2025")).claims[0].verification, undefined);
  });
});

describe("verify-claim verified gate", () => {
  async function gateRun(evidence) {
    const dir = await tmpdir();
    await makeGarden(dir, [{ slug: "alpha", claims: [claim("claim-001", { evidence })] }]);
    return { dir, run: runClaim(dir, BASE_ARGS("alpha", "claim-001", ["--status", "verified"])) };
  }

  test("refuses verified with zero evidence packets", async () => {
    const { run } = await gateRun([]);
    assert.equal(run.status, 1);
    assert.match(run.stderr, /the claim has no evidence packets/);
  });

  test("refuses verified when every snippet is a placeholder (case-insensitive)", async () => {
    const { run } = await gateRun([realEvidence({ snippet: "Evidence Snippet Pending" }), realEvidence({ snippet: "evidence snippet pending" })]);
    assert.equal(run.status, 1);
    assert.match(run.stderr, /every evidence snippet is missing or a placeholder/);
  });

  test("refuses verified when evidence packets have no real snippet at all (regression)", async () => {
    // Previously a missing/blank snippet was not the placeholder string, so the
    // every() check passed and the claim was marked verified with zero evidence text.
    const missing = await gateRun([{ sourceId: "source-a", supports: "direct" }]);
    assert.equal(missing.run.status, 1);
    assert.match(missing.run.stderr, /missing or a placeholder/);
    const blank = await gateRun([realEvidence({ snippet: "   " })]);
    assert.equal(blank.run.status, 1);
  });

  test("accepts verified when at least one snippet is real", async () => {
    const { run } = await gateRun([realEvidence({ snippet: "evidence snippet pending" }), realEvidence()]);
    assert.equal(run.status, 0, run.stderr);
  });

  test("the gate applies only to the verified status", async () => {
    const dir = await tmpdir();
    await makeGarden(dir, [{ slug: "alpha", claims: [claim("claim-001")] }]);
    const run = runClaim(dir, BASE_ARGS("alpha", "claim-001", ["--status", "contested"]));
    assert.equal(run.status, 0, run.stderr);
  });
});

describe("verify-claim write safety", () => {
  test("sequential runs on sibling claims accumulate both verifications", async () => {
    const dir = await tmpdir();
    await makeGarden(dir, [{ slug: "alpha", claims: [claim("claim-001", { evidence: [realEvidence()] }), claim("claim-002")] }]);
    const first = runClaim(dir, BASE_ARGS("alpha", "claim-001", ["--status", "verified", "--reviewer", "a"]));
    const second = runClaim(dir, BASE_ARGS("alpha", "claim-002", ["--status", "contested", "--reviewer", "b"]));
    assert.equal(first.status, 0, first.stderr);
    assert.equal(second.status, 0, second.stderr);
    const artifact = await readArtifact(dir, "alpha");
    assert.equal(artifact.claims[0].verification.status, "verified");
    assert.equal(artifact.claims[1].verification.status, "contested");
  });

  test("concurrent runs on different articles both succeed", async () => {
    const dir = await tmpdir();
    await makeGarden(dir, [
      { slug: "one", claims: [claim("claim-001")] },
      { slug: "two", claims: [claim("claim-001")] }
    ]);
    const [a, b] = await Promise.all([
      spawnClaim(dir, BASE_ARGS("one", "claim-001", ["--status", "stale"])).done,
      spawnClaim(dir, BASE_ARGS("two", "claim-001", ["--status", "contested"])).done
    ]);
    assert.equal(a.status, 0, a.stderr);
    assert.equal(b.status, 0, b.stderr);
    assert.equal((await readArtifact(dir, "one")).claims[0].verification.status, "stale");
    assert.equal((await readArtifact(dir, "two")).claims[0].verification.status, "contested");
  });

  test("a concurrent artifact write during the run is merged, not clobbered (regression)", async (t) => {
    // The child used to write back the artifact copy it loaded at start-up,
    // losing any concurrent update. artifact.json is a FIFO here so the parent
    // can deterministically interleave a concurrent write between the child's
    // initial load and its final write.
    let fifoAvailable = true;
    const dir = await tmpdir();
    const articleDir = path.join(dir, "content", "articles", "2026", "race");
    await mkdir(articleDir, { recursive: true });
    const fifo = artifactPath(dir, "race");
    try {
      execFileSync("mkfifo", [fifo]);
    } catch {
      fifoAvailable = false;
    }
    if (!fifoAvailable) {
      t.skip("mkfifo unavailable on this platform");
      return;
    }
    await writeFile(path.join(articleDir, "article.md"), "---\ntitle: race\nstatus: published\n---\nBody.\n");
    await writeFile(path.join(articleDir, "agent.md"), "---\nrole: tester\n---\nBrief.\n");

    const original = {
      id: "article:race",
      title: "race",
      status: "published",
      updatedAt: "2026-01-01",
      topics: [],
      related: [],
      sources: [],
      claims: [claim("claim-001"), claim("claim-002")]
    };
    const concurrent = structuredClone(original);
    concurrent.claims[1].verification = { status: "verified", reviewedAt: TODAY, reviewer: "concurrent" };

    const { child, done } = spawnClaim(dir, BASE_ARGS("race", "claim-001", ["--status", "contested", "--reviewer", "slow"]));

    // Each parent write rendezvous hands the child its next input. A FIFO
    // reader only sees EOF once the writer count hits zero, so the guard gap
    // lets the child close its first read handle before the second write
    // opens — otherwise both JSON documents would arrive concatenated. The
    // child's final write is atomic (temp file + rename over the FIFO), so
    // the result is read from the artifact path after the child exits.
    let step = 0;
    let failed = false;
    const orchestrate = (async () => {
      // Rendezvous 1: child reads artifact.json during loadArticles.
      step = 1;
      await writeFile(fifo, JSON.stringify(original, null, 2) + "\n");
      if (failed) return;
      await new Promise((resolve) => setTimeout(resolve, 500));
      // Rendezvous 2: the fixed child re-reads artifact.json right before
      // writing; serve it the concurrently-updated copy. A buggy child that
      // never re-reads leaves this write blocked and trips the timeout.
      step = 2;
      await writeFile(fifo, JSON.stringify(concurrent, null, 2) + "\n");
    })();

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("child never re-read the artifact (lost-update race present)")), 15000)
    );
    let run;
    try {
      run = await Promise.race([orchestrate.then(() => done), timeout]);
    } catch (error) {
      failed = true;
      child.kill("SIGKILL");
      // Release the blocked parent-side FIFO operation so nothing dangles.
      await readFile(fifo, "utf8").catch(() => {});
      await done.catch(() => {});
      assert.fail(error.message);
    }
    assert.equal(run.status, 0, run.stderr);
    const final = JSON.parse(await readFile(fifo, "utf8"));
    assert.equal(final.claims[0].verification.status, "contested", "child's own update is written");
    assert.equal(final.claims[0].verification.reviewer, "slow");
    assert.deepEqual(
      final.claims[1].verification,
      { status: "verified", reviewedAt: TODAY, reviewer: "concurrent" },
      "concurrent update to the sibling claim survives"
    );
    assert.equal(final.updatedAt, TODAY);
  });
});
