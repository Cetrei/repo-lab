import {
  Armchair,
  Baby,
  BatteryCharging,
  BatteryMedium,
  Bird,
  Bomb,
  Brain,
  Bug,
  ChefHat,
  ChevronsUp,
  CircleHelp,
  Crosshair,
  Dices,
  Drama,
  Droplets,
  Dumbbell,
  Eye,
  EyeOff,
  Flame,
  Flower2,
  Footprints,
  Ghost,
  Hand,
  Heart,
  HeartPulse,
  Map as MapIcon,
  Megaphone,
  Mountain,
  Network,
  PartyPopper,
  PawPrint,
  Ribbon,
  Rocket,
  ScanEye,
  Skull,
  Smile,
  Snowflake,
  Sprout,
  Swords,
  Trash2,
  Wind,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Stylized glyphs, one per monster and per upgrade. They are not game art: they only give each row a
 * quick visual anchor. An id without an entry falls back to a question mark, and a test keeps the two
 * lists in step with the catalogs.
 */
export const MONSTER_GLYPHS: Record<string, LucideIcon> = {
  gnome: Sprout,
  banger: Bomb,
  tick: Bug,
  spewer: Droplets,
  "birthday-boy": PartyPopper,
  rugrat: Baby,
  animal: PawPrint,
  upscream: Megaphone,
  hidden: EyeOff,
  mentalist: Brain,
  headgrab: Hand,
  bowtie: Ribbon,
  "shadow-child": Ghost,
  bella: Flower2,
  chef: ChefHat,
  gambit: Dices,
  "heart-hugger": Heart,
  oogly: Eye,
  huntsman: Crosshair,
  reaper: Skull,
  headman: Swords,
  robe: Drama,
  clown: Smile,
  trudge: Footprints,
  "cleanup-crew": Trash2,
  loom: Network,
  peeper: ScanEye,
  "apex-predator": Flame,
  elsa: Snowflake,
};

export const UPGRADE_GLYPHS: Record<string, LucideIcon> = {
  strength: Dumbbell,
  range: Hand,
  stamina: BatteryCharging,
  sprint: Wind,
  "crouch-rest": Armchair,
  health: HeartPulse,
  "map-player-count": MapIcon,
  "tumble-launch": Rocket,
  "tumble-wings": Bird,
  "tumble-climb": Mountain,
  "extra-jump": ChevronsUp,
  "death-head-battery": BatteryMedium,
};

type Kind = "monster" | "upgrade";

/** A square tile with the glyph of a monster or an upgrade. Decorative: the name always sits next to it. */
export function GlyphTile({ kind, id, size = 40 }: { kind: Kind; id: string; size?: number }) {
  const Glyph = (kind === "monster" ? MONSTER_GLYPHS : UPGRADE_GLYPHS)[id] ?? CircleHelp;
  return (
    <span className="glyph" data-kind={kind} style={{ width: size, height: size }} aria-hidden="true">
      <Glyph size={Math.round(size * 0.55)} strokeWidth={1.75} />
    </span>
  );
}
