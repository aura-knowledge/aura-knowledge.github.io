import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { readJson, sha256, toPosix, writeJson } from "./lib/content-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = process.cwd();

const ajv = new Ajv2020({ allErrors: true, strict: false });
ajv.addFormat("uri", {
  type: "string",
  validate(value) {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }
});

function parseArgs(argv) {
  const args = {};
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--config") {
      args.config = argv[index + 1];
      index += 1;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  return args;
}

function today() {
  return new Date().toISOString().slice(0, 10);
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

function candidateId(url) {
  const hash = sha256(normalizeUrl(url)).slice(0, 12);
  return `candidate-source-${hash}`;
}

function extractRssItems(xml) {
  const items = [];
  const itemRegex = /<item>[\s\S]*?<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[0];
    const titleMatch = itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/);
    const linkMatch = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/);
    const guidMatch = itemXml.match(/<guid[^>]*>([\s\S]*?)<\/guid>/);
    const url = linkMatch?.[1]?.trim() ?? guidMatch?.[1]?.trim() ?? "";
    const title = titleMatch?.[1]
      ?.replace(/<!\[CDATA\[/g, "")
      ?.replace(/\]\]>/g, "")
      ?.replace(/\s+/g, " ")
      ?.trim() ?? url;
    if (url) {
      items.push({ title, url });
    }
  }
  return items;
}

function extractAtomEntries(xml) {
  const entries = [];
  const entryRegex = /<entry>[\s\S]*?<\/entry>/g;
  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    const entryXml = match[0];
    const titleMatch = entryXml.match(/<title[^>]*>([\s\S]*?)<\/title>/);
    const linkMatch = entryXml.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/);
    const url = linkMatch?.[1]?.trim() ?? "";
    const title = titleMatch?.[1]
      ?.replace(/<!\[CDATA\[/g, "")
      ?.replace(/\]\]>/g, "")
      ?.replace(/\s+/g, " ")
      ?.trim() ?? url;
    if (url) {
      entries.push({ title, url });
    }
  }
  return entries;
}

async function fetchFeed(feed) {
  const response = await fetch(feed.url, {
    headers: { "User-Agent": "AuraKnowledgeScout/1.0" }
  });
  if (!response.ok) {
    throw new Error(`Feed ${feed.id} failed: ${response.status} ${response.statusText}`);
  }
  const xml = await response.text();
  return feed.type === "atom" ? extractAtomEntries(xml) : extractRssItems(xml);
}

async function main() {
  const args = parseArgs(process.argv);
  const configPath = args.config ?? path.join(rootDir, "scout.config.json");
  const config = await readJson(configPath);

  const configSchema = await readJson(path.join(rootDir, "schemas", "scout-config.schema.json"));
  const validateConfig = ajv.compile(configSchema);
  if (!validateConfig(config)) {
    console.error("Invalid scout config:", validateConfig.errors);
    process.exit(1);
  }

  const outputDir = path.join(rootDir, "content", "scout", "candidates", today());
  const reportPath = path.join(rootDir, "content", "scout", "reports", `${today()}.json`);
  const feedCounts = {};
  const seen = new Set();
  const candidates = [];

  for (const feed of config.feeds) {
    if (feed.enabled === false) {
      continue;
    }

    let items = [];
    try {
      items = await fetchFeed(feed);
    } catch (error) {
      console.warn(`Skipping feed ${feed.id}: ${error.message}`);
      feedCounts[feed.id] = 0;
      continue;
    }

    let accepted = 0;
    for (const item of items) {
      const url = normalizeUrl(item.url);
      if (seen.has(url)) {
        continue;
      }
      seen.add(url);
      accepted += 1;

      const id = candidateId(url);
      const candidate = {
        schemaVersion: 1,
        id,
        url,
        title: item.title,
        type: feed.sourceType ?? "article",
        accessed: today(),
        input: { kind: "url", value: url },
        status: "candidate",
        notes: `Discovered via feed ${feed.id} (${feed.name}) for topic ${feed.topic}.`
      };
      candidates.push(candidate);

      if (!args.dryRun) {
        await mkdir(outputDir, { recursive: true });
        await writeJson(path.join(outputDir, `${id}.json`), candidate);
      }
    }

    feedCounts[feed.id] = accepted;
  }

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    feedCounts,
    candidates
  };

  if (args.dryRun) {
    console.log(`Dry run: would discover ${candidates.length} candidate(s).`);
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeJson(reportPath, report);

  console.log(`Scout discovered ${candidates.length} candidate(s).`);
  console.log(`Report: ${toPosix(path.relative(rootDir, reportPath))}`);
  console.log(`Candidates: ${toPosix(path.relative(rootDir, outputDir))}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
