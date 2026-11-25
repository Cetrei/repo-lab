"""Valuable table, read from data/valuables.yaml (written by scripts/fetch_valuables.py).

`low` and `high` are the value range in dollars, `mass` the mass of the item and `damage` its impact damage
at the four hit strengths (none, light, medium, heavy). `noise` and `trigger` only exist for trap valuables.
The location `any` holds the valuables that can show up on every map.

`stuns_big` follows the rule of the file: only a valuable whose heaviest hit does `big_stun_damage` or more
stuns a big enemy.
"""

from __future__ import annotations

from dataclasses import dataclass

from ..catalog import TableCatalog
from ..datafiles import load_table
from ..errors import DataError

ANYWHERE = "any"
SIZES = ("tiny", "small", "medium", "big", "wide", "tall", "very_tall")


@dataclass(frozen=True, slots=True)
class Location:
    id: str
    name: str


@dataclass(frozen=True, slots=True)
class Valuable:
    id: str
    name: str
    location: str
    size: str
    low: int
    high: int
    mass: float
    damage: tuple[int, int, int, int]
    noise: int | None = None
    trigger: str = ""
    note: str = ""
    stuns_big: bool = False


def _load() -> tuple[TableCatalog[Location], TableCatalog[Valuable], int, list[dict[str, str]]]:
    table = load_table("valuables.yaml")
    stun = table.child("rules").only("big_stun_damage").integer("big_stun_damage")
    if stun < 1:
        raise DataError("valuables.yaml: rules.big_stun_damage must be at least 1")
    locations = []
    for row in table.rows("locations"):
        row.only("id", "name")
        locations.append(Location(id=row.text("id"), name=row.text("name")))
    places = TableCatalog("location", locations)
    if ANYWHERE not in places:
        raise DataError(f"valuables.yaml: locations must include '{ANYWHERE}'")
    valuables = []
    for row in table.rows("valuables"):
        row.only(
            "id", "name", "location", "size", "low", "high", "mass", "damage", "noise", "trigger", "note"
        )
        name = row.text("name")
        place = row.text("location")
        if place not in places:
            raise DataError(f"valuables.yaml: {name} is in the unknown location '{place}'")
        size = row.text("size")
        if size not in SIZES:
            raise DataError(f"valuables.yaml: {name} has the unknown size '{size}'")
        low, high = row.integer("low"), row.integer("high")
        if not 0 <= low <= high:
            raise DataError(f"valuables.yaml: {name} must have 0 <= low <= high")
        hits = row.numbers("damage", 4)
        damage = (int(hits[0]), int(hits[1]), int(hits[2]), int(hits[3]))
        valuables.append(
            Valuable(
                id=row.text("id"),
                name=name,
                location=place,
                size=size,
                low=low,
                high=high,
                mass=row.number("mass"),
                damage=damage,
                noise=row.opt_integer("noise"),
                trigger=row.opt_text("trigger"),
                note=row.opt_text("note"),
                stuns_big=damage[3] >= stun,
            )
        )
    return places, TableCatalog("valuable", valuables), stun, table.sources()


LOCATIONS, VALUABLES, BIG_STUN_DAMAGE, SOURCES = _load()
