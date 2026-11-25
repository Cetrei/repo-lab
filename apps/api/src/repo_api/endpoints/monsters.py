"""Monster strength endpoints."""

from __future__ import annotations

from repo_core.monsters.data import BASE_STRENGTH, MAX_PLAYERS, MONSTERS
from repo_core.monsters.engine import lift_table

from ..dispatch import Endpoint
from ..params import Params


def catalog(params: Params) -> object:
    return {
        "base_strength": BASE_STRENGTH,
        "max_players": MAX_PLAYERS,
        "monsters": list(MONSTERS.all()),
    }


def lift(params: Params) -> object:
    """`upgrades` has one entry per player: the Strength upgrades that player bought."""
    return {"rows": lift_table(params.int_list("upgrades"))}


ENDPOINTS = (
    Endpoint("monsters.catalog", "Monster table and the strength rule constants", catalog),
    Endpoint("monsters.lift", "Can this team lift each monster, and what is missing", lift),
)
