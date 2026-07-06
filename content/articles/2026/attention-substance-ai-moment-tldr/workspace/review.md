# Review Notes: attention-substance-ai-moment-tldr

## Status

Review

## Reviewers

- Kimi Code agent review (sibling-agent equivalent) for issue #103

## Scope

Review the four charts in the TLDR article `Your Phone Is a Power Tool. You're Using It as a Toy.`:

1. `tldr-entertainment-vs-education.svg` — internet time split (pie chart)
2. `tldr-daily-time-breakdown.svg` — daily screen time by activity (horizontal bar)
3. `what-ai-makes-cheap.svg` — AI productivity gains by task (grouped bar)
4. `tldr-fifteen-min-compounding.svg` — 15-minute compounding (line chart)

Review criteria: chart-type fit, head-to-head communication, data ranges and caveats, accessibility, and whether additional charts would strengthen the argument.

## Overall verdict

The charts are clear, source-caveated, and accessible at a basic level, but two of the four use suboptimal chart types. The line chart in particular visually contradicts the article's claim of simple linear compounding. One or two additional charts would make the central trade-off more visceral.

**Publishing decision for chart package:** [ ] Ready to publish  [x] Needs changes

---

## Chart 1: Internet time split (`tldr-entertainment-vs-education.svg`)

**Type:** Pie chart  
**Data:** NCAER IHDS Wave 3 share of use: Entertainment & Social Media 66%, Education 16%, Communication 8%, Work/Productive 5%, Other 5%.

### Assessment
- **Chart-type fit:** Acceptable, not ideal. A pie chart works for part-to-whole when one slice dominates, but it makes precise comparison of the smaller slices difficult. The reader's main takeaway — the 4:1 entertainment-to-education ratio — is clear, but only because the percentages are labeled.
- **Data ranges and caveats:** Adequate. The source is named and the caveat (“Self-reported usage shares; actual minutes may differ. Illustrative allocation.”) is honest.
- **Accessibility:** Title and `<desc>` are present. Color contrast is reasonable. The two 5% slices use different colors (orange/red), so they are distinguishable.

### Recommendations
- **Keep or replace?** Keep for now, but consider replacing with a **sorted horizontal bar chart** or a **waffle chart** if the article is revised. A bar chart would let readers compare all five categories more accurately and would make the 4:1 ratio easier to eyeball.
- **If kept:** move the labels closer to the slices and ensure the legend order matches the visual order.

---

## Chart 2: Daily screen time breakdown (`tldr-daily-time-breakdown.svg`)

**Type:** Horizontal bar chart  
**Data:** Estimated daily minutes by activity: Reels & short-form video 95, Social media & messaging 58, Education & learning 48, Web series & movies 45, Creative & productive work 15, News & reading 12.

### Assessment
- **Chart-type fit:** Good. Horizontal bars are the right choice for comparing durations across category labels.
- **Data ranges and caveats:** Good. The caveat clearly states this is an illustrative composite and varies by age, region, and device.
- **Accessibility:** Good. Labels are inside/next to bars. Contrast is strong.

### Issues
- **Sort order:** The bars are sorted ascending from top to bottom (smallest at top). Most readers expect the largest category at the top. This forces a quick re-scan.
- **Color semantics:** The rainbow palette does not encode meaning. Reels and web series are both entertainment but use different colors; education and creative work are both productive but also use different colors.

### Recommendations
- Sort bars **descending** (largest at top) or group by category.
- Use a **two-color or gradient scheme** that signals “entertainment/social” vs. “productive/education” vs. “other.” For example, warm tones for entertainment, cool tones for productive, neutral for news.

---

## Chart 3: AI productivity gains (`what-ai-makes-cheap.svg`)

**Type:** Grouped/vertical bar chart  
**Data:** Estimated time reduction from generative AI: Writing 40%, Coding 56%, Consulting analysis 25%, Customer support 14%.

### Assessment
- **Chart-type fit:** Good. A bar chart is the right choice for comparing a single numeric value across discrete tasks.
- **Data ranges and caveats:** Good. Y-axis starts at 0. The caveat correctly flags experimental settings and non-Indian contexts.
- **Accessibility:** Good. Values are labeled on top of each bar.

### Issues
- **Color:** Like Chart 2, the palette is arbitrary. Coding (purple) and writing (blue) are not meaningfully different categories.
- **Label density:** “Consulting analysis” and “Customer support” are long labels; vertical bars handle them, but horizontal bars would give the labels more room.

