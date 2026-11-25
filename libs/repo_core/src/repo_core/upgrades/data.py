"""Shop upgrade rules, read from data/upgrades.yaml.

Each upgrade has a cap of units "in circulation" at once. Units bought and not used yet stay in
circulation (cart or truck), so the game does not generate them again. The shop shows up to
`shop_slots` of the units that are still available. Keeping exactly `shop_slots` available units
makes the shop fully predictable. That is the manipulation the videos describe.

How the game draws from the available units is not documented, so the engine assumes every available
unit is equally likely and says so in `selection_model`.
"""

from __future__ import annotations

from dataclasses import dataclass

from ..catalog import TableCatalog
from ..datafiles import load_table
from ..errors import DataError


@dataclass(frozen=True, slots=True)
class Upgrade:
    id: str
    name: str
    cap: int
    permanent: bool = False


@dataclass(frozen=True, slots=True)
class ShopRuleset:
    id: str
    label: str
    shop_slots: int
    truck_capacity: int
    reroll_step: int
    selection_model: str
    note: str = ""


def _load() -> tuple[TableCatalog[Upgrade], TableCatalog[ShopRuleset], str, list[dict[str, str]]]:
    table = load_table("upgrades.yaml")
    upgrades = []
    for row in table.rows("upgrades"):
        row.only("id", "name", "cap", "permanent")
        cap = row.integer("cap")
        if cap < 1:
            raise DataError(f"upgrades.yaml: {row.text('id')} cap must be at least 1")
        upgrades.append(Upgrade(row.text("id"), row.text("name"), cap, row.flag("permanent")))
    shop = table.child("shop").only(
        "id", "label", "shop_slots", "truck_capacity", "reroll_step", "selection_model", "note"
    )
    ruleset = ShopRuleset(
        id=shop.text("id"),
        label=shop.text("label"),
        shop_slots=shop.integer("shop_slots"),
        truck_capacity=shop.integer("truck_capacity"),
        reroll_step=shop.integer("reroll_step"),
        selection_model=shop.text("selection_model"),
        note=shop.opt_text("note"),
    )
    if ruleset.shop_slots < 1 or ruleset.truck_capacity < 1 or ruleset.reroll_step < 0:
        raise DataError("upgrades.yaml: shop slots, truck capacity and reroll step must be positive")
    return (
        TableCatalog("upgrade", upgrades),
        TableCatalog("shop ruleset", (ruleset,)),
        ruleset.id,
        table.sources(),
    )


UPGRADES, SHOP_RULESETS, DEFAULT_SHOP_RULESET_ID, SOURCES = _load()
TOTAL_UNITS = sum(u.cap for u in UPGRADES.all())
