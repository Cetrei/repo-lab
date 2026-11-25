import { RARITIES } from "@repo-lab/contract";
import { describe, expect, it } from "vitest";
import cases from "../../../packages/contract/fixtures/cases.json";
import manifest from "../public/icons/manifest.json";
import { MONSTER_GLYPHS, UPGRADE_GLYPHS } from "./icons";
import { verdict } from "./lift";

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
    ];
    const missing = wanted.filter(([folder, id]) => !files.includes(`../public/icons/${folder}/${id}.png`));
    expect(missing).toEqual([]);
    const listed = new Set(manifest.icons.map((icon) => icon.file));
    expect(wanted.filter(([folder, id]) => !listed.has(`${folder}/${id}.png`))).toEqual([]);
    expect(manifest.icons.every((icon) => icon.source.startsWith(manifest.wiki))).toBe(true);
  });
});
