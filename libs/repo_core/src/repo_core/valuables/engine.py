"""Valuables of one map.

A map lists its own valuables and the ones that can show up anywhere. Both lists go from the most to the
least valuable.
"""

from __future__ import annotations

from dataclasses import dataclass

from ..catalog import Catalog
from .data import ANYWHERE, LOCATIONS, VALUABLES, Location, Valuable


@dataclass(frozen=True, slots=True)
class MapValuables:
    location: Location
    own: tuple[Valuable, ...]
    anywhere: tuple[Valuable, ...]


def _by_value(items: list[Valuable]) -> tuple[Valuable, ...]:
    return tuple(sorted(items, key=lambda v: (-v.high, -v.low, v.name)))


def map_valuables(
    location_id: str,
    valuables: Catalog[Valuable] | None = None,
    locations: Catalog[Location] | None = None,
) -> MapValuables:
    """The valuables of one map, split in its own and the ones of any map. Unknown maps raise `UnknownId`."""
    place = (locations or LOCATIONS).get(location_id)
    every = (valuables or VALUABLES).all()
    own = [v for v in every if v.location == place.id and place.id != ANYWHERE]
    anywhere = [v for v in every if v.location == ANYWHERE]
    return MapValuables(location=place, own=_by_value(own), anywhere=_by_value(anywhere))
