#!/usr/bin/env python3
"""Download the art of each map of the wiki, for the map selector of the valuables.

    python3 scripts/fetch_maps.py [--width 480]

Each map page of https://repo-2025horror.fandom.com has one image named after the map (HMM, MJS, MOHA, SVR,
SBA), and the five share the same kind of picture, so they sit well side by side. The wiki scales each one to
a fixed width and the files go to apps/web/public/icons/maps/<id>.webp, with the file page they came from in
manifest.json. The art belongs to its authors, so the manifest keeps the source. Only the standard library
is used.
"""

from __future__ import annotations

import argparse
import json
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

API = "https://repo-2025horror.fandom.com/api.php"
AGENT = "repo-lab-maps-fetch (https://github.com/Cetrei/repo-lab)"
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "apps" / "web" / "public" / "icons" / "maps"

# The id is the one of data/valuables.yaml, the file is the picture of the map on the wiki.
MAPS = {
    "headman-manor": "HMM.png",
    "mcjannek-station": "MJS.PNG",
    "museum-of-human-art": "MOHA.png",
    "sunstone-valley-resort": "SVR.png",
    "swiftbroom-academy": "SBA.png",
}


def get(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        data: bytes = response.read()
    return data


def file_info() -> dict[str, dict[str, Any]]:
    query = urllib.parse.urlencode(
        {
            "action": "query",
            "titles": "|".join(f"File:{name}" for name in MAPS.values()),
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
            found[page["title"].removeprefix("File:")] = info[0]
    return found


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--width", type=int, default=480, help="width in pixels of each saved image")
    args = parser.parse_args()
    info = file_info()
    OUT.mkdir(parents=True, exist_ok=True)
    manifest: list[dict[str, Any]] = []
    for map_id, name in MAPS.items():
        meta = info.get(name)
        if meta is None:
            print("without an image on the wiki:", map_id)
            continue
        base, _, _ = meta["url"].partition("?")
        scaled = base.replace(
            "/revision/latest", f"/revision/latest/scale-to-width-down/{min(args.width, int(meta['width']))}"
        )
        (OUT / f"{map_id}.webp").write_bytes(get(scaled))
        manifest.append(
            {
                "id": map_id,
                "title": name,
                "source": meta["descriptionurl"],
                "original": [meta["width"], meta["height"]],
            }
        )
    text = json.dumps(
        {"wiki": "https://repo-2025horror.fandom.com", "maps": manifest}, indent=2, ensure_ascii=False
    )
    (OUT / "manifest.json").write_text(text + "\n", encoding="utf-8")
    print(f"{len(manifest)} map images saved")


if __name__ == "__main__":
    main()
