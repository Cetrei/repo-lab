import type { LiftCheck, Monster, RunOutlook, Valuable } from "@repo-lab/contract";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { guarantee, guaranteeText } from "../components/BoxStrip";
import { HealthBar } from "../components/HealthBar";
import { visible } from "../components/ValuablesStrip";
import { ChannelContext } from "../channel";
import { EngineProvider } from "../engine/EngineProvider";
import { GameProvider } from "../game/GameProvider";
import { routesFor } from "../routes";
import { replayEngine } from "../test/replay";
import { PartidaView, plainName, possibleIds, tilesOf } from "./PartidaView";

function show(view: ReactElement) {
  const engine = replayEngine();
  const result = render(
    <EngineProvider engine={engine}>
      <ChannelContext.Provider value="next">
        <GameProvider>{view}</GameProvider>
      </ChannelContext.Provider>
    </EngineProvider>,
  );
  return { engine, ...result };
}

describe("routesFor", () => {
  it("keeps the stable tabs and gives the test channel one Partida view in place of three", () => {
    expect(routesFor("stable").map((route) => route.id)).toEqual(["cajas", "monstruos", "mejoras", "apariciones", "fuentes"]);
    expect(routesFor("next").map((route) => route.id)).toEqual(["partida", "mejoras", "fuentes"]);
  });
});

describe("possibleIds", () => {
  const rules = {
    members: { tier1: [{ id: "gnome" }], tier2: [{ id: "bowtie" }], tier3: [{ id: "robe" }] },
    groups: [{ monster_id: "gnome-pack", count: 3 }],
  } as unknown as Parameters<typeof possibleIds>[0];

  it("lists only the tiers that spawn", () => {
    expect([...possibleIds(rules, { tier1: 2, tier2: 0, tier3: 0 })]).toEqual(["gnome"]);
  });

  it("adds the groups that replace a tier 3 enemy", () => {
    const ids = possibleIds(rules, { tier1: 0, tier2: 0, tier3: 1 });
    expect(ids.has("robe")).toBe(true);
    expect(ids.has("gnome-pack")).toBe(true);
  });
});

describe("tilesOf", () => {
  const rows = [
    { monster_id: "c", name: "Robe" },
    { monster_id: "a", name: "Gnome" },
    { monster_id: "b", name: "Éclair" },
    { monster_id: "d", name: "Hidden" },
  ] as LiftCheck[];
  const monsters = [
    { id: "a", tier: 1 },
    { id: "b", tier: 2 },
    { id: "c", tier: 3 },
    { id: "d", tier: 2 },
  ] as Monster[];
  const possible = new Set(["a", "b", "c"]);

  it("hides what cannot spawn and orders by tier", () => {
    expect(tilesOf(rows, monsters, possible, "").map((tile) => tile.row.monster_id)).toEqual(["a", "b", "c"]);
    expect(tilesOf(rows, monsters, possible, "").map((tile) => tile.tier)).toEqual([1, 2, 3]);
  });

  it("searches by name without caring for accents or capitals", () => {
    expect(tilesOf(rows, monsters, possible, " ECLAIR ").map((tile) => tile.row.monster_id)).toEqual(["b"]);
    expect(plainName("Éclair")).toBe("eclair");
  });
});

describe("HealthBar", () => {
  it("splits the health in bars of 100, the last one partly filled", () => {
    const { container } = render(<HealthBar health={250} />);
    const fills = Array.from(container.querySelectorAll<HTMLElement>(".hp__seg")).map((seg) => seg.style.getPropertyValue("--fill"));
    expect(fills).toEqual(["1", "1", "0.5"]);
    expect(screen.getByRole("img", { name: "Vida 250" })).toBeTruthy();
  });

  it("draws nothing for a monster without a figure", () => {
    const { container } = render(<HealthBar health={null} />);
    expect(container.querySelector(".hp")).toBeNull();
  });
});

