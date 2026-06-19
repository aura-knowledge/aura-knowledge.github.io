import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sha256, toPosix, writeJson } from "./lib/content-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = process.cwd();

function parseArgs(argv) {
  const args = {};
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--kind") {
      args.kind = argv[index + 1];
      index += 1;
    } else if (arg === "--value") {
      args.value = argv[index + 1];
      index += 1;
    } else if (arg === "--type") {
      args.type = argv[index + 1];
      index += 1;
    } else if (arg === "--title") {
      args.title = argv[index + 1];
      index += 1;
    } else if (arg === "--notes") {
      args.notes = argv[index + 1];
      index += 1;
    } else if (arg === "--output-dir") {
      args.outputDir = argv[index + 1];
      index += 1;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (!args.value) {
      args.value = arg;
    }
  }
  return args;
}

function detectKind(value) {
  if (/^\d{4}\.\d{4,5}(v\d+)?$/.test(value) || /arxiv\.org\/abs\/\d{4}\.\d{4,5}/.test(value)) {
    return "arxiv";
  }
  if (/^10\.\d{4,}\/.+$/i.test(value) || /doi\.org\/10\.\d{4,}\//i.test(value)) {
    return "doi";
  }
  if (/^github\.com\/[\w-]+\/[\w-]+/.test(value) || /^[\w-]+\/[\w-]+$/.test(value)) {
    return "github";
  }
  return "url";
}

function extractArxivId(value) {
  const match = value.match(/(\d{4}\.\d{4,5})(v\d+)?/);
  return match?.[1];
}

function normalizeDoi(value) {
  const match = value.match(/(10\.\d{4,}\/.+)/i);
  return match?.[1]?.toLowerCase();
}

function parseGithubRepo(value) {
  const match = value.match(/(?:github\.com\/)?([\w-]+)\/([\w-]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

async function fetchUrl(value) {
  const response = await fetch(value, {
    headers: { "User-Agent": "AuraKnowledgeSourceImporter/1.0" }
  });
  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
  }
  const finalUrl = response.url;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    return { url: finalUrl, title: finalUrl, description: "" };
  }
  const text = await response.text();
  const titleMatch = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1]?.replace(/\s+/g, " ")?.trim() ?? finalUrl;
  const descMatch = text.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    ?? text.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  const description = descMatch?.[1]?.trim() ?? "";
  return { url: finalUrl, title, description };
}

async function fetchArxiv(value) {
  const id = extractArxivId(value);
  if (!id) {
    throw new Error(`Cannot parse arXiv ID from ${value}`);
  }
  const response = await fetch(`https://export.arxiv.org/api/query?id_list=${id}`);
  if (!response.ok) {
    throw new Error(`arXiv API failed: ${response.status}`);
  }
  const text = await response.text();
  const entryMatch = text.match(/<entry>[\s\S]*?<\/entry>/);
  const entry = entryMatch?.[0] ?? "";
  const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
  const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
  const title = titleMatch?.[1]?.replace(/\s+/g, " ")?.trim() ?? `arXiv:${id}`;
  const description = summaryMatch?.[1]?.replace(/\s+/g, " ")?.trim() ?? "";
  return {
    url: `https://arxiv.org/abs/${id}`,
    title,
    description,
    type: "paper"
  };
}

async function fetchDoi(value) {
  const doi = normalizeDoi(value);
  if (!doi) {
    throw new Error(`Cannot parse DOI from ${value}`);
  }
  const response = await fetch(`https://doi.org/${encodeURIComponent(doi)}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "AuraKnowledgeSourceImporter/1.0"
    },
    redirect: "follow"
  });
  if (!response.ok) {
    throw new Error(`DOI resolution failed: ${response.status}`);
  }
  const data = await response.json();
  const title = data.title?.[0]
    ?? data.message?.title?.[0]
    ?? data.message?.["container-title"]?.[0]
    ?? `DOI:${doi}`;
  const description = data.abstract
    ?? data.message?.abstract
    ?? "";
  return {
    url: `https://doi.org/${doi}`,
    title: String(title).replace(/\s+/g, " ").trim(),
    description: String(description).replace(/\s+/g, " ").trim(),
    type: "article"
  };
}

async function fetchGithub(value) {
  const repo = parseGithubRepo(value);
  if (!repo) {
    throw new Error(`Cannot parse GitHub repo from ${value}`);
  }
  const apiUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}`;
  const response = await fetch(apiUrl, {
    headers: { "User-Agent": "AuraKnowledgeSourceImporter/1.0" }
  });
  if (!response.ok) {
    return {
      url: `https://github.com/${repo.owner}/${repo.repo}`,
      title: `${repo.owner}/${repo.repo}`,
      description: "",
      type: "repository"
    };
  }
  const data = await response.json();
  return {
    url: data.html_url ?? `https://github.com/${repo.owner}/${repo.repo}`,
    title: data.full_name ?? `${repo.owner}/${repo.repo}`,
    description: data.description ?? "",
    type: "repository"
  };
}

async function resolveInput(kind, value) {
  switch (kind) {
    case "arxiv":
      return fetchArxiv(value);
    case "doi":
      return fetchDoi(value);
    case "github":
      return fetchGithub(value);
    default:
      return fetchUrl(value);
  }
}

function candidateId(url) {
  const hash = sha256(normalizeUrl(url)).slice(0, 12);
  return `candidate-source-${hash}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.value) {
    console.error(
      "Usage: npm run source:import -- <value> [--kind url|arxiv|doi|github] [--type <source-type>] [--title \"...\"] [--notes \"...\"] [--output-dir <dir>] [--dry-run]"
    );
    process.exit(1);
  }

  const kind = args.kind ?? detectKind(args.value);
  const resolved = await resolveInput(kind, args.value);
  const url = normalizeUrl(resolved.url);
  const title = args.title ?? resolved.title;
  const type = args.type ?? resolved.type ?? "article";
  const notes = args.notes ?? resolved.description ?? "";
  const id = candidateId(url);

  const candidate = {
    schemaVersion: 1,
    id,
    url,
    title,
    type,
    accessed: today(),
    input: { kind, value: args.value },
    status: "candidate",
    notes
  };

  const outputDir = args.outputDir ?? path.join(rootDir, "content", "scout", "candidates", today());
  const outputPath = path.join(outputDir, `${id}.json`);

  if (args.dryRun) {
    console.log(`Dry run: would write ${toPosix(path.relative(rootDir, outputPath))}`);
    console.log(JSON.stringify(candidate, null, 2));
    return;
  }

  await mkdir(outputDir, { recursive: true });
  await writeJson(outputPath, candidate);
  console.log(`Imported source candidate: ${toPosix(path.relative(rootDir, outputPath))}`);
  console.log(`  Title: ${title}`);
  console.log(`  Type: ${type}`);
  console.log(`  Promote with: npm run source:promote -- ${id} --article <slug>`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
