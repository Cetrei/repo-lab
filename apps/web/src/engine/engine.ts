import type { Transport } from "@repo-lab/contract";
import type { EnginePhase, FromWorker, ToWorker } from "./protocol";

export interface EngineState {
  phase: EnginePhase;
  detail: string;
}

/** What the interface needs from whatever answers its requests: a transport and a status it can show. */
export interface Engine {
  readonly kind: "pyodide" | "http";
  readonly transport: Transport;
  getState(): EngineState;
  subscribe(listener: () => void): () => void;
}

class StateStore {
  private state: EngineState;
  private readonly listeners = new Set<() => void>();

  constructor(initial: EngineState) {
    this.state = initial;
  }

  readonly get = (): EngineState => this.state;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  set(next: EngineState): void {
    if (next.phase === this.state.phase && next.detail === this.state.detail) return;
    this.state = next;
    for (const listener of this.listeners) listener();
  }
}

/** The part of `Worker` the engine uses, so tests can stand in for it. */
export interface WorkerLike {
  postMessage(message: ToWorker): void;
  addEventListener(type: "message", listener: (event: MessageEvent<FromWorker>) => void): void;
  addEventListener(type: "error", listener: (event: ErrorEvent) => void): void;
}

interface Waiting {
  resolve(value: unknown): void;
  reject(reason: Error): void;
}

/** Sends every request to the Pyodide worker and keeps the loading status for the header. */
export function createWorkerEngine(worker: WorkerLike, bundleUrl: string): Engine {
  const store = new StateStore({ phase: "loading", detail: "Cargando Python" });
  const waiting = new Map<number, Waiting>();
  let counter = 0;
  let broken: Error | null = null;

  const fail = (detail: string): void => {
    broken = new Error(detail);
    store.set({ phase: "failed", detail });
    for (const entry of waiting.values()) entry.reject(broken);
    waiting.clear();
  };

  worker.addEventListener("message", (event) => {
    const message = event.data;
    if (message.type === "status") {
      if (message.phase === "failed") fail(message.detail);
      else store.set({ phase: message.phase, detail: message.detail });
      return;
    }
    const entry = waiting.get(message.id);
    if (entry === undefined) return;
    waiting.delete(message.id);
    if (message.type === "answer") entry.resolve(message.raw);
    else entry.reject(new Error(message.detail));
  });
  worker.addEventListener("error", (event) => {
    fail(event.message || "El motor se detuvo");
  });
  worker.postMessage({ type: "init", bundleUrl });

  return {
    kind: "pyodide",
    transport: {
      send(name, payload) {
        if (broken !== null) return Promise.reject(broken);
        return new Promise((resolve, reject) => {
          counter += 1;
          waiting.set(counter, { resolve, reject });
          worker.postMessage({ type: "call", id: counter, name, payload });
        });
      },
    },
    getState: store.get,
    subscribe: store.subscribe,
  };
}

/** Development transport against `uv run python -m repo_api.http`. It answers with the same envelope. */
export function createHttpEngine(baseUrl: string, fetchImpl: typeof fetch = fetch): Engine {
  const store = new StateStore({ phase: "loading", detail: `Esperando a ${baseUrl}` });
  return {
    kind: "http",
    transport: {
      async send(name, payload) {
        let response: Response;
        try {
          response = await fetchImpl(`${baseUrl}/api/${name}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload ?? null),
          });
        } catch {
          store.set({ phase: "failed", detail: `No hay servidor en ${baseUrl}` });
          throw new Error(`No hay servidor en ${baseUrl}`);
        }
        store.set({ phase: "ready", detail: `Servidor local ${baseUrl}` });
        return response.json();
      },
    },
    getState: store.get,
    subscribe: store.subscribe,
  };
}
