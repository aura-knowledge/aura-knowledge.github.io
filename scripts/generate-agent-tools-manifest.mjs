import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { buildToolsManifest } from "./lib/agent-tools.mjs";
import { readJson, rootDir, toPosix } from "./lib/content-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.join(rootDir, "public", "agents", "tools.json");

const ajv = new Ajv2020({ allErrors: true, strict: false });

function normalizeForComparison(manifest) {
  const { generatedAt, ...rest } = manifest;
  return JSON.stringify(rest);
}

async function loadExistingGeneratedAt() {
  try {
    const existing = await readJson(outputPath);
    return existing.generatedAt;
  } catch {
    return null;
  }
}

async function main() {
  let manifest = buildToolsManifest();
  const existingGeneratedAt = await loadExistingGeneratedAt();
  if (existingGeneratedAt) {
    const existingRaw = await readFile(outputPath, "utf8");
    const existing = JSON.parse(existingRaw);
    if (normalizeForComparison(existing) === normalizeForComparison(manifest)) {
      manifest.generatedAt = existing.generatedAt;
    }
  }

  const schema = await readJson(path.join(rootDir, "schemas", "agent-tools.schema.json"));
  const validate = ajv.compile(schema);
  if (!validate(manifest)) {
    const messages = validate.errors?.map((error) => `${error.instancePath || "/"} ${error.message}`) ?? [];
    throw new Error(`Generated manifest is invalid: ${messages.join("; ")}`);
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`Generated ${toPosix(path.relative(rootDir, outputPath))} with ${manifest.tools.length} tools.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
