"""Can this team lift this monster?

Rule (see docs/DATA_SOURCES.md): every player starts with 5 internal strength and adds 1 per
purchased Strength upgrade. Strength of everyone who grabs adds up. A monster listed at N upgrades
needs a combined internal strength of at least 5 + N.

Below that figure a team may still hold the monster with effort. `HARD_RATIO` of the data file says from which
share of the figure on, see `effort_for`.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from math import ceil

from ..catalog import Catalog
from ..checks import require_int
from ..errors import InvalidInput
from .data import BASE_STRENGTH, HARD_RATIO, MAX_PLAYERS, MONSTERS, Monster

MAX_UPGRADES = 99

# How a team stands against a monster it wants to lift.
EASY = "easy"  # the team reaches the listed figure
HARD = "hard"  # it holds the monster, but it costs
NONE = "none"  # it cannot lift it yet
NEVER = "never"  # no amount of strength lifts it


@dataclass(frozen=True, slots=True)
class LiftCheck:
    monster_id: str
    name: str
    health: int | None
    drain: int | None
    note: str
    liftable: bool
    required: int | None
    combined: int
    base_strength: int
    can_lift: bool
    margin: int | None
    missing: int
    min_players_without_upgrades: int | None
    upgrades_from_zero: tuple[int, ...] | None
    stunned_required: int | None
    stunned_required_min: int | None
    can_lift_stunned: bool | None
    players_needed: int | None
    players_needed_stunned: int | None
    players_needed_stunned_min: int | None
    effort: str
    hard_required: int | None


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


def hard_strength(need: int | None) -> int | None:
    """The least combined strength that still holds a monster that needs `need`, at `HARD_RATIO` of it."""
    if need is None:
        return None
    return min(need, max(1, ceil(need * HARD_RATIO)))


def effort_for(need: int | None, combined: int) -> str:
    """`easy` from the listed figure, `hard` from `hard_strength` up to it, `none` below.

    `never` is the answer for a monster without a figure.
    """
    if need is None:
        return NEVER
    if combined >= need:
        return EASY
    hard = hard_strength(need)
    return HARD if hard is not None and combined >= hard else NONE


def stunned_range(monster: Monster) -> tuple[int, int] | None:
    """The least and the most internal strength the sources ask to hold the monster stunned.

    Both are the same when the sources agree, and None when none of them gives a figure.
    """
    if not monster.stunned_upgrades:
        return None
    return BASE_STRENGTH + monster.stunned_upgrades[0], BASE_STRENGTH + monster.stunned_upgrades[-1]


def can_lift_stunned(figures: tuple[int, int] | None, combined: int) -> bool | None:
    """True when the team reaches even the highest figure, False when it misses even the lowest.

    None when there is no figure, or when the figures disagree and the team falls between them.
    """
    if figures is None:
        return None
    low, high = figures
    if combined >= high:
        return True
    return False if combined < low else None


def lift_check(monster: Monster, upgrades: Sequence[int]) -> LiftCheck:
    combined = combined_strength(upgrades)
    need = required_strength(monster)
    stunned = stunned_range(monster)
    stunned_low, stunned_high = stunned if stunned is not None else (None, None)
    return LiftCheck(
        monster_id=monster.id,
        name=monster.name,
        health=monster.health,
        drain=monster.drain,
        note=monster.note,
        liftable=need is not None,
        required=need,
        combined=combined,
        base_strength=BASE_STRENGTH,
        can_lift=need is not None and combined >= need,
        margin=None if need is None else combined - need,
        missing=0 if need is None else max(0, need - combined),
        min_players_without_upgrades=None if need is None else ceil(need / BASE_STRENGTH),
        upgrades_from_zero=upgrades_from_zero(monster),
        stunned_required=stunned_high,
        stunned_required_min=stunned_low,
        can_lift_stunned=can_lift_stunned(stunned, combined),
        players_needed=players_needed(need, upgrades),
        players_needed_stunned=players_needed(stunned_high, upgrades),
        players_needed_stunned_min=players_needed(stunned_low, upgrades),
        effort=effort_for(need, combined),
        hard_required=hard_strength(need),
    )


def lift_table(upgrades: Sequence[int], catalog: Catalog[Monster] | None = None) -> list[LiftCheck]:
    """Every monster for one team, easiest first. Monsters that cannot be lifted go last."""
    monsters = (catalog or MONSTERS).all()
    rows = [lift_check(m, upgrades) for m in monsters]
    rows.sort(key=lambda r: (r.required is None, r.required or 0, r.name))
    return rows
