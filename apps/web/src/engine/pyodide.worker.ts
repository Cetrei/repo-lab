/**
 * Runs the Python rules inside Pyodide, off the main thread.
 *
 * The page sends `init` with the URL of `bundle.zip` (repo_core, repo_api and the YAML tables), then one
 * `call` per request. Python answers with JSON text, which is parsed here and validated by the contract
 * on the page. Requests that arrive while Python is still loading wait for it.
 */
import type { FromWorker, ToWorker } from "./protocol";

const PYODIDE_VERSION = "0.29.3";
const INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const APP_DIR = "/app";

type PythonCall = (name: string, payloadJson: string) => string;

interface Pyodide {
  loadPackage(names: string | string[]): Promise<unknown>;
  unpackArchive(buffer: ArrayBuffer, format: string, options?: { extractDir?: string }): void;
  runPython(code: string): unknown;
  globals: { get(name: string): unknown };
}

interface PyodideModule {
  loadPyodide(options: { indexURL: string }): Promise<Pyodide>;
}

const scope = self as unknown as {
  postMessage(message: FromWorker): void;
  onmessage: ((event: MessageEvent<ToWorker>) => void) | null;
};

function post(message: FromWorker): void {
  scope.postMessage(message);
}

function loading(detail: string): void {
  post({ type: "status", phase: "loading", detail });
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function start(bundleUrl: string): Promise<PythonCall> {
  loading("Descargando Pyodide");
  const module = (await import(/* @vite-ignore */ `${INDEX_URL}pyodide.mjs`)) as PyodideModule;
  const pyodide = await module.loadPyodide({ indexURL: INDEX_URL });

  loading("Cargando PyYAML");
  await pyodide.loadPackage("pyyaml");

  loading("Descargando las reglas");
  const response = await fetch(bundleUrl);
  if (!response.ok) throw new Error(`No se pudieron descargar las reglas (${response.status})`);
  pyodide.unpackArchive(await response.arrayBuffer(), "zip", { extractDir: APP_DIR });

  loading("Iniciando las reglas");
  pyodide.runPython(
    [
      "import os, sys",
      `os.environ["REPO_DATA_DIR"] = "${APP_DIR}/data"`,
      `sys.path.insert(0, "${APP_DIR}")`,
      "from repo_api.app import call as repo_call",
    ].join("\n"),
  );
  const call = pyodide.globals.get("repo_call") as PythonCall;
  post({ type: "status", phase: "ready", detail: `Python ${PYODIDE_VERSION}` });
  return call;
}

let ready: Promise<PythonCall> | null = null;

async function answer(id: number, name: string, payload: unknown): Promise<void> {
  try {
    if (ready === null) throw new Error("El motor no recibió su configuración");
    const call = await ready;
    const raw: unknown = JSON.parse(call(name, JSON.stringify(payload ?? null)));
    post({ type: "answer", id, raw });
  } catch (error) {
    post({ type: "failure", id, detail: describe(error) });
  }
}

scope.onmessage = (event) => {
  const message = event.data;
  if (message.type === "init") {
    ready = start(message.bundleUrl);
    ready.catch((error: unknown) => {
      post({ type: "status", phase: "failed", detail: describe(error) });
    });
    return;
  }
  void answer(message.id, message.name, message.payload);
};
