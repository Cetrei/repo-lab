import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { ChannelContext } from "./channel";
import { EngineProvider } from "./engine/EngineProvider";
import { ROUTES, routeFromHash } from "./routes";
import { replayEngine } from "./test/replay";

function open(hash: string) {
  window.location.hash = hash;
}

function renderApp(engine = replayEngine()) {
  return render(
    <EngineProvider engine={engine}>
      <App />
    </EngineProvider>,
  );
}

afterEach(() => {
  window.location.hash = "";
});

describe("routeFromHash", () => {
  it("finds a route by its hash", () => {
    expect(routeFromHash("#/mejoras").label).toBe("Mejoras");
    expect(routeFromHash("#mejoras").label).toBe("Mejoras");
  });

  it("falls back to the first route for anything else", () => {
    expect(routeFromHash("").id).toBe(ROUTES[0].id);
    expect(routeFromHash("#/no-existe").id).toBe(ROUTES[0].id);
  });
});

describe("App", () => {
  it("opens on the cosmetic boxes and links every calculator", async () => {
    open("");
    renderApp();
    const nav = screen.getByRole("navigation", { name: "Calculadoras" });
    expect(nav.querySelectorAll("a")).toHaveLength(ROUTES.length);
    expect(screen.getByRole("link", { name: "Cajas" }).getAttribute("aria-current")).toBe("page");
    expect(await screen.findByRole("list", { name: "Cajas por rareza" })).toBeTruthy();
    expect(await screen.findByRole("button", { name: "Parche del juego" })).toBeTruthy();
    expect(document.title).toBe("REPO Lab");
  });

  it("follows the address when it changes", async () => {
    open("");
    renderApp();
    await screen.findByRole("list", { name: "Cajas por rareza" });
    act(() => {
      open("#/monstruos");
    });
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Monstruos" }).getAttribute("aria-current")).toBe("page");
    });
    expect(await screen.findByRole("heading", { name: "Qué monstruos puedes levantar" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Cajas" }).getAttribute("aria-current")).toBeNull();
    expect(document.title).toBe("Monstruos | REPO Lab");
  });

  it("shows only the loading screen until Python is ready", () => {
    open("");
    renderApp(replayEngine({ phase: "loading", detail: "Cargando PyYAML" }));
    expect(screen.getByRole("progressbar")).toBeTruthy();
    expect(screen.getByText("Cargando PyYAML")).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Calculadoras" })).toBeNull();
  });

  it("shows the state of the engine in the header", () => {
    open("");
    renderApp(replayEngine({ phase: "failed", detail: "Sin red para bajar Pyodide" }));
    const status = screen.getByText("Sin red para bajar Pyodide").closest(".engine");
    expect(status?.getAttribute("data-state")).toBe("failed");
  });

  it("has no test banner and no test views on the stable site", () => {
    open("");
    renderApp();
    expect(screen.queryByRole("note")).toBeNull();
    expect(screen.queryByRole("link", { name: "Partida" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Valuables" })).toBeNull();
  });
});

describe("App on the test channel", () => {
  function renderNext() {
    return render(
      <EngineProvider engine={replayEngine()}>
        <ChannelContext.Provider value="next">
          <App />
        </ChannelContext.Provider>
      </EngineProvider>,
    );
  }

  it("says it is the test channel and links back to the stable site", () => {
    open("");
    renderNext();
    const banner = screen.getByRole("note");
    expect(banner.textContent).toContain("Canal de pruebas");
    expect(screen.getByRole("link", { name: "Volver a la versión estable" }).getAttribute("href")).toBe("../");
  });

  it("adds the Partida and Valuables tabs and opens them", async () => {
    open("#/partida");
    renderNext();
    expect(screen.getByRole("link", { name: "Valuables" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Partida" }).getAttribute("aria-current")).toBe("page");
    expect(await screen.findByRole("heading", { name: /^Partida en el nivel/ })).toBeTruthy();
    act(() => {
      open("#/valuables");
    });
    expect(await screen.findByRole("heading", { name: "Valuables por mapa" })).toBeTruthy();
    expect(document.title).toBe("Valuables | REPO Lab");
  });
});
