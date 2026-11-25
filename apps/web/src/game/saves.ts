/**
 * The state of one game of the player: the level they are on, the team, the shop and the boxes. Everything a
 * calculator asks for lives here, so it survives a reload and several games can be kept side by side.
 */
export interface Game {
  level: number;
  /** Levels in a row that ended without a cosmetic box. */
  badLuck: number;
  /** How many levels the box table of the run covers. */
  runLevels: number;
  /** One entry per player: the Strength upgrades that player bought. */
  team: number[];
  /** Shop units bought and not used, by upgrade id. */
  held: Record<string, number>;
  /** Permanent upgrades already used. */
  consumed: string[];
  /** The upgrades the player wants to see in the shop. */
  wanted: string[];
  /** The units set to be spent, by upgrade id. */
  used: Record<string, number>;
  rerolls: number;
}

export interface Save {
  id: string;
  name: string;
  savedAt: number;
  game: Game;
}

export interface SaveStore {
  activeId: string;
  saves: Save[];
}

/** Bumped when the shape of a stored game changes, so an old file is read by its own rules or dropped. */
export const STORE_KEY = "repo-lab:games:v1";

export const LIMITS = {
  level: { min: 1, max: 10000 },
  badLuck: { min: 0, max: 500 },
  runLevels: { min: 1, max: 100 },
  players: { min: 1, max: 6 },
  upgrades: { min: 0, max: 99 },
  rerolls: { min: 0, max: 1000 },
} as const;

export function newGame(): Game {
  return { level: 1, badLuck: 0, runLevels: 10, team: [0, 0], held: {}, consumed: [], wanted: [], used: {}, rerolls: 0 };
}

function whole(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}

function counts(value: unknown): Record<string, number> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [id, count] of Object.entries(value)) {
    const n = whole(count, 1, LIMITS.upgrades.max, 0);
    if (n > 0) out[id] = n;
  }
  return out;
}

function ids(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** A game read from storage, field by field: anything out of range or of the wrong type falls back to its default. */
export function readGame(value: unknown): Game {
  const base = newGame();
  if (typeof value !== "object" || value === null) return base;
  const raw = value as Record<string, unknown>;
  const team = Array.isArray(raw.team)
    ? raw.team.slice(0, LIMITS.players.max).map((entry) => whole(entry, LIMITS.upgrades.min, LIMITS.upgrades.max, 0))
    : base.team;
  return {
    level: whole(raw.level, LIMITS.level.min, LIMITS.level.max, base.level),
    badLuck: whole(raw.badLuck, LIMITS.badLuck.min, LIMITS.badLuck.max, base.badLuck),
    runLevels: whole(raw.runLevels, LIMITS.runLevels.min, LIMITS.runLevels.max, base.runLevels),
    team: team.length >= LIMITS.players.min ? team : base.team,
    held: counts(raw.held),
    consumed: ids(raw.consumed),
    wanted: ids(raw.wanted),
    used: counts(raw.used),
    rerolls: whole(raw.rerolls, LIMITS.rerolls.min, LIMITS.rerolls.max, base.rerolls),
  };
}

let counter = 0;

function freshId(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter.toString(36)}`;
}

/** The first free name of the form "Partida N". */
export function nextName(saves: readonly Save[]): string {
  const taken = new Set(saves.map((save) => save.name));
  for (let n = saves.length + 1; ; n += 1) {
    const name = `Partida ${n}`;
    if (!taken.has(name)) return name;
  }
}

export function newSave(saves: readonly Save[], game: Game = newGame()): Save {
  return { id: freshId(), name: nextName(saves), savedAt: Date.now(), game };
}

export function freshStore(): SaveStore {
  const first = newSave([]);
  return { activeId: first.id, saves: [first] };
}

/** What storage holds, read defensively. A file that does not parse gives a new store with one empty game. */
export function readStore(text: string | null): SaveStore {
  if (text === null) return freshStore();
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null) return freshStore();
    const raw = parsed as { activeId?: unknown; saves?: unknown };
    const saves = Array.isArray(raw.saves)
      ? raw.saves.flatMap((entry: unknown): Save[] => {
          if (typeof entry !== "object" || entry === null) return [];
          const item = entry as Record<string, unknown>;
          if (typeof item.id !== "string" || typeof item.name !== "string") return [];
          return [
            {
              id: item.id,
              name: item.name.slice(0, 40) || "Partida",
              savedAt: whole(item.savedAt, 0, Number.MAX_SAFE_INTEGER, 0),
              game: readGame(item.game),
            },
          ];
        })
      : [];
    const first = saves[0];
    if (!first) return freshStore();
    const active = saves.find((save) => save.id === raw.activeId) ?? first;
    return { activeId: active.id, saves };
  } catch {
    return freshStore();
  }
}
