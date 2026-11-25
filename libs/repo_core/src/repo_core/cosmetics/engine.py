"""Cosmetic box odds.

Two public functions:

* `level_outlook`: what can happen on one level, given how many completed levels in a row
  spawned no box (the bad luck count).
* `run_outlook`: the same chained over many levels, with cumulative odds and how many levels it
  usually takes to see a first box of a rarity.

Rules modelled (see docs/DATA_SOURCES.md):

* Slot 1 rolls from level 1, slot 2 from level 6, slot 3 from level 11. Each slot climbs six steps.
* Slots roll in order. The bad luck bonus is added to every roll until one of them succeeds, and
  it resets the instant a box spawns, so later slots on that level go back to their base chance.
* A level that is completed with zero boxes raises the bad luck count by one. Any box resets it.
  The count survives game over and new saves.
* A box that spawned but was never found does not count as a miss. Only the spawn roll matters.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass

from ..checks import require_int
from .rulesets import (
    DEFAULT_RULESET_ID,
    MAX_SLOTS,
    MAXED_LEVEL,
    RARITIES,
    RULESETS,
    SLOT_STRIDE,
    STEPS,
    Rarity,
    Ruleset,
)

TARGETS: tuple[str, ...] = ("any", *(r.value for r in RARITIES))
PRUNE_BELOW = 1e-15
DEFAULT_HORIZON = 400


@dataclass(frozen=True, slots=True)
class SlotOutlook:
    slot: int
    step: int
    base_spawn: float
    spawn: float
    rarity: dict[Rarity, float]


@dataclass(frozen=True, slots=True)
class LevelOutlook:
    level: int
    bad_luck: int
    modifier: float
    slots: tuple[SlotOutlook, ...]
    count_distribution: tuple[float, ...]
    p_dry: float
    p_any: float
    expected_boxes: float
    expected_by_rarity: dict[Rarity, float]
    p_at_least_one: dict[Rarity, float]


@dataclass(frozen=True, slots=True)
class Milestone:
    target: str
    median: int | None
    p90: int | None
    expected: float
    p_within_horizon: float


@dataclass(frozen=True, slots=True)
class RunRow:
    level: int
    p_any: float
    expected_boxes: float
    expected_by_rarity: dict[Rarity, float]
    cumulative: dict[str, float]


@dataclass(frozen=True, slots=True)
class RunOutlook:
    ruleset_id: str
    start_level: int
    bad_luck: int
    rows: tuple[RunRow, ...]
    milestones: dict[str, Milestone]
    horizon: int


def active_slots(level: int) -> list[tuple[int, int]]:
    """(slot index, step 1..6) for every slot that rolls on this level."""
    out = []
    for slot in range(MAX_SLOTS):
        step = level - SLOT_STRIDE * slot
        if step >= 1:
            out.append((slot, min(step, STEPS)))
    return out


def _spawn_patterns(base: list[float], modifier: float) -> list[tuple[tuple[bool, ...], float]]:
    """Every spawn/no spawn combination with its probability, rolling slots in order."""
    states: list[tuple[tuple[bool, ...], float, bool]] = [((), 1.0, False)]
    for chance in base:
        nxt = []
        for mask, prob, hit in states:
            eff = chance if hit else min(1.0, chance + modifier)
            if eff > 0.0:
                nxt.append(((*mask, True), prob * eff, True))
            if eff < 1.0:
                nxt.append(((*mask, False), prob * (1.0 - eff), hit))
        states = nxt
    return [(mask, prob) for mask, prob, _ in states]


def level_outlook(level: int, bad_luck: int = 0, ruleset: Ruleset | None = None) -> LevelOutlook:
    require_int("level", level, 1, 10_000)
    require_int("bad_luck", bad_luck, 0, 500)
    rs = ruleset or RULESETS.get(DEFAULT_RULESET_ID)
    modifier = bad_luck * rs.bad_luck_bonus

    slots = active_slots(level)
    base = [rs.spawn_by_step[step - 1] for _, step in slots]
    rows = [rs.rarity_by_step[step - 1] for _, step in slots]
    patterns = _spawn_patterns(base, modifier)

    count = [0.0] * (MAX_SLOTS + 1)
    marginal = [0.0] * len(slots)
    no_rarity = [0.0] * len(RARITIES)
    for mask, prob in patterns:
        count[sum(mask)] += prob
        for i, spawned in enumerate(mask):
            if spawned:
                marginal[i] += prob
        for r in range(len(RARITIES)):
            miss = 1.0
            for i, spawned in enumerate(mask):
                if spawned:
                    miss *= 1.0 - rows[i][r]
            no_rarity[r] += prob * miss

    slot_views = tuple(
        SlotOutlook(
            slot=slot + 1,
            step=step,
            base_spawn=base[i],
            spawn=marginal[i],
            rarity={r: rows[i][ri] for ri, r in enumerate(RARITIES)},
        )
        for i, (slot, step) in enumerate(slots)
    )
    expected = {r: sum(marginal[i] * rows[i][ri] for i in range(len(slots))) for ri, r in enumerate(RARITIES)}
    return LevelOutlook(
        level=level,
        bad_luck=bad_luck,
        modifier=modifier,
        slots=slot_views,
        count_distribution=tuple(count),
        p_dry=count[0],
        p_any=1.0 - count[0],
        expected_boxes=sum(marginal),
        expected_by_rarity=expected,
        p_at_least_one={r: 1.0 - no_rarity[ri] for ri, r in enumerate(RARITIES)},
    )


class _Chain:
    """Walks levels one by one tracking the bad luck count and, per target, the mass that has
    not seen the target yet."""

    def __init__(self, ruleset: Ruleset, level: int, bad_luck: int) -> None:
        self._ruleset = ruleset
        self.level = level
        self._dist: dict[int, float] = {bad_luck: 1.0}
        self._alive: dict[str, dict[int, float]] = {t: {bad_luck: 1.0} for t in TARGETS}
        self._cache: dict[tuple[int, int], LevelOutlook] = {}

    def _outlook(self, level: int, k: int) -> LevelOutlook:
        key = (min(level, MAXED_LEVEL), k)
        if key not in self._cache:
            self._cache[key] = level_outlook(key[0], k, self._ruleset)
        return self._cache[key]

    def step(self) -> tuple[float, float, dict[Rarity, float], dict[str, float]]:
        level = self.level
        p_any = 0.0
        boxes = 0.0
        by_rarity = {r: 0.0 for r in RARITIES}
        nxt_dist: defaultdict[int, float] = defaultdict(float)
        for k, mass in self._dist.items():
            o = self._outlook(level, k)
            p_any += mass * o.p_any
            boxes += mass * o.expected_boxes
            for r in RARITIES:
                by_rarity[r] += mass * o.expected_by_rarity[r]
            nxt_dist[k + 1] += mass * o.p_dry
            nxt_dist[0] += mass * o.p_any
        self._dist = {k: m for k, m in nxt_dist.items() if m > PRUNE_BELOW}

        cumulative: dict[str, float] = {}
        for target in TARGETS:
            nxt_alive: defaultdict[int, float] = defaultdict(float)
            for k, mass in self._alive[target].items():
                o = self._outlook(level, k)
                miss = o.p_dry if target == "any" else 1.0 - o.p_at_least_one[Rarity(target)]
                nxt_alive[k + 1] += mass * o.p_dry
                nxt_alive[0] += mass * max(0.0, miss - o.p_dry)
            self._alive[target] = {k: m for k, m in nxt_alive.items() if m > PRUNE_BELOW}
            cumulative[target] = 1.0 - sum(self._alive[target].values())
        self.level += 1
        return p_any, boxes, by_rarity, cumulative


def _milestone(target: str, curve: list[float]) -> Milestone:
    def first_reaching(p: float) -> int | None:
        for n, value in enumerate(curve, start=1):
            if value >= p:
                return n
        return None

    survival_sum = 1.0 + sum(1.0 - value for value in curve[:-1])
    return Milestone(
        target=target,
        median=first_reaching(0.5),
        p90=first_reaching(0.9),
        expected=survival_sum,
        p_within_horizon=curve[-1],
    )


def run_outlook(
    start_level: int,
    levels: int,
    bad_luck: int = 0,
    ruleset: Ruleset | None = None,
    horizon: int = DEFAULT_HORIZON,
) -> RunOutlook:
    require_int("start_level", start_level, 1, 10_000)
    require_int("levels", levels, 1, 100)
    require_int("bad_luck", bad_luck, 0, 500)
    rs = ruleset or RULESETS.get(DEFAULT_RULESET_ID)
    horizon = max(horizon, levels)

    chain = _Chain(rs, start_level, bad_luck)
    rows: list[RunRow] = []
    curves: dict[str, list[float]] = {t: [] for t in TARGETS}
    for n in range(horizon):
        level = start_level + n
        p_any, boxes, by_rarity, cumulative = chain.step()
        for target in TARGETS:
            curves[target].append(cumulative[target])
        if n < levels:
            rows.append(RunRow(level, p_any, boxes, by_rarity, cumulative))
    return RunOutlook(
        ruleset_id=rs.id,
        start_level=start_level,
        bad_luck=bad_luck,
        rows=tuple(rows),
        milestones={t: _milestone(t, curves[t]) for t in TARGETS},
        horizon=horizon,
    )
