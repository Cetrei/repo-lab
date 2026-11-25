"""Compara data/monsters.yaml con las fichas de la wiki de R.E.P.O. (MediaWiki API).

Una sola peticion a la API publica de repo-2025horror.fandom.com, con un User-Agent honesto, sin
cookies ni disfraz de navegador. Lee de cada ficha los campos del infobox `str._to_grab`,
`str._to_grab_stun` y `object_mass`, y los pone junto a lo que dice el yaml.

Uso: python3 scripts/wiki_check.py
"""

from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://repo-2025horror.fandom.com/api.php"
UA = "repo-lab personal data check (one request, see scripts/wiki_check.py)"
YAML = Path(__file__).resolve().parent.parent / "data" / "monsters.yaml"
# La ficha del Clown se llama distinto porque hay un valuable con el mismo nombre.
TITLE = {"Clown": "Clown (Monster)"}


def yaml_rows() -> dict[str, dict[str, str | None]]:
    rows = {}
    pattern = re.compile(r"\s*- \{name: ([^,]+), tier: (\d), lift: ([^,]+),(?: stunned: (\[[^\]]*\]|\d+),)?")
    for line in YAML.read_text(encoding="utf-8").splitlines():
        match = pattern.match(line)
        if match:
            rows[match.group(1)] = {"tier": match.group(2), "lift": match.group(3), "stunned": match.group(4)}
    return rows


def infobox_field(text: str, key: str) -> str:
    found = re.search(r"\|\s*" + re.escape(key) + r"\s*=\s*([^\n|]*)", text)
    return found.group(1).strip().rstrip("}") if found else ""


def first_number(value: str) -> str:
    found = re.search(r"\d+(?:\.\d+)?", value)
    return found.group(0) if found else value


def mass_of(text: str) -> str:
    # El Cleanup Crew lista dos masas (cuerpo y cabeza): se usa la del cuerpo.
    body = re.search(r"object_mass\s*=\s*Monster:\s*\*?\s*(\d+(?:\.\d+)?)", text)
    return body.group(1) if body else first_number(infobox_field(text, "object_mass"))


def wiki_infoboxes(names: list[str]) -> dict[str, dict[str, str]]:
    titles = "|".join(TITLE.get(n, n) for n in names)
    query = urllib.parse.urlencode(
        {
            "action": "query",
            "prop": "revisions",
            "rvprop": "content|timestamp",
            "rvslots": "main",
            "format": "json",
            "formatversion": 2,
            "titles": titles,
        }
    )
    request = urllib.request.Request(f"{API}?{query}", headers={"User-Agent": UA})
    with urllib.request.urlopen(request, timeout=60) as response:
        pages = json.load(response)["query"]["pages"]
    result = {}
    for page in pages:
        if "revisions" not in page:
            continue
        revision = page["revisions"][0]
        text = revision["slots"]["main"]["content"]
        name = page["title"].replace(" (Monster)", "")
        result[name] = {
            "grab": infobox_field(text, "str._to_grab"),
            "stun": first_number(infobox_field(text, "str._to_grab_stun")),
            "mass": mass_of(text),
            "edited": revision["timestamp"][:10],
        }
    return result


def main() -> None:
    rows = yaml_rows()
    wiki = wiki_infoboxes(list(rows))
    cols = ("lift yaml", "lift wiki", "stun yaml", "stun wiki", "masa")
    widths = (10, 11, 11, 11, 7)
    head = "".join(f"{c:>{w}}" for c, w in zip(cols, widths, strict=True))
    print(f"{'monstruo':14}{head}  editado   nota")
    for name, row in rows.items():
        info = wiki.get(name)
        if info is None:
            print(f"{name:14}{row['lift']:>10}{'sin ficha':>11}")
            continue
        notes = []
        if row["lift"] != info["grab"] and info["grab"] not in ("[Impossible]", ""):
            notes.append("lift distinto")
        yaml_stun = row["stunned"] or ""
        if info["stun"] == "" and yaml_stun:
            notes.append("la wiki no trae aturdido")
        elif info["stun"] and yaml_stun and info["stun"] != yaml_stun:
            notes.append("aturdido distinto")
        print(
            f"{name:14}{row['lift']:>10}{info['grab']:>11}{yaml_stun or '-':>11}{info['stun'] or '-':>11}"
            f"{info['mass']:>7}  {info['edited']}  {', '.join(notes)}"
        )


if __name__ == "__main__":
    main()
