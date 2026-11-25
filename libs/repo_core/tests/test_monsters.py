import unittest

from repo_core.errors import InvalidInput
from repo_core.monsters.data import MONSTERS
from repo_core.monsters.engine import (
    BASE_STRENGTH,
    combined_strength,
    lift_check,
    lift_table,
    upgrades_from_zero,
)


class MonsterTests(unittest.TestCase):
    def test_table_has_29_monsters(self) -> None:
        self.assertEqual(len(MONSTERS.all()), 29)

    def test_internal_strength_is_five_plus_upgrades(self) -> None:
        headman = MONSTERS.get("headman")
        check = lift_check(headman, [0])
        self.assertEqual(check.required, 18)
        self.assertEqual(BASE_STRENGTH + headman.solo_upgrades, 18)

    def test_wiki_example_two_players_grab_headman(self) -> None:
        # Six upgrades (11) plus two upgrades (7) reach 18.
        check = lift_check(MONSTERS.get("headman"), [6, 2])
        self.assertEqual(combined_strength([6, 2]), 18)
        self.assertTrue(check.can_lift)
        self.assertEqual(check.margin, 0)

    def test_two_players_need_eight_upgrades_for_tier_13(self) -> None:
        self.assertEqual(upgrades_from_zero(MONSTERS.get("trudge")), (13, 8, 3, 0, 0, 0))

    def test_four_players_without_upgrades_beat_tier_13(self) -> None:
        check = lift_check(MONSTERS.get("trudge"), [0, 0, 0, 0])
        self.assertEqual(check.combined, 20)
        self.assertTrue(check.can_lift)

    def test_two_players_lift_rugrat_without_upgrades(self) -> None:
        self.assertTrue(lift_check(MONSTERS.get("rugrat"), [0, 0]).can_lift)
        self.assertFalse(lift_check(MONSTERS.get("rugrat"), [0]).can_lift)

    def test_never_liftable_monsters(self) -> None:
        for monster_id in ("peeper", "apex-predator", "elsa"):
            check = lift_check(MONSTERS.get(monster_id), [99, 99, 99, 99, 99, 99])
            self.assertFalse(check.liftable)
            self.assertFalse(check.can_lift)
            self.assertIsNone(check.upgrades_from_zero)

    def test_stunned_requirement(self) -> None:
        check = lift_check(MONSTERS.get("bowtie"), [0])
        self.assertEqual(check.stunned_required, 7)
        self.assertFalse(check.can_lift_stunned)

    def test_table_order_and_unliftable_last(self) -> None:
        rows = lift_table([0, 0])
        self.assertEqual(rows[-1].required, None)
        required = [r.required for r in rows if r.required is not None]
        self.assertEqual(required, sorted(required))

    def test_invalid_players(self) -> None:
        with self.assertRaises(InvalidInput):
            combined_strength([])
        with self.assertRaises(InvalidInput):
            combined_strength([0] * 7)
        with self.assertRaises(InvalidInput):
            combined_strength([-1])


if __name__ == "__main__":
    unittest.main()
