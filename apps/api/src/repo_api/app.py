"""Builds the registry with every endpoint. The browser and the HTTP adapter both start here."""

from __future__ import annotations

from .dispatch import Dispatcher, Registry
from .endpoints import cosmetics, meta, monsters, spawning, upgrades

MODULES = (meta, cosmetics, monsters, upgrades, spawning)


def build_registry() -> Registry:
    registry = Registry()
    for module in MODULES:
        for endpoint in module.ENDPOINTS:
            registry.add(endpoint)
    return registry


def build_dispatcher() -> Dispatcher:
    return Dispatcher(build_registry())


DISPATCHER = build_dispatcher()


def call(name: str, payload_json: str = "null") -> str:
    """Entry point for Pyodide: endpoint name and JSON text in, JSON text out."""
    return DISPATCHER.call_json(name, payload_json)
