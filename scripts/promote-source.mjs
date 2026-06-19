import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { loadArticles, readJson, toPosix, writeJson } from "./lib/content-utils.mjs";

const rootDir = process.cwd();
const scoutDir = path.join(rootDir, "content", "scout", "candidates");

function parseArgs(argv) {
  const args = { positional: [] };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--article") {
      args.article = argv[index + 1];
      index += 1;
    } else if (arg === "--year") {
      args.year = argv[index + 1];
      index += 1;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      args.positional.push(arg);
    }
  }
  return args;
}

async function findCandidate(candidateId) {
  let dateDirs = [];
  try {
    const entries = await readdir(scoutDir, { withFileTypes: true });
    dateDirs = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  for (const dateDir of dateDirs) {
    const candidatePath = path.join(scoutDir, dateDir, `${candidateId}.json`);
    try {
      const candidate = await readJson(candidatePath);
      if (candidate.id === candidateId) {
        return { candidate, candidatePath };
      }
    } catch {
      // ignore missing files
    }
  }

  return null;
}

async function main() {
  const args = parseArgs(process.argv);
  const candidateId = args.positional[0];

  if (!candidateId || !args.article) {
    console.error(
      "Usage: npm run source:promote -- <candidate-id> --article <slug> [--year YYYY]"
    );
    process.exit(1);
  }

  const found = await findCandidate(candidateId);
  if (!found) {
    console.error(`Candidate not found: ${candidateId}`);
    process.exit(1);
  }

  const { candidate, candidatePath } = found;
  const articles = await loadArticles();
  const year = args.year ?? new Date().getFullYear().toString();
  const article = articles.find((a) => a.year === year && a.slug === args.article);

  if (!article) {
    console.error(`Article not found: ${year}/${args.article}`);
    process.exit(1);
  }

  const sourceId = candidate.id.replace(/^candidate-/, "");
  if (article.artifact.sources.some((source) => source.id === sourceId)) {
    console.error(`Source ${sourceId} already exists in ${year}/${args.article}.`);
    process.exit(1);
  }

  article.artifact.sources.push({
    id: sourceId,
    title: candidate.title,
    url: candidate.url,
    type: candidate.type,
    accessed: candidate.accessed
  });

  await writeJson(article.artifactPath, article.artifact);

  candidate.status = "promoted";
  await writeJson(candidatePath, candidate);

  console.log(`Promoted ${candidate.id} to ${sourceId} in ${year}/${args.article}.`);
  console.log(`Run npm run generate to refresh public packets.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
