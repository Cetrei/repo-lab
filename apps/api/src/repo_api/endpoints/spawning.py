"""Enemy spawning endpoints."""

from __future__ import annotations

from repo_core.spawning.data import RULES
from repo_core.spawning.engine import despawn_window, respawn_window, spawn_outlook

from ..dispatch import Endpoint
from ..params import Params


def rules(params: Params) -> object:
    return RULES


def outlook(params: Params) -> object:
    return spawn_outlook(params.integer("level"))


def despawn(params: Params) -> object:
    return despawn_window()


def respawn(params: Params) -> object:
    return respawn_window(
        params.integer("minutes_on_level"),
        params.boolean("killed"),
        params.integer("noise_seconds", 0),
        params.boolean("final_extraction_done"),
    )


ENDPOINTS = (
    Endpoint("spawning.rules", "Spawn tiers, timers and the constants behind them", rules),
    Endpoint("spawning.outlook", "Enemies per tier and group odds for a level", outlook),
    Endpoint("spawning.despawn", "Seconds until an unseen enemy despawns", despawn),
    Endpoint("spawning.respawn", "Seconds until an enemy is back", respawn),
)
