import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "../lib/content-utils.mjs";

const slug = "attention-substance-ai-moment";
const year = "2026";
const articleDir = path.join(process.cwd(), "content", "articles", year, slug);
const articlePath = path.join(articleDir, "article.md");
const artifactPath = path.join(articleDir, "artifact.json");

const articleRaw = await readFile(articlePath, "utf8");
const artifact = JSON.parse(await readFile(artifactPath, "utf8"));

const relatedSlugs = [
  "the-attention-extraction",
  "by-the-numbers-what-indians-do-online",
  "the-reel-nation-short-form-video",
  "public-space-and-private-screens",
  "the-student-screen-education-vs-entertainment",
  "sleep-anxiety-and-tele-manas",
  "the-engagement-gap-productivity-india",
  "who-profits-advertising-foreign-platforms",
  "the-design-of-extraction",
  "trust-and-outrage-platforms-and-cohesion",
  "the-indic-language-internet-and-vernacular-feeds",
  "india-in-global-context",
  "historical-hinges-access-is-not-benefit",
  "the-green-revolution-trade-off",
  "tobacco-seatbelts-food-safety",
  "the-life-phase-thread",
  "the-jio-effect-cheap-data-access-behavior",
  "gender-and-the-attention-economy",
  "the-generational-bet",
  "what-ai-makes-cheap",
  "the-demographic-dividend-is-not-automatic",
  "what-india-is-building-vs-could-build",
  "the-creator-economys-incentive-trap",
  "ai-could-make-extraction-cheaper-too",
  "bhashini-and-the-indic-language-ai-moment",
  "the-compounding-bet",
  "historical-analogies-of-missed-transitions",
  "the-substance-builder",
  "the-small-rep-theory",
  "ai-as-journeyman-assistant",
  "the-students-garden",
  "the-workers-garden",
  "the-familys-garden",
  "the-citizens-garden",
  "failure-teaching-and-the-skill-stack",
  "designing-for-substance",
  "engagement-is-a-design-choice",
  "alternative-metrics-time-well-spent",
  "regulation-as-a-floor-dsa-it-rules-dpdp",
  "public-pressure-and-internal-accountability",
  "user-migration-and-the-exit-problem",
  "friction-chronological-feeds-user-chosen-algorithms",
  "business-models-that-reward-substance",
  "age-appropriate-design",
  "the-better-question",
  "a-map-of-levers",
  "product-ideas-that-could-shift-incentives",
  "open-questions-the-series-leaves-unresolved",
  "a-readers-guide-to-the-series",
  "attention-substance-ai-moment-tldr"
];

const related = relatedSlugs.map((s) => ({ type: "article", id: `article:${s}` }));
related.push({ type: "topic", id: "topic:attention-economy" });

artifact.related = related;

const contentHash = sha256(articleRaw);
artifact.contentHash = contentHash;
artifact.updatedAt = new Date().toISOString().slice(0, 10);

const review = artifact.provenance.reviews[artifact.provenance.reviews.length - 1];
review.status = "approved";
review.contentHash = contentHash;
review.reviewedAt = new Date().toISOString().slice(0, 10);
review.notes = "Updated series index to include all 50 series articles plus the TLDR summary.";

await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`Updated series index with ${relatedSlugs.length} related articles.`);
console.log(`New contentHash: ${contentHash}`);
