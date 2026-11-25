"""Valuable endpoints."""

from __future__ import annotations

from repo_core.valuables.data import BIG_STUN_DAMAGE, LOCATIONS, VALUABLES
from repo_core.valuables.engine import map_valuables

from ..dispatch import Endpoint
from ..params import Params


def catalog(params: Params) -> object:
    return {
        "big_stun_damage": BIG_STUN_DAMAGE,
        "locations": list(LOCATIONS.all()),
        "valuables": list(VALUABLES.all()),
    }


def map_view(params: Params) -> object:
    """`location` is the id of a map of the catalog."""
    return map_valuables(params.string("location"))


ENDPOINTS = (
    Endpoint(
        "valuables.catalog", "Every valuable, the maps they come from and the big enemy stun rule", catalog
    ),
    Endpoint("valuables.map", "The valuables of one map, its own and the ones of any map", map_view),
)
