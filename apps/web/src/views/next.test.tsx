import type { LiftCheck, Valuable } from "@repo-lab/contract";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { ChannelContext } from "../channel";
import { EngineProvider } from "../engine/EngineProvider";
import { GameProvider } from "../game/GameProvider";
import { routesFor } from "../routes";
import { replayEngine } from "../test/replay";
import { effortCounts, PartidaView, possibleIds } from "./PartidaView";
import { ValuablesView, visible } from "./ValuablesView";

function show(view: ReactElement) {
  const engine = replayEngine();
  render(
    <EngineProvider engine={engine}>
      <ChannelContext.Provider value="next">
        <GameProvider>{view}</GameProvider>
      </ChannelContext.Provider>
    </EngineProvider>,
  );
  return engine;
}

function row(effort: LiftCheck["effort"]): LiftCheck {
  return { effort } as LiftCheck;
}

describe("routesFor", () => {
  it("keeps the stable site as it was and adds the new views only to the test channel", () => {
    const stable = routesFor("stable").map((route) => route.id);
    const next = routesFor("next").map((route) => route.id);
    expect(stable).not.toContain("partida");
    expect(stable).not.toContain("valuables");
    expect(next).toEqual(["cajas", "monstruos", "mejoras", "apariciones", "partida", "valuables", "fuentes"]);
  });
});

describe("effortCounts", () => {
  it("counts the lifts that are clean, held with effort and out of reach", () => {
    const rows = [row("easy"), row("easy"), row("hard"), row("never"), row("none")];
    expect(effortCounts(rows)).toEqual({ easy: 2, hard: 1, none: 2 });
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

describe("ValuablesView", () => {
  it("opens on the first map and lists its valuables from the most valuable", async () => {
    const engine = show(<ValuablesView />);
    expect(await screen.findByRole("heading", { name: "Valuables por mapa" })).toBeTruthy();
    const list = await screen.findByRole("list", { name: "Valuables de Headman Manor" });
    expect(within(list).getByText("Piano")).toBeTruthy();
    expect(engine.payloads("valuables.map")[0]).toEqual({ location: "headman-manor" });
  });

  it("asks for another map when its chip is pressed", async () => {
    const engine = show(<ValuablesView />);
    await screen.findByRole("list", { name: "Valuables de Headman Manor" });
    fireEvent.click(screen.getByRole("button", { name: "McJannek Station" }));
    await waitFor(() => {
      expect(engine.payloads("valuables.map")).toContainEqual({ location: "mcjannek-station" });
    });
  });

  it("narrows the list to what stuns big enemies", async () => {
    show(<ValuablesView />);
    await screen.findByRole("list", { name: "Valuables de Headman Manor" });
    const before = document.querySelectorAll(".vcard").length;
    fireEvent.click(screen.getByRole("button", { name: /Aturden enemigos grandes/ }));
    const after = document.querySelectorAll(".vcard").length;
    expect(after).toBeLessThan(before);
    document.querySelectorAll(".vcard").forEach((card) => {
      expect(card.getAttribute("data-stun")).toBe("true");
    });
  });
});

describe("PartidaView", () => {
  it("puts the level, its enemies and what the team lifts on one screen", async () => {
    const engine = show(<PartidaView />);
    expect(await screen.findByRole("heading", { name: /^Partida en el nivel/ })).toBeTruthy();
    expect(screen.getByText("Los levantas sin problema")).toBeTruthy();
    expect(screen.getByText("Los sostienes con esfuerzo")).toBeTruthy();
    expect(engine.payloads("spawning.outlook").length).toBeGreaterThan(0);
    expect(engine.payloads("monsters.lift").length).toBeGreaterThan(0);
  });

  it("opens the detail of an enemy from its card", async () => {
    show(<PartidaView />);
    await screen.findByRole("heading", { name: /^Partida en el nivel/ });
    const [card] = await screen.findAllByRole("button", { name: /Gnome/ });
    if (!card) throw new Error("no Gnome card");
    fireEvent.click(card);
    expect(await screen.findByRole("dialog")).toBeTruthy();
  });
});
