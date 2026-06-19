# Article Series Organization Design

## Goal

Make `/articles/` communicate when published essays belong to an ordered article series, without hiding standalone essays or relying on topic tags to imply reading order.

## Context

The site currently lists every published article by recency. Seven recently published articles plus the reader guide belong to **The Long Human Road to AI: Season 1**, but they appear as unrelated cards mixed with standalone essays. The existing topic tag `long-human-road-to-ai` groups them by subject, but topics do not encode sequence, season, or entry point.

## Research Summary

Publishing platforms separate different organization jobs:

- Medium lists are curated, manually ordered collections.
- Substack sections create navigational containers, while tags stay looser.
- Ghost tags are flexible for grouping, but do not encode reading order on their own.
- Sphinx `toctree` uses an explicit ordered structure for related documents.

For this site, the scalable model is a first-class series layer: topics answer "what is this about?", articles answer "what was published?", and series answer "what should I read together, and in what order?"

## Design

Article artifacts gain optional `series` metadata:

- `slug`: stable series id, e.g. `long-human-road-to-ai`
- `title`: human-facing series title
- `season`: optional season label, e.g. `Season 1`
- `order`: numeric ordering within the series
- `role`: `guide`, `chapter`, `companion`, or `appendix`

The articles index will render series groups before standalone articles. Each group shows the series title, season, count, entry-point link, and ordered article list. Standalone articles keep the existing recency card layout below.

Each article page will show a compact series navigation block when `series` metadata exists. It links to the previous and next entry in the same series and names the series context.

## Visual Direction

The series block should feel like a reading path, not a marketing banner. Use existing typography, borders, and color tokens. The signature element is a narrow ordered rail: small chapter numbers aligned beside article titles. This makes sequence visible without adding decorative cards or a new palette.

## Data Rules

- Series metadata is optional.
- Articles without `series` metadata remain standalone.
- A series entry must have a non-negative integer `order`.
- Orders must be unique within a series.
- The reader guide should use `role: guide` and `order: 0`.
- Rendering must sort series entries by `order`, then by date for stable fallback.

## Testing

Add a series check script that reads article artifacts and verifies:

- The Long Human Road to AI has eight entries.
- The first entry is the reader guide.
- Orders are unique and sorted.
- Standalone articles are not included in the LHRA group.

Run the script directly during development, then include it in `npm run check`.
