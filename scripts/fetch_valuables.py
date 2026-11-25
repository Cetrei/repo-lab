#!/usr/bin/env python3
"""Read every valuable of the wiki into data/valuables.yaml and download its art.

    python3 scripts/fetch_valuables.py [--size 128] [--no-images]

The list comes from the wikitext of https://repo-2025horror.fandom.com/wiki/Valuables through the
MediaWiki API: the table of all valuables (value, size, mass, impact damage and location) and the table of
trap valuables (noise range and what sets them off). Each image is scaled by the wiki to a fixed width and
saved under apps/web/public/icons/valuables/<id>.png, with the file page it came from listed in
apps/web/public/icons/valuables/manifest.json. The art belongs to its authors, so the manifest keeps the
source. Only the standard library is used.
"""

from __future__ import annotations

import argparse
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

API = "https://repo-2025horror.fandom.com/api.php"
PAGE = "https://repo-2025horror.fandom.com/wiki/Valuables"
AGENT = "repo-lab-valuables-fetch (https://github.com/Cetrei/repo-lab)"
ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "valuables.yaml"
ICONS = ROOT / "apps" / "web" / "public" / "icons" / "valuables"

# The wiki says that only valuables with a maximum impact damage of 30 or more stun big enemies.
BIG_STUN_DAMAGE = 30
BIG_STUN_SOURCE = "R.E.P.O. wiki, Valuables"

SIZES = ("Tiny", "Small", "Medium", "Big", "Wide", "Tall", "Very Tall")
ROW = re.compile(r"\{\{ValuablesTableRow\s*\n(.*?)\n\}\}", re.DOTALL)
FIELD = re.compile(r"^\|(\w+)=(.*)$")


