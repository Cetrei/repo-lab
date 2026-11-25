import unittest

from repo_core.cosmetics.engine import level_outlook, run_outlook
from repo_core.cosmetics.rulesets import RULESETS, Rarity, Ruleset, _normalized

# Numbers the cosmetics video (cYPnWvc24v4) uses to show why the wiki sums are wrong: three boxes
# at 60 percent each and a 3.27 percent conditional ultra rare chance per box.
_VIDEO_ROW = (38.87, 37.03, 20.83, 3.27)
VIDEO_RULESET = Ruleset(
    id="video-example",
    label="Example from the video",
    patch="test",
    spawn_by_step=(0.60,) * 6,
    rarity_by_step=_normalized((_VIDEO_ROW,) * 6),
    bad_luck_bonus=0.0,
)


class CosmeticTests(unittest.TestCase):
    def test_only_the_current_patch_ships(self) -> None:
        self.assertEqual([r.id for r in RULESETS.all()], ["may-2026"])

    def test_level_one_is_25_percent(self) -> None:
        out = level_outlook(1)
        self.assertAlmostEqual(out.p_any, 0.25)
        self.assertEqual(len(out.slots), 1)

    def test_wiki_bad_luck_example_level_ten(self) -> None:
        # One dry level before level 10: slot 1 is 65 + 25 = 90 percent, slot 2 is 57 + 25 = 82.
        out = level_outlook(10, bad_luck=1)
        self.assertAlmostEqual(out.slots[0].spawn, 0.90)
        self.assertAlmostEqual(out.p_dry, 0.10 * 0.18)

    def test_three_dry_levels_guarantee_a_box(self) -> None:
        self.assertAlmostEqual(level_outlook(1, bad_luck=3).p_dry, 0.0)

    def test_three_slots_from_level_eleven(self) -> None:
        self.assertEqual(len(level_outlook(11).slots), 3)
        self.assertEqual(len(level_outlook(16).slots), 3)
        self.assertEqual(len(level_outlook(6).slots), 2)

    def test_rarity_rows_sum_to_one(self) -> None:
        for slot in level_outlook(16).slots:
            self.assertAlmostEqual(sum(slot.rarity.values()), 1.0)

    def test_video_complement_rule_beats_the_wiki_sum(self) -> None:
        out = level_outlook(16, ruleset=VIDEO_RULESET)
        one_box = 0.60 * 0.0327
        # Expected ultra boxes per level is the plain sum (the video's 5.886 percent simulated figure).
        self.assertAlmostEqual(out.expected_by_rarity[Rarity.ULTRA], 3 * one_box)
        # Seeing at least one is the complement rule, a little lower, and nowhere near the wiki's 8.87.
        at_least_one = 1.0 - (1.0 - one_box) ** 3
        self.assertAlmostEqual(out.p_at_least_one[Rarity.ULTRA], at_least_one)
        self.assertAlmostEqual(at_least_one, 0.0577, places=4)
        self.assertLess(out.p_at_least_one[Rarity.ULTRA], out.expected_by_rarity[Rarity.ULTRA])
        self.assertLess(out.p_at_least_one[Rarity.ULTRA], 0.0887)

    def test_run_is_monotonic_and_ends_near_one(self) -> None:
        run = run_outlook(1, 20)
        curve = [row.cumulative["any"] for row in run.rows]
        self.assertEqual(curve, sorted(curve))
        self.assertGreater(curve[-1], 0.999)
        self.assertEqual(run.milestones["any"].p90 is not None, True)


if __name__ == "__main__":
    unittest.main()
