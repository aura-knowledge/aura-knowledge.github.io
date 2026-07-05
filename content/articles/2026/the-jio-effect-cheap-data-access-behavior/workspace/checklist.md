# Publishing Checklist: the-jio-effect-cheap-data-access-behavior

## Claims and evidence

- [ ] Every claim has at least one evidence packet.
- [ ] High-confidence, contested, or risk claims have counterevidence.
- [ ] Every evidence packet has a source and a snippet.
- [ ] All `sourceId` values resolve to entries in the source list.
- [ ] Each claim has a visible marker in `article.md`.

## Sources

- [ ] Sources are recorded in `workspace/sources/`.
- [ ] Each source has a title, URL, type, and accessed date.

## Provenance and review

- [ ] Agent contributions are recorded in `artifact.json` provenance.
- [ ] A human review with status `approved` is present before publishing.
- [ ] The approved review's `contentHash` matches the current `article.md` hash.

## Site checks

- [ ] `npm run generate` has been run.
- [ ] `npm run check` passes with no errors.
