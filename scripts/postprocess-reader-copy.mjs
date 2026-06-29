import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const distDir = path.join(process.cwd(), "dist");
const markerPattern =
  /(<span\b(?=[^>]*\bclass="[^"]*\bclaim-marker\b[^"]*")[^>]*>)(?:Claim|Point) C(\d+)(<\/span>)/g;

async function* htmlFiles(directory) {
  for (const entry of await readdir(directory)) {
    const entryPath = path.join(directory, entry);
    const entryStat = await stat(entryPath);

    if (entryStat.isDirectory()) {
      yield* htmlFiles(entryPath);
    } else if (entry.endsWith(".html")) {
      yield entryPath;
    }
  }
}

let changedFiles = 0;
let changedMarkers = 0;

for await (const filePath of htmlFiles(distDir)) {
  const html = await readFile(filePath, "utf8");
  let replacements = 0;
  const updated = html.replace(markerPattern, (...args) => {
    replacements += 1;
    return `${args[1]}Point C${args[2]}${args[3]}`;
  });

  if (updated !== html) {
    await writeFile(filePath, updated);
    changedFiles += 1;
    changedMarkers += replacements;
  }
}

console.log(`Postprocessed reader copy in ${changedFiles} HTML file(s), ${changedMarkers} marker(s).`);
