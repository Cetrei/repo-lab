"""Endpoint registry and dispatcher.

Every handler is a plain function from `Params` to a domain result. The dispatcher is the only place
that turns results and domain errors into the response envelope, so the browser (Pyodide) and the HTTP
adapter answer identically:

    {"ok": true,  "data": ...}
    {"ok": false, "error": {"code": "invalid_input", "message": "..."}}
"""

from __future__ import annotations

import json
from collections.abc import Iterable
from dataclasses import dataclass
from typing import Any, Protocol

from repo_core.errors import DomainError

from .params import Params
from .serialize import to_jsonable


class Handler(Protocol):
    def __call__(self, params: Params) -> object: ...


@dataclass(frozen=True, slots=True)
class Endpoint:
    name: str
    summary: str
    handler: Handler


class Registry:
    def __init__(self, endpoints: Iterable[Endpoint] = ()) -> None:
        self._by_name: dict[str, Endpoint] = {}
        for endpoint in endpoints:
            self.add(endpoint)

    def add(self, endpoint: Endpoint) -> None:
        if endpoint.name in self._by_name:
            raise ValueError(f"duplicate endpoint '{endpoint.name}'")
        self._by_name[endpoint.name] = endpoint

    def get(self, name: str) -> Endpoint | None:
        return self._by_name.get(name)

    def names(self) -> list[str]:
        return sorted(self._by_name)

    def describe(self) -> list[dict[str, str]]:
        return [{"name": n, "summary": self._by_name[n].summary} for n in self.names()]


def ok(data: Any) -> dict[str, Any]:
    return {"ok": True, "data": data}


def failure(code: str, message: str) -> dict[str, Any]:
    return {"ok": False, "error": {"code": code, "message": message}}


class Dispatcher:
    def __init__(self, registry: Registry) -> None:
        self._registry = registry

    @property
    def registry(self) -> Registry:
        return self._registry

    def dispatch(self, name: str, payload: Any = None) -> dict[str, Any]:
        endpoint = self._registry.get(name)
        if endpoint is None:
            return failure("unknown_endpoint", f"unknown endpoint '{name}'")
        try:
            return ok(to_jsonable(endpoint.handler(Params(payload))))
        except DomainError as error:
            return failure(error.code, str(error))

    def call_json(self, name: str, payload_json: str = "null") -> str:
        """Entry point for Pyodide: JSON text in, JSON text out."""
        try:
            payload = json.loads(payload_json) if payload_json else None
        except json.JSONDecodeError as error:
            return json.dumps(failure("invalid_json", f"request body is not valid JSON: {error.msg}"))
        return json.dumps(self.dispatch(name, payload))
