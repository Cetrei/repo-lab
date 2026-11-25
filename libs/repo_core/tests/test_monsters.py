import unittest
from dataclasses import replace

from repo_core.errors import InvalidInput
from repo_core.monsters.data import MONSTERS
from repo_core.monsters.engine import (
    BASE_STRENGTH,
    EASY,
    HARD,
    NEVER,
    NONE,
    combined_strength,
    effort_for,
    hard_strength,
    lift_check,
    lift_table,
    players_needed,
    upgrades_from_zero,
)


class MonsterTests(unittest.TestCase):
    def test_table_has_30_monsters(self) -> None:
        self.assertEqual(len(MONSTERS.all()), 30)

    def test_internal_strength_is_five_plus_upgrades(self) -> None:
        headman = MONSTERS.get("headman")
        check = lift_check(headman, [0])
        self.assertEqual(check.required, 18)
        self.assertEqual(check.base_strength, 5)
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

    def test_gnome_always_lifts_and_tick_is_never_grabbed(self) -> None:
        self.assertEqual(lift_check(MONSTERS.get("gnome"), [0]).effort, EASY)
        tick = lift_check(MONSTERS.get("tick"), [99])
        self.assertFalse(tick.liftable)
        self.assertEqual(tick.effort, NEVER)

    def test_an_active_rugrat_is_out_of_reach_alone_with_zero_or_one_upgrade(self) -> None:
        rugrat = MONSTERS.get("rugrat")
        self.assertEqual(lift_check(rugrat, [0]).effort, NONE)
        self.assertEqual(lift_check(rugrat, [1]).effort, NONE)
        self.assertEqual(lift_check(rugrat, [2]).effort, HARD)
        self.assertEqual(lift_check(rugrat, [3]).effort, HARD)
        self.assertEqual(lift_check(rugrat, [4]).effort, EASY)
        self.assertEqual(lift_check(rugrat, [0, 0]).effort, EASY)

    def test_a_lone_rugrat_without_upgrades_holds_it_only_when_stunned(self) -> None:
        rugrat = MONSTERS.get("rugrat")
        for upgrades in ([0], [1]):
            check = lift_check(rugrat, upgrades)
            self.assertFalse(check.can_lift)
            self.assertTrue(check.can_lift_stunned)
            self.assertEqual(check.stunned_required, BASE_STRENGTH)
            self.assertEqual(check.players_needed_stunned, 1)

    def test_effort_steps_with_the_team(self) -> None:
        self.assertEqual(hard_strength(9), 7)
        self.assertEqual(hard_strength(None), None)
        self.assertEqual(effort_for(18, 5), NONE)
        self.assertEqual(effort_for(18, 13), NONE)
        self.assertEqual(effort_for(18, 14), HARD)
        self.assertEqual(effort_for(18, 18), EASY)
        self.assertEqual(effort_for(None, 30), NEVER)

    def test_big_monsters_follow_the_weight_class(self) -> None:
        self.assertFalse(MONSTERS.get("gnome").big)
        self.assertFalse(MONSTERS.get("rugrat").big)
        self.assertTrue(MONSTERS.get("reaper").big)
        self.assertTrue(MONSTERS.get("trudge").big)

    def test_never_liftable_monsters(self) -> None:
        for monster_id in ("peeper", "apex-predator", "elsa", "tick"):
            check = lift_check(MONSTERS.get(monster_id), [99, 99, 99, 99, 99, 99])
            self.assertFalse(check.liftable)
            self.assertFalse(check.can_lift)
            self.assertIsNone(check.upgrades_from_zero)

    def test_stunned_requirement(self) -> None:
        check = lift_check(MONSTERS.get("bowtie"), [0])
        self.assertEqual(check.stunned_required, 7)
        self.assertEqual(check.stunned_required_min, 7)
        self.assertFalse(check.can_lift_stunned)

    def test_headman_stunned_uses_the_most_likely_figure(self) -> None:
        # The live wiki has no figure for it; 4 is the old chart value the owner chose (b70).
        headman = MONSTERS.get("headman")
        self.assertEqual(headman.stunned_upgrades, (4,))
        check = lift_check(headman, [0])
        self.assertEqual((check.stunned_required_min, check.stunned_required), (9, 9))
        self.assertFalse(lift_check(headman, [3]).can_lift_stunned)
        self.assertTrue(lift_check(headman, [4]).can_lift_stunned)

    def test_a_stunned_range_is_shown_when_the_sources_disagree(self) -> None:
        headman = replace(MONSTERS.get("headman"), stunned_upgrades=(1, 4))
        check = lift_check(headman, [0])
        self.assertEqual((check.stunned_required_min, check.stunned_required), (6, 9))
        self.assertFalse(check.can_lift_stunned)  # 5 misses even the lowest figure
        self.assertIsNone(lift_check(headman, [2]).can_lift_stunned)  # 7 falls between 6 and 9
        self.assertTrue(lift_check(headman, [4]).can_lift_stunned)  # 9 reaches the highest

    def test_a_range_gives_the_sure_players_and_the_best_case(self) -> None:
        headman = replace(MONSTERS.get("headman"), stunned_upgrades=(1, 4))
        check = lift_check(headman, [3, 0, 0])
        self.assertEqual(check.players_needed_stunned, 2)
        self.assertEqual(check.players_needed_stunned_min, 1)
        alone = lift_check(headman, [2])
        self.assertIsNone(alone.players_needed_stunned)
        self.assertEqual(alone.players_needed_stunned_min, 1)

    def test_one_stunned_figure_is_sure_and_none_is_no_data(self) -> None:
        rugrat = lift_check(MONSTERS.get("rugrat"), [0])
        self.assertEqual((rugrat.stunned_required_min, rugrat.stunned_required), (5, 5))
        pony = lift_check(MONSTERS.get("pony"), [0])
        self.assertEqual(MONSTERS.get("pony").stunned_upgrades, ())
        self.assertIsNone(pony.stunned_required)
        self.assertIsNone(pony.stunned_required_min)
        self.assertIsNone(pony.can_lift_stunned)

    def test_table_order_and_unliftable_last(self) -> None:
        rows = lift_table([0, 0])
        self.assertEqual(rows[-1].required, None)
        required = [r.required for r in rows if r.required is not None]
        self.assertEqual(required, sorted(required))

    def test_players_needed_takes_the_strongest_first(self) -> None:
        headman = MONSTERS.get("headman")
        self.assertEqual(lift_check(headman, [13]).players_needed, 1)
        self.assertEqual(lift_check(headman, [0, 6, 2]).players_needed, 2)
        self.assertEqual(lift_check(headman, [0, 0]).players_needed, None)

    def test_players_needed_without_a_figure(self) -> None:
        self.assertEqual(players_needed(None, [9, 9]), None)

    def test_invalid_players(self) -> None:
        with self.assertRaises(InvalidInput):
            combined_strength([])
        with self.assertRaises(InvalidInput):
            combined_strength([0] * 7)
        with self.assertRaises(InvalidInput):
            combined_strength([-1])


if __name__ == "__main__":
    unittest.main()