def get(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        data: bytes = response.read()
    return data


def wikitext(page: str) -> str:
    query = urllib.parse.urlencode(
        {"action": "parse", "page": page, "prop": "wikitext", "format": "json", "redirects": "1"}
    )
    payload = json.loads(get(f"{API}?{query}"))
    text: str = payload["parse"]["wikitext"]["*"]
    return text


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def fields(block: str) -> dict[str, str]:
    """The `|key=value` lines of one template call. A line without a key continues the previous value."""
    found: dict[str, str] = {}
    last = ""
    for line in re.sub(r"<!--.*?-->", "", block, flags=re.DOTALL).splitlines():
        match = FIELD.match(line)
        if match:
            last = match.group(1)
            found[last] = match.group(2).strip()
        elif last:
            found[last] = f"{found[last]}\n{line.strip()}"
    return found


def money(text: str) -> tuple[int, int]:
    numbers = [int(n.replace(",", "")) for n in re.findall(r"\d[\d,]*", text)]
    if not numbers:
        raise SystemExit(f"no value in {text!r}")
    return numbers[0], numbers[-1]


def traps(text: str) -> dict[str, dict[str, Any]]:
    """Name -> noise range and trigger, from the table of trap valuables."""
    start = text.find("=== Traps Valuables ===")
    end = text.find("\n== ", start)
    section = text[start:end]
    found: dict[str, dict[str, Any]] = {}
    pattern = re.compile(
        r"\|-\n\|\[\[([^\]|]+)(?:\|[^\]]*)?\]\]\n\|\[\[File:[^\n]*\n\|(\d+)[^\n]*\n\|([^\n]*)\n"
    )
    for name, noise, trigger in pattern.findall(section):
        found[name.strip()] = {"noise": int(noise), "trigger": trigger.strip()}
    return found


def read_rows(text: str) -> list[dict[str, Any]]:
    trap_table = traps(text)
    rows: list[dict[str, Any]] = []
    seen: set[str] = set()
    for block in ROW.findall(text):
        row = fields(block)
        name = row.get("item", "").strip()
        size = row.get("size", "").strip()
        if not name or size not in SIZES:
            raise SystemExit(f"unreadable row {row!r}")
        low, high = money(row.get("value", ""))
        damage_lines = row.get("damage", "").splitlines()
        damage = [int(n) for n in re.findall(r"\d+", damage_lines[0])] if damage_lines else []
        extra = "; ".join(text_line for text_line in damage_lines[1:] if text_line)
        if len(damage) != 4:
            # a few rows give a range instead of the four levels: keep the top figure and the wiki's words
            print(f"{name}: impact damage {damage_lines[:1]!r}, kept as its top figure")
            extra = "; ".join(part for part in (damage_lines[0] if damage_lines else "", extra) if part)
            damage = [0, 0, 0, max(damage, default=0)]
        ident = slug(name)
        location = row.get("location", "").strip()
        if ident in seen:
            ident = f"{ident}-{slug(location)}"
        seen.add(ident)
        entry: dict[str, Any] = {
            "id": ident,
            "name": name,
            "location": location,
            "size": size,
            "low": low,
            "high": high,
            "mass": mass_of(row.get("mass", "")),
            "damage": damage,
            "image": row.get("image", "").strip(),
        }
        if extra:
            entry["note"] = extra
        trap = trap_table.get(name)
        if trap:
            entry["trap"] = trap
        rows.append(entry)
    return rows


def mass_of(text: str) -> float:
    """The mass of an item. Rows that say "Varies (Up to 3)" keep their top figure."""
    numbers = re.findall(r"\d+(?:\.\d+)?", text)
    return max((float(n) for n in numbers), default=0.0)


def quoted(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def render(entry: dict[str, Any]) -> str:
    parts = [
        f"id: {entry['id']}",
        f"name: {quoted(entry['name'])}",
        f"location: {slug(entry['location'])}",
        f"size: {entry['size'].lower().replace(' ', '_')}",
        f"low: {entry['low']}",
        f"high: {entry['high']}",
        f"mass: {entry['mass']}",
        f"damage: [{', '.join(str(n) for n in entry['damage'])}]",
    ]
    if "trap" in entry:
        parts.append(f"noise: {entry['trap']['noise']}")
        parts.append(f"trigger: {quoted(entry['trap']['trigger'])}")
    if "note" in entry:
        parts.append(f"note: {quoted(entry['note'])}")
    return "  - {" + ", ".join(parts) + "}"


def write_data(rows: list[dict[str, Any]]) -> None:
    places = sorted({row["location"] for row in rows})
    lines = [
        (
            "# Valuables of every location, read from the wiki by scripts/fetch_valuables.py. "
            "Do not edit by hand:"
        ),
        (
            "# run the script again. `low` and `high` are the value range in dollars, "
            "`mass` the mass of the item,"
        ),
        (
            "# `damage` its impact damage at the four hit strengths (none, light, medium, heavy). "
            "`noise` and `trigger`"
        ),
        "# are only there for the trap valuables.",
        "",
        "sources:",
        "  - name: R.E.P.O. wiki, Valuables",
        f"    url: {PAGE}",
        (
            "    note: Table of all valuables and table of trap valuables, "
            "read on the day the file was generated."
        ),
        "",
        "locations:",
        *(f"  - {{id: {slug(place)}, name: {quoted(place)}}}" for place in places),
        "",
        "rules:",
        f"  # Impact damage at the heavy hit from which a valuable stuns big enemies ({BIG_STUN_SOURCE}).",
        f"  big_stun_damage: {BIG_STUN_DAMAGE}",
        "",
        "valuables:",
        *(render(row) for row in rows),
        "",
    ]
    DATA.write_text("\n".join(lines), encoding="utf-8")


def file_info(titles: list[str]) -> dict[str, dict[str, Any]]:
    query = urllib.parse.urlencode(
        {
            "action": "query",
            "titles": "|".join(f"File:{title}" for title in titles),
            "prop": "imageinfo",
            "iiprop": "url|size",
            "format": "json",
        }
    )
    payload = json.loads(get(f"{API}?{query}"))
    found: dict[str, dict[str, Any]] = {}
    for page in payload["query"]["pages"].values():
        info = page.get("imageinfo")
        if info:
            found[page["title"].removeprefix("File:").replace("_", " ")] = info[0]
    return found


def scaled(url: str, width: int) -> str:
    base, _, query = url.partition("?")
    base = base.replace("/revision/latest", f"/revision/latest/scale-to-width-down/{width}")
    return f"{base}?{query}" if query else base


def fetch_images(rows: list[dict[str, Any]], width: int) -> None:
    ICONS.mkdir(parents=True, exist_ok=True)
    titles = sorted({row["image"].replace("_", " ") for row in rows if row["image"]})
    info: dict[str, dict[str, Any]] = {}
    for start in range(0, len(titles), 40):
        info.update(file_info(titles[start : start + 40]))
    manifest: list[dict[str, Any]] = []
    missing: list[str] = []
    for row in rows:
        meta = info.get(row["image"].replace("_", " "))
        if meta is None:
            missing.append(row["name"])
            continue
        target = ICONS / f"{row['id']}.png"
        target.write_bytes(get(scaled(meta["url"], min(width, int(meta["width"])))))
        manifest.append(
            {
                "id": row["id"],
                "title": row["image"],
                "source": meta["descriptionurl"],
                "original": [meta["width"], meta["height"]],
            }
        )
    text = json.dumps(
        {"wiki": "https://repo-2025horror.fandom.com", "icons": manifest}, indent=2, ensure_ascii=False
    )
    (ICONS / "manifest.json").write_text(text + "\n", encoding="utf-8")
    print(f"{len(manifest)} images saved")
    if missing:
        print("without an image on the wiki:", ", ".join(missing))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0] if __doc__ else None)
    parser.add_argument("--size", type=int, default=128, help="width in pixels of each saved image")
    parser.add_argument("--no-images", action="store_true", help="only rewrite data/valuables.yaml")
    args = parser.parse_args()
    rows = read_rows(wikitext("Valuables"))
    write_data(rows)
    print(f"{len(rows)} valuables in {len({row['location'] for row in rows})} locations")
    if not args.no_images:
        fetch_images(rows, args.size)


if __name__ == "__main__":
    main()
