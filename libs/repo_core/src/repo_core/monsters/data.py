"""Monster table, read from data/monsters.yaml.

`tier` is the danger level of the wiki (1 to 3), which sets how many of them a level spawns.
`solo_upgrades` is the listed breakpoint, in purchased Strength upgrades. The game compares the
combined internal strength (base strength per player plus their upgrades) with the base plus
`solo_upgrades`. `None` means the monster cannot be lifted while it is active.

`weight` is the weight class of the wiki, 0 (very light) to 4 (very heavy). Health is only filled where a
source states it. A missing value stays `None`, never a guess.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from ..catalog import TableCatalog
from ..datafiles import load_table
from ..errors import DataError

MAX_WEIGHT = 4


@dataclass(frozen=True, slots=True)
class Monster:
    id: str
    name: str
    tier: int
    solo_upgrades: int | None
    stunned_upgrades: int | None = None
    weight: int = 2
    big: bool = False
    health: int | None = None
    note: str = ""


def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def _load() -> tuple[TableCatalog[Monster], int, int, float, int, list[dict[str, str]]]:
    table = load_table("monsters.yaml")
    rules = table.child("rules").only("base_strength", "max_players", "hard_ratio", "big_weight")
    base, players = rules.integer("base_strength"), rules.integer("max_players")
    if base < 1 or players < 1:
        raise DataError("monsters.yaml: rules.base_strength and rules.max_players must be at least 1")
    ratio = rules.number("hard_ratio")
    if not 0 < ratio <= 1:
        raise DataError("monsters.yaml: rules.hard_ratio must be above 0 and at most 1")
    big_weight = rules.integer("big_weight")
    if not 0 <= big_weight <= MAX_WEIGHT:
        raise DataError(f"monsters.yaml: rules.big_weight must be between 0 and {MAX_WEIGHT}")
    monsters = []
    for row in table.rows("monsters"):
        row.only("name", "tier", "lift", "stunned", "weight", "health", "note")
        name = row.text("name")
        tier = row.integer("tier")
        if tier not in (1, 2, 3):
            raise DataError(f"monsters.yaml: {name} has tier {tier}, it must be 1, 2 or 3")
        weight = row.integer("weight")
        if not 0 <= weight <= MAX_WEIGHT:
            raise DataError(
                f"monsters.yaml: {name} has weight {weight}, it must be between 0 and {MAX_WEIGHT}"
            )
        monsters.append(
            Monster(
                id=_slug(name),
                name=name,
                tier=tier,
                solo_upgrades=row.required_integer_or_null("lift"),
                stunned_upgrades=row.opt_integer("stunned"),
                weight=weight,
                big=weight >= big_weight,
                health=row.opt_integer("health"),
                note=row.opt_text("note"),
            )
        )
    return TableCatalog("monster", monsters), base, players, ratio, big_weight, table.sources()


MONSTERS, BASE_STRENGTH, MAX_PLAYERS, HARD_RATIO, BIG_WEIGHT, SOURCES = _load()
