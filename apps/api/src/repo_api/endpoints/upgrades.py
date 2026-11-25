"""Upgrade shop endpoints."""

from __future__ import annotations

from repo_core.upgrades.data import DEFAULT_SHOP_RULESET_ID, SHOP_RULESETS, TOTAL_UNITS, UPGRADES
from repo_core.upgrades.engine import (
    locate_units,
    reroll_cost,
    shop_outlook,
    stash_plan,
    use_units,
)

from ..dispatch import Endpoint
from ..params import Params


def catalog(params: Params) -> object:
    return {
        "upgrades": list(UPGRADES.all()),
        "total_units": TOTAL_UNITS,
        "shop": SHOP_RULESETS.get(DEFAULT_SHOP_RULESET_ID),
    }


def shop(params: Params) -> object:
    return shop_outlook(params.counts("held"), params.str_list("consumed", []))


def stash(params: Params) -> object:
    return stash_plan(
        params.str_list("wanted"),
        params.counts("held"),
        params.str_list("consumed", []),
    )


def use(params: Params) -> object:
    return use_units(
        params.counts("used"),
        params.counts("held"),
        params.str_list("consumed", []),
    )


def locate(params: Params) -> object:
    return locate_units(params.str_list("bought"))


def reroll(params: Params) -> object:
    rerolls = params.integer("rerolls")
    return {"rerolls": rerolls, "total_cost": reroll_cost(rerolls)}


ENDPOINTS = (
    Endpoint("upgrades.catalog", "Upgrade caps and the shop rules", catalog),
    Endpoint("upgrades.shop", "Odds of each upgrade appearing for the units in circulation", shop),
    Endpoint("upgrades.stash", "Units to buy and keep so the shop shows what you want", stash),
    Endpoint("upgrades.use", "Use bought units: pool, truck and void afterwards", use),
    Endpoint("upgrades.locate", "Which bought units sit in the truck and which in the void", locate),
    Endpoint("upgrades.reroll", "Total price of rerolling the shop", reroll),
)
