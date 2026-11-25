import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EngineProvider } from "../engine/EngineProvider";
import type { Engine } from "../engine/engine";
import { useCall } from "./useCall";

interface Waiting {
  payload: unknown;
  resolve(value: unknown): void;
  reject(reason: unknown): void;
}

/** An engine whose answers the test releases by hand, to check what the hook does with late ones. */
function controlled() {
  const waiting: Waiting[] = [];
  const engine: Engine = {
    kind: "pyodide",
    getState: () => ({ phase: "ready", detail: "test" }),
    subscribe: () => () => undefined,
    transport: {
      send: (_name, payload) =>
        new Promise((resolve, reject) => {
          waiting.push({ payload, resolve, reject });
        }),
    },
  };
  return { engine, waiting };
}

function outlook(level: number) {
  return {
    ok: true,
    data: {
      level,
      counts: { tier1: 1, tier2: 0, tier3: 1 },
      group_chance: 0.032,
      expected_groups: 0.032,
      p_any_group: 0.032,
    },
  };
}

function Probe({ level }: { level: number | null }) {
  const result = useCall("spawning.outlook", level === null ? null : { level });
  return (
    <p>
      {`${result.pending ? "pending" : "idle"} ${result.data ? `L${result.data.level}` : "empty"} ${result.error?.code ?? "fine"}`}
    </p>
  );
}

function renderProbe(engine: Engine, level: number | null) {
  const view = render(
    <EngineProvider engine={engine}>
      <Probe level={level} />
    </EngineProvider>,
  );
  return {
    ...view,
    show: (next: number | null) => {
      view.rerender(
        <EngineProvider engine={engine}>
          <Probe level={next} />
        </EngineProvider>,
      );
    },
  };
}

describe("useCall", () => {
  it("is pending until the first answer and then holds it", async () => {
    const { engine, waiting } = controlled();
    renderProbe(engine, 1);
    expect(screen.getByText("pending empty fine")).toBeTruthy();
    await act(async () => {
      waiting[0]?.resolve(outlook(1));
    });
    expect(await screen.findByText("idle L1 fine")).toBeTruthy();
  });

  it("ignores an answer that arrives after a newer request", async () => {
    const { engine, waiting } = controlled();
    const { show } = renderProbe(engine, 1);
    show(2);
    expect(waiting).toHaveLength(2);
    await act(async () => {
      waiting[1]?.resolve(outlook(2));
    });
    await act(async () => {
      waiting[0]?.resolve(outlook(1));
    });
    expect(await screen.findByText("idle L2 fine")).toBeTruthy();
  });

  it("keeps the last answer on screen while the next one is on its way", async () => {
    const { engine, waiting } = controlled();
    const { show } = renderProbe(engine, 1);
    await act(async () => {
      waiting[0]?.resolve(outlook(1));
    });
    show(2);
    expect(await screen.findByText("pending L1 fine")).toBeTruthy();
  });

  it("does not ask again for a request with the same content", async () => {
    const { engine, waiting } = controlled();
    const { show } = renderProbe(engine, 1);
    show(1);
    expect(waiting).toHaveLength(1);
  });

  it("holds the call back while the request is null", () => {
    const { engine, waiting } = controlled();
    renderProbe(engine, null);
    expect(waiting).toHaveLength(0);
    expect(screen.getByText("idle empty fine")).toBeTruthy();
  });

  it("reports a refusal from the domain with its code", async () => {
    const { engine, waiting } = controlled();
    renderProbe(engine, 1);
    await act(async () => {
      waiting[0]?.resolve({ ok: false, error: { code: "invalid_input", message: "level must be 1 or more" } });
    });
    expect(await screen.findByText("idle empty invalid_input")).toBeTruthy();
  });

  it("reports an answer that breaks the contract as a contract failure", async () => {
    const { engine, waiting } = controlled();
    renderProbe(engine, 1);
    await act(async () => {
      waiting[0]?.resolve({ ok: true, data: { level: "uno" } });
    });
    expect(await screen.findByText("idle empty contract")).toBeTruthy();
  });

  it("reports a broken engine", async () => {
    const { engine, waiting } = controlled();
    renderProbe(engine, 1);
    await act(async () => {
      waiting[0]?.reject(new Error("sin red"));
    });
    await waitFor(() => {
      expect(screen.getByText("idle empty engine")).toBeTruthy();
    });
  });
});
