"""Spawn counts, group odds and respawn timers."""

from __future__ import annotations

from dataclasses import dataclass

from ..checks import require_int
from .data import (
    DESPAWN_FIRST_PART,
    DESPAWN_SECOND_PART,
    EARLY_LEVEL_MINUTES,
    EARLY_RESPAWN,
    FINAL_EXTRACTION_RESPAWN,
    GROUP_CHANCE,
    KILL_MULTIPLIER,
    LATE_LEVEL_MINUTES,
    LATE_RESPAWN,
    NOISE_SECONDS_REMOVED_PER_SECOND,
    SPAWN_BANDS,
    TierCounts,
)


@dataclass(frozen=True, slots=True)
class SpawnOutlook:
    level: int
    counts: TierCounts
    group_chance: float
    expected_groups: float
    p_any_group: float


@dataclass(frozen=True, slots=True)
class DespawnWindow:
    low: int
    high: int


@dataclass(frozen=True, slots=True)
class RespawnWindow:
    """Seconds until an enemy is back. `known` is False when the video gives no number."""

    known: bool
    low: int | None
    high: int | None
    reason: str


def enemy_counts(level: int) -> TierCounts:
    require_int("level", level, 1, 10_000)
    for first, last, counts in SPAWN_BANDS:
        if level >= first and (last is None or level <= last):
            return counts
    raise AssertionError("SPAWN_BANDS must cover every level")


def spawn_outlook(level: int) -> SpawnOutlook:
    counts = enemy_counts(level)
    return SpawnOutlook(
        level=level,
        counts=counts,
        group_chance=GROUP_CHANCE,
        expected_groups=counts.tier3 * GROUP_CHANCE,
        p_any_group=1.0 - (1.0 - GROUP_CHANCE) ** counts.tier3,
    )


def despawn_window() -> DespawnWindow:
    """Total seconds from spawn to despawn when no player ever stands inside the bubble."""
    return DespawnWindow(
        low=DESPAWN_FIRST_PART[0] + DESPAWN_SECOND_PART[0],
        high=DESPAWN_FIRST_PART[1] + DESPAWN_SECOND_PART[1],
    )


def respawn_window(
    minutes_on_level: int,
    killed: bool = False,
    noise_seconds: int = 0,
    final_extraction_done: bool = False,
) -> RespawnWindow:
    require_int("minutes_on_level", minutes_on_level, 0, 10_000)
    require_int("noise_seconds", noise_seconds, 0, 100_000)
    if final_extraction_done:
        return RespawnWindow(True, FINAL_EXTRACTION_RESPAWN, FINAL_EXTRACTION_RESPAWN, "final extraction")
    if minutes_on_level <= EARLY_LEVEL_MINUTES:
        low, high = EARLY_RESPAWN
        reason = f"first {EARLY_LEVEL_MINUTES} minutes"
    elif minutes_on_level > LATE_LEVEL_MINUTES:
        low, high = LATE_RESPAWN
        reason = f"over {LATE_LEVEL_MINUTES} minutes"
    else:
        return RespawnWindow(
            False,
            None,
            None,
            f"the video states the timer up to {EARLY_LEVEL_MINUTES} and past {LATE_LEVEL_MINUTES} minutes",
        )
    if killed:
        low, high = low * KILL_MULTIPLIER, high * KILL_MULTIPLIER
        reason += ", killed"
    cut = noise_seconds * NOISE_SECONDS_REMOVED_PER_SECOND
    return RespawnWindow(True, max(0, low - cut), max(0, high - cut), reason)
