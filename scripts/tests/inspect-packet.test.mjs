import { after, describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile, spawnSync } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const SCRIPT = fileURLToPath(new URL("../inspect-packet.mjs", import.meta.url));

const ALPHA_PACKET = {
  id: "article:alpha",
  slug: "alpha",
  title: "Alpha Article",
  status: "published",
  maturity: "seed",
  topics: ["product-truth"],
  thesis: "Alpha thesis statement.",
  articleUrl: "https://example.test/articles/alpha/",
  tokenEstimate: 42,
  claims: [
    {
      id: "claim-001",
      claim: "Alpha claim one.",
      confidence: "high",
      status: "core",
      evidence: [
        { sourceId: "source-one", snippet: "Alpha evidence one." },
        { sourceId: "source-two", snippet: "Alpha evidence two." }
      ],
      counterevidence: [{ sourceId: "source-two", summary: "Alpha counter qualification." }]
    }
  ],
  sources: [
    { id: "source-one", title: "Source One", type: "paper", url: "https://example.test/one" },
    { id: "source-two", title: "Source Two", type: "report", url: "https://example.test/two" }
  ]
};

const BETA_PACKET = {
  id: "article:beta",
  slug: "beta",
  title: "Bêta Article ☕",
  status: "published",
  maturity: "sprout",
  topics: ["agent-ops"],
  thesis: "Beta thesis statement.",
  articleUrl: "https://example.test/articles/beta/",
  claims: [
    {
      id: "claim-001",
      claim: "Beta claim one.",
      confidence: "low",
      status: "risk",
      evidence: [],
      counterevidence: [{ sourceId: "source-one", summary: "Beta contests source-one." }]
    }
  ],
  sources: [
    { id: "source-one", title: "Source One", type: "paper", url: "https://example.test/one" }
  ]
};

const NODES = [
  { id: "article:alpha", type: "article", label: "Alpha Article" },
  { id: "topic:product-truth", type: "topic", label: "product-truth" }
  // article:beta deliberately absent: exercises the label fallback.
];

const EDGES = {
  edges: [
    { from: "article:alpha", to: "topic:product-truth", type: "covers" },
    { from: "article:beta", to: "article:alpha", type: "supports" }
  ]
};

async function writeGarden(dir) {
  await fs.mkdir(path.join(dir, "content", "articles"), { recursive: true });
  await fs.mkdir(path.join(dir, "public", "agents", "articles"), { recursive: true });
  await fs.mkdir(path.join(dir, "public", "graph"), { recursive: true });
  const write = (relative, value) =>
    fs.writeFile(
      path.join(dir, relative),
      typeof value === "string" ? value : JSON.stringify(value)
    );
  await write("public/agents/index.json", {
    site: "https://example.test",
    base: "",
    articles: [
      { id: "article:alpha", slug: "alpha", agentJsonPath: "/agents/articles/alpha.json" },
      { id: "article:beta", slug: "beta", agentJsonPath: "/agents/articles/beta.json" }
    ]
  });
  await write("public/agents/verification-report.json", {
    articles: [
      { slug: "alpha", claims: [] },
      { slug: "beta", claims: [] }
    ]
  });
  await write("public/agents/articles/alpha.json", ALPHA_PACKET);
  await write("public/agents/articles/beta.json", BETA_PACKET);
  await write("public/graph/nodes.json", NODES);
  await write("public/graph/edges.json", EDGES);
}

async function makeGarden(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "inspect-packet-"));
  t.after(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });
  await writeGarden(dir);
  return dir;
}

// Shared fixture for the read-only majority of tests.
const sharedDir = await fs.mkdtemp(path.join(os.tmpdir(), "inspect-packet-shared-"));
await writeGarden(sharedDir);
after(async () => {
  await fs.rm(sharedDir, { recursive: true, force: true });
});

function run(args, cwd = sharedDir) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: "utf8" });
}

