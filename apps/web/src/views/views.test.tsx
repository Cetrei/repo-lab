import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { EngineProvider } from "../engine/EngineProvider";
import { replayEngine } from "../test/replay";
import { CosmeticsView } from "./CosmeticsView";
import { MonstersView } from "./MonstersView";
import { SourcesView } from "./SourcesView";
import { SpawningView } from "./SpawningView";
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
    expect(await screen.findByText("Por rareza")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Nivel 1" })).toBeTruthy();
    expect(await screen.findByText("Cuántos niveles hacen falta para ver la primera caja")).toBeTruthy();
    expect(screen.getAllByText("Cualquier caja").length).toBeGreaterThan(0);
  });

  it("asks again with the level and the bad luck that were typed", async () => {
    const engine = show(<CosmeticsView />);
    await screen.findByText("Por rareza");
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
    await screen.findByText("Por rareza");
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
    const range = await screen.findByLabelText("Range (tope 3)");
    fireEvent.change(range, { target: { value: "2" } });
    await waitFor(() => {
      expect(engine.payloads("upgrades.shop").at(-1)).toEqual({ held: { range: 2 }, consumed: [] });
    });
    expect(await screen.findByRole("heading", { name: "La tienda" })).toBeTruthy();
  });

  it("marks a permanent upgrade as used", async () => {
    const engine = show(<UpgradesView />);
    await screen.findByLabelText("Range (tope 3)");
    const held = within(screen.getByRole("heading", { name: "Lo que tienes" }).closest("section")!);
    fireEvent.click(held.getByRole("button", { name: "Map Player Count" }));
    await waitFor(() => {
      expect(engine.payloads("upgrades.shop").at(-1)).toEqual({ held: {}, consumed: ["map-player-count"] });
    });
  });

  it("asks for a stash plan only once something is wanted, and names the units to keep", async () => {
    const engine = show(<UpgradesView />);
    expect(await screen.findByText("Marca al menos una mejora para ver el plan.")).toBeTruthy();
    expect(engine.payloads("upgrades.stash")).toHaveLength(0);
    const wanted = within(screen.getByRole("heading", { name: "Controlar la tienda" }).closest("section")!);
    fireEvent.click(wanted.getByRole("button", { name: "Strength" }));
    await waitFor(() => {
      expect(engine.payloads("upgrades.stash").at(-1)).toEqual({ wanted: ["strength"], held: {}, consumed: [] });
    });
    expect(await screen.findByText(/Compra y guarda/)).toBeTruthy();
    expect(screen.getByText(/Stamina x4/)).toBeTruthy();
  });

  it("offers to use only what is held, and asks Python what that leaves", async () => {
    const engine = show(<UpgradesView />);
    expect(await screen.findByText("Anota unidades en Lo que tienes para poder usarlas aquí.")).toBeTruthy();
    fireEvent.change(await screen.findByLabelText("Range (tope 3)"), { target: { value: "2" } });
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
    const range = await screen.findByLabelText("Range (tope 3)");
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

  it("says when the source gives no respawn timer instead of inventing one", async () => {
    show(<SpawningView />);
    expect(await screen.findByText("Sin dato para esos minutos")).toBeTruthy();
    expect(await screen.findByText(/no se inventa un número/)).toBeTruthy();
  });

  it("sends the kill, the noise and the extraction to the respawn calculation", async () => {
    const engine = show(<SpawningView />);
    await screen.findByText("Sin dato para esos minutos");
    fireEvent.click(screen.getByRole("button", { name: "Lo mataron" }));
    fireEvent.click(screen.getByRole("button", { name: "Extracción final hecha" }));
    type("Segundos de ruido", "10");
    await waitFor(() => {
      expect(engine.payloads("spawning.respawn").at(-1)).toEqual({
        minutes_on_level: 5,
        killed: true,
        noise_seconds: 10,
        final_extraction_done: true,
      });
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
