import unittest

from repo_core.errors import InvalidInput, UnknownId
from repo_core.upgrades.data import TOTAL_UNITS
from repo_core.upgrades.engine import (
    availability,
    locate_units,
    reroll_cost,
    shop_outlook,
    stash_plan,
    use_units,
)

WANTED = ["strength", "sprint", "extra-jump", "tumble-launch", "tumble-wings", "health"]
WIKI_STASH = {
    "stamina": 4,
    "range": 3,
    "crouch-rest": 3,
    "death-head-battery": 1,
    "tumble-climb": 1,
    "map-player-count": 1,
}


class UpgradeTests(unittest.TestCase):
    def test_23_units_in_total(self) -> None:
        self.assertEqual(TOTAL_UNITS, 23)

    def test_empty_shop_odds(self) -> None:
        out = shop_outlook({})
        self.assertEqual(out.pool_total, 23)
        self.assertFalse(out.guaranteed)
        rows = {r.upgrade_id: r for r in out.rows}
        self.assertAlmostEqual(rows["extra-jump"].p_appears, 10 / 23)
        self.assertAlmostEqual(rows["strength"].p_appears, 350 / 506)
        self.assertAlmostEqual(sum(r.expected_units for r in out.rows), 10.0)

    def test_wiki_example_thirteen_stashed_gives_the_wanted_ten(self) -> None:
        out = shop_outlook(WIKI_STASH)
        self.assertEqual(out.pool_total, 10)
        self.assertTrue(out.guaranteed)
        shown = {r.upgrade_id for r in out.rows if r.certain}
        self.assertEqual(shown, set(WANTED))
        self.assertEqual(out.held_total, 13)
        self.assertEqual(out.truck_free, 3)

    def test_plan_reproduces_the_wiki_stash(self) -> None:
        plan = stash_plan(WANTED, {})
        self.assertEqual(plan.stash, WIKI_STASH)
        self.assertEqual(plan.units_to_stash, 13)
        self.assertEqual((plan.truck_units, plan.void_units), (13, 0))
        self.assertTrue(plan.all_wanted_guaranteed)
        self.assertEqual(plan.filler, {})

    def test_map_player_count_already_used_needs_twelve(self) -> None:
        plan = stash_plan(WANTED, {}, consumed={"map-player-count"})
        self.assertEqual(plan.units_to_stash, 12)
        self.assertNotIn("map-player-count", plan.stash)
        self.assertTrue(plan.all_wanted_guaranteed)

    def test_too_many_wanted_units_is_not_guaranteed(self) -> None:
        plan = stash_plan(["stamina", "range", "sprint"], {})
        self.assertEqual(plan.after.pool_total, 10)
        self.assertTrue(plan.all_wanted_guaranteed)
        plan = stash_plan(["stamina", "range", "sprint", "strength"], {})
        self.assertFalse(plan.after.guaranteed)
        self.assertFalse(plan.all_wanted_guaranteed)

    def test_full_truck_needs_no_extra_stash(self) -> None:
        held = {"stamina": 4, "range": 3, "crouch-rest": 3, "sprint": 3, "health": 2, "strength": 1}
        plan = stash_plan(["extra-jump"], held)
        self.assertEqual(plan.units_to_stash, 0)
        self.assertEqual(plan.held_after, 16)
        self.assertEqual(plan.void_units, 0)
        self.assertEqual(plan.after.truck_free, 0)

    def test_more_than_sixteen_held_overflows_into_the_void(self) -> None:
        # Video xYEGPmfww9A: buy ten, buy ten again, the truck keeps 16 and the rest waits in the void.
        held = {
            "stamina": 4,
            "range": 3,
            "crouch-rest": 3,
            "sprint": 3,
            "health": 2,
            "strength": 2,
            "map-player-count": 1,
            "tumble-launch": 1,
            "tumble-wings": 1,
        }
        out = shop_outlook(held)
        self.assertEqual(out.held_total, 20)
        self.assertEqual((out.truck_units, out.void_units, out.truck_free), (16, 4, 0))
        self.assertEqual(out.pool_total, 3)
        self.assertTrue(out.guaranteed)

    def test_using_units_refills_the_truck_from_the_void(self) -> None:
        held = {
            "stamina": 4,
            "range": 3,
            "crouch-rest": 3,
            "sprint": 3,
            "health": 2,
            "strength": 2,
            "map-player-count": 1,
            "tumble-launch": 1,
            "tumble-wings": 1,
        }
        used = use_units({"map-player-count": 1}, held)
        self.assertEqual((used.released_from_void, used.void_after), (1, 3))
        self.assertEqual(used.consumed, ("map-player-count",))
        self.assertEqual(used.after.held_total, 19)
        self.assertEqual(used.after.pool_total, 3)  # a permanent upgrade never returns to the pool
        again = use_units({"strength": 1}, held)
        self.assertEqual(again.after.pool_total, 4)  # a normal one goes back to the pool
        self.assertEqual(again.released_from_void, 1)
        with self.assertRaises(InvalidInput):
            use_units({"strength": 3}, held)

    def test_newest_purchases_take_the_truck_and_the_oldest_wait_in_the_void(self) -> None:
        bought = (
            ["range"] * 3
            + ["stamina"] * 4
            + ["sprint"] * 3
            + ["health"] * 2
            + ["strength", "strength", "extra-jump", "tumble-launch", "tumble-wings", "death-head-battery"]
        )
        where = locate_units(bought)
        self.assertEqual(where.void, ("range", "range"))
        self.assertEqual(len(where.truck), 16)
        self.assertEqual(where.truck[-6:], tuple(bought[-6:]))
        self.assertEqual(locate_units(bought[:5]).void, ())

    def test_validation(self) -> None:
        with self.assertRaises(UnknownId):
            availability({"nope": 1})
        with self.assertRaises(InvalidInput):
            availability({"strength": 3})

    def test_reroll_cost_is_cumulative(self) -> None:
        self.assertEqual(reroll_cost(0), 0)
        self.assertEqual(reroll_cost(1), 5_000)
        self.assertEqual(reroll_cost(3), 30_000)


if __name__ == "__main__":
    unittest.main()
