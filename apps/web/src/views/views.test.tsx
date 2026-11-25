import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { EngineProvider } from "../engine/EngineProvider";
import { replayEngine } from "../test/replay";
import { CosmeticsView } from "./CosmeticsView";
import { MonstersView } from "./MonstersView";
import { SourcesView } from "./SourcesView";
import { SpawningView } from "./SpawningView";
import { PatchProvider, PatchSelector } from "../components/Patch";
import { UpgradesView } from "./UpgradesView";

function show(view: ReactElement) {
  const engine = replayEngine();
  render(<EngineProvider engine={engine}>{view}</EngineProvider>);
  return engine;
}

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe("CosmeticsView", () => {
  it("shows the odds of the level and of the run from Python's answers", async () => {
    show(<CosmeticsView />);
    expect(await screen.findByRole("list", { name: "Cajas por rareza" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Nivel 1" })).toBeTruthy();
    // The wait for the first box of each rarity lives in the same cards as the odds of the level.
    expect((await screen.findAllByText("Hasta la primera")).length).toBeGreaterThan(0);
    expect(screen.queryByRole("list", { name: "Espera hasta la primera caja" })).toBeNull();
    expect(screen.getAllByText(/Cualquier caja: la primera llega/).length).toBe(1);
  });

  it("keeps the tables behind the (i) button until it is opened", async () => {
    show(<CosmeticsView />);
    await screen.findAllByText("Hasta la primera");
    expect(screen.queryByText("Cuántos niveles hacen falta para ver la primera caja")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Más información sobre las cajas del nivel" }));
    expect(await screen.findByText("Cuántos niveles hacen falta para ver la primera caja")).toBeTruthy();
  });

  it("lights the bad luck bar from the segments and keeps it in step with the number", async () => {
    const engine = show(<CosmeticsView />);
    await screen.findByRole("list", { name: "Cajas por rareza" });
    fireEvent.click(screen.getByRole("button", { name: "3 niveles sin caja" }));
    await waitFor(() => {
      expect(engine.payloads("cosmetics.level").at(-1)).toEqual({ level: 1, bad_luck: 3 });
    });
    expect((screen.getByLabelText("Mala suerte") as HTMLInputElement).value).toBe("3");
    expect(screen.getByRole("button", { name: "2 niveles sin caja" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "4 niveles sin caja" }).getAttribute("aria-pressed")).toBe("false");
    // Pressing the last lit segment again lowers the count by one.
    fireEvent.click(screen.getByRole("button", { name: "3 niveles sin caja" }));
    await waitFor(() => {
      expect(engine.payloads("cosmetics.level").at(-1)).toEqual({ level: 1, bad_luck: 2 });
    });
  });

  it("follows the patch chosen in the corner of the page", async () => {
    const engine = replayEngine();
    render(
      <EngineProvider engine={engine}>
        <PatchProvider>
          <PatchSelector />
          <CosmeticsView />
        </PatchProvider>
      </EngineProvider>,
    );
    const wrench = await screen.findByRole("button", { name: "Parche del juego" });
    const first = engine.payloads("cosmetics.level")[0];
    expect(first).not.toHaveProperty("ruleset");
    // Nothing about the patches shows until the wrench is pressed.
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.click(wrench);
    const options = within(screen.getByRole("listbox", { name: "Parche" })).getAllByRole("option");
    expect(options.filter((option) => option.getAttribute("aria-selected") === "true")).toHaveLength(1);
    if (options.length > 1) {
      const other = options.find((option) => option.getAttribute("aria-selected") === "false");
      if (other) fireEvent.click(other);
      await waitFor(() => {
        expect(engine.payloads("cosmetics.level").at(-1)).toHaveProperty("ruleset");
      });
      expect(screen.queryByRole("listbox")).toBeNull();
    }
  });

  it("asks again with the level and the bad luck that were typed", async () => {
    const engine = show(<CosmeticsView />);
    await screen.findByRole("list", { name: "Cajas por rareza" });
    type("Nivel", "12");
    type("Mala suerte", "3");
    await waitFor(() => {
      expect(engine.payloads("cosmetics.level").at(-1)).toEqual({ level: 12, bad_luck: 3 });
    });
    await waitFor(() => {
      expect(engine.payloads("cosmetics.run").at(-1)).toMatchObject({ bad_luck: 3 });
    });
  });

  it("never sends a level the engine would refuse", async () => {
    const engine = show(<CosmeticsView />);
    await screen.findByRole("list", { name: "Cajas por rareza" });
    const before = engine.payloads("cosmetics.level").length;
    type("Nivel", "0");
    expect(engine.payloads("cosmetics.level")).toHaveLength(before);
    expect(screen.getByLabelText("Nivel").getAttribute("aria-invalid")).toBe("true");
  });
});

describe("MonstersView team", () => {
  it("shows one semibot per player with the strength upgrades in its corner", async () => {
    show(<MonstersView />);
    const team = await screen.findByRole("list", { name: "Tu equipo" });
    expect(within(team).getAllByRole("listitem")).toHaveLength(2);
    fireEvent.click(within(team).getByRole("button", { name: "Sumar a Mejoras de Fuerza del jugador 1" }));
    expect((screen.getByLabelText("Mejoras de Fuerza del jugador 1") as HTMLInputElement).value).toBe("1");
  });
});

describe("MonstersView", () => {
  it("lists every monster with what the team can do", async () => {
    show(<MonstersView />);
    expect(await screen.findByRole("heading", { name: "Qué monstruos puedes levantar" })).toBeTruthy();
    expect(screen.getByText("Gnome")).toBeTruthy();
    expect(screen.getByText("Elsa")).toBeTruthy();
    expect(screen.getAllByText("Sin dato").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Solo").length).toBeGreaterThan(0);
  });

  it("opens the calculation of a monster in a dialog and keeps every card the same", async () => {
    show(<MonstersView />);
    await screen.findByText("Gnome");
    expect(document.querySelector(".mcard details")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Gnome/ }));
    const dialog = await screen.findByRole("dialog", { name: "Gnome" });
    expect(within(dialog).getByText("Fuerza necesaria")).toBeTruthy();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("filters down to what the team can lift", async () => {
    show(<MonstersView />);
    await screen.findByText("Shadow Child");
    fireEvent.click(screen.getByRole("button", { name: "Solo los que puedo levantar" }));
    expect(screen.queryByText("Shadow Child")).toBeNull();
    expect(screen.getByText("Gnome")).toBeTruthy();
  });

  it("sends one entry per player and grows the team at the end", async () => {
    const engine = show(<MonstersView />);
    await screen.findByRole("heading", { name: "Qué monstruos puedes levantar" });
    expect(engine.payloads("monsters.lift").at(-1)).toEqual({ upgrades: [0, 0] });
    fireEvent.click(screen.getByRole("button", { name: "Sumar a Jugadores" }));
    type("Mejoras de Fuerza del jugador 1", "4");
    await waitFor(() => {
      expect(engine.payloads("monsters.lift").at(-1)).toEqual({ upgrades: [4, 0, 0] });
    });
    expect(screen.getByLabelText("Mejoras de Fuerza del jugador 3")).toBeTruthy();
  });

  it("keeps what was typed when the team shrinks", async () => {
    const engine = show(<MonstersView />);
    await screen.findByRole("heading", { name: "Qué monstruos puedes levantar" });
    type("Mejoras de Fuerza del jugador 1", "6");
    fireEvent.click(screen.getByRole("button", { name: "Restar a Jugadores" }));
    await waitFor(() => {
      expect(engine.payloads("monsters.lift").at(-1)).toEqual({ upgrades: [6] });
    });
  });
});

describe("UpgradesView", () => {
  it("builds the shop request from the units held", async () => {
    const engine = show(<UpgradesView />);
    fireEvent.change(await screen.findByLabelText("Tengo Range"), { target: { value: "2" } });
    await waitFor(() => {
      expect(engine.payloads("upgrades.shop").at(-1)).toEqual({ held: { range: 2 }, consumed: [] });
    });
    expect(await screen.findByRole("heading", { name: "Tus mejoras" })).toBeTruthy();
  });

  it("keeps the numbers behind the (i) of each card until they are asked for", async () => {
    show(<UpgradesView />);
    await screen.findByLabelText("Tengo Range");
    expect(screen.queryByText("En el fondo común")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Más información sobre Range" }));
    expect(screen.getByText("En el fondo común")).toBeTruthy();
    expect(screen.getByText("Unidades esperadas")).toBeTruthy();
  });

  it("marks a permanent upgrade as used from its details", async () => {
    const engine = show(<UpgradesView />);
    await screen.findByLabelText("Tengo Range");
    fireEvent.click(screen.getByRole("button", { name: "Más información sobre Map Player Count" }));
    fireEvent.click(screen.getByRole("button", { name: "Ya la usé" }));
    await waitFor(() => {
      expect(engine.payloads("upgrades.shop").at(-1)).toEqual({ held: {}, consumed: ["map-player-count"] });
    });
  });

  it("asks for a stash plan only once something is wanted, and lists what to buy", async () => {
    const engine = show(<UpgradesView />);
    expect(await screen.findByText(/Marca con la estrella/)).toBeTruthy();
    expect(engine.payloads("upgrades.stash")).toHaveLength(0);
    fireEvent.click(await screen.findByRole("button", { name: "Quiero Strength" }));
    await waitFor(() => {
      expect(engine.payloads("upgrades.stash").at(-1)).toEqual({ wanted: ["strength"], held: {}, consumed: [] });
    });
    expect(await screen.findByText(/Compra y guarda/)).toBeTruthy();
    const list = within(screen.getByRole("list", { name: "Lista de compra" }));
    expect(list.getByText("Stamina")).toBeTruthy();
    expect(list.getByText("×4")).toBeTruthy();
    expect(screen.getAllByText(/Comprar y guardar/).length).toBeGreaterThan(0);
  });

  it("offers to use only what is held, and asks Python what that leaves", async () => {
    const engine = show(<UpgradesView />);
    expect(await screen.findByText(/Anota arriba cuántas unidades tienes/)).toBeTruthy();
    fireEvent.change(await screen.findByLabelText("Tengo Range"), { target: { value: "2" } });
    fireEvent.change(await screen.findByLabelText("Usar Range"), { target: { value: "1" } });
    await waitFor(() => {
      expect(engine.payloads("upgrades.use").at(-1)).toEqual({
        used: { range: 1 },
        held: { range: 2 },
        consumed: [],
      });
    });
    expect(await screen.findByText(/Gastas 1 unidad y vuelven al fondo común/)).toBeTruthy();
  });

  it("drops what was set to use when the stock is lowered below it", async () => {
    const engine = show(<UpgradesView />);
    const range = await screen.findByLabelText("Tengo Range");
    fireEvent.change(range, { target: { value: "2" } });
    fireEvent.change(await screen.findByLabelText("Usar Range"), { target: { value: "2" } });
    fireEvent.change(range, { target: { value: "1" } });
    await waitFor(() => {
      expect(engine.payloads("upgrades.use").at(-1)).toEqual({ used: { range: 1 }, held: { range: 1 }, consumed: [] });
    });
  });

  it("prices the rerolls", async () => {
    const engine = show(<UpgradesView />);
    fireEvent.change(await screen.findByLabelText("Rerolls"), { target: { value: "3" } });
    await waitFor(() => {
      expect(engine.payloads("upgrades.reroll").at(-1)).toEqual({ rerolls: 3 });
    });
    expect(await screen.findByText("Costo total")).toBeTruthy();
  });
});

describe("SpawningView tiers", () => {
  it("opens the monsters of a tier and, for tier 3, the groups with their count", async () => {
    show(<SpawningView />);
    await screen.findByRole("heading", { name: "Enemigos en el nivel 1" });
    fireEvent.click(await screen.findByRole("button", { name: "Qué monstruos son de Tier 1" }));
    const dialog = await screen.findByRole("dialog", { name: "Monstruos de Tier 1" });
    expect(within(dialog).getByText("Gnome")).toBeTruthy();
    expect(within(dialog).queryByText("Grupos")).toBeNull();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    fireEvent.click(screen.getByRole("button", { name: "Qué grupos pueden salir" }));
    const groups = within(await screen.findByRole("dialog", { name: "Monstruos de Tier 3" }));
    expect(groups.getByText("Grupos")).toBeTruthy();
    expect(groups.getByText("×10")).toBeTruthy();
  });
});

describe("SpawningView", () => {
  it("shows the enemies of the level and the table behind them", async () => {
    show(<SpawningView />);
    expect(await screen.findByRole("heading", { name: "Enemigos en el nivel 1" })).toBeTruthy();
    expect(await screen.findByText(/en adelante/)).toBeTruthy();
  });

  it("has no adjustable timers, only the level", async () => {
    const engine = show(<SpawningView />);
    await screen.findByRole("heading", { name: "Enemigos en el nivel 1" });
    expect(screen.queryByLabelText("Minutos en el nivel")).toBeNull();
    expect(screen.queryByLabelText("Segundos de ruido")).toBeNull();
    expect(engine.payloads("spawning.respawn")).toHaveLength(0);
    type("Nivel", "7");
    await waitFor(() => {
      expect(engine.payloads("spawning.outlook").at(-1)).toEqual({ level: 7 });
    });
  });
});

describe("SourcesView", () => {
  it("credits the sources of every calculator with a link to each", async () => {
    show(<SourcesView />);
    for (const title of ["Cajas cosméticas", "Fuerza por monstruo", "Mejoras de la tienda", "Aparición de enemigos"]) {
      expect(await screen.findByRole("heading", { name: title })).toBeTruthy();
    }
    const links = screen.getAllByRole<HTMLAnchorElement>("link");
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link.rel).toContain("noreferrer");
  });
});
