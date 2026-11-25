"""Shop odds and the stash plan that makes the shop predictable.

Vocabulary used by the UI:

* pool: units of an upgrade the game may still generate (cap minus units in circulation)
* shop: the `shop_slots` units drawn from the pool for this visit
* cart and truck: units bought and not used yet. They count as in circulation, so they leave the pool
* void: bought and unused units that do not fit in the truck. They are not lost: they stay out of the
  pool and move into the truck as soon as units are used. Units just bought always take truck slots
  first, so the void holds the older ones (video xYEGPmfww9A, 01:52 and 08:54)
* consumed: upgrades already used. Only permanent ones (Map Player Count) stay out of the pool
"""

from __future__ import annotations

from collections.abc import Collection, Mapping, Sequence
from dataclasses import dataclass
from math import comb

from ..catalog import Catalog
from ..checks import require_int
from .data import (
    DEFAULT_SHOP_RULESET_ID,
    SHOP_RULESETS,
    UPGRADES,
    ShopRuleset,
    Upgrade,
)


@dataclass(frozen=True, slots=True)
class ShopRow:
    upgrade_id: str
    name: str
    cap: int
    held: int
    pool: int
    p_appears: float
    expected_units: float
    certain: bool


@dataclass(frozen=True, slots=True)
class ShopOutlook:
    slots: int
    pool_total: int
    held_total: int
    truck_capacity: int
    truck_units: int
    truck_free: int
    void_units: int
    guaranteed: bool
    rows: tuple[ShopRow, ...]


@dataclass(frozen=True, slots=True)
class StashPlan:
    stash: dict[str, int]
    units_to_stash: int
    held_after: int
    truck_units: int
    void_units: int
    all_wanted_guaranteed: bool
    filler: dict[str, int]
    after: ShopOutlook


def availability(
    held: Mapping[str, int],
    consumed: Collection[str] = (),
    catalog: Catalog[Upgrade] | None = None,
) -> dict[str, int]:
    """Units of each upgrade the game can still generate."""
    cat = catalog or UPGRADES
    for upgrade_id in (*held, *consumed):
        cat.get(upgrade_id)
    out: dict[str, int] = {}
    for u in cat.all():
        have = require_int(f"held[{u.id}]", held.get(u.id, 0), 0, u.cap)
        out[u.id] = 0 if (u.permanent and u.id in consumed) else u.cap - have
    return out


def shop_outlook(
    held: Mapping[str, int],
    consumed: Collection[str] = (),
    ruleset: ShopRuleset | None = None,
    catalog: Catalog[Upgrade] | None = None,
) -> ShopOutlook:
    rs = ruleset or SHOP_RULESETS.get(DEFAULT_SHOP_RULESET_ID)
    cat = catalog or UPGRADES
    pool = availability(held, consumed, cat)
    total = sum(pool.values())
    k = rs.shop_slots
    held_total = sum(held.get(u.id, 0) for u in cat.all())
    guaranteed = total <= k

    rows = []
    for u in cat.all():
        a = pool[u.id]
        if guaranteed:
            p = 1.0 if a > 0 else 0.0
            expected = float(a)
        else:
            p = 1.0 - comb(total - a, k) / comb(total, k)
            expected = k * a / total
        rows.append(
            ShopRow(
                upgrade_id=u.id,
                name=u.name,
                cap=u.cap,
                held=held.get(u.id, 0),
                pool=a,
                p_appears=p,
                expected_units=expected,
                certain=a > 0 and p >= 1.0,
            )
        )
    return ShopOutlook(
        slots=k,
        pool_total=total,
        held_total=held_total,
        truck_capacity=rs.truck_capacity,
        truck_units=min(held_total, rs.truck_capacity),
        truck_free=max(0, rs.truck_capacity - held_total),
        void_units=max(0, held_total - rs.truck_capacity),
        guaranteed=guaranteed,
        rows=tuple(rows),
    )


