import { mkdir, readdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { loadArticles, readJson, toPosix, writeJson } from "./lib/content-utils.mjs";

const rootDir = process.cwd();
const scoutDir = path.join(rootDir, "content", "scout", "candidates");
const CANDIDATE_ID_PATTERN = /^[a-z0-9-]+$/;

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

// mkdir is atomic on all supported platforms, so it doubles as a lock acquire.
// Stale locks (interrupted process) are broken after 30s; acquisition gives up
// after 15s so a wedged lock fails loudly instead of hanging forever.
async function acquireArtifactLock(artifactPath) {
  const lockPath = `${artifactPath}.lock`;
  const startedAt = Date.now();
  for (;;) {
    try {
      await mkdir(lockPath);
      return async () => {
        await rm(lockPath, { recursive: true, force: true });
      };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      try {
        const info = await stat(lockPath);
        if (Date.now() - info.mtimeMs > 30000) {
          await rm(lockPath, { recursive: true, force: true });
          continue;
        }
      } catch {
        // Lock vanished between the checks; retry.
      }
      if (Date.now() - startedAt > 15000) {
        throw new Error(
          `Timed out waiting for the promote lock at ${lockPath}. Remove it if a previous run was interrupted.`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
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

  if (!CANDIDATE_ID_PATTERN.test(candidateId)) {
    console.error(`Invalid candidate id: ${candidateId}. Use lowercase letters, numbers, and hyphens only.`);
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

  // Serialize the check-and-append against other promote processes; without
  // this, concurrent runs read the same artifact and lose each other's sources.
  const release = await acquireArtifactLock(article.artifactPath);
  let alreadyExists = false;
  try {
    // Re-read inside the lock so the duplicate check sees the latest state.
    const freshArtifact = await readJson(article.artifactPath);
    if (freshArtifact.sources.some((source) => source.id === sourceId)) {
      alreadyExists = true;
    } else {
      freshArtifact.sources.push({
        id: sourceId,
        title: candidate.title,
        url: candidate.url,
        type: candidate.type,
        accessed: candidate.accessed
      });
      await writeJson(article.artifactPath, freshArtifact);
    }
  } finally {
    await release();
  }

  if (alreadyExists) {
    console.error(`Source ${sourceId} already exists in ${year}/${args.article}.`);
    process.exit(1);
  }

  candidate.status = "promoted";
  await writeJson(candidatePath, candidate);

  console.log(`Promoted ${candidate.id} to ${sourceId} in ${year}/${args.article}.`);
  console.log(`Run npm run generate to refresh public packets.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
