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
  Rabbit,
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
import type { CSSProperties } from "react";

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
  pony: Rabbit,
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
export function GlyphTile({ kind, id, size = 40, eager }: { kind: Kind; id: string; size?: number; eager?: boolean }) {
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
          loading={eager ? "eager" : "lazy"}
          decoding={eager ? "sync" : "async"}
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
export function RarityArt({ rarity, size = 72, height = size }: { rarity: string; size?: number; height?: number }) {
  const [failed, setFailed] = useState(false);
  const Glyph = glyphFor("rarity", rarity);
  return (
    <span className="crate" data-rarity={rarity} style={{ width: size, height }} aria-hidden="true">
      {failed ? (
        <Glyph size={Math.round(size * 0.5)} strokeWidth={1.75} />
      ) : (
        <img
          src={iconUrl("rarity", rarity)}
          alt=""
          width={size}
          height={height}
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

/** Hues that turn the grey semibot head into the colors of the game lobby. */
const HEAD_HUES = [0, 28, 60, 115, 170, 205, 260, 315];

/** The lobby colors in a random order, so every head of a list gets a different one. */
export function shuffledHues(): number[] {
  const hues = [...HEAD_HUES];
  for (let index = hues.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [hues[index], hues[other]] = [hues[other] ?? 0, hues[index] ?? 0];
  }
  return hues;
}

/**
 * The head of a semibot, the player of the game, tinted with one lobby color. The tint is a filter, so the
 * eyes are a second image laid on top of the tinted one and keep their own colors.
 */
export function PlayerHead({ hue, size }: { hue: number; size: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <User aria-hidden size={Math.round(size * 0.6)} strokeWidth={1.75} />;
  return (
    <span className="semibot" style={{ "--hue": `${hue}deg`, width: size, height: size } as CSSProperties}>
      <img
        className="semibot__body"
        src={iconUrl("player", "head")}
        alt=""
        width={size}
        height={size}
        decoding="async"
        draggable={false}
        onError={() => {
          setFailed(true);
        }}
      />
      <img
        className="semibot__eyes"
        src={iconUrl("player", "eyes")}
        alt=""
        width={size}
        height={size}
        decoding="async"
        draggable={false}
      />
    </span>
  );
}

/** One head for a solo lift, a few overlapped heads when several players have to grab the monster. */
export function Heads({ count }: { count: number }) {
  const [hues] = useState(shuffledHues);
  const shown = Math.min(Math.max(count, 1), 3);
  return (
    <span className="heads" aria-hidden="true">
      {hues.slice(0, shown).map((hue) => (
        <PlayerHead key={hue} hue={hue} size={22} />
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

const warm: HTMLImageElement[] = [];

/**
 * Starts downloading and decoding every piece of game art while Python loads, so a dialog or a card never
 * shows an image that is still arriving. The images stay referenced so the browser keeps them decoded.
 */
export function preloadArt(): void {
  const base = import.meta.env.BASE_URL;
  fetch(`${base}icons/manifest.json`)
    .then((response) => response.json() as Promise<{ icons?: { file: string }[] }>)
    .then((manifest) => {
      for (const icon of manifest.icons ?? []) {
        const image = new Image();
        image.src = `${base}icons/${icon.file}`;
        image.decode().catch(() => undefined);
        warm.push(image);
      }
      // the eyes are cut from the head by scripts/make_eyes.py, so the manifest does not list them
      const eyes = new Image();
      eyes.src = iconUrl("player", "eyes");
      eyes.decode().catch(() => undefined);
      warm.push(eyes);
    })
    .catch(() => undefined);
}
