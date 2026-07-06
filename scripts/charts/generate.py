#!/usr/bin/env python3
"""
Generate SVG charts for the Attention, Substance, and the AI Moment series.

Usage:
    python3 scripts/charts/generate.py

Each chart is defined in CHARTS and backed by a CSV in scripts/charts/data/.
Charts are written to public/images/articles/2026/attention-substance-ai-moment/.
"""

import csv
import json
import os
from pathlib import Path
from typing import Optional

import matplotlib
matplotlib.use("Agg")  # headless backend
import matplotlib.pyplot as plt
import matplotlib.patheffects as pe
import xml.etree.ElementTree as ET

# Keep text as selectable text elements in SVGs rather than vector paths.
plt.rcParams["svg.fonttype"] = "none"

# Base paths relative to this script
SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR / "data"
DEFINITIONS_DIR = SCRIPT_DIR / "definitions"
DEFINITIONS_DIR.mkdir(parents=True, exist_ok=True)
OUT_DIR = SCRIPT_DIR.parent.parent / "public" / "images" / "articles" / "2026" / "attention-substance-ai-moment"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Color palette (accessible, print-friendly, WCAG 2.2 AA against white)
COLORS = {
    "primary": "#1d4ed8",
    "secondary": "#6b21a8",
    "accent": "#15803d",
    "warning": "#9a3412",
    "danger": "#b91c1c",
    "neutral": "#475569",
    "light": "#cbd5e1",
    "palette": ["#1d4ed8", "#9a3412", "#15803d", "#6b21a8", "#b91c1c", "#0f766e", "#4338ca"],
    "entertainment": "#9a3412",
    "productive": "#1d4ed8",
}


