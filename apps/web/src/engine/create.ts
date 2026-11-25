import { createHttpEngine, createWorkerEngine, type Engine } from "./engine";

const DEFAULT_API = "http://127.0.0.1:8000";

/**
 * The browser runs Python through Pyodide. For development, `?engine=http` talks to the local API instead
 * (`uv run python -m repo_api.http`), and `&api=` changes its address.
 */
export function createEngine(): Engine {
  const params = new URLSearchParams(window.location.search);
  if (params.get("engine") === "http") {
    return createHttpEngine(params.get("api") ?? DEFAULT_API);
  }
  const worker = new Worker(new URL("./pyodide.worker.ts", import.meta.url), { type: "module" });
  const bundleUrl = new URL(`${import.meta.env.BASE_URL}py/bundle.zip`, document.baseURI).href;
  return createWorkerEngine(worker, bundleUrl);
}
