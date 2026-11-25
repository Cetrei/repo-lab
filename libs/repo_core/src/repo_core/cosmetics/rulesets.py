"""Cosmetic box rulesets, read from data/cosmetics.yaml.

Each ruleset has six steps. A box slot walks through the steps as the level climbs: slot 1 starts at
level 1, slot 2 one stride later and so on, and every slot stops at the last step. The number of slots
and the stride come from the data file too.

Sources are listed in the file itself and in docs/DATA_SOURCES.md.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from ..catalog import TableCatalog
from ..datafiles import load_table
from ..errors import DataError


class Rarity(StrEnum):
    COMMON = "common"
    UNCOMMON = "uncommon"
    RARE = "rare"
    ULTRA = "ultra"


RARITIES: tuple[Rarity, ...] = tuple(Rarity)
STEPS = 6


def _normalized(rows: tuple[tuple[float, ...], ...]) -> tuple[tuple[float, ...], ...]:
    """Published tables are rounded, so rows can sum to 99.7 or 100.2. Force them to 1."""
    out = []
    for row in rows:
        total = sum(row)
        out.append(tuple(value / total for value in row))
    return tuple(out)


@dataclass(frozen=True, slots=True)
class Ruleset:
    id: str
    label: str
    patch: str
    spawn_by_step: tuple[float, ...]
    rarity_by_step: tuple[tuple[float, ...], ...]
    bad_luck_bonus: float
    note: str = ""

    def __post_init__(self) -> None:
        if len(self.spawn_by_step) != STEPS or len(self.rarity_by_step) != STEPS:
            raise ValueError("a ruleset needs exactly six steps")


def _load() -> tuple[TableCatalog[Ruleset], str, int, int, list[dict[str, str]]]:
    table = load_table("cosmetics.yaml")
    slots = table.child("slots")
    count, stride = slots.integer("count"), slots.integer("stride")
    if count < 1 or stride < 1:
        raise DataError("cosmetics.yaml: slots.count and slots.stride must be at least 1")
    rulesets = []
    for row in table.rows("rulesets"):
        row.only("id", "label", "patch", "bad_luck_bonus", "spawn_by_step", "rarity_by_step", "note")
        rulesets.append(
            Ruleset(
                id=row.text("id"),
                label=row.text("label"),
                patch=row.text("patch"),
                spawn_by_step=tuple(v / 100 for v in row.numbers("spawn_by_step", STEPS)),
                rarity_by_step=_normalized(row.matrix("rarity_by_step", STEPS, len(RARITIES))),
                bad_luck_bonus=row.number("bad_luck_bonus") / 100,
                note=row.opt_text("note"),
            )
        )
    catalog = TableCatalog("ruleset", rulesets)
    default = table.text("default")
    if default not in catalog:
        raise DataError(f"cosmetics.yaml: default '{default}' is not a ruleset id")
    return catalog, default, count, stride, table.sources()


RULESETS, DEFAULT_RULESET_ID, MAX_SLOTS, SLOT_STRIDE, SOURCES = _load()
MAXED_LEVEL = SLOT_STRIDE * (MAX_SLOTS - 1) + STEPS
