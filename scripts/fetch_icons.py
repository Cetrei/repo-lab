#!/usr/bin/env python3
"""Download the game art for upgrades, monsters, cosmetic crates and the semibot from the wiki.

    python3 scripts/fetch_icons.py [--size 192]

The images come from the MediaWiki API of https://repo-2025horror.fandom.com. Each one is scaled by
the wiki itself to a fixed width, saved under apps/web/public/icons/<kind>/<id>.png and listed in
apps/web/public/icons/manifest.json with the file page it came from. The game art belongs to its
authors: the manifest keeps the source so the site can credit it. Only the standard library is used.
"""

from __future__ import annotations

import argparse
import json
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

API = "https://repo-2025horror.fandom.com/api.php"
AGENT = "repo-lab-icon-fetch (https://github.com/Cetrei/repo-lab)"
OUT = Path(__file__).resolve().parent.parent / "apps" / "web" / "public" / "icons"

# catalog id -> title of the wiki file
UPGRADES: dict[str, str] = {
    "strength": "Strength Upgrade.png",
    "range": "Range Upgrade.png",
    "stamina": "Stamina Upgrade.png",
    "sprint": "Sprint Speed Upgrade.png",
    "crouch-rest": "Crouch Rest Upgrade.png",
    "health": "Upgrade Health Albedo.png",
    "map-player-count": "Player Count Upgrade.png",
    "tumble-launch": "Tumble Launch Upgrade.png",
    "tumble-wings": "Tumble Wings Upgrade.png",
    "tumble-climb": "Tumble Climb Upgrade.png",
    "extra-jump": "Extra Jump Upgrade.png",
    "death-head-battery": "Death Head Battery Upgrade.png",
}

MONSTERS: dict[str, str] = {
    "gnome": "Gnome Transparent.png",
    "banger": "Banger Transparent.png",
    "tick": "Tick monster.png",
    "spewer": "Spewer Transparent.png",
    "birthday-boy": "Birthday Boy monster.png",
    "rugrat": "Rugrat Transparent.png",
    "animal": "Animal Transparent.png",
    "upscream": "Upscream Transparent.png",
    "hidden": "Hidden Transparent.png",
    "mentalist": "Mentalist Transparent.png",
    "headgrab": "Headgrab monster.png",
    "bowtie": "Bowtie Transparent.png",
    "shadow-child": "Shadow Child Transparent.png",
    "bella": "Bella monster.png",
    "chef": "Chef Transparent.png",
    "gambit": "Gambit monster.png",
    "heart-hugger": "Heart Hugger monster.png",
    "oogly": "Oogly monster.png",
    "huntsman": "Huntsman Transparent.png",
    "reaper": "Reaper Transparent.png",
    "headman": "Headman Transparent.png",
    "robe": "Robe Transparent.png",
    "clown": "Clown beamer.png",
    "trudge": "Trudge Transparent.png",
    "cleanup-crew": "Cleanup Crew monster.png",
    "loom": "Loom monster.png",
    "peeper": "Peeper Transparent.png",
    "apex-predator": "Apex Predator Transparent.png",
    "elsa": "Elsa monster.png",
}

# the four cosmetic crates, one per rarity of data/cosmetics.yaml
RARITIES: dict[str, str] = {
    "common": "Common cosm transp.png",
    "uncommon": "Uncommon cosm transp.png",
    "rare": "Rare cosm transp.png",
    "ultra": "Ultra rare cosm transp.png",
}


# the semibot head, tinted in the page with the lobby colors
PLAYERS: dict[str, str] = {
    "head": "Semibot Cropped.png",
}


def get(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        data: bytes = response.read()
    return data


def file_info(titles: list[str]) -> dict[str, dict[str, Any]]:
    """Map each wiki file title to its imageinfo (url, size, description page)."""
    query = urllib.parse.urlencode(
        {
            "action": "query",
            "titles": "|".join(f"File:{t}" for t in titles),
            "prop": "imageinfo",
            "iiprop": "url|size|mime",
            "format": "json",
        }
    )
    payload = json.loads(get(f"{API}?{query}"))
    pages: dict[str, dict[str, Any]] = payload["query"]["pages"]
    found: dict[str, dict[str, Any]] = {}
    for page in pages.values():
        info = page.get("imageinfo")
        if info:
            found[page["title"].removeprefix("File:")] = info[0]
    return found


def scaled(url: str, width: int) -> str:
    """The wiki serves a resized copy when the path carries scale-to-width-down."""
    base, _, query = url.partition("?")
    base = base.replace("/revision/latest", f"/revision/latest/scale-to-width-down/{width}")
    return f"{base}?{query}" if query else base


def fetch_kind(kind: str, mapping: dict[str, str], width: int) -> list[dict[str, Any]]:
    folder = OUT / kind
    folder.mkdir(parents=True, exist_ok=True)
    # title lookups are normalised by the API (first letter uppercase, underscores)
    info = file_info(list(mapping.values()))
    entries: list[dict[str, Any]] = []
    for ident, title in mapping.items():
        meta = info.get(title) or info.get(title.replace(" ", "_"))
        if meta is None:
            raise SystemExit(f"{kind}/{ident}: {title!r} is not on the wiki")
        target = folder / f"{ident}.png"
        target.write_bytes(get(scaled(meta["url"], min(width, int(meta["width"])))))
        entries.append(
            {
                "kind": kind,
                "id": ident,
                "file": f"{kind}/{ident}.png",
                "title": title,
                "source": meta["descriptionurl"],
                "original": [meta["width"], meta["height"]],
            }
        )
        print(f"{kind}/{ident}.png  {target.stat().st_size // 1024} KB")
    return entries


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0] if __doc__ else None)
    parser.add_argument("--size", type=int, default=192, help="width in pixels of each saved image")
    args = parser.parse_args()
    entries = (
        fetch_kind("upgrades", UPGRADES, args.size)
        + fetch_kind("monsters", MONSTERS, args.size)
        + fetch_kind("rarities", RARITIES, args.size)
        + fetch_kind("players", PLAYERS, args.size)
    )
    manifest = {"wiki": "https://repo-2025horror.fandom.com", "icons": entries}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(f"{len(entries)} icons, manifest written")


if __name__ == "__main__":
    main()