### Recommendations
- Use a single color or a sequential gradient so the visual emphasis falls on magnitude, not category.
- Optional: convert to a horizontal bar chart to improve label readability and align with Chart 2.

---

## Chart 4: 15-minute compounding (`tldr-fifteen-min-compounding.svg`)

**Type:** Line chart with area fill  
**Data:** Cumulative hours from 15 min/day over 1, 4, 12, 26, and 52 weeks: 2, 7, 21, 46, 91 hours.

### Assessment
- **Chart-type fit:** Poor. A line chart implies a continuous trend, but the x-axis uses irregular milestone intervals (1, 4, 12, 26, 52 weeks). The line connects these points as if they were evenly spaced, which distorts the slope and makes the growth look curved/accelerating.
- **Data ranges and caveats:** The caveat says “Simple linear projection,” but the chart shape contradicts that. This is the most serious mismatch.
- **Label ambiguity:** The y-axis labels use “2L”, “7L”, “21L”, etc. “L” is ambiguous; it could be misread as “liters” or “lakhs.”
- **Accessibility:** Title and desc are present, but the visual message is misleading.

### Recommendations
- **Replace with a bar chart.** Use equal-width bars at each milestone (1, 4, 12, 26, 52 weeks) and label the y-axis “Cumulative hours.” This accurately represents the linear accumulation without implying a curve.
- If a line chart is strongly preferred, use a uniform weekly x-axis (0–52) with a straight line, and remove the area fill.
- Remove the “L” suffix or replace it with a clear “h” for hours.

---

## Head-to-head comparison

The article's strongest section is the “Head-to-Head” table, which compares 15 minutes of consumption vs. 15 minutes of substance-building. Currently this is text-only. A chart would make the comparison more immediate.

### Suggested new chart: consumption vs. creation over one year

**Type:** Small-multiples or grouped bar chart  
**Data:** Cumulative hours after 1 week, 1 month, 6 months, and 1 year for two scenarios:

| Period | 15 min/day scrolling | 15 min/day learning/creating |
|---|---|---|
| 1 week | 1.75 h | 1.75 h |
| 4 weeks | 7 h | 7 h |
| 26 weeks | 46 h | 46 h |
| 52 weeks | 91 h | 91 h |

Because the time input is identical, the chart would not show a difference in hours. To make the comparison meaningful, add a second dimension: **what each path produces** — e.g., “episodes watched / reels seen” vs. “skill hours built / essays drafted.” This turns the chart from a time chart into an outcome chart.

**Alternative:** A simple diverging or paired bar chart showing “cost” (hours lost to extraction) vs. “return” (capability built) for the same 91-hour annual budget.

---

## Accessibility summary

| Chart | Title/desc | Color contrast | Colorblind-safe | Label clarity |
|---|---|---|---|---|
| Entertainment vs. education | Yes | Good | Mostly | Good |
| Daily time breakdown | Yes | Good | Mostly | Good |
| AI productivity gains | Yes | Good | Mostly | Good |
| 15-min compounding | Yes | Good | Yes | Needs fix ("L" suffix) |

**Suggested accessibility improvement:** Add hatching or pattern fills to the two smallest pie slices so they remain distinguishable in grayscale.

---

## Additional charts to consider

1. **Head-to-head outcome chart** (recommended): show what 91 annual hours of scrolling produces vs. what 91 hours of substance-building produces.
2. **Age-group attention-to-education ratio:** visualize ASER 2024's 76% social-media vs. 57% education figure by age band, if more granular data exists.
3. **Engagement cost chart:** a small bar chart showing India's 23% employee engagement alongside a global benchmark or the estimated $351 billion disengagement cost. Use sparingly; the article already mentions this in prose.

Avoid adding more than one or two new charts. The TLDR should remain scannable.

---

## Recommended next actions

1. **Fix Chart 4 first** — replace the line chart with a bar chart and remove the “L” suffix.
2. **Fix Chart 2 sort order** — put the largest category at the top.
3. **Unify color semantics** across Charts 1–3 so color encodes meaning (entertainment vs. productive vs. other).
4. **Add one head-to-head outcome chart** to make the central trade-off tangible.
5. Re-run the chart generator and re-check SVG `title`/`desc` metadata.

## Privacy status

Clear. All data and sources are already public and cited.
