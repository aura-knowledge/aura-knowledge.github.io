import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sha256, toPosix } from "./lib/content-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templateDir = path.join(__dirname, "templates", "workspace");
const rootDir = process.cwd();

function parseArgs(argv) {
  const args = {
    positional: []
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--year") {
      args.year = argv[index + 1];
      index += 1;
    } else if (arg === "--topic") {
      args.topic = argv[index + 1];
      index += 1;
    } else if (arg === "--title") {
      args.title = argv[index + 1];
      index += 1;
    } else if (arg === "--dek") {
      args.dek = argv[index + 1];
      index += 1;
    } else if (arg === "--summary") {
      args.summary = argv[index + 1];
      index += 1;
    } else if (arg === "--thesis") {
      args.thesis = argv[index + 1];
      index += 1;
    } else if (arg === "--seed") {
      args.seed = argv[index + 1];
      index += 1;
    } else if (arg === "--force") {
      args.force = true;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      args.positional.push(arg);
    }
  }

  return args;
}

function titleCase(slug) {
  return slug
    .split("-")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

async function findTemplateFiles(dir, relativePath = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryRelative = path.join(relativePath, entry.name);
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findTemplateFiles(entryPath, entryRelative)));
    } else {
      files.push({ relative: toPosix(entryRelative), absolute: entryPath });
    }
  }

  return files;
}

function fillTemplate(template, values) {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

async function main() {
  const args = parseArgs(process.argv);
  const slug = args.positional[0];

  if (!slug) {
    console.error(
      "Usage: npm run workspace:create -- <slug> [--year YYYY] [--topic topic-slug] [--title \"...\"] [--dek \"...\"] [--summary \"...\"] [--thesis \"...\"] [--seed <file>] [--force] [--dry-run]"
    );
    process.exit(1);
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    console.error(`Invalid slug: ${slug}. Use only lowercase letters, numbers, and hyphens.`);
    process.exit(1);
  }

  const year = args.year ?? new Date().getFullYear().toString();
  if (!/^\d{4}$/.test(year)) {
    console.error(`Invalid year: ${year}. Use YYYY format.`);
    process.exit(1);
  }

  const topic = args.topic ?? slug;
  if (!/^[a-z0-9-]+$/.test(topic)) {
    console.error(`Invalid topic: ${topic}. Use only lowercase letters, numbers, and hyphens.`);
    process.exit(1);
  }

  const titleBase = titleCase(slug);
  const title = args.title ?? `${titleBase} Article`;
  const dek =
    args.dek ??
    `A short description of the ${slug} article and what it aims to explore for readers and agents.`;
  const summary =
    args.summary ??
    `This article explores ${slug}, gathers evidence, records counterarguments, and produces a human-readable essay plus an agent-auditable artifact.`;
  const thesis =
    args.thesis ??
    `The topic of ${slug} is worth examining because it connects observable signals to a broader claim about how knowledge work and agentic systems are evolving.`;
  const date = new Date().toISOString().slice(0, 10);

  const targetDir = path.join(rootDir, "content", "articles", year, slug);

  try {
    const existing = await stat(targetDir);
    if (existing.isDirectory() && !args.force) {
      console.error(`Workspace already exists: ${targetDir}. Use --force to overwrite.`);
      process.exit(1);
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  const values = { slug, year, date, topic, title, dek, summary, thesis, contentHash: "PLACEHOLDER" };

  let seedContent = "";
  if (args.seed) {
    try {
      seedContent = await readFile(args.seed, "utf8");
    } catch (error) {
      console.error(`Cannot read seed file: ${args.seed}`);
      process.exit(1);
    }
  }

  const templateFiles = await findTemplateFiles(templateDir);
  const plannedWrites = [];

  for (const { relative, absolute } of templateFiles) {
    const rawTemplate = await readFile(absolute, "utf8");
    const filled = fillTemplate(rawTemplate, values);
    const targetPath = path.join(targetDir, relative);
    plannedWrites.push({ source: absolute, target: targetPath, content: filled });
  }

  if (args.dryRun) {
    console.log(`Dry run: would create workspace at ${toPosix(path.relative(rootDir, targetDir))}`);
    for (const { target } of plannedWrites) {
      console.log(`  - ${toPosix(path.relative(rootDir, target))}`);
    }
    return;
  }

  // Write everything except artifact.json first.
  const artifactWrite = plannedWrites.find((write) => write.target.endsWith("artifact.json"));
  const otherWrites = plannedWrites.filter((write) => write !== artifactWrite);

  for (const { target, content } of otherWrites) {
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }

  // Compute article.md hash now that article.md is written.
  const articlePath = path.join(targetDir, "article.md");
  const articleRaw = await readFile(articlePath, "utf8");
  const contentHash = sha256(articleRaw);

  // Fill artifact.json with the real hash.
  const artifactContent = fillTemplate(await readFile(artifactWrite.source, "utf8"), {
    ...values,
    contentHash
  });
  await mkdir(path.dirname(artifactWrite.target), { recursive: true });
  await writeFile(artifactWrite.target, artifactContent);

  // Optionally seed notes.md.
  if (seedContent) {
    const notesWrite = plannedWrites.find((write) => write.target.endsWith("workspace/notes.md"));
    const notesPath = notesWrite?.target ?? path.join(targetDir, "workspace", "notes.md");
    await writeFile(notesPath, `${seedContent}\n`);
  }

  console.log(`Created workspace at ${toPosix(path.relative(rootDir, targetDir))}`);
  console.log("Next steps:");
  console.log("  1. Edit workspace/plan.md, workspace/notes.md, and workspace/sources/");
  console.log("  2. Draft the article in article.md");
  console.log("  3. Update artifact.json claims, evidence, and provenance");
  console.log("  4. Run npm run generate");
  console.log("  5. Run npm run check");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
