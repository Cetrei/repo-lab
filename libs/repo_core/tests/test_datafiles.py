import unittest

from repo_core.cosmetics.rulesets import DEFAULT_RULESET_ID, RULESETS
from repo_core.datafiles import Node, load_table
from repo_core.errors import DataError
from repo_core.monsters.data import MONSTERS
from repo_core.upgrades.data import TOTAL_UNITS, UPGRADES


class NodeTests(unittest.TestCase):
    def test_errors_name_the_file_and_the_path(self) -> None:
        node = Node({"monsters": [{"name": "Gnome", "lift": "four"}]}, "monsters.yaml", "")
        row = node.rows("monsters")[0]
        with self.assertRaises(DataError) as caught:
            row.required_integer_or_null("lift")
        self.assertEqual(str(caught.exception), "monsters.yaml: monsters[0].lift must be an integer or null")

    def test_missing_key_is_an_error(self) -> None:
        with self.assertRaises(DataError):
            Node({"a": 1}, "x.yaml", "").number("b")

    def test_booleans_are_not_numbers(self) -> None:
        with self.assertRaises(DataError):
            Node({"a": True}, "x.yaml", "").integer("a")

    def test_unknown_keys_are_rejected(self) -> None:
        # A stray comma in a flow mapping turns the tail of a note into a key with no value.
        node = Node({"name": "Elsa", "no levantar.": None}, "monsters.yaml", "monsters[0]")
        with self.assertRaises(DataError):
            node.only("name", "note")

    def test_matrix_checks_the_shape(self) -> None:
        node = Node({"m": [[1, 2], [3]]}, "x.yaml", "")
        with self.assertRaises(DataError):
            node.matrix("m", 2, 2)
        self.assertEqual(
            Node({"m": [[1, 2], [3, 4]]}, "x.yaml", "").matrix("m", 2, 2), ((1.0, 2.0), (3.0, 4.0))
        )


class BundledDataTests(unittest.TestCase):
    def test_every_file_credits_its_sources(self) -> None:
        for name in ("cosmetics.yaml", "monsters.yaml", "upgrades.yaml", "spawning.yaml"):
            sources = load_table(name).sources()
            self.assertTrue(sources, name)
            self.assertTrue(all(s["name"] for s in sources), name)

    def test_the_default_ruleset_exists(self) -> None:
        self.assertIn(DEFAULT_RULESET_ID, RULESETS)

    def test_table_sizes_match_the_documented_numbers(self) -> None:
        self.assertEqual(len(MONSTERS.all()), 29)
        self.assertEqual(len(UPGRADES.all()), 12)
        self.assertEqual(TOTAL_UNITS, 23)


if __name__ == "__main__":
    unittest.main()
