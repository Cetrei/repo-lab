"""Monster table, read from data/monsters.yaml.

`solo_upgrades` is the listed breakpoint, in purchased Strength upgrades. The game compares the
combined internal strength (base strength per player plus their upgrades) with the base plus
`solo_upgrades`. `None` means the monster cannot be lifted while it is active.

Health is only filled where a source states it. A missing value stays `None`, never a guess.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from ..catalog import TableCatalog
from ..datafiles import load_table
from ..errors import DataError


@dataclass(frozen=True, slots=True)
class Monster:
    id: str
    name: str
    solo_upgrades: int | None
    stunned_upgrades: int | None = None
    health: int | None = None
    note: str = ""


def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def _load() -> tuple[TableCatalog[Monster], int, int, list[dict[str, str]]]:
    table = load_table("monsters.yaml")
    rules = table.child("rules").only("base_strength", "max_players")
    base, players = rules.integer("base_strength"), rules.integer("max_players")
    if base < 1 or players < 1:
        raise DataError("monsters.yaml: rules.base_strength and rules.max_players must be at least 1")
    monsters = []
    for row in table.rows("monsters"):
        row.only("name", "lift", "stunned", "health", "note")
        name = row.text("name")
        monsters.append(
            Monster(
                id=_slug(name),
                name=name,
                solo_upgrades=row.required_integer_or_null("lift"),
                stunned_upgrades=row.opt_integer("stunned"),
                health=row.opt_integer("health"),
                note=row.opt_text("note"),
            )
        )
    return TableCatalog("monster", monsters), base, players, table.sources()


MONSTERS, BASE_STRENGTH, MAX_PLAYERS, SOURCES = _load()
