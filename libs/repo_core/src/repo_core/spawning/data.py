"""Enemy spawning and respawn rules, read from data/spawning.yaml.

Source: video GyCMcu3uPIE (alter ego), see docs/DATA_SOURCES.md. The video gives how many enemies spawn
per tier at each level, the chance of a tier 3 group, and the despawn and respawn timers. It does not
give per monster weights or tier membership for the current roster, so the odds of meeting one
specific monster are not modeled.
"""

from __future__ import annotations

import itertools
from dataclasses import dataclass

from ..datafiles import load_table
from ..errors import DataError


@dataclass(frozen=True, slots=True)
class TierCounts:
    tier1: int
    tier2: int
    tier3: int

    @property
    def total(self) -> int:
        return self.tier1 + self.tier2 + self.tier3


@dataclass(frozen=True, slots=True)
class SpawnRules:
    bands: tuple[tuple[int, int | None, TierCounts], ...]
    group_chance: float
    despawn_first_part: tuple[int, int]
    despawn_second_part: tuple[int, int]
    despawn_bubble_units: int
    early_level_minutes: int
    late_level_minutes: int
    early_respawn: tuple[int, int]
    late_respawn: tuple[int, int]
    kill_multiplier: int
    final_extraction_respawn: int
    noise_seconds_removed_per_second: int
    respawn_distance_units: tuple[int, int]
    sources: tuple[dict[str, str], ...]


def _bands() -> tuple[tuple[int, int | None, TierCounts], ...]:
    bands: list[tuple[int, int | None, TierCounts]] = []
    for row in load_table("spawning.yaml").rows("tiers_by_level"):
        row.only("from", "to", "tier1", "tier2", "tier3")
        counts = TierCounts(row.integer("tier1"), row.integer("tier2"), row.integer("tier3"))
        bands.append((row.integer("from"), row.opt_integer("to"), counts))
    if bands[0][0] != 1:
        raise DataError("spawning.yaml: tiers_by_level must start at level 1")
    for (_, last, _), (first, _, _) in itertools.pairwise(bands):
        if last is None or first != last + 1:
            raise DataError(
                "spawning.yaml: tiers_by_level rows must be contiguous, only the last is open ended"
            )
    if bands[-1][1] is not None:
        raise DataError("spawning.yaml: the last tiers_by_level row must not have a `to`")
    return tuple(bands)


def _load() -> SpawnRules:
    table = load_table("spawning.yaml")
    despawn = table.child("despawn").only("first_part", "second_part", "bubble_units")
    respawn = table.child("respawn").only(
        "early_minutes",
        "late_minutes",
        "early",
        "late",
        "kill_multiplier",
        "final_extraction",
        "noise_seconds_removed_per_second",
        "distance_units",
    )
    chance = table.number("group_chance")
    if not 0 <= chance <= 100:
        raise DataError("spawning.yaml: group_chance must be between 0 and 100")
    return SpawnRules(
        bands=_bands(),
        group_chance=chance / 100,
        despawn_first_part=despawn.int_pair("first_part"),
        despawn_second_part=despawn.int_pair("second_part"),
        despawn_bubble_units=despawn.integer("bubble_units"),
        early_level_minutes=respawn.integer("early_minutes"),
        late_level_minutes=respawn.integer("late_minutes"),
        early_respawn=respawn.int_pair("early"),
        late_respawn=respawn.int_pair("late"),
        kill_multiplier=respawn.integer("kill_multiplier"),
        final_extraction_respawn=respawn.integer("final_extraction"),
        noise_seconds_removed_per_second=respawn.integer("noise_seconds_removed_per_second"),
        respawn_distance_units=respawn.int_pair("distance_units"),
        sources=tuple(table.sources()),
    )


RULES = _load()

SPAWN_BANDS = RULES.bands
GROUP_CHANCE = RULES.group_chance
DESPAWN_FIRST_PART = RULES.despawn_first_part
DESPAWN_SECOND_PART = RULES.despawn_second_part
DESPAWN_BUBBLE_UNITS = RULES.despawn_bubble_units
EARLY_LEVEL_MINUTES = RULES.early_level_minutes
LATE_LEVEL_MINUTES = RULES.late_level_minutes
EARLY_RESPAWN = RULES.early_respawn
LATE_RESPAWN = RULES.late_respawn
KILL_MULTIPLIER = RULES.kill_multiplier
FINAL_EXTRACTION_RESPAWN = RULES.final_extraction_respawn
NOISE_SECONDS_REMOVED_PER_SECOND = RULES.noise_seconds_removed_per_second
RESPAWN_DISTANCE_UNITS = RULES.respawn_distance_units
SOURCES = RULES.sources
