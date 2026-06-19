import { writeFile } from "node:fs/promises";
import {
  ALLOWED_MATURITIES,
  ALLOWED_STATUSES,
  CLAIM_STATES,
  formatResults,
  loadGardenData,
  queryArticles
} from "./lib/garden-queries.mjs";

function usage() {
  console.log(`Usage: node scripts/garden-query.mjs [options]

Query the Aura Knowledge garden by structured fields. Filters combine with AND logic.

Options:
  --topic <topic>              Filter by article topic.
  --tag <tag>                  Filter by article tag.
  --maturity <maturity>        Filter by maturity: ${Array.from(ALLOWED_MATURITIES).join(" | ")}.
  --status <status>            Filter by status: ${Array.from(ALLOWED_STATUSES).join(" | ")}.
  --cites-source-type <type>   Filter by source type cited by the article.
  --claim-state <state>        Filter by claim verification state: ${Array.from(CLAIM_STATES).join(" | ")}.
  --keyword <phrase>           Case-insensitive phrase match across title, summary, thesis, claims, sources, tags, and topics.
  --related-to <slug>          Articles related to the given slug by shared topic or graph edge.
  --format <format>            Output format: ids | json | jsonl | markdown (default: json).
  --limit <n>                  Maximum number of results.
  --output <file>              Write output to file instead of stdout.
  --help                       Show this message.

Examples:
  node scripts/garden-query.mjs --topic product-truth --format markdown
  node scripts/garden-query.mjs --claim-state needs-evidence --format jsonl
  node scripts/garden-query.mjs --keyword "agent" --limit 5
  node scripts/garden-query.mjs --related-to agent-auditable-research
`);
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--help":
        usage();
        process.exit(0);
        break;
      case "--topic":
        options.topic = argv[++i];
        break;
      case "--tag":
        options.tag = argv[++i];
        break;
      case "--maturity":
        options.maturity = argv[++i];
        break;
      case "--status":
        options.status = argv[++i];
        break;
      case "--cites-source-type":
        options.citesSourceType = argv[++i];
        break;
      case "--claim-state":
        options.claimState = argv[++i];
        break;
      case "--keyword":
        options.keyword = argv[++i];
        break;
      case "--related-to":
        options.relatedTo = argv[++i];
        break;
      case "--format":
        options.format = argv[++i];
        break;
      case "--limit":
        options.limit = Number(argv[++i]);
        break;
      case "--output":
        options.output = argv[++i];
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function validateOptions(options) {
  if (options.maturity && !ALLOWED_MATURITIES.has(options.maturity)) {
    throw new Error(`Invalid maturity: ${options.maturity}`);
  }
  if (options.status && !ALLOWED_STATUSES.has(options.status)) {
    throw new Error(`Invalid status: ${options.status}`);
  }
  if (options.claimState && !CLAIM_STATES.has(options.claimState)) {
    throw new Error(`Invalid claim state: ${options.claimState}`);
  }
  if (options.format && !["ids", "json", "jsonl", "markdown"].includes(options.format)) {
    throw new Error(`Invalid format: ${options.format}`);
  }
  if ("limit" in options && (!Number.isInteger(options.limit) || options.limit < 1)) {
    throw new Error("--limit must be a positive integer.");
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  validateOptions(options);

  const data = await loadGardenData();
  const results = queryArticles(options, data);
  const output = formatResults(results, options.format ?? "json");

  if (options.output) {
    await writeFile(options.output, output);
    console.log(`Wrote ${results.length} result(s) to ${options.output}.`);
  } else {
    process.stdout.write(output);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
