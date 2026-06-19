import { loadArticles, writeJson } from "./lib/content-utils.mjs";

const STATUS_MAP = {
  "publish-ready": "approved",
  "reviewed-with-agent-input": "approved",
  reviewed: "approved",
  approved: "approved",
  rejected: "rejected",
  changes: "requested-changes"
};

function mapReviewStatus(status) {
  return STATUS_MAP[status] ?? "commented";
}

const articles = await loadArticles();
let migratedCount = 0;

for (const article of articles) {
  const artifact = article.artifact;
  if (artifact.schemaVersion === 3) {
    continue;
  }

  if (artifact.schemaVersion !== 2) {
    console.warn(`Skipping ${article.year}/${article.slug}: unsupported schemaVersion ${artifact.schemaVersion}`);
    continue;
  }

  const humanReview = artifact.humanReview ?? {
    status: "commented",
    reviewedAt: artifact.updatedAt,
    reviewers: ["human author"],
    notes: "Migrated from legacy artifact without humanReview record."
  };

  artifact.provenance = {
    createdAt: artifact.publishedAt ?? artifact.updatedAt,
    createdBy: "human",
    agents: [],
    reviews: [
      {
        reviewer: "human",
        reviewedAt: humanReview.reviewedAt,
        status: mapReviewStatus(humanReview.status),
        scope: ["claims", "sources", "tone", "privacy"],
        notes: humanReview.notes ?? "",
        contentHash: article.contentHash
      }
    ],
    policy: {
      id: "policy:default",
      version: "1.0.0"
    }
  };

  delete artifact.humanReview;
  artifact.schemaVersion = 3;

  await writeJson(article.artifactPath, artifact);
  migratedCount += 1;
  console.log(`Migrated ${article.year}/${article.slug} to schemaVersion 3.`);
}

console.log(`Migrated ${migratedCount} artifact(s).`);
