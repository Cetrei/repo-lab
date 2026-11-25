import { z } from "zod";

/** Shapes shared by several endpoints. Every object is strict, so a field Python adds shows up as a failing test. */

export const rarity = z.strictObject({
  common: z.number(),
  uncommon: z.number(),
  rare: z.number(),
  ultra: z.number(),
});
export type Rarity = z.infer<typeof rarity>;
export const RARITIES = ["common", "uncommon", "rare", "ultra"] as const;

export const source = z.strictObject({
  name: z.string(),
  url: z.string(),
  note: z.string(),
});
export type Source = z.infer<typeof source>;

/** Cosmetic boxes. */

export const ruleset = z.strictObject({
  id: z.string(),
  label: z.string(),
  patch: z.string(),
  spawn_by_step: z.array(z.number()),
  rarity_by_step: z.array(z.array(z.number())),
  bad_luck_bonus: z.number(),
  note: z.string(),
});
export type Ruleset = z.infer<typeof ruleset>;

export const rulesets = z.strictObject({
  default: z.string(),
  rulesets: z.array(ruleset),
});

export const slotOutlook = z.strictObject({
  slot: z.int(),
  step: z.int(),
  base_spawn: z.number(),
  spawn: z.number(),
  rarity,
});

export const levelOutlook = z.strictObject({
  level: z.int(),
  bad_luck: z.int(),
  modifier: z.number(),
  slots: z.array(slotOutlook),
  count_distribution: z.array(z.number()),
  p_dry: z.number(),
  p_any: z.number(),
  expected_boxes: z.number(),
  expected_by_rarity: rarity,
  p_at_least_one: rarity,
});
export type LevelOutlook = z.infer<typeof levelOutlook>;

export const milestone = z.strictObject({
  target: z.string(),
  median: z.int().nullable(),
  p90: z.int().nullable(),
  expected: z.number(),
  p_within_horizon: z.number(),
});
export type Milestone = z.infer<typeof milestone>;

export const runRow = z.strictObject({
  level: z.int(),
  p_any: z.number(),
  expected_boxes: z.number(),
  expected_by_rarity: rarity,
  cumulative: z.strictObject({
    any: z.number(),
    common: z.number(),
    uncommon: z.number(),
    rare: z.number(),
    ultra: z.number(),
  }),
});

export const runOutlook = z.strictObject({
  ruleset_id: z.string(),
  start_level: z.int(),
  bad_luck: z.int(),
  rows: z.array(runRow),
  milestones: z.strictObject({
    any: milestone,
    common: milestone,
    uncommon: milestone,
    rare: milestone,
    ultra: milestone,
  }),
  horizon: z.int(),
});
export type RunOutlook = z.infer<typeof runOutlook>;

/** Monsters. */

export const monster = z.strictObject({
  id: z.string(),
  name: z.string(),
  solo_upgrades: z.int().nullable(),
  stunned_upgrades: z.int().nullable(),
  health: z.int().nullable(),
  note: z.string(),
});
export type Monster = z.infer<typeof monster>;

export const monsterCatalog = z.strictObject({
  base_strength: z.int(),
  max_players: z.int(),
  monsters: z.array(monster),
});

export const liftCheck = z.strictObject({
  monster_id: z.string(),
  name: z.string(),
  health: z.int().nullable(),
  note: z.string(),
  liftable: z.boolean(),
  required: z.int().nullable(),
  combined: z.int(),
  can_lift: z.boolean(),
  margin: z.int().nullable(),
  missing: z.int(),
  min_players_without_upgrades: z.int().nullable(),
  upgrades_from_zero: z.array(z.int()).nullable(),
  stunned_required: z.int().nullable(),
  can_lift_stunned: z.boolean().nullable(),
});
export type LiftCheck = z.infer<typeof liftCheck>;

export const liftTable = z.strictObject({ rows: z.array(liftCheck) });

/** Upgrade shop. */

export const upgrade = z.strictObject({
  id: z.string(),
  name: z.string(),
  cap: z.int(),
  permanent: z.boolean(),
});
export type Upgrade = z.infer<typeof upgrade>;

export const shopRuleset = z.strictObject({
  id: z.string(),
  label: z.string(),
  shop_slots: z.int(),
  truck_capacity: z.int(),
  reroll_step: z.int(),
  selection_model: z.string(),
  note: z.string(),
});

export const upgradeCatalog = z.strictObject({
  upgrades: z.array(upgrade),
  total_units: z.int(),
  shop: shopRuleset,
});

export const shopRow = z.strictObject({
  upgrade_id: z.string(),
  name: z.string(),
  cap: z.int(),
  held: z.int(),
  pool: z.int(),
  p_appears: z.number(),
  expected_units: z.number(),
  certain: z.boolean(),
});

export const shopOutlook = z.strictObject({
  slots: z.int(),
  pool_total: z.int(),
  held_total: z.int(),
  truck_capacity: z.int(),
  truck_units: z.int(),
  truck_free: z.int(),
  void_units: z.int(),
  guaranteed: z.boolean(),
  rows: z.array(shopRow),
});
export type ShopOutlook = z.infer<typeof shopOutlook>;

const counts = z.record(z.string(), z.int());

export const stashPlan = z.strictObject({
  stash: counts,
  units_to_stash: z.int(),
  held_after: z.int(),
  truck_units: z.int(),
  void_units: z.int(),
  all_wanted_guaranteed: z.boolean(),
  filler: counts,
  after: shopOutlook,
});
export type StashPlan = z.infer<typeof stashPlan>;

export const useResult = z.strictObject({
  held: counts,
  consumed: z.array(z.string()),
  units_used: z.int(),
  released_from_void: z.int(),
  void_after: z.int(),
  after: shopOutlook,
});
export type UseResult = z.infer<typeof useResult>;

export const unitLocation = z.strictObject({
  truck: z.array(z.string()),
  void: z.array(z.string()),
});

export const rerollCost = z.strictObject({
  rerolls: z.int(),
  total_cost: z.int(),
});

/** Spawning. */

export const tierCounts = z.strictObject({
  tier1: z.int(),
  tier2: z.int(),
  tier3: z.int(),
});

const intPair = z.tuple([z.int(), z.int()]);

export const spawnRules = z.strictObject({
  bands: z.array(z.tuple([z.int(), z.int().nullable(), tierCounts])),
  group_chance: z.number(),
  despawn_first_part: intPair,
  despawn_second_part: intPair,
  despawn_bubble_units: z.int(),
  early_level_minutes: z.int(),
  late_level_minutes: z.int(),
  early_respawn: intPair,
  late_respawn: intPair,
  kill_multiplier: z.int(),
  final_extraction_respawn: z.int(),
  noise_seconds_removed_per_second: z.int(),
  respawn_distance_units: intPair,
  sources: z.array(source),
});

export const spawnOutlook = z.strictObject({
  level: z.int(),
  counts: tierCounts,
  group_chance: z.number(),
  expected_groups: z.number(),
  p_any_group: z.number(),
});
export type SpawnOutlook = z.infer<typeof spawnOutlook>;

export const despawnWindow = z.strictObject({ low: z.int(), high: z.int() });

export const respawnWindow = z.strictObject({
  known: z.boolean(),
  low: z.int().nullable(),
  high: z.int().nullable(),
  reason: z.string(),
});
export type RespawnWindow = z.infer<typeof respawnWindow>;

/** Credits. */

export const sources = z.strictObject({
  cosmetics: z.array(source),
  monsters: z.array(source),
  upgrades: z.array(source),
  spawning: z.array(source),
});
