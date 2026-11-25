"""Typed access to a request payload. Every failure is an `InvalidInput` with the field name."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from repo_core.errors import InvalidInput


def _is_int(value: object) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


class Params:
    def __init__(self, raw: Any) -> None:
        if raw is None:
            raw = {}
        if not isinstance(raw, Mapping):
            raise InvalidInput("request body must be an object")
        self._raw: Mapping[str, Any] = raw

    def integer(self, name: str, default: int | None = None) -> int:
        if name not in self._raw:
            if default is None:
                raise InvalidInput(f"{name} is required")
            return default
        value = self._raw[name]
        if not _is_int(value):
            raise InvalidInput(f"{name} must be an integer")
        return value

    def boolean(self, name: str, default: bool = False) -> bool:
        value = self._raw.get(name, default)
        if not isinstance(value, bool):
            raise InvalidInput(f"{name} must be true or false")
        return value

    def string(self, name: str) -> str:
        value = self._raw.get(name)
        if not isinstance(value, str) or not value:
            raise InvalidInput(f"{name} must be a non empty string")
        return value

    def opt_string(self, name: str) -> str | None:
        return None if self._raw.get(name) is None else self.string(name)

    def int_list(self, name: str) -> list[int]:
        values = self._raw.get(name)
        if not isinstance(values, list) or not all(_is_int(v) for v in values):
            raise InvalidInput(f"{name} must be a list of integers")
        return values

    def str_list(self, name: str, default: list[str] | None = None) -> list[str]:
        if name not in self._raw and default is not None:
            return default
        values = self._raw.get(name)
        if not isinstance(values, list) or not all(isinstance(v, str) for v in values):
            raise InvalidInput(f"{name} must be a list of strings")
        return values

    def counts(self, name: str) -> dict[str, int]:
        """A map of id to a count, for example the units held per upgrade."""
        values = self._raw.get(name, {})
        if not isinstance(values, Mapping):
            raise InvalidInput(f"{name} must be an object of counts")
        out: dict[str, int] = {}
        for key, count in values.items():
            if not _is_int(count):
                raise InvalidInput(f"{name}.{key} must be an integer")
            out[str(key)] = count
        return out
