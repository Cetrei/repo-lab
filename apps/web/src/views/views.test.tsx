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
    expect(await screen.findByRole("list", { name: "Espera hasta la primera caja" })).toBeTruthy();
    expect(screen.getAllByText("Cualquier caja").length).toBeGreaterThan(0);
  });

  it("keeps the tables behind the (i) buttons until they are opened", async () => {
    show(<CosmeticsView />);
    await screen.findByRole("list", { name: "Espera hasta la primera caja" });
    expect(screen.queryByText("Cuántos niveles hacen falta para ver la primera caja")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Más información sobre la espera hasta la primera caja" }));
    expect(await screen.findByText("Cuántos niveles hacen falta para ver la primera caja")).toBeTruthy();
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
    const select = await screen.findByLabelText("Parche");
    const first = engine.payloads("cosmetics.level")[0];
    expect(first).not.toHaveProperty("ruleset");
    const options = Array.from((select as HTMLSelectElement).options).map((option) => option.value);
    if (options.length > 1) {
      fireEvent.change(select, { target: { value: options[1] } });
      await waitFor(() => {
        expect(engine.payloads("cosmetics.level").at(-1)).toMatchObject({ ruleset: options[1] });
      });
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

describe("MonstersView", () => {
  it("lists every monster with what the team can do", async () => {
    show(<MonstersView />);
    expect(await screen.findByRole("heading", { name: "Qué monstruos puedes levantar" })).toBeTruthy();
    expect(screen.getByText("Gnome")).toBeTruthy();
    expect(screen.getByText("Elsa")).toBeTruthy();
    expect(screen.getAllByText("Sin dato").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Solo").length).toBeGreaterThan(0);
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
    expect(await screen.findByText("Anota unidades en Tus mejoras para poder usarlas aquí.")).toBeTruthy();
    fireEvent.change(await screen.findByLabelText("Tengo Range"), { target: { value: "2" } });
    fireEvent.change(await screen.findByLabelText("Usar Range"), { target: { value: "1" } });
    await waitFor(() => {
      expect(engine.payloads("upgrades.use").at(-1)).toEqual({
        used: { range: 1 },
        held: { range: 2 },
        consumed: [],
      });
    });
    expect(await screen.findByText("Unidades usadas")).toBeTruthy();
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
