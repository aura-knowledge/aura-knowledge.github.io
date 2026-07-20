import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";

export const rootDir = process.cwd();
export const contentRoot = path.join(rootDir, "content", "articles");
export const roadmapRoot = path.join(rootDir, "content", "roadmap");
export const publicRoot = path.join(rootDir, "public");

export function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

export function toDateString(value) {
  if (value instanceof Date || Object.prototype.toString.call(value) === "[object Date]") {
    // Take everything before the time component instead of a fixed 10-char slice:
    // years outside 0000-9999 serialize with a signed six-digit year ("+010000-01-01"),
    // which a fixed slice would truncate into a malformed date.
    return value.toISOString().split("T")[0];
  }

  return String(value).slice(0, 10);
}

export function normalizeDates(data) {
  const copy = { ...data };
  for (const key of ["date", "updated", "publishedAt", "updatedAt", "accessed", "reviewedAt"]) {
    if (copy[key]) {
      copy[key] = toDateString(copy[key]);
    }
  }
  return copy;
}

export function parseFrontmatter(raw, filePath) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    throw new Error(`Missing YAML frontmatter: ${filePath}`);
  }

  const loaded = yaml.load(match[1]) ?? {};
  if (typeof loaded !== "object" || Array.isArray(loaded)) {
    throw new Error(`Frontmatter must be a YAML mapping, got ${Array.isArray(loaded) ? "an array" : typeof loaded}: ${filePath}`);
  }

  return {
    data: normalizeDates(loaded),
    body: raw.slice(match[0].length)
  };
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new SyntaxError(`Invalid JSON in ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

export async function writeJson(filePath, data) {
  const serialized = JSON.stringify(data, null, 2);
  if (serialized === undefined) {
    throw new TypeError(`writeJson: value is not JSON-serializable (undefined, function, or symbol) for ${filePath}`);
  }
  await mkdir(path.dirname(filePath), { recursive: true });
  // Atomic publish: same-directory temp file + rename, so concurrent readers
  // never observe a torn (partially written) JSON document.
  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(tempPath, `${serialized}\n`);
    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
}

export async function findArticleDirs() {
  const years = await readdir(contentRoot, { withFileTypes: true });
  const dirs = [];

  for (const year of years) {
    if (!year.isDirectory()) continue;
    const yearDir = path.join(contentRoot, year.name);
    const slugs = await readdir(yearDir, { withFileTypes: true });
    for (const slug of slugs) {
      if (!slug.isDirectory()) continue;
      dirs.push(path.join(yearDir, slug.name));
    }
  }

  return dirs.sort();
}

export async function loadArticle(articleDir) {
  const year = path.basename(path.dirname(articleDir));
  const slug = path.basename(articleDir);
  const articlePath = path.join(articleDir, "article.md");
  const agentPath = path.join(articleDir, "agent.md");
  const artifactPath = path.join(articleDir, "artifact.json");

  const [articleRaw, agentRaw, artifact] = await Promise.all([
    readFile(articlePath, "utf8"),
    readFile(agentPath, "utf8"),
    readJson(artifactPath)
  ]);

  const articleMatter = parseFrontmatter(articleRaw, articlePath);
  const agentMatter = parseFrontmatter(agentRaw, agentPath);
  const sourcePath = toPosix(path.relative(rootDir, articlePath));
  const agentBriefPath = toPosix(path.relative(rootDir, agentPath));

  return {
    year,
    slug,
    articleDir,
    articlePath,
    agentPath,
    artifactPath,
    articleRaw,
    articleBody: articleMatter.body,
    agentRaw,
    agentBody: agentMatter.body,
    articleFrontmatter: articleMatter.data,
    agentFrontmatter: agentMatter.data,
    artifact,
    sourcePath,
    agentBriefPath,
    contentHash: sha256(articleRaw)
  };
}

export async function loadArticles() {
  const dirs = await findArticleDirs();
  return Promise.all(dirs.map((dir) => loadArticle(dir)));
}

export async function findRoadmapFiles() {
  try {
    const entries = await readdir(roadmapRoot, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => path.join(roadmapRoot, entry.name))
      .sort();
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export async function loadRoadmaps() {
  const files = await findRoadmapFiles();
  return Promise.all(
    files.map(async (filePath) => {
      const data = await readJson(filePath);
      return {
        ...data,
        sourcePath: toPosix(path.relative(rootDir, filePath)),
        filePath
      };
    })
  );
}
