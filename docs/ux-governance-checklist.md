# UX Governance Checklist

This checklist is the human-reading-quality gate for Aura Knowledge. It is used by authors and reviewers before merging changes that affect the public site.

## Route availability

- [ ] `/` renders
- [ ] `/topics/` renders
- [ ] `/articles/` renders
- [ ] `/roadmap/` renders
- [ ] `/organization/` renders
- [ ] `/graph/` renders
- [ ] `/agents/` renders
- [ ] Each topic landing page (`/topics/[topic]/`) renders
- [ ] Each year archive (`/articles/[year]/`) renders
- [ ] Each month archive (`/articles/[year]/[month]/`) renders

## Navigation

- [ ] Primary nav links are visible and have an active state on every page
- [ ] Agent entry and Graph links are reachable from footer/machine band
- [ ] No broken internal links

## Article reading

- [ ] Claim markers in prose match claim IDs in the artifact
- [ ] Each published claim has at least one evidence packet
- [ ] Evidence cards render source title, snippet, and support type
- [ ] Counterevidence is visible when present
- [ ] Source ledger is scanable and links are valid

## Accessibility

- [ ] Focus indicators are visible on buttons and links
- [ ] All interactive elements are reachable by keyboard
- [ ] Color contrast meets WCAG 2.1 AA for normal text
- [ ] Mobile view has no horizontal overflow below 760px
- [ ] Mobile audit rail is collapsed behind a `<details>` element

## Machine surfaces

- [ ] `/agents/index.json` schemaVersion matches current contract
- [ ] `/agents/diagnostics.json` is generated
- [ ] `/agents/verification-report.json` is generated
- [ ] `/llms.txt` reflects current site structure

## Automated checks

Run:

```bash
npm run check
```

This executes:
- `npm run generate` — produces agent artifacts
- `npm run validate` — schema + evidence diagnostics
- `astro build` — builds the static site
- `npm run validate:build` — graph integrity + required routes

## Notes

- Playwright browser automation is intentionally deferred until the component catalog stabilizes.
- Warning-level diagnostics do not fail the build; they are signals for authors to review.
