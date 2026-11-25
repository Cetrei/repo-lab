import importlib.util
import json
import unittest
from pathlib import Path
from types import ModuleType

from repo_api.app import DISPATCHER, build_registry, call
from repo_api.dispatch import Dispatcher, Endpoint, Registry
from repo_api.params import Params
from repo_core.errors import InvalidInput

ROOT = Path(__file__).resolve().parents[3]


def _load_fixture_script() -> ModuleType:
    path = ROOT / "scripts" / "gen_fixtures.py"
    spec = importlib.util.spec_from_file_location("gen_fixtures", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class ParamsTests(unittest.TestCase):
    def test_integer_rejects_booleans_and_text(self) -> None:
        with self.assertRaises(InvalidInput):
            Params({"level": True}).integer("level")
        with self.assertRaises(InvalidInput):
            Params({"level": "3"}).integer("level")

    def test_missing_required_field_names_it(self) -> None:
        with self.assertRaisesRegex(InvalidInput, "level is required"):
            Params({}).integer("level")

    def test_defaults(self) -> None:
        params = Params(None)
        self.assertEqual(params.integer("bad_luck", 0), 0)
        self.assertEqual(params.str_list("consumed", []), [])
        self.assertEqual(params.counts("held"), {})

    def test_body_must_be_an_object(self) -> None:
        with self.assertRaises(InvalidInput):
            Params([1])


class DispatcherTests(unittest.TestCase):
    def test_success_and_domain_error_use_the_envelope(self) -> None:
        good = DISPATCHER.dispatch("cosmetics.level", {"level": 1})
        self.assertTrue(good["ok"])
        self.assertEqual(good["data"]["level"], 1)
        bad = DISPATCHER.dispatch("cosmetics.level", {"level": 0})
        self.assertEqual(bad["ok"], False)
        self.assertEqual(bad["error"]["code"], "invalid_input")

    def test_unknown_endpoint(self) -> None:
        answer = DISPATCHER.dispatch("nope", None)
        self.assertEqual(answer["error"]["code"], "unknown_endpoint")

    def test_call_json_round_trip(self) -> None:
        answer = json.loads(call("upgrades.reroll", '{"rerolls": 2}'))
        self.assertEqual(answer, {"ok": True, "data": {"rerolls": 2, "total_cost": 15000}})

    def test_call_json_rejects_broken_json(self) -> None:
        answer = json.loads(call("upgrades.reroll", "{"))
        self.assertEqual(answer["error"]["code"], "invalid_json")

    def test_empty_body_is_no_payload(self) -> None:
        self.assertTrue(json.loads(call("monsters.catalog", ""))["ok"])

    def test_duplicate_names_are_refused(self) -> None:
        def handler(params: Params) -> object:
            return None

        registry = Registry([Endpoint("a.b", "x", handler)])
        with self.assertRaises(ValueError):
            registry.add(Endpoint("a.b", "y", handler))
        self.assertEqual(Dispatcher(registry).dispatch("a.b")["data"], None)

    def test_every_endpoint_has_a_summary(self) -> None:
        for row in build_registry().describe():
            self.assertTrue(row["summary"], row["name"])


class FixtureTests(unittest.TestCase):
    def test_fixtures_are_up_to_date(self) -> None:
        script = _load_fixture_script()
        self.assertEqual(script.main(["--check"]), 0)

    def test_every_endpoint_has_a_fixture_case(self) -> None:
        script = _load_fixture_script()
        covered = {endpoint for _, endpoint, _ in script.CASES}
        self.assertEqual(set(build_registry().names()) - covered, set())


if __name__ == "__main__":
    unittest.main()
