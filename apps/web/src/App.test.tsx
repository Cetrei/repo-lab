import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
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
    expect(await screen.findByLabelText("Parche")).toBeTruthy();
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

  it("shows the state of the engine in the header", () => {
    open("");
    renderApp(replayEngine({ phase: "failed", detail: "Sin red para bajar Pyodide" }));
    const status = screen.getByText("Sin red para bajar Pyodide").closest(".engine");
    expect(status?.getAttribute("data-state")).toBe("failed");
  });
});
