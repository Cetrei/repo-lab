/** Messages between the page and the Pyodide worker. Everything crossing the boundary is plain data. */

export type EnginePhase = "loading" | "ready" | "failed";

export interface InitMessage {
  type: "init";
  bundleUrl: string;
}

export interface CallMessage {
  type: "call";
  id: number;
  name: string;
  payload: unknown;
}

export type ToWorker = InitMessage | CallMessage;

export interface StatusMessage {
  type: "status";
  phase: EnginePhase;
  detail: string;
}

export interface AnswerMessage {
  type: "answer";
  id: number;
  /** The envelope Python produced, already parsed. The contract validates it on the page. */
  raw: unknown;
}

export interface FailureMessage {
  type: "failure";
  id: number;
  detail: string;
}

export type FromWorker = StatusMessage | AnswerMessage | FailureMessage;
