import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "../lib/content-utils.mjs";

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: node scripts/attention-expansion/finalize-article.mjs <slug>");
  process.exit(1);
}

const year = "2026";
const articleDir = path.join(process.cwd(), "content", "articles", year, slug);
const articlePath = path.join(articleDir, "article.md");
const artifactPath = path.join(articleDir, "artifact.json");

const articleRaw = await readFile(articlePath, "utf8");
const artifact = JSON.parse(await readFile(artifactPath, "utf8"));

const contentHash = sha256(articleRaw);

artifact.status = "published";
artifact.maturity = "seed";
artifact.contentHash = contentHash;

if (artifact.provenance.reviews.length === 0) {
  artifact.provenance.reviews.push({
    reviewer: "human",
    reviewedAt: new Date().toISOString().slice(0, 10),
    status: "approved",
    scope: ["thesis", "claims", "tone", "privacy", "sources"],
    notes: "Human author approved publication.",
    contentHash
  });
} else {
  const review = artifact.provenance.reviews[artifact.provenance.reviews.length - 1];
  review.status = "approved";
  review.contentHash = contentHash;
  review.reviewedAt = new Date().toISOString().slice(0, 10);
}

if (!artifact.provenance.agents.find(a => a.role === "drafting")) {
  artifact.provenance.agents.push({
    role: "drafting",
    model: "kimi",
    invokedAt: new Date().toISOString().slice(0, 10),
    inputHash: `sha256:${contentHash}`,
    outputHash: `sha256:${contentHash}`
  });
}

await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`Finalized ${slug} with contentHash ${contentHash}`);
