"""Cosmetic box endpoints."""

from __future__ import annotations

from repo_core.cosmetics.engine import DEFAULT_HORIZON, level_outlook, run_outlook
from repo_core.cosmetics.rulesets import DEFAULT_RULESET_ID, RULESETS, Ruleset

from ..dispatch import Endpoint
from ..params import Params


def _ruleset(params: Params) -> Ruleset | None:
    ruleset_id = params.opt_string("ruleset")
    return None if ruleset_id is None else RULESETS.get(ruleset_id)


def rulesets(params: Params) -> object:
    return {"default": DEFAULT_RULESET_ID, "rulesets": list(RULESETS.all())}


def level(params: Params) -> object:
    return level_outlook(
        params.integer("level"),
        params.integer("bad_luck", 0),
        _ruleset(params),
    )


def run(params: Params) -> object:
    return run_outlook(
        params.integer("start_level"),
        params.integer("levels"),
        params.integer("bad_luck", 0),
        _ruleset(params),
        params.integer("horizon", DEFAULT_HORIZON),
    )


ENDPOINTS = (
    Endpoint("cosmetics.rulesets", "Rulesets for cosmetic boxes and the default id", rulesets),
    Endpoint("cosmetics.level", "Box odds for one level given the bad luck count", level),
    Endpoint("cosmetics.run", "Box odds chained over many levels with milestones", run),
)
