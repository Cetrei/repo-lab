import cases from "../../../../packages/contract/fixtures/cases.json";
import type { Engine, EngineState } from "../engine/engine";

interface Case {
  name: string;
  endpoint: string;
  request: unknown;
  response: { ok: boolean };
}

const golden = cases as Case[];

export interface Call {
  name: string;
  payload: unknown;
}

export interface ReplayEngine extends Engine {
  calls: Call[];
  /** The payloads sent to one endpoint, oldest first. */
  payloads(name: string): unknown[];
}

/**
 * An engine that answers from the golden fixtures Python wrote, so the views are tested against real
 * answers. An exact request match wins, otherwise the first successful case of that endpoint answers.
 */
export function replayEngine(state: EngineState = { phase: "ready", detail: "Python de prueba" }): ReplayEngine {
  const calls: Call[] = [];
  return {
    kind: "pyodide",
    calls,
    payloads: (name) => calls.filter((call) => call.name === name).map((call) => call.payload),
    getState: () => state,
    subscribe: () => () => undefined,
    transport: {
      send(name, payload) {
        calls.push({ name, payload });
        const hits = golden.filter((item) => item.endpoint === name && item.response.ok);
        const wanted = JSON.stringify(payload ?? null);
        const exact = hits.find((item) => JSON.stringify(item.request ?? null) === wanted);
        const answer = (exact ?? hits[0])?.response ?? {
          ok: false,
          error: { code: "unknown_endpoint", message: `unknown endpoint '${name}'` },
        };
        return Promise.resolve(answer);
      },
    },
  };
}
