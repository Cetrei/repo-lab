import { createClient } from "@repo-lab/contract";
import { describe, expect, it } from "vitest";
import { createHttpEngine, createWorkerEngine, type WorkerLike } from "./engine";
import type { FromWorker, ToWorker } from "./protocol";

/** A worker that records what the page sends and lets the test answer by hand. */
function fakeWorker() {
  const sent: ToWorker[] = [];
  let onMessage: (event: MessageEvent<FromWorker>) => void = () => undefined;
  let onError: (event: ErrorEvent) => void = () => undefined;
  const worker: WorkerLike = {
    postMessage: (message) => {
      sent.push(message);
    },
    addEventListener(type: "message" | "error", listener: unknown) {
      if (type === "message") onMessage = listener as typeof onMessage;
      else onError = listener as typeof onError;
    },
  };
  return {
    worker,
    sent,
    reply: (message: FromWorker) => {
      onMessage(new MessageEvent("message", { data: message }));
    },
    crash: (message: string) => {
      onError(new ErrorEvent("error", { message }));
    },
  };
}

describe("worker engine", () => {
  it("starts loading and hands the bundle address to the worker", () => {
    const { worker, sent } = fakeWorker();
    const engine = createWorkerEngine(worker, "https://site/py/bundle.zip");
    expect(sent).toEqual([{ type: "init", bundleUrl: "https://site/py/bundle.zip" }]);
    expect(engine.getState().phase).toBe("loading");
  });

  it("follows the worker status and tells its listeners", () => {
    const { worker, reply } = fakeWorker();
    const engine = createWorkerEngine(worker, "bundle");
    let notified = 0;
    engine.subscribe(() => {
      notified += 1;
    });
    reply({ type: "status", phase: "loading", detail: "Descargando Pyodide" });
    reply({ type: "status", phase: "ready", detail: "Python 0.29.3" });
    expect(engine.getState()).toEqual({ phase: "ready", detail: "Python 0.29.3" });
    expect(notified).toBe(2);
  });

  it("does not notify when nothing changed", () => {
    const { worker, reply } = fakeWorker();
    const engine = createWorkerEngine(worker, "bundle");
    let notified = 0;
    engine.subscribe(() => {
      notified += 1;
    });
    reply({ type: "status", phase: "loading", detail: "Cargando Python" });
    expect(notified).toBe(0);
  });

  it("matches every answer to its own request, whatever order they come back in", async () => {
    const { worker, sent, reply } = fakeWorker();
    const engine = createWorkerEngine(worker, "bundle");
    const first = engine.transport.send("a", { n: 1 });
    const second = engine.transport.send("b", null);
    const ids = sent.filter((m) => m.type === "call").map((m) => m.id);
    reply({ type: "answer", id: ids[1] ?? -1, raw: "for b" });
    reply({ type: "answer", id: ids[0] ?? -1, raw: "for a" });
    await expect(first).resolves.toBe("for a");
    await expect(second).resolves.toBe("for b");
  });

  it("rejects a request the worker could not run", async () => {
    const { worker, sent, reply } = fakeWorker();
    const engine = createWorkerEngine(worker, "bundle");
    const pending = engine.transport.send("a", null);
    const call = sent.find((m) => m.type === "call");
    reply({ type: "failure", id: call?.type === "call" ? call.id : -1, detail: "boom" });
    await expect(pending).rejects.toThrow("boom");
  });

  it("fails every waiting request when Python does not start, and every later one too", async () => {
    const { worker, reply } = fakeWorker();
    const engine = createWorkerEngine(worker, "bundle");
    const waiting = engine.transport.send("a", null);
    reply({ type: "status", phase: "failed", detail: "sin red" });
    await expect(waiting).rejects.toThrow("sin red");
    await expect(engine.transport.send("b", null)).rejects.toThrow("sin red");
    expect(engine.getState()).toEqual({ phase: "failed", detail: "sin red" });
  });

  it("treats a crash of the worker as a failure", async () => {
    const { worker, crash } = fakeWorker();
    const engine = createWorkerEngine(worker, "bundle");
    const waiting = engine.transport.send("a", null);
    crash("worker caído");
    await expect(waiting).rejects.toThrow("worker caído");
    expect(engine.getState().phase).toBe("failed");
  });

  it("carries a request through the contract client end to end", async () => {
    const { worker, sent, reply } = fakeWorker();
    const engine = createWorkerEngine(worker, "bundle");
    const client = createClient(engine.transport);
    const pending = client.call("upgrades.reroll", { rerolls: 2 });
    const call = sent.find((m) => m.type === "call");
    expect(call).toMatchObject({ name: "upgrades.reroll", payload: { rerolls: 2 } });
    reply({
      type: "answer",
      id: call?.type === "call" ? call.id : -1,
      raw: { ok: true, data: { rerolls: 2, total_cost: 15000 } },
    });
    await expect(pending).resolves.toEqual({ rerolls: 2, total_cost: 15000 });
  });
});

describe("http engine", () => {
  it("posts the payload to the endpoint and returns the envelope, also for a refusal", async () => {
    const seen: { url: string; body: string }[] = [];
    const fetchImpl: typeof fetch = (input, init) => {
      seen.push({ url: String(input), body: String(init?.body) });
      return Promise.resolve(
        new Response(JSON.stringify({ ok: false, error: { code: "invalid_input", message: "level" } }), {
          status: 400,
        }),
      );
    };
    const engine = createHttpEngine("http://api", fetchImpl);
    expect(engine.getState().phase).toBe("loading");
    const answer = await engine.transport.send("cosmetics.level", { level: 0 });
    expect(seen).toEqual([{ url: "http://api/api/cosmetics.level", body: '{"level":0}' }]);
    expect(answer).toEqual({ ok: false, error: { code: "invalid_input", message: "level" } });
    expect(engine.getState().phase).toBe("ready");
  });

  it("reports a missing server instead of hanging", async () => {
    const engine = createHttpEngine("http://api", () => Promise.reject(new TypeError("Failed to fetch")));
    await expect(engine.transport.send("meta.sources", null)).rejects.toThrow("No hay servidor en http://api");
    expect(engine.getState().phase).toBe("failed");
  });
});
