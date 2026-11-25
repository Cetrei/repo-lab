"""Loader for the YAML files under data/.

All constants that drive a calculation live in those files, so a contribution is a data edit. The
reader below checks the shape and reports the file and the path of the first problem, for example
`monsters.yaml: monsters[3].lift must be an integer or null`.

The folder is found through the REPO_DATA_DIR variable, or by walking up from this file until a folder
named `data` with `cosmetics.yaml` inside appears. The browser build sets the variable.
"""

from __future__ import annotations

import os
from collections.abc import Mapping, Sequence
from functools import cache
from pathlib import Path
from typing import Any

import yaml

from .errors import DataError

DATA_DIR_ENV = "REPO_DATA_DIR"
MARKER = "cosmetics.yaml"


def data_dir() -> Path:
    override = os.environ.get(DATA_DIR_ENV)
    if override:
        return Path(override)
    for parent in Path(__file__).resolve().parents:
        candidate = parent / "data"
        if (candidate / MARKER).is_file():
            return candidate
    raise DataError(f"data folder not found, set {DATA_DIR_ENV}")


@cache
def load_table(name: str) -> Node:
    path = data_dir() / name
    try:
        raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    except OSError as error:
        raise DataError(f"{name}: cannot read the file ({error.strerror})") from None
    except yaml.YAMLError as error:
        raise DataError(f"{name}: invalid YAML ({error})") from None
    return Node(raw, name, "")


def _is_number(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _is_integer(value: object) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


class Node:
    """A mapping from a data file with typed getters that fail with a readable location."""

    def __init__(self, raw: Any, file: str, path: str) -> None:
        if not isinstance(raw, Mapping):
            raise DataError(f"{file}: {path or 'the file'} must be a mapping")
        self._raw: Mapping[str, Any] = raw
        self._file = file
        self._path = path

    def _at(self, key: str) -> str:
        return f"{self._path}.{key}" if self._path else key

    def _fail(self, key: str, expected: str) -> DataError:
        return DataError(f"{self._file}: {self._at(key)} must be {expected}")

    def only(self, *allowed: str) -> Node:
        """Fail on a key nobody reads, so a typo or a stray comma in a flow mapping is not silent."""
        for key in self._raw:
            if key not in allowed:
                raise DataError(f"{self._file}: {self._at(str(key))} is not a known key")
        return self

    def _required(self, key: str, expected: str) -> Any:
        if key not in self._raw:
            raise self._fail(key, expected)
        return self._raw[key]

    def text(self, key: str) -> str:
        value = self._required(key, "a non empty text")
        if not isinstance(value, str) or not value.strip():
            raise self._fail(key, "a non empty text")
        return value

    def opt_text(self, key: str) -> str:
        value = self._raw.get(key)
        if value is None:
            return ""
        if not isinstance(value, str):
            raise self._fail(key, "a text")
        return value

    def number(self, key: str) -> float:
        value = self._required(key, "a number")
        if not _is_number(value):
            raise self._fail(key, "a number")
        return float(value)

    def integer(self, key: str) -> int:
        value = self._required(key, "an integer")
        if not _is_integer(value):
            raise self._fail(key, "an integer")
        return int(value)

    def opt_integer(self, key: str) -> int | None:
        value = self._raw.get(key)
        if value is not None and not _is_integer(value):
            raise self._fail(key, "an integer or null")
        return value

    def required_integer_or_null(self, key: str) -> int | None:
        """Like `opt_integer`, but the key must be written, so an unliftable monster is explicit."""
        self._required(key, "an integer or null")
        return self.opt_integer(key)

    def flag(self, key: str) -> bool:
        value = self._raw.get(key, False)
        if not isinstance(value, bool):
            raise self._fail(key, "true or false")
        return value

    def numbers(self, key: str, length: int) -> tuple[float, ...]:
        expected = f"a list of {length} numbers"
        value = self._required(key, expected)
        if not isinstance(value, Sequence) or isinstance(value, str) or len(value) != length:
            raise self._fail(key, expected)
        if not all(_is_number(v) for v in value):
            raise self._fail(key, expected)
        return tuple(float(v) for v in value)

    def matrix(self, key: str, rows: int, columns: int) -> tuple[tuple[float, ...], ...]:
        expected = f"{rows} rows of {columns} numbers"
        value = self._required(key, expected)
        if not isinstance(value, Sequence) or isinstance(value, str) or len(value) != rows:
            raise self._fail(key, expected)
        out = []
        for index, row in enumerate(value):
            if not isinstance(row, Sequence) or isinstance(row, str) or len(row) != columns:
                raise self._fail(f"{key}[{index}]", f"a list of {columns} numbers")
            if not all(_is_number(v) for v in row):
                raise self._fail(f"{key}[{index}]", f"a list of {columns} numbers")
            out.append(tuple(float(v) for v in row))
        return tuple(out)

    def int_pair(self, key: str) -> tuple[int, int]:
        value = self._required(key, "a pair of integers")
        if not isinstance(value, Sequence) or isinstance(value, str) or len(value) != 2:
            raise self._fail(key, "a pair of integers")
        if not all(_is_integer(v) for v in value):
            raise self._fail(key, "a pair of integers")
        return (value[0], value[1])

    def child(self, key: str) -> Node:
        return Node(self._required(key, "a mapping"), self._file, self._at(key))

    def rows(self, key: str) -> list[Node]:
        value = self._required(key, "a non empty list")
        if not isinstance(value, list) or not value:
            raise self._fail(key, "a non empty list")
        return [Node(item, self._file, f"{self._at(key)}[{i}]") for i, item in enumerate(value)]

    def sources(self) -> list[dict[str, str]]:
        """The credits of the file: name, optional url and a note."""
        return [
            {"name": row.text("name"), "url": row.opt_text("url"), "note": row.opt_text("note")}
            for row in self.rows("sources")
        ]