def read_csv(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def _inject_svg_metadata(svg_path: Path, title: str, description: str) -> None:
    """Inject <title> and <desc> elements into the SVG root for accessibility."""
    ET.register_namespace("", "http://www.w3.org/2000/svg")
    tree = ET.parse(svg_path)
    root = tree.getroot()
    ns = {"svg": "http://www.w3.org/2000/svg"}
    for tag in ("title", "desc"):
        existing = root.find(f"svg:{tag}", ns)
        if existing is not None:
            root.remove(existing)
    title_el = ET.Element("{http://www.w3.org/2000/svg}title")
    title_el.text = title
    desc_el = ET.Element("{http://www.w3.org/2000/svg}desc")
    desc_el.text = description
    root.insert(0, title_el)
    root.insert(1, desc_el)
    tree.write(svg_path, encoding="utf-8", xml_declaration=False)


def save_svg(fig: plt.Figure, filename: str, source: str, caveat: str,
             alt_text: Optional[str] = None) -> None:
    out_path = OUT_DIR / filename
    fig.savefig(out_path, format="svg", bbox_inches="tight", transparent=False)
    plt.close(fig)
    print(f"Generated {out_path}")
    title = alt_text or filename
    description = f"{title}. Source: {source}. {caveat}"
    _inject_svg_metadata(out_path, title, description)
    # Write a sidecar metadata file for source/caveat tracking
    meta_path = out_path.with_suffix(".json")
    meta = {"source": source, "caveat": caveat, "filename": filename, "alt_text": title}
    meta_path.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")


def pie_chart(csv_path: Path, title: str, x_key: str, y_key: str,
              source: str, caveat: str, filename: str,
              alt_text: Optional[str] = None) -> None:
    rows = read_csv(csv_path)
    labels = [r[x_key] for r in rows]
    values = [float(r[y_key]) for r in rows]
    colors = COLORS["palette"][: len(labels)]

    fig, ax = plt.subplots(figsize=(8, 6))
    wedges, texts, autotexts = ax.pie(
        values, labels=labels, autopct="%1.0f%%", startangle=90,
        colors=colors, pctdistance=0.75, labeldistance=1.08,
        textprops={"fontsize": 10})
    for t in autotexts:
        t.set_fontsize(10)
        t.set_weight("bold")
    ax.set_title(title, fontsize=14, weight="bold", pad=16)
    fig.text(0.5, 0.02, f"Source: {source} — {caveat}", ha="center", fontsize=9, style="italic")
    save_svg(fig, filename, source, caveat, alt_text=alt_text)


def grouped_bar_chart(csv_path: Path, title: str, x_key: str, y_key: str, y_label: str,
                      source: str, caveat: str, filename: str,
                      alt_text: Optional[str] = None, unit: str = "%") -> None:
    rows = read_csv(csv_path)
    labels = [r[x_key] for r in rows]
    values = [float(r[y_key]) for r in rows]

    fig, ax = plt.subplots(figsize=(8, 5))
    bars = ax.bar(labels, values, color=COLORS["palette"][: len(labels)], edgecolor="white")
    ax.set_ylim(0, max(values) * 1.2)
    ax.set_ylabel(y_label)
    ax.set_title(title, fontsize=14, weight="bold", pad=16)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    for bar in bars:
        height = bar.get_height()
        ax.annotate(f"{height:.0f}{unit}",
                    xy=(bar.get_x() + bar.get_width() / 2, height),
                    xytext=(0, 3),
                    textcoords="offset points",
                    ha="center", va="bottom", fontsize=10)
    fig.text(0.5, -0.04, f"Source: {source} — {caveat}", ha="center", fontsize=9, style="italic")
    save_svg(fig, filename, source, caveat, alt_text=alt_text)


def stacked_bar_chart(csv_path: Path, title: str, x_key: str, y_key: str, y_label: str,
                      source: str, caveat: str, filename: str,
                      alt_text: Optional[str] = None) -> None:
    rows = read_csv(csv_path)
    labels = [r[x_key] for r in rows]
    values = [float(r[y_key]) for r in rows]
    colors = COLORS["palette"][: len(labels)]

    fig, ax = plt.subplots(figsize=(8, 5))
    left = 0.0
    for label, value, color in zip(labels, values, colors):
        ax.barh("Daily online time", value, left=left, color=color, label=label, edgecolor="white")
        ax.text(left + value / 2, 0, f"{value:.0f}m", ha="center", va="center",
                color="black", weight="bold",
                path_effects=[pe.withStroke(linewidth=3, foreground="white")])
        left += value
    ax.set_xlabel(y_label)
    ax.set_title(title, fontsize=14, weight="bold", pad=16)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_visible(False)
    ax.set_yticks([])
    ax.legend(loc="upper right", bbox_to_anchor=(1.02, -0.12), ncol=len(labels), frameon=False)
    fig.text(0.5, -0.06, f"Source: {source} — {caveat}", ha="center", fontsize=9, style="italic")
    save_svg(fig, filename, source, caveat, alt_text=alt_text)


def line_chart(csv_path: Path, title: str, x_key: str, y_key: str, y_label: str,
               source: str, caveat: str, filename: str,
               alt_text: Optional[str] = None) -> None:
    rows = read_csv(csv_path)
    x = [r[x_key] for r in rows]
    y = [float(r[y_key]) for r in rows]

    fig, ax = plt.subplots(figsize=(9, 5))
    ax.plot(x, y, color=COLORS["primary"], marker="o", linewidth=2.5, markersize=6)
    ax.fill_between(range(len(x)), y, alpha=0.12, color=COLORS["primary"])
    ax.set_ylabel(y_label)
    ax.set_title(title, fontsize=14, weight="bold", pad=16)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    plt.xticks(rotation=30, ha="right")
    for i, (xi, yi) in enumerate(zip(x, y)):
        ax.annotate(f"{yi:.0f}L", (i, yi), textcoords="offset points", xytext=(0, 8), ha="center", fontsize=9)
    fig.text(0.5, -0.06, f"Source: {source} — {caveat}", ha="center", fontsize=9, style="italic")
    save_svg(fig, filename, source, caveat, alt_text=alt_text)


def multi_series_line_chart(csv_path: Path, title: str, x_key: str, y_label: str,
                            source: str, caveat: str, filename: str,
                            alt_text: Optional[str] = None) -> None:
    rows = read_csv(csv_path)
    x = [r[x_key] for r in rows]
    # All other columns are series
    series_keys = [k for k in rows[0].keys() if k != x_key]

    fig, ax = plt.subplots(figsize=(9, 5))
    for idx, series_key in enumerate(series_keys):
        y = [float(r[series_key]) for r in rows]
        color = COLORS["palette"][idx % len(COLORS["palette"])]
        ax.plot(x, y, color=color, marker="o", linewidth=2.5, markersize=6, label=series_key)
    ax.set_ylabel(y_label)
    ax.set_title(title, fontsize=14, weight="bold", pad=16)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    plt.xticks(rotation=30, ha="right")
    ax.legend(loc="upper left", frameon=False)
    fig.text(0.5, -0.06, f"Source: {source} — {caveat}", ha="center", fontsize=9, style="italic")
    save_svg(fig, filename, source, caveat, alt_text=alt_text)


def horizontal_bar_chart(csv_path: Path, title: str, x_key: str, y_key: str, x_label: str,
                         source: str, caveat: str, filename: str,
                         alt_text: Optional[str] = None, unit: str = "%", colors: Optional[list[str]] = None) -> None:
    rows = read_csv(csv_path)
    labels = [r[x_key] for r in rows]
    values = [float(r[y_key]) for r in rows]
    bar_colors = colors if colors else COLORS["palette"][: len(labels)]

    fig, ax = plt.subplots(figsize=(8, 5))
    bars = ax.barh(labels, values, color=bar_colors, edgecolor="white")
    ax.set_xlabel(x_label)
    ax.set_title(title, fontsize=14, weight="bold", pad=16)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    for bar, val in zip(bars, values):
        ax.text(val + max(values) * 0.01, bar.get_y() + bar.get_height() / 2,
                f"{val:.0f}{unit}", va="center", fontsize=10)
    ax.set_xlim(0, max(values) * 1.2)
    fig.text(0.5, -0.04, f"Source: {source} — {caveat}", ha="center", fontsize=9, style="italic")
    save_svg(fig, filename, source, caveat, alt_text=alt_text)


def paired_horizontal_bar_chart(csv_path: Path, title: str, x_key: str, y_key_left: str,
                                y_key_right: str, label_left: str, label_right: str,
                                source: str, caveat: str, filename: str,
                                alt_text: Optional[str] = None) -> None:
    """Diverging horizontal bars: left = consumption counts, right = substance counts.

    CSV columns: x_key (activity label), y_key_left (consumption count),
    y_key_right (substance count), plus optional *_label columns for bar annotations.
    """
    rows = read_csv(csv_path)
    labels = [r[x_key] for r in rows]
    left_values = [float(r[y_key_left]) for r in rows]
    right_values = [float(r[y_key_right]) for r in rows]
    left_labels = [r.get(f"{y_key_left}_label", f"{v:.0f}") for r, v in zip(rows, left_values)]
    right_labels = [r.get(f"{y_key_right}_label", f"{v:.0f}") for r, v in zip(rows, right_values)]

    fig, (ax_left, ax_right) = plt.subplots(1, 2, figsize=(10, 5), sharey=True)
    y = range(len(labels))
    bar_height = 0.5

    # Left subplot: consumption counts (horizontal bars pointing left)
    ax_left.barh(y, left_values, color=COLORS["entertainment"], edgecolor="white", height=bar_height)
    ax_left.set_xlabel(label_left)
    ax_left.set_title(title, fontsize=14, weight="bold", pad=16)
    ax_left.invert_xaxis()
    ax_left.yaxis.tick_right()
    ax_left.set_yticks(list(y))
    ax_left.set_yticklabels(labels)
    ax_left.spines["top"].set_visible(False)
    ax_left.spines["left"].set_visible(False)
    for i, (val, lbl) in enumerate(zip(left_values, left_labels)):
        ax_left.text(val * 0.95, i, lbl, va="center", ha="right", fontsize=9, color="white", weight="bold")

    # Right subplot: substance counts (horizontal bars pointing right)
    ax_right.barh(y, right_values, color=COLORS["productive"], edgecolor="white", height=bar_height)
    ax_right.set_xlabel(label_right)
    ax_right.set_yticks(list(y))
    ax_right.set_yticklabels([])
    ax_right.spines["top"].set_visible(False)
    ax_right.spines["right"].set_visible(False)
    for i, (val, lbl) in enumerate(zip(right_values, right_labels)):
        ax_right.text(val * 1.05, i, lbl, va="center", ha="left", fontsize=9, weight="bold")

    fig.text(0.5, -0.04, f"Source: {source} — {caveat}", ha="center", fontsize=9, style="italic")
    save_svg(fig, filename, source, caveat, alt_text=alt_text)


def diverging_bar_chart(csv_path: Path, title: str, x_key: str, y_key: str, x_label: str,
                        source: str, caveat: str, filename: str,
                        alt_text: Optional[str] = None, unit: str = "") -> None:
    """Horizontal diverging bar chart centered at zero. Positive values extend right,
    negative values extend left. Useful for showing reallocation or before/after shifts.
    """
    rows = read_csv(csv_path)
    labels = [r[x_key] for r in rows]
    values = [float(r[y_key]) for r in rows]

    colors = [COLORS["productive"] if v > 0 else COLORS["entertainment"] if v < 0 else COLORS["neutral"] for v in values]

    fig, ax = plt.subplots(figsize=(8, 5))
    bars = ax.barh(labels, values, color=colors, edgecolor="white")
    ax.set_xlabel(x_label)
    ax.set_title(title, fontsize=14, weight="bold", pad=16)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.axvline(0, color="#111318", linewidth=0.8)

    for bar, val in zip(bars, values):
        label = f"{val:+.0f}{unit}" if val != 0 else f"0{unit}"
        x_pos = val + (max(values) * 0.02 if val >= 0 else min(values) * 0.02)
        ha = "left" if val >= 0 else "right"
        ax.text(x_pos, bar.get_y() + bar.get_height() / 2, label,
                va="center", ha=ha, fontsize=10, weight="bold")

    lim = max(abs(min(values)), abs(max(values))) * 1.3
    ax.set_xlim(-lim, lim)
    fig.text(0.5, -0.04, f"Source: {source} — {caveat}", ha="center", fontsize=9, style="italic")
    save_svg(fig, filename, source, caveat, alt_text=alt_text)


CHARTS = [
    {
        "type": "grouped_bar",
        "csv": "aser-social-education.csv",
        "filename": "aser-social-education.svg",
        "title": "Adolescent smartphone use: social media vs. education (India, 2024)",
        "x_key": "purpose",
        "y_key": "percentage",
        "y_label": "Percentage of 14–16-year-olds",
        "source": "ASER 2024 National Findings",
        "caveat": "Rural and national sample; correlation, not causation.",
    },
    {
        "type": "stacked_bar",
        "csv": "daily-online-time-by-activity.csv",
        "filename": "daily-online-time-by-activity.svg",
        "title": "Estimated daily online time by activity (India)",
        "x_key": "activity",
        "y_key": "minutes",
        "y_label": "Minutes per day (approx. 5 hours total)",
        "source": "NCAER IHDS Wave 3 and IAMAI-Kantar 2024",
        "caveat": "Illustrative allocation based on reported share of use; not a direct time-use measurement.",
    },
    {
        "type": "horizontal_bar",
        "csv": "creator-income-bands.csv",
        "filename": "creator-income-bands.svg",
        "title": "Where creator-economy ad payments go (estimated)",
        "x_key": "band",
        "y_key": "share_pct",
        "x_label": "Estimated share of ad payments (%)",
        "source": "BCG From Content to Commerce: Mapping India's Creator Economy; CreatorIQ State of Creator Compensation 2026",
        "caveat": "Estimated percentile bands derived from reported top-1% and top-10% shares; not a full distribution and not India-specific.",
    },
    {
        "type": "grouped_bar",
        "csv": "ad-revenue-platform-origin.csv",
        "filename": "ad-revenue-platform-origin.svg",
        "title": "Estimated digital advertising revenue by platform origin (India, FY24-25)",
        "x_key": "origin",
        "y_key": "revenue_crore",
        "y_label": "Gross ad revenue (₹ crore)",
        "source": "Meta / Google India ROC filings; domestic estimate",
        "caveat": "Foreign-platform figures from ROC filings; domestic share is an illustrative estimate.",
    },
]


def load_definition_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    charts = list(CHARTS)
    for def_path in sorted(DEFINITIONS_DIR.glob("*.json")):
        try:
            charts.append(load_definition_json(def_path))
        except Exception as e:
            print(f"Skipping {def_path}: {e}")
    for chart in charts:
        csv_path = DATA_DIR / chart["csv"]
        if not csv_path.exists():
            print(f"Skipping {chart['filename']}: missing data file {csv_path}")
            continue
        ctype = chart["type"]
        if ctype == "multi_series_line":
            multi_series_line_chart(
                csv_path=csv_path,
                title=chart["title"],
                x_key=chart["x_key"],
                y_label=chart["y_label"],
                source=chart["source"],
                caveat=chart["caveat"],
                filename=chart["filename"],
                alt_text=chart.get("alt_text", chart["title"]),
            )
            continue
        if ctype == "paired_horizontal_bar":
            paired_horizontal_bar_chart(
                csv_path=csv_path,
                title=chart["title"],
                x_key=chart["x_key"],
                y_key_left=chart["y_key_left"],
                y_key_right=chart["y_key_right"],
                label_left=chart["label_left"],
                label_right=chart["label_right"],
                source=chart["source"],
                caveat=chart["caveat"],
                filename=chart["filename"],
                alt_text=chart.get("alt_text", chart["title"]),
            )
            continue
        kwargs = {
            "csv_path": csv_path,
            "title": chart["title"],
            "x_key": chart["x_key"],
            "y_key": chart["y_key"],
            "source": chart["source"],
            "caveat": chart["caveat"],
            "filename": chart["filename"],
            "alt_text": chart.get("alt_text", chart["title"]),
        }
        if ctype == "grouped_bar":
            grouped_bar_chart(**kwargs, y_label=chart["y_label"], unit=chart.get("unit", "%"))
        elif ctype == "stacked_bar":
            stacked_bar_chart(**kwargs, y_label=chart["y_label"])
        elif ctype == "line":
            line_chart(**kwargs, y_label=chart["y_label"])
        elif ctype == "horizontal_bar":
            horizontal_bar_chart(**kwargs, x_label=chart["x_label"], unit=chart.get("unit", "%"), colors=chart.get("colors"))
        elif ctype == "pie":
            pie_chart(**kwargs)
        elif ctype == "diverging_bar":
            diverging_bar_chart(**kwargs, x_label=chart["x_label"], unit=chart.get("unit", ""))
        else:
            print(f"Unknown chart type: {ctype}")


if __name__ == "__main__":
    main()
