import { RARITIES } from "@repo-lab/contract";
import type { LiftCheck } from "@repo-lab/contract";
import { describe, expect, it } from "vitest";
import cases from "../../../packages/contract/fixtures/cases.json";
import manifest from "../public/icons/manifest.json";
import { MONSTER_GLYPHS, UPGRADE_GLYPHS } from "./icons";
import { known, stunnedFigure as stunFigure, stunVerdict, teamStrength, verdict } from "./lift";

interface Case {
  endpoint: string;
  response: { ok: boolean; data?: unknown };
}

function catalog<T>(endpoint: string): T {
  const hit = (cases as Case[]).find((item) => item.endpoint === endpoint && item.response.ok);
  if (!hit) throw new Error(`no fixture for ${endpoint}`);
  return hit.response.data as T;
}

describe("verdict", () => {
  it("says solo, how many players, or what is missing", () => {
    expect(verdict(10, 1, 0)).toEqual({ tone: "good", players: 1, text: "Solo" });
    expect(verdict(18, 3, 0)).toEqual({ tone: "good", players: 3, text: "3 jugadores" });
    expect(verdict(18, null, 4)).toEqual({ tone: "bad", players: null, text: "Faltan 4" });
    expect(verdict(18, null, null)).toEqual({ tone: "bad", players: null, text: "No alcanza" });
  });

  it("has nothing to say without a figure", () => {
    expect(verdict(null, null, null)).toEqual({ tone: "muted", players: null, text: "Sin dato" });
  });
});

describe("stunVerdict", () => {
  const row = (patch: Partial<LiftCheck>) =>
    ({
      liftable: true,
      base_strength: 5,
      stunned_required: null,
      stunned_required_min: null,
      players_needed_stunned: null,
      players_needed_stunned_min: null,
      ...patch,
    }) as LiftCheck;
  const sure = { stunned_required: 5, stunned_required_min: 5, players_needed_stunned: 1, players_needed_stunned_min: 1 };
  const range = { stunned_required: 9, stunned_required_min: 6 };

  it("says a monster that cannot be grabbed cannot be grabbed, even with a stunned figure", () => {
    const never = { tone: "muted", players: null, text: "No se puede agarrar" };
    expect(stunVerdict(row({ liftable: false }))).toEqual(never);
    expect(stunVerdict(row({ liftable: false, ...sure }))).toEqual(never);
  });

  it("keeps Sin dato for a monster that can be grabbed but has no stunned figure", () => {
    expect(stunVerdict(row({})).text).toBe("Sin dato");
    expect(stunFigure(row({}))).toBeNull();
  });

  it("gives a sure figure as one number and one answer", () => {
    expect(stunVerdict(row(sure)).text).toBe("Solo");
    expect(stunFigure(row(sure))).toBe("0");
  });

  it("gives a range when the sources disagree", () => {
    expect(stunFigure(row(range))).toBe("1 a 4");
    expect(stunVerdict(row({ ...range, players_needed_stunned: 2, players_needed_stunned_min: 1 }))).toEqual({
      tone: "good",
      players: 2,
      text: "1 a 2 jugadores",
    });
    expect(stunVerdict(row({ ...range, players_needed_stunned: 2, players_needed_stunned_min: 2 })).text).toBe(
      "2 jugadores",
    );
  });

  it("is not sure between the figures and says it cannot when it misses all of them", () => {
    expect(stunVerdict(row({ ...range, players_needed_stunned_min: 1 })).text).toBe("Sin certeza");
    expect(stunVerdict(row(range)).text).toBe("No alcanza");
  });
});

describe("strength as the player knows it", () => {
  const base = { base_strength: 5 } as LiftCheck;

  it("takes the base off, so a lone player without upgrades has 0", () => {
    expect(known(base, 5)).toBe("0");
    expect(known(base, 9)).toBe("4");
  });

  it("shows the team from any row, each extra player adding the base", () => {
    expect(teamStrength([{ ...base, combined: 5 } as LiftCheck])).toBe("0");
    expect(teamStrength([{ ...base, combined: 10 } as LiftCheck])).toBe("5");
    expect(teamStrength([])).toBe("0");
  });
});

describe("glyphs", () => {
  it("cover every monster of the catalog", () => {
    const monsters = catalog<{ monsters: { id: string }[] }>("monsters.catalog").monsters;
    expect(monsters.filter((item) => !(item.id in MONSTER_GLYPHS)).map((item) => item.id)).toEqual([]);
  });

  it("cover every upgrade of the catalog", () => {
    const upgrades = catalog<{ upgrades: { id: string }[] }>("upgrades.catalog").upgrades;
    expect(upgrades.filter((item) => !(item.id in UPGRADE_GLYPHS)).map((item) => item.id)).toEqual([]);
  });
});

describe("game art", () => {
  const files = Object.keys(import.meta.glob("../public/icons/*/*.png"));

  it("has a PNG and a wiki source for every monster, upgrade and rarity of the catalogs", () => {
    const monsters = catalog<{ monsters: { id: string }[] }>("monsters.catalog").monsters;
    const upgrades = catalog<{ upgrades: { id: string }[] }>("upgrades.catalog").upgrades;
    const wanted = [
      ...monsters.map((item) => ["monsters", item.id] as const),
      ...upgrades.map((item) => ["upgrades", item.id] as const),
      ...RARITIES.map((rarity) => ["rarities", rarity] as const),
      ...["head"].map((id) => ["players", id] as const),
    ];
    const missing = wanted.filter(([folder, id]) => !files.includes(`../public/icons/${folder}/${id}.png`));
    expect(missing).toEqual([]);
    const listed = new Set(manifest.icons.map((icon) => icon.file));
    expect(wanted.filter(([folder, id]) => !listed.has(`${folder}/${id}.png`))).toEqual([]);
    expect(manifest.icons.every((icon) => icon.source.startsWith(manifest.wiki))).toBe(true);
  });
});
