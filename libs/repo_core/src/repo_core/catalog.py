"""Lookup seam shared by every data table (rulesets, monsters, weapons, upgrades)."""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from typing import Protocol

from .errors import UnknownId


class HasId(Protocol):
    @property
    def id(self) -> str: ...


class Catalog[T](Protocol):
    """Read only access to a table of items that carry a string id."""

    def get(self, item_id: str) -> T: ...

    def all(self) -> Sequence[T]: ...


class TableCatalog[T: HasId]:
    """In memory `Catalog`. The bundled data tables use it; tests can pass their own."""

    def __init__(self, kind: str, items: Iterable[T]) -> None:
        self._kind = kind
        self._items: tuple[T, ...] = tuple(items)
        self._by_id: dict[str, T] = {item.id: item for item in self._items}
        if len(self._by_id) != len(self._items):
            raise ValueError(f"duplicate ids in catalog '{kind}'")

    def get(self, item_id: str) -> T:
        try:
            return self._by_id[item_id]
        except KeyError:
            raise UnknownId(f"unknown {self._kind} '{item_id}'") from None

    def all(self) -> Sequence[T]:
        return self._items

    def __contains__(self, item_id: object) -> bool:
        return item_id in self._by_id
