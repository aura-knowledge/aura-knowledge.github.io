import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";

const specPath = path.join(process.cwd(), "scripts", "attention-expansion", "articles-spec.json");
const spec = JSON.parse(await readFile(specPath, "utf8"));

const orderMap = new Map([
  ["attention-substance-ai-moment", 0],
  ["the-attention-extraction", 1],
  ["by-the-numbers-what-indians-do-online", 2],
  ["the-reel-nation-short-form-video", 3],
  ["public-space-and-private-screens", 4],
  ["the-student-screen-education-vs-entertainment", 5],
  ["sleep-anxiety-and-tele-manas", 6],
  ["the-engagement-gap-productivity-india", 7],
  ["who-profits-advertising-foreign-platforms", 8],
  ["the-design-of-extraction", 9],
  ["trust-and-outrage-platforms-and-cohesion", 10],
  ["the-indic-language-internet-and-vernacular-feeds", 11],
  ["india-in-global-context", 12],
  ["historical-hinges-access-is-not-benefit", 13],
  ["the-green-revolution-trade-off", 14],
  ["tobacco-seatbelts-food-safety", 15],
  ["the-life-phase-thread", 16],
  ["the-jio-effect-cheap-data-access-behavior", 17],
  ["gender-and-the-attention-economy", 18],
  ["the-generational-bet", 19],
  ["what-ai-makes-cheap", 20],
  ["the-demographic-dividend-is-not-automatic", 21],
  ["what-india-is-building-vs-could-build", 22],
  ["the-creator-economys-incentive-trap", 23],
  ["ai-could-make-extraction-cheaper-too", 24],
  ["bhashini-and-the-indic-language-ai-moment", 25],
  ["the-compounding-bet", 26],
  ["historical-analogies-of-missed-transitions", 27],
  ["the-substance-builder", 28],
  ["the-small-rep-theory", 29],
  ["ai-as-journeyman-assistant", 30],
  ["the-students-garden", 31],
  ["the-workers-garden", 32],
  ["the-familys-garden", 33],
  ["the-citizens-garden", 34],
  ["failure-teaching-and-the-skill-stack", 35],
  ["designing-for-substance", 36],
  ["engagement-is-a-design-choice", 37],
  ["alternative-metrics-time-well-spent", 38],
  ["regulation-as-a-floor-dsa-it-rules-dpdp", 39],
  ["public-pressure-and-internal-accountability", 40],
  ["user-migration-and-the-exit-problem", 41],
  ["friction-chronological-feeds-user-chosen-algorithms", 42],
  ["business-models-that-reward-substance", 43],
  ["age-appropriate-design", 44],
  ["the-better-question", 45],
  ["a-map-of-levers", 46],
  ["product-ideas-that-could-shift-incentives", 47],
  ["open-questions-the-series-leaves-unresolved", 48],
  ["a-readers-guide-to-the-series", 49]
]);

const existingSlugs = new Set(orderMap.keys());

const baseDir = path.join(process.cwd(), "content", "articles", "2026");
const slugs = await readdir(baseDir);

for (const slug of slugs) {
  const artifactPath = path.join(baseDir, slug, "artifact.json");
  try {
    const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
    if (!existingSlugs.has(slug)) continue;

    artifact.series = {
      slug: "attention-substance-ai-moment",
      title: "Attention, Substance, and the AI Moment",
      order: orderMap.get(slug),
      role: slug === "attention-substance-ai-moment" ? "guide" : "chapter"
    };

    await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
    console.log(`Set ${slug} to order ${orderMap.get(slug)}`);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(`Error processing ${slug}: ${error.message}`);
    }
  }
}
