# Artifact Widget Catalog

This catalog lists the approved Astro components for rendering Aura Knowledge artifacts. The goal is to bound the UI surface so that both humans and agents can predict how artifact data will be rendered.

## Human-facing article widgets

| Component | Props | Purpose |
|-----------|-------|---------|
| `ClaimCard` | `claim`, `sourceById` | Render a single claim with its evidence and counterevidence packets. |
| `EvidencePacket` | `packet`, `source?` | Render one typed evidence packet. |
| `CounterevidencePacket` | `packet`, `source?` | Render one typed counterevidence packet. |
| `SourceLedger` | `sources` | Render the article source list. |
| `ProvenancePanel` | `provenance`, `contentHash` | Render artifact provenance, reviews, and hash alignment. |
| `AgentPacketLink` | `slug`, `base?` | Render links to the machine-readable agent packet. |
| `MaturityBadge` | `maturity` | Render a maturity value with its color class. |
| `StatusBadge` | `status` | Render an article status badge. |

## Navigation and rail widgets

| Component | Props | Purpose |
|-----------|-------|---------|
| `FocusRail` | `claims` | Render the sticky claim navigation rail. |
| `TopicChip` | `topic`, `href?` | Render a topic label as a chip or link. |

## Roadmap widgets

| Component | Props | Purpose |
|-----------|-------|---------|
| `RoadmapCard` | `variant: "phase" \| "idea"`, plus phase/idea data | Render a roadmap phase or idea card. |

`RoadmapCard` accepts:
- `variant="phase"` with `phase`, `index`, and `ideaById` props.
- `variant="idea"` with `idea` and `sourceBase` props.

## Chrome widgets

| Component | Props | Purpose |
|-----------|-------|---------|
| `ThemeToggle` | none | Render the light/dark theme toggle. |

## Contracts

- All components are server-only Astro components (`.astro`) unless otherwise noted.
- Components accept typed props that mirror the artifact schema where possible.
- Lists render semantic markup (`<ul>`, `<ol>`, `<article>`) and include ARIA labels.
- Badges use `text-transform: capitalize` and color-coded status/maturity classes.
- The catalog intentionally does not include arbitrary generative UI; new widgets should be added here before being used on public pages.