def stash_plan(
    wanted: Collection[str],
    held: Mapping[str, int],
    consumed: Collection[str] = (),
    ruleset: ShopRuleset | None = None,
    catalog: Catalog[Upgrade] | None = None,
) -> StashPlan:
    """Which unwanted units to buy and keep so the shop shows what you want.

    Only unwanted units are stashed. The pool is cut down to exactly `shop_slots`, so every wanted
    unit appears. If the wanted units alone exceed the slots, the shop is not fully predictable and
    `after` carries the real odds.
    """
    rs = ruleset or SHOP_RULESETS.get(DEFAULT_SHOP_RULESET_ID)
    cat = catalog or UPGRADES
    wanted_ids = set(wanted)
    for upgrade_id in wanted_ids:
        cat.get(upgrade_id)

    pool = availability(held, consumed, cat)
    need = max(0, sum(pool.values()) - rs.shop_slots)
    unwanted = sorted(
        ((uid, a) for uid, a in pool.items() if uid not in wanted_ids and a > 0),
        key=lambda item: (-item[1], item[0]),
    )

    stash: dict[str, int] = {}
    left = need
    for uid, a in unwanted:
        take = min(a, left)
        if take:
            stash[uid] = take
            left -= take
        if left == 0:
            break

    held_after = dict(held)
    for uid, n in stash.items():
        held_after[uid] = held_after.get(uid, 0) + n
    after = shop_outlook(held_after, consumed, rs, cat)
    after_pool = availability(held_after, consumed, cat)
    return StashPlan(
        stash=stash,
        units_to_stash=sum(stash.values()),
        held_after=after.held_total,
        truck_units=after.truck_units,
        void_units=after.void_units,
        all_wanted_guaranteed=after.guaranteed,
        filler={uid: a for uid, a in after_pool.items() if uid not in wanted_ids and a > 0},
        after=after,
    )


def reroll_cost(rerolls: int, ruleset: ShopRuleset | None = None) -> int:
    """Total money for `rerolls` rerolls in one shop: 5000, then 10000, then 15000 and so on."""
    rs = ruleset or SHOP_RULESETS.get(DEFAULT_SHOP_RULESET_ID)
    n = require_int("rerolls", rerolls, 0, 1_000)
    return rs.reroll_step * n * (n + 1) // 2


@dataclass(frozen=True, slots=True)
class UnitLocation:
    truck: tuple[str, ...]
    void: tuple[str, ...]


def locate_units(
    bought: Sequence[str],
    ruleset: ShopRuleset | None = None,
    catalog: Catalog[Upgrade] | None = None,
) -> UnitLocation:
    """Where bought and unused units sit, from the order they were bought (oldest first).

    The video states that units just bought always take truck slots first, so the truck holds the
    newest `truck_capacity` units and the void holds the older ones. Which void unit comes back first
    when slots free up is not stated anywhere, so that order is not modeled.
    """
    rs = ruleset or SHOP_RULESETS.get(DEFAULT_SHOP_RULESET_ID)
    cat = catalog or UPGRADES
    for upgrade_id in bought:
        cat.get(upgrade_id)
    cut = max(0, len(bought) - rs.truck_capacity)
    return UnitLocation(truck=tuple(bought[cut:]), void=tuple(bought[:cut]))


@dataclass(frozen=True, slots=True)
class UseResult:
    held: dict[str, int]
    consumed: tuple[str, ...]
    units_used: int
    released_from_void: int
    void_after: int
    after: ShopOutlook


def use_units(
    used: Mapping[str, int],
    held: Mapping[str, int],
    consumed: Collection[str] = (),
    ruleset: ShopRuleset | None = None,
    catalog: Catalog[Upgrade] | None = None,
) -> UseResult:
    """Use bought units. They return to the pool, except permanent ones, and the void refills the truck."""
    rs = ruleset or SHOP_RULESETS.get(DEFAULT_SHOP_RULESET_ID)
    cat = catalog or UPGRADES
    before = shop_outlook(held, consumed, rs, cat)
    held_after = dict(held)
    consumed_after = set(consumed)
    for uid, n in used.items():
        upgrade = cat.get(uid)
        have = held_after.get(uid, 0)
        require_int(f"used[{uid}]", n, 0, have)
        if n:
            held_after[uid] = have - n
            if upgrade.permanent:
                consumed_after.add(uid)
    after = shop_outlook(held_after, consumed_after, rs, cat)
    units_used = sum(used.values())
    return UseResult(
        held={uid: n for uid, n in held_after.items() if n},
        consumed=tuple(sorted(consumed_after)),
        units_used=units_used,
        released_from_void=min(units_used, before.void_units),
        void_after=after.void_units,
        after=after,
    )
