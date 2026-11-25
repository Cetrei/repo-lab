import { RARITIES } from "@repo-lab/contract";
import type { ValuableSize } from "@repo-lab/contract";

export const RARITY_LABEL = {
  common: "Común",
  uncommon: "Poco común",
  rare: "Rara",
  ultra: "Ultra",
} as const satisfies Record<(typeof RARITIES)[number], string>;

/** The milestone targets of a run: any box, or a first box of one rarity. */
export const TARGETS = ["any", ...RARITIES] as const;
export type Target = (typeof TARGETS)[number];

export const TARGET_LABEL: Record<Target, string> = {
  any: "Cualquier caja",
  ...RARITY_LABEL,
};

export const SIZE_LABEL: Record<ValuableSize, string> = {
  tiny: "Diminuto",
  small: "Pequeño",
  medium: "Mediano",
  big: "Grande",
  wide: "Ancho",
  tall: "Alto",
  very_tall: "Muy alto",
};

export const TIER_LABEL = {
  tier1: "Tier 1",
  tier2: "Tier 2",
  tier3: "Tier 3",
} as const;