describe("guarantee", () => {
  const cumulative = (common: number, ultra: number) => ({ any: 1, common, uncommon: 0.5, rare: 0.5, ultra });
  const run = {
    rows: [{ cumulative: cumulative(0.6, 0.1) }, { cumulative: cumulative(1, 0.2) }],
    milestones: { any: { p90: 1 }, common: { p90: 2 }, uncommon: { p90: 4 }, rare: { p90: null }, ultra: { p90: 12 } },
  } as unknown as RunOutlook;

  it("is sure when missing the box stops being possible", () => {
    expect(guarantee(run, "common")).toEqual({ kind: "sure", levels: 2 });
    expect(guaranteeText({ kind: "sure", levels: 1 })).toBe("Seguro en 1 nivel");
  });

  it("falls back to the 9 of 10 level count, never called a guarantee", () => {
    expect(guarantee(run, "ultra")).toEqual({ kind: "likely", levels: 12 });
    expect(guaranteeText({ kind: "likely", levels: 12 })).toBe("90 % en 12 niveles");
    expect(guarantee(run, "rare")).toEqual({ kind: "none" });
  });
});

describe("visible", () => {
  const items = [
    { id: "piano", stuns_big: true },
    { id: "plate", stuns_big: false },
  ] as Valuable[];

  it("keeps everything, or only what stuns a big enemy", () => {
    expect(visible(items, false)).toHaveLength(2);
    expect(visible(items, true).map((item) => item.id)).toEqual(["piano"]);
  });
});

describe("PartidaView", () => {
  it("puts the team, the boxes and the monsters of the level on one screen", async () => {
    const { engine } = show(<PartidaView />);
    expect(await screen.findByRole("heading", { name: "Equipo" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Cajas" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Monstruos" })).toBeTruthy();
    expect(await screen.findByRole("list", { name: "Monstruos que pueden salir en este nivel" })).toBeTruthy();
    await screen.findByRole("list", { name: "Cajas por rareza" });
    expect(engine.payloads("spawning.outlook").length).toBeGreaterThan(0);
    expect(engine.payloads("monsters.lift").length).toBeGreaterThan(0);
    expect(engine.payloads("cosmetics.level").length).toBeGreaterThan(0);
  });

  it("explains nothing in text: the legend and the tier panels are gone", async () => {
    show(<PartidaView />);
    await screen.findByRole("list", { name: "Monstruos que pueden salir en este nivel" });
    expect(screen.queryByText(/Verde:/)).toBeNull();
    expect(screen.queryByRole("heading", { name: /^Tier/ })).toBeNull();
  });

  it("opens the detail of an enemy from its tile and names its tier", async () => {
    show(<PartidaView />);
    const [tile] = await screen.findAllByRole("button", { name: /^Gnome, tier 1/ });
    if (!tile) throw new Error("no Gnome tile");
    fireEvent.click(tile);
    expect(await screen.findByRole("dialog")).toBeTruthy();
  });

  it("narrows the tiles with the search by name", async () => {
    show(<PartidaView />);
    const list = await screen.findByRole("list", { name: "Monstruos que pueden salir en este nivel" });
    const before = within(list).getAllByRole("button").length;
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar un monstruo por nombre" }), { target: { value: "gnome" } });
    const names = within(list)
      .getAllByRole("button")
      .map((tile) => tile.getAttribute("aria-label") ?? "");
    expect(names.length).toBeLessThan(before);
    for (const name of names) expect(name.toLowerCase()).toContain("gnome");
  });

  it("keeps the valuables under a fold and asks for another map when its chip is pressed", async () => {
    const { engine, container } = show(<PartidaView />);
    const fold = await waitFor(() => {
      const found = container.querySelector("details.fold");
      if (!found) throw new Error("no fold");
      return found as HTMLDetailsElement;
    });
    expect(fold.open).toBe(false);
    fold.open = true;
    const list = await screen.findByRole("list", { name: "Valuables de Headman Manor" });
    expect(within(list).getByText("Piano")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "McJannek Station" }));
    await waitFor(() => {
      expect(engine.payloads("valuables.map")).toContainEqual({ location: "mcjannek-station" });
    });
  });

  it("narrows the valuables to what stuns big enemies", async () => {
    const { container } = show(<PartidaView />);
    await waitFor(() => {
      if (!container.querySelector("details.fold")) throw new Error("no fold");
    });
    (container.querySelector("details.fold") as HTMLDetailsElement).open = true;
    await screen.findByRole("list", { name: "Valuables de Headman Manor" });
    const before = container.querySelectorAll(".vtile").length;
    fireEvent.click(screen.getByRole("button", { name: "Solo los que aturden enemigos grandes" }));
    const tiles = Array.from(container.querySelectorAll(".vtile"));
    expect(tiles.length).toBeLessThan(before);
    for (const tile of tiles) expect(tile.getAttribute("data-stun")).toBe("true");
  });
});
