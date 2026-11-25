"""Small range checks so engines fail with a readable message instead of a wrong number."""

from __future__ import annotations

from .errors import InvalidInput


def require_int(name: str, value: int, low: int, high: int) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise InvalidInput(f"{name} must be an integer")
    if not low <= value <= high:
        raise InvalidInput(f"{name} must be between {low} and {high}")
    return value
