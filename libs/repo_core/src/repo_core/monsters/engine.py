"""Can this team lift this monster?

Rule (see docs/DATA_SOURCES.md): every player starts with 5 internal strength and adds 1 per
purchased Strength upgrade. Strength of everyone who grabs adds up. A monster listed at N upgrades
needs a combined internal strength of at least 5 + N.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from math import ceil

from ..catalog import Catalog
from ..checks import require_int
from ..errors import InvalidInput
from .data import BASE_STRENGTH, MAX_PLAYERS, MONSTERS, Monster

MAX_UPGRADES = 99


@dataclass(frozen=True, slots=True)
class LiftCheck:
    monster_id: str
    name: str
    health: int | None
    note: str
    liftable: bool
    required: int | None
    combined: int
    can_lift: bool
    margin: int | None
    missing: int
    min_players_without_upgrades: int | None
    upgrades_from_zero: tuple[int, ...] | None
    stunned_required: int | None
    can_lift_stunned: bool | None
    players_needed: int | None
    players_needed_stunned: int | None


def combined_strength(upgrades: Sequence[int]) -> int:
    """Internal strength of a team, one entry per player with their purchased Strength upgrades."""
    if not 1 <= len(upgrades) <= MAX_PLAYERS:
        raise InvalidInput(f"players must be between 1 and {MAX_PLAYERS}")
    return sum(BASE_STRENGTH + require_int("upgrades", u, 0, MAX_UPGRADES) for u in upgrades)


def required_strength(monster: Monster) -> int | None:
    if monster.solo_upgrades is None:
        return None
    return BASE_STRENGTH + monster.solo_upgrades


def upgrades_from_zero(monster: Monster) -> tuple[int, ...] | None:
    """Total Strength upgrades the whole team must buy, for 1 to MAX_PLAYERS players."""
    need = required_strength(monster)
    if need is None:
        return None
    return tuple(max(0, need - BASE_STRENGTH * n) for n in range(1, MAX_PLAYERS + 1))


def players_needed(need: int | None, upgrades: Sequence[int]) -> int | None:
    """Fewest players of this team that reach `need` together, strongest first.

    None when the monster has no figure or when the whole team still falls short.
    """
    if need is None:
        return None
    total = 0
    for count, bought in enumerate(sorted(upgrades, reverse=True), start=1):
        total += BASE_STRENGTH + bought
        if total >= need:
            return count
    return None


def lift_check(monster: Monster, upgrades: Sequence[int]) -> LiftCheck:
    combined = combined_strength(upgrades)
    need = required_strength(monster)
    stunned_need = None if monster.stunned_upgrades is None else BASE_STRENGTH + monster.stunned_upgrades
    return LiftCheck(
        monster_id=monster.id,
        name=monster.name,
        health=monster.health,
        note=monster.note,
        liftable=need is not None,
        required=need,
        combined=combined,
        can_lift=need is not None and combined >= need,
        margin=None if need is None else combined - need,
        missing=0 if need is None else max(0, need - combined),
        min_players_without_upgrades=None if need is None else ceil(need / BASE_STRENGTH),
        upgrades_from_zero=upgrades_from_zero(monster),
        stunned_required=stunned_need,
        can_lift_stunned=None if stunned_need is None else combined >= stunned_need,
        players_needed=players_needed(need, upgrades),
        players_needed_stunned=players_needed(stunned_need, upgrades),
    )


def lift_table(upgrades: Sequence[int], catalog: Catalog[Monster] | None = None) -> list[LiftCheck]:
    """Every monster for one team, easiest first. Monsters that cannot be lifted go last."""
    monsters = (catalog or MONSTERS).all()
    rows = [lift_check(m, upgrades) for m in monsters]
    rows.sort(key=lambda r: (r.required is None, r.required or 0, r.name))
    return rows
