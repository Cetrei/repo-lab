"""Writes the golden fixtures that the TypeScript contract is tested against.

Every case is an endpoint, a request and the exact envelope Python answers with. Run it without
arguments to rewrite `packages/contract/fixtures/cases.json`, or with `--check` to fail when the file on
disk is out of date (the Python tests and the CI do that).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from repo_api.app import DISPATCHER

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "packages" / "contract" / "fixtures" / "cases.json"

CASES: tuple[tuple[str, str, Any], ...] = (
    ("rulesets", "cosmetics.rulesets", None),
    ("level one", "cosmetics.level", {"level": 1}),
    ("level twelve with bad luck", "cosmetics.level", {"level": 12, "bad_luck": 3}),
    ("run of five levels", "cosmetics.run", {"start_level": 1, "levels": 5}),
    ("run with bad luck", "cosmetics.run", {"start_level": 4, "levels": 3, "bad_luck": 2}),
    ("level below one", "cosmetics.level", {"level": 0}),
    ("monster catalog", "monsters.catalog", None),
    ("lift with one player", "monsters.lift", {"upgrades": [4]}),
    ("lift with a full team", "monsters.lift", {"upgrades": [2, 0, 5, 1, 0, 3]}),
    ("lift without players", "monsters.lift", {"upgrades": []}),
    ("upgrade catalog", "upgrades.catalog", None),
    ("fresh shop", "upgrades.shop", {}),
    ("shop with units held", "upgrades.shop", {"held": {"strength": 1, "range": 2}, "consumed": ["stamina"]}),
    ("stash plan", "upgrades.stash", {"wanted": ["strength", "health"]}),
    ("use units", "upgrades.use", {"used": {"strength": 1}, "held": {"strength": 2, "range": 1}}),
    ("locate units", "upgrades.locate", {"bought": ["strength", "range", "range"]}),
    ("reroll price", "upgrades.reroll", {"rerolls": 3}),
    ("spawning rules", "spawning.rules", None),
    ("outlook for level seven", "spawning.outlook", {"level": 7}),
    ("outlook for level twelve", "spawning.outlook", {"level": 12}),
    ("despawn window", "spawning.despawn", None),
    (
        "respawn after a kill",
        "spawning.respawn",
        {"minutes_on_level": 20, "killed": True, "noise_seconds": 10},
    ),
    ("respawn late", "spawning.respawn", {"minutes_on_level": 55, "killed": False}),
    ("valuable catalog", "valuables.catalog", None),
    ("valuables of a map", "valuables.map", {"location": "headman-manor"}),
    ("valuables of the any map", "valuables.map", {"location": "any"}),
    ("valuables of an unknown map", "valuables.map", {"location": "nowhere"}),
    ("sources", "meta.sources", None),
    ("unknown endpoint", "nothing.here", None),
    ("request is not an object", "monsters.lift", [1, 2]),
)


def build() -> list[dict[str, Any]]:
    cases = []
    for name, endpoint, request in CASES:
        response = DISPATCHER.dispatch(endpoint, request)
        cases.append({"name": name, "endpoint": endpoint, "request": request, "response": response})
    return cases


def render() -> str:
    return json.dumps(build(), indent=2, ensure_ascii=False) + "\n"


def main(argv: list[str]) -> int:
    text = render()
    if "--check" in argv:
        current = TARGET.read_text(encoding="utf-8") if TARGET.exists() else ""
        if current != text:
            print(f"{TARGET.relative_to(ROOT)} is out of date, run: uv run python scripts/gen_fixtures.py")
            return 1
        return 0
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(text, encoding="utf-8")
    print(f"wrote {len(CASES)} cases to {TARGET.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