describe("argument validation", () => {
  test("--help exits 0 and prints usage", () => {
    const result = run(["--help"]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Usage: node scripts\/inspect-packet\.mjs/);
  });

  test("no arguments exits 1 with mode guidance", () => {
    const result = run([]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Specify one of --article, --claim, --source, or --graph-slice/);
    assert.equal(result.stdout, "");
  });

  test("conflicting modes exit 1", () => {
    const result = run(["--article", "alpha", "--source", "source-one"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /only one inspection mode/);
  });

  test("invalid format exits 1", () => {
    const result = run(["--article", "alpha", "--format", "yaml"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Invalid format: yaml/);
  });

  test("unknown argument exits 1", () => {
    const result = run(["--bogus"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unknown argument: --bogus/);
  });

  test("--claim requires exactly slug:claimId — missing or extra segments are rejected, not truncated", () => {
    for (const value of ["alpha", "alpha:claim-001:junk"]) {
      const result = run(["--claim", value]);
      assert.equal(result.status, 1, value);
      assert.match(result.stderr, /--claim must be in the form slug:claimId/, value);
    }
  });
});

describe("--article mode", () => {
  test("known article prints a JSON slice with counts", () => {
    const result = run(["--article", "alpha"]);
    assert.equal(result.status, 0, result.stderr);
    const slice = JSON.parse(result.stdout);
    assert.equal(slice.id, "article:alpha");
    assert.equal(slice.claimCount, 1);
    assert.equal(slice.sourceCount, 2);
    assert.deepEqual(slice.claims, [
      { id: "claim-001", claim: "Alpha claim one.", confidence: "high", status: "core" }
    ]);
    assert.equal(slice.sources.length, 2);
    assert.ok(!("evidence" in slice.claims[0]), "article slice stays compact");
  });

  test("unknown article exits 1 with a clean message", () => {
    const result = run(["--article", "ghost"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Article not found: ghost/);
  });

  test("markdown format renders the header fields", () => {
    const result = run(["--article", "alpha", "--format", "markdown"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^# Alpha Article/);
    assert.match(result.stdout, /- \*\*Claims:\*\* 1/);
    assert.match(result.stdout, /- \*\*Sources:\*\* 2/);
  });

  test("non-ASCII titles survive the JSON round trip", () => {
    const result = run(["--article", "beta"]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).title, "Bêta Article ☕");
  });
});

describe("--claim mode", () => {
  test("known claim prints composite id and evidence detail", () => {
    const result = run(["--claim", "alpha:claim-001"]);
    assert.equal(result.status, 0, result.stderr);
    const slice = JSON.parse(result.stdout);
    assert.equal(slice.claimId, "article:alpha:claim-001");
    assert.equal(slice.localClaimId, "claim-001");
    assert.equal(slice.evidence.length, 2);
    assert.equal(slice.counterevidence.length, 1);
  });

  test("unknown claim id in a known article exits 1", () => {
    const result = run(["--claim", "alpha:claim-999"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Claim not found: claim-999/);
  });

  test("claim in an unknown article exits 1", () => {
    const result = run(["--claim", "ghost:claim-001"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Article not found: ghost/);
  });

  test("markdown format counts packets", () => {
    const result = run(["--claim", "alpha:claim-001", "--format", "markdown"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /\*\*Evidence packets:\*\* 2/);
    assert.match(result.stdout, /\*\*Counterevidence packets:\*\* 1/);
  });
});

describe("--source mode", () => {
  test("a source cited by two articles reports both occurrences with claim roles", () => {
    const result = run(["--source", "source-one"]);
    assert.equal(result.status, 0, result.stderr);
    const slice = JSON.parse(result.stdout);
    assert.equal(slice.sourceId, "source-one");
    assert.equal(slice.occurrences.length, 2);
    const [alpha, beta] = slice.occurrences;
    assert.equal(alpha.slug, "alpha");
    assert.deepEqual(alpha.supportingClaimIds, ["article:alpha:claim-001"]);
    assert.deepEqual(alpha.contestingClaimIds, []);
    assert.equal(beta.slug, "beta");
    assert.deepEqual(beta.supportingClaimIds, []);
    assert.deepEqual(beta.contestingClaimIds, ["article:beta:claim-001"]);
  });

  test("a claim citing the same source in evidence and counterevidence appears in both lists", () => {
    const result = run(["--source", "source-two"]);
    assert.equal(result.status, 0, result.stderr);
    const [occurrence] = JSON.parse(result.stdout).occurrences;
    assert.deepEqual(occurrence.supportingClaimIds, ["article:alpha:claim-001"]);
    assert.deepEqual(occurrence.contestingClaimIds, ["article:alpha:claim-001"]);
  });

  test("unknown source exits 1", () => {
    const result = run(["--source", "source-ghost"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Source not found: source-ghost/);
  });

  test("markdown format renders one section per occurrence", () => {
    const result = run(["--source", "source-one", "--format", "markdown"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /# source-one/);
    assert.match(result.stdout, /## alpha/);
    assert.match(result.stdout, /## beta/);
  });
});

describe("--graph-slice mode", () => {
  test("known node lists outgoing and incoming edges with labels", () => {
    const result = run(["--graph-slice", "article:alpha"]);
    assert.equal(result.status, 0, result.stderr);
    const slice = JSON.parse(result.stdout);
    assert.deepEqual(slice.node, { id: "article:alpha", type: "article", label: "Alpha Article" });
    assert.deepEqual(slice.outgoing, [
      { type: "covers", nodeId: "topic:product-truth", label: "product-truth" }
    ]);
    assert.deepEqual(slice.incoming, [
      // article:beta is not in nodes.json, so the label falls back to the raw id.
      { type: "supports", nodeId: "article:beta", label: "article:beta" }
    ]);
  });

  test("unknown node exits 1", () => {
    const result = run(["--graph-slice", "article:ghost"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Graph node not found: article:ghost/);
  });

  test("markdown format renders direction sections", () => {
    const result = run(["--graph-slice", "article:alpha", "--format", "markdown"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /# article:alpha/);
    assert.match(result.stdout, /## Outgoing/);
    assert.match(result.stdout, /- covers → topic:product-truth/);
    assert.match(result.stdout, /## Incoming/);
    assert.match(result.stdout, /- supports ← article:beta/);
  });
});

describe("corrupted on-disk state", () => {
  test("malformed article packet JSON exits 1 without partial stdout", async (t) => {
    const dir = await makeGarden(t);
    await fs.writeFile(path.join(dir, "public", "agents", "articles", "alpha.json"), "{ broken");
    const result = run(["--article", "alpha"], dir);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.ok(result.stderr.length > 0);
  });

  test("malformed verification-report exits 1 with regeneration guidance", async (t) => {
    const dir = await makeGarden(t);
    await fs.writeFile(
      path.join(dir, "public", "agents", "verification-report.json"),
      "definitely not json"
    );
    const result = run(["--article", "alpha"], dir);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Cannot serve verification data/);
    assert.match(result.stderr, /npm run generate/);
  });
});

describe("concurrent invocations", () => {
  test("parallel read-only inspections all succeed with identical output", async () => {
    const runs = await Promise.all(
      Array.from({ length: 4 }, () =>
        execFileAsync(process.execPath, [SCRIPT, "--article", "alpha"], { cwd: sharedDir })
      )
    );
    for (const { stdout, stderr } of runs) {
      assert.equal(stderr, "");
      assert.equal(stdout, runs[0].stdout);
    }
    assert.ok(JSON.parse(runs[0].stdout).claimCount === 1);
  });
});
