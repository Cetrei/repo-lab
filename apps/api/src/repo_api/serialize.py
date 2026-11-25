"""Turn domain results into plain JSON values.

Dataclasses become objects, tuples become arrays and enum keys or values become their string value. Floats
are passed through untouched so the contract tests compare real numbers, not rounded text.
"""

from __future__ import annotations

from dataclasses import fields, is_dataclass
from enum import Enum
from typing import Any


def to_jsonable(value: Any) -> Any:
    if isinstance(value, Enum):
        return value.value
    if is_dataclass(value) and not isinstance(value, type):
        return {f.name: to_jsonable(getattr(value, f.name)) for f in fields(value)}
    if isinstance(value, dict):
        return {_key(k): to_jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set, frozenset)):
        items = sorted(value) if isinstance(value, (set, frozenset)) else value
        return [to_jsonable(v) for v in items]
    return value


def _key(key: Any) -> str:
    if isinstance(key, Enum):
        return str(key.value)
    return str(key)
