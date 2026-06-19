import { readFile, writeFile } from "node:fs/promises";
import { glob } from "node:fs/promises";

const artifactPaths = [];
for await (const path of glob("content/articles/*/*/artifact.json")) {
  artifactPaths.push(path);
}

for (const artifactPath of artifactPaths) {
  const raw = await readFile(artifactPath, "utf-8");
  const artifact = JSON.parse(raw);

  if (artifact.schemaVersion !== 1) {
    console.log(`Skipping ${artifactPath}: already schemaVersion ${artifact.schemaVersion ?? "unknown"}`);
    continue;
  }

  artifact.schemaVersion = 2;

  for (const claim of artifact.claims) {
    const assessedAt = artifact.updatedAt;

    // Convert evidence strings to EvidencePacket objects.
    claim.evidence = claim.evidence.map((sourceId) => {
      if (typeof sourceId === "object" && sourceId !== null) {
        return sourceId;
      }
      return {
        sourceId,
        snippet: "Evidence snippet pending.",
        supports: "direct",
        assessedAt
      };
    });

    // Convert counterevidence strings to CounterevidencePacket objects.
    claim.counterevidence = claim.counterevidence.map((entry) => {
      if (typeof entry === "object" && entry !== null) {
        return entry;
      }
      return {
        summary: entry,
        assessedAt
      };
    });

    // If there were standalone evidenceNotes, fold them into the first evidence packet.
    if (Array.isArray(claim.evidenceNotes) && claim.evidenceNotes.length > 0) {
      const notes = claim.evidenceNotes.join(" ");
      if (claim.evidence.length > 0) {
        claim.evidence[0].notes = notes;
      }
      delete claim.evidenceNotes;
    }
  }

  await writeFile(artifactPath, JSON.stringify(artifact, null, 2) + "\n");
  console.log(`Migrated ${artifactPath}`);
}

console.log(`Migrated ${artifactPaths.length} artifact(s).`);
