import { readFile } from "node:fs/promises";
import path from "node:path";
import { readJson, sha256, toPosix, writeJson } from "./lib/content-utils.mjs";

function parseArgs(argv) {
  const args = {
    inputs: []
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--dir":
        args.dir = argv[index + 1];
        index += 1;
        break;
      case "--role":
        args.role = argv[index + 1];
        index += 1;
        break;
      case "--model":
        args.model = argv[index + 1];
        index += 1;
        break;
      case "--input":
        args.inputs.push(argv[index + 1]);
        index += 1;
        break;
      case "--output":
        args.output = argv[index + 1];
        index += 1;
        break;
      case "--invokedAt":
        args.invokedAt = argv[index + 1];
        index += 1;
        break;
      case "--notes":
        args.notes = argv[index + 1];
        index += 1;
        break;
      default:
        if (arg.startsWith("-")) {
          throw new Error(`Unknown option: ${arg}`);
        }
        break;
    }
  }

  return args;
}

function normalizeBuffer(value) {
  return value.replace(/\r\n/g, "\n");
}

async function hashFile(filePath) {
  const raw = await readFile(filePath, "utf8");
  return sha256(normalizeBuffer(raw));
}

function relativeInside(articleDir, filePath) {
  const absolute = path.isAbsolute(filePath) ? filePath : path.join(articleDir, filePath);
  const relative = path.relative(articleDir, absolute);
  if (relative.startsWith("..")) {
    throw new Error(`Path ${filePath} is outside article directory ${articleDir}`);
  }
  return toPosix(relative);
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.dir || !args.role || !args.model || args.inputs.length === 0 || !args.output) {
    console.error(
      "Usage: node scripts/record-agent-run.mjs --dir <article-dir> --role <role> --model <model> --input <file> [--input <file>] --output <file> [--invokedAt YYYY-MM-DD] [--notes <text>]"
    );
    process.exit(1);
  }

  const articleDir = path.resolve(args.dir);
  const artifactPath = path.join(articleDir, "artifact.json");
  const artifact = await readJson(artifactPath);

  if (artifact.schemaVersion !== 3) {
    throw new Error(`Artifact must use schemaVersion 3; found ${artifact.schemaVersion}`);
  }

  const invokedAt = args.invokedAt ?? new Date().toISOString().slice(0, 10);
  const outputRel = relativeInside(articleDir, args.output);
  const outputHash = await hashFile(path.join(articleDir, outputRel));

  const inputHashes = [];
  for (const input of args.inputs) {
    const inputRel = relativeInside(articleDir, input);
    const inputHash = await hashFile(path.join(articleDir, inputRel));
    inputHashes.push({ path: inputRel, hash: inputHash });
  }

  // Canonical inputHash is a hash of sorted path=hash pairs so order is stable.
  const inputHashPayload = inputHashes
    .sort((left, right) => left.path.localeCompare(right.path))
    .map(({ path: inputPath, hash }) => `${inputPath}=${hash}`)
    .join("\n");
  const inputHash = sha256(inputHashPayload);

  artifact.provenance.agents.push({
    role: args.role,
    model: args.model,
    invokedAt,
    inputHash: `sha256:${inputHash}`,
    outputHash: `sha256:${outputHash}`,
    ...(args.notes ? { notes: args.notes } : {})
  });

  await writeJson(artifactPath, artifact);
  console.log(
    `Recorded ${args.role} run for ${outputRel} with inputHash sha256:${inputHash} and outputHash sha256:${outputHash}.`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
