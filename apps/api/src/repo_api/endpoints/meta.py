"""Credits of the data files."""

from __future__ import annotations

from repo_core.cosmetics import rulesets as cosmetics
from repo_core.monsters import data as monsters
from repo_core.spawning import data as spawning
from repo_core.upgrades import data as upgrades
from repo_core.valuables import data as valuables

from ..dispatch import Endpoint
from ..params import Params


def sources(params: Params) -> object:
    return {
        "cosmetics": cosmetics.SOURCES,
        "monsters": monsters.SOURCES,
        "upgrades": upgrades.SOURCES,
        "spawning": spawning.SOURCES,
        "valuables": valuables.SOURCES,
    }


ENDPOINTS = (Endpoint("meta.sources", "Where the numbers of each calculator come from", sources),)
