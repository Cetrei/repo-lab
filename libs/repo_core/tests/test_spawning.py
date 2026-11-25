import unittest

from repo_core.errors import InvalidInput
from repo_core.monsters.data import MONSTERS
from repo_core.spawning.data import RULES
from repo_core.spawning.engine import despawn_window, enemy_counts, respawn_window, spawn_outlook


class SpawningTests(unittest.TestCase):
    def test_counts_by_level_band(self) -> None:
        expected = {
            1: (1, 0, 1),
            2: (1, 0, 1),
            3: (1, 1, 1),
            5: (1, 1, 1),
            6: (2, 2, 2),
            8: (2, 2, 2),
            9: (2, 3, 2),
            10: (2, 3, 2),
            11: (2, 3, 3),
            40: (2, 3, 3),
        }
        for level, (t1, t2, t3) in expected.items():
            counts = enemy_counts(level)
            self.assertEqual((counts.tier1, counts.tier2, counts.tier3), (t1, t2, t3), level)

    def test_group_chance_scales_with_tier_three_spawns(self) -> None:
        self.assertAlmostEqual(spawn_outlook(1).p_any_group, 0.032)
        self.assertAlmostEqual(spawn_outlook(11).p_any_group, 1 - 0.968**3)
        self.assertAlmostEqual(spawn_outlook(11).expected_groups, 3 * 0.032)

    def test_every_monster_belongs_to_exactly_one_tier(self) -> None:
        listed = [
            member.id
            for tier in (RULES.members.tier1, RULES.members.tier2, RULES.members.tier3)
            for member in tier
        ]
        self.assertEqual(sorted(listed), sorted(monster.id for monster in MONSTERS.all()))
        self.assertEqual(len(RULES.members.tier1), 9)
        self.assertEqual(len(RULES.members.tier2), 12)
        self.assertEqual(len(RULES.members.tier3), 9)

    def test_groups_are_tier_one_or_two_monsters_with_their_count(self) -> None:
        by_id = {group.monster_id: group for group in RULES.groups}
        self.assertEqual(len(by_id), len(RULES.groups))
        self.assertEqual(by_id["gnome"].count, 10)
        self.assertEqual(by_id["banger"].count, 6)
        self.assertEqual(by_id["banger"].tier, 2)
        self.assertTrue(all(group.tier in (1, 2) and group.count >= 2 for group in RULES.groups))

    def test_despawn_is_three_to_four_minutes_plus_twenty_to_forty_seconds(self) -> None:
        window = despawn_window()
        self.assertEqual((window.low, window.high), (200, 280))

    def test_respawn_timers_from_the_video(self) -> None:
        early = respawn_window(5)
        self.assertEqual((early.low, early.high), (240, 300))
        killed = respawn_window(5, killed=True)
        self.assertEqual((killed.low, killed.high), (720, 900))  # 12 to 15 minutes
        late_killed = respawn_window(51, killed=True)
        self.assertEqual((late_killed.low, late_killed.high), (3, 3))

    def test_final_extraction_resets_every_timer_to_one_second(self) -> None:
        for killed in (False, True):
            out = respawn_window(2, killed=killed, final_extraction_done=True)
            self.assertEqual((out.low, out.high), (1, 1))

    def test_noise_removes_five_seconds_per_second(self) -> None:
        out = respawn_window(5, noise_seconds=20)
        self.assertEqual((out.low, out.high), (140, 200))
        self.assertEqual(respawn_window(5, noise_seconds=1_000).low, 0)

    def test_the_middle_of_the_level_is_unknown_not_guessed(self) -> None:
        out = respawn_window(30)
        self.assertFalse(out.known)
        self.assertIsNone(out.low)

    def test_validation(self) -> None:
        with self.assertRaises(InvalidInput):
            enemy_counts(0)
        with self.assertRaises(InvalidInput):
            respawn_window(-1)


if __name__ == "__main__":
    unittest.main()
