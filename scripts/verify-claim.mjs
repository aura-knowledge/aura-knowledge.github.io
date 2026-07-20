import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadArticles, rootDir, writeJson } from "./lib/content-utils.mjs";

const STATUSES = new Set(["draft", "verified", "contested", "stale"]);
const PLACEHOLDER_SNIPPET = /evidence snippet pending/i;

function usage() {
  console.error(
    "Usage: node scripts/verify-claim.mjs --slug <slug> --claim <claim-NNN> --status <draft|verified|contested|stale> --reviewer <name> [--note <text>] [--date <YYYY-MM-DD>]"
  );
  process.exit(2);
}

function parseArgs(argv) {
  const args = {};
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) usage();
      args[key] = value;
      index += 1;
    } else {
      usage();
    }
  }
  return args;
}

const args = parseArgs(process.argv);
if (!args.slug || !args.claim || !args.status || !args.reviewer) usage();
if (!STATUSES.has(args.status)) {
  console.error(`Invalid status "${args.status}". Expected one of: ${Array.from(STATUSES).join(", ")}.`);
  process.exit(2);
}
const reviewedAt = args.date ?? new Date().toISOString().slice(0, 10);
if (
  !/^\d{4}-\d{2}-\d{2}$/.test(reviewedAt) ||
  Number.isNaN(new Date(reviewedAt).getTime()) ||
  new Date(reviewedAt).toISOString().slice(0, 10) !== reviewedAt
) {
  console.error(`Invalid date "${reviewedAt}". Expected a real YYYY-MM-DD date.`);
  process.exit(2);
}

const articles = await loadArticles();
const article = articles.find((entry) => entry.slug === args.slug);
if (!article) {
  console.error(`Article not found: ${args.slug}`);
  process.exit(1);
}

const artifactPath = path.join(rootDir, "content", "articles", String(article.year), article.slug, "artifact.json");
// Re-read the artifact immediately before modifying it. The full-garden load
// above takes long enough that a concurrent writer (another verify-claim run
// on a sibling claim, npm run generate) could have changed the file since;
// writing back the stale in-memory copy would silently drop those updates.
const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
const claim = artifact.claims.find((entry) => entry.id === args.claim);
if (!claim) {
  console.error(`Claim not found: ${args.slug} ${args.claim}`);
  process.exit(1);
}

function hasRealEvidence(candidate) {
  return candidate.evidence.some((packet) => {
    const snippet = (packet.snippet ?? "").trim();
    return snippet.length > 0 && !PLACEHOLDER_SNIPPET.test(snippet);
  });
}

if (args.status === "verified" && !hasRealEvidence(claim)) {
  console.error(
    `Refusing to mark ${args.slug} ${args.claim} verified: ${claim.evidence.length === 0 ? "the claim has no evidence packets" : "every evidence snippet is missing or a placeholder"}. Fill real evidence first.`
  );
  process.exit(1);
}

const previous = claim.verification ?? null;
claim.verification = {
  status: args.status,
  reviewedAt,
  reviewer: args.reviewer,
  ...(args.note ? { note: args.note } : {})
};

const today = new Date().toISOString().slice(0, 10);
if (artifact.updatedAt < today) {
  artifact.updatedAt = today;
}
await writeJson(artifactPath, artifact);

console.log(
  `${args.slug} ${args.claim}: verification ${previous ? `${previous.status} -> ${args.status}` : `(none) -> ${args.status}`} by ${args.reviewer} on ${reviewedAt}.`
);
console.log("Run npm run generate to refresh agent outputs.");
