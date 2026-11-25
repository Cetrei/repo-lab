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
  Package,
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
  User,
  Wind,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

/**
 * Stylized glyphs, one per monster and per upgrade. They are the fallback when the game art of an entry
 * is missing or fails to load. An id without an entry falls back to a question mark, and a test keeps
 * the two lists in step with the catalogs.
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

type Kind = "monster" | "upgrade" | "rarity" | "player";

const FOLDER: Record<Kind, string> = {
  monster: "monsters",
  upgrade: "upgrades",
  rarity: "rarities",
  player: "players",
};

/**
 * Where the game art of a monster or an upgrade lives. The PNGs come from the community wiki through
 * scripts/fetch_icons.py, and icons/manifest.json lists the wiki page of each one. The base is relative,
 * so the same build works on a project page and locally.
 */
export function iconUrl(kind: Kind, id: string): string {
  return `${import.meta.env.BASE_URL}icons/${FOLDER[kind]}/${id}.png`;
}

function glyphFor(kind: Kind, id: string): LucideIcon {
  if (kind === "rarity") return Package;
  if (kind === "player") return User;
  return (kind === "monster" ? MONSTER_GLYPHS : UPGRADE_GLYPHS)[id] ?? CircleHelp;
}

/**
 * A square tile with the game art of a monster or an upgrade. Decorative: the name always sits next to
 * it. If the image cannot load, the stylized glyph takes its place.
 */
export function GlyphTile({ kind, id, size = 40 }: { kind: Kind; id: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const Glyph = glyphFor(kind, id);
  return (
    <span className="glyph" data-kind={kind} style={{ width: size, height: size }} aria-hidden="true">
      {failed ? (
        <Glyph size={Math.round(size * 0.55)} strokeWidth={1.75} />
      ) : (
        <img
          src={iconUrl(kind, id)}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => {
            setFailed(true);
          }}
        />
      )}
    </span>
  );
}

/** The cosmetic crate of a rarity, a transparent cutout that keeps its own proportions. */
export function RarityArt({ rarity, size = 72 }: { rarity: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const Glyph = glyphFor("rarity", rarity);
  return (
    <span className="crate" data-rarity={rarity} style={{ width: size, height: size }} aria-hidden="true">
      {failed ? (
        <Glyph size={Math.round(size * 0.5)} strokeWidth={1.75} />
      ) : (
        <img
          src={iconUrl("rarity", rarity)}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => {
            setFailed(true);
          }}
        />
      )}
    </span>
  );
}

/** A semibot, the player of the game: the whole robot for a team member, the head for who lifts. */
export function PlayerArt({ kind, height }: { kind: "robot" | "head"; height: number }) {
  const [failed, setFailed] = useState(false);
  const width = kind === "robot" ? Math.round(height * 0.48) : height;
  return failed ? (
    <User aria-hidden size={Math.round(height * 0.6)} strokeWidth={1.75} />
  ) : (
    <img
      className="semibot"
      data-kind={kind}
      src={iconUrl("player", kind)}
      alt=""
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => {
        setFailed(true);
      }}
    />
  );
}

/** One head for a solo lift, a few overlapped heads when several players have to grab the monster. */
export function Heads({ count }: { count: number }) {
  const shown = Math.min(Math.max(count, 1), 3);
  return (
    <span className="heads" aria-hidden="true">
      {Array.from({ length: shown }, (_, index) => (
        <PlayerArt key={index} kind="head" height={22} />
      ))}
    </span>
  );
}

/** The portrait of an upgrade box at its natural proportions (183 by 277), for cards. */
export function UpgradeArt({ id }: { id: string }) {
  const [failed, setFailed] = useState(false);
  const Glyph = glyphFor("upgrade", id);
  return failed ? (
    <span className="art art--fallback" aria-hidden="true">
      <Glyph size={28} strokeWidth={1.75} />
    </span>
  ) : (
    <img
      className="art"
      src={iconUrl("upgrade", id)}
      alt=""
      width={72}
      height={109}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => {
        setFailed(true);
      }}
    />
  );
}
