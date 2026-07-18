import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";

const baseDir = path.join(process.cwd(), "content", "articles", "2026");
const slugs = await readdir(baseDir);

for (const slug of slugs) {
  const articlePath = path.join(baseDir, slug, "article.md");
  try {
    const raw = await readFile(articlePath, "utf8");
    if (!raw.includes("Attention, Substance, and the AI Moment")) continue;
    // Replace kicker patterns like:
    // <p class="article-kicker">Attention, Substance, and the AI Moment · Part 3: The Diagnosis</p>
    // <p class="article-kicker">Attention, Substance, and the AI Moment · Part 6: Synthesis and Action</p>
    const updated = raw.replace(
      /<p class="article-kicker">Attention, Substance, and the AI Moment · Part (\d+): [^<]+<\/p>/g,
      '<p class="article-kicker">Attention, Substance, and the AI Moment · Part $1</p>'
    );
    if (updated !== raw) {
      await writeFile(articlePath, updated);
      console.log(`Updated kicker in ${slug}`);
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(`Error processing ${slug}: ${error.message}`);
    }
  }
}
