import unittest

from repo_core.catalog import TableCatalog
from repo_core.errors import UnknownId
from repo_core.valuables.data import (
    ANYWHERE,
    BIG_STUN_DAMAGE,
    LOCATIONS,
    SIZES,
    VALUABLES,
    Location,
    Valuable,
)
from repo_core.valuables.engine import map_valuables


def _valuable(name: str, location: str, low: int, high: int, heavy: int = 8) -> Valuable:
    return Valuable(
        id=name.lower(),
        name=name,
        location=location,
        size="tiny",
        low=low,
        high=high,
        mass=0.5,
        damage=(0, 2, 5, heavy),
        stuns_big=heavy >= BIG_STUN_DAMAGE,
    )


class ValuableDataTests(unittest.TestCase):
    def test_every_valuable_belongs_to_a_listed_location_and_size(self) -> None:
        for item in VALUABLES.all():
            self.assertIn(item.location, LOCATIONS, item.name)
            self.assertIn(item.size, SIZES, item.name)
            self.assertLessEqual(item.low, item.high, item.name)

    def test_anywhere_is_a_location(self) -> None:
        self.assertIn(ANYWHERE, LOCATIONS)

    def test_the_big_stun_rule_follows_the_heavy_hit(self) -> None:
        stunning = [item for item in VALUABLES.all() if item.stuns_big]
        self.assertTrue(stunning)
        self.assertTrue(all(item.damage[3] >= BIG_STUN_DAMAGE for item in stunning))
        self.assertTrue(
            all(item.damage[3] < BIG_STUN_DAMAGE for item in VALUABLES.all() if not item.stuns_big)
        )

    def test_traps_carry_noise_and_a_trigger(self) -> None:
        traps = [item for item in VALUABLES.all() if item.noise is not None]
        self.assertTrue(traps)
        self.assertTrue(all(item.trigger for item in traps))


class MapValuablesTests(unittest.TestCase):
    places = TableCatalog(
        "location", [Location("any", "Any"), Location("manor", "Manor"), Location("empty", "Empty")]
    )
    items = TableCatalog(
        "valuable",
        [
            _valuable("Cup", "manor", 100, 200),
            _valuable("Vase", "manor", 300, 500),
            _valuable("Bust", "manor", 300, 500),
            _valuable("Surplus", "any", 1, 5000),
        ],
    )

    def test_a_map_splits_its_own_valuables_from_the_ones_of_any_map(self) -> None:
        view = map_valuables("manor", self.items, self.places)
        self.assertEqual([v.name for v in view.own], ["Bust", "Vase", "Cup"])
        self.assertEqual([v.name for v in view.anywhere], ["Surplus"])

    def test_a_map_without_valuables_still_lists_the_ones_of_any_map(self) -> None:
        view = map_valuables("empty", self.items, self.places)
        self.assertEqual(view.own, ())
        self.assertEqual(len(view.anywhere), 1)

    def test_the_any_map_is_not_listed_twice(self) -> None:
        view = map_valuables("any", self.items, self.places)
        self.assertEqual(view.own, ())
        self.assertEqual([v.name for v in view.anywhere], ["Surplus"])

    def test_an_unknown_map_is_an_error(self) -> None:
        with self.assertRaises(UnknownId):
            map_valuables("nowhere", self.items, self.places)

    def test_the_bundled_table_has_valuables_for_every_map(self) -> None:
        for place in LOCATIONS.all():
            view = map_valuables(place.id)
            self.assertTrue(view.own or place.id == ANYWHERE, place.name)


if __name__ == "__main__":
    unittest.main()
