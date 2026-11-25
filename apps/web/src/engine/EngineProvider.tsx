import { createClient, type Client } from "@repo-lab/contract";
import { createContext, use, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { Engine, EngineState } from "./engine";

interface EngineContextValue {
  engine: Engine;
  client: Client;
}

const EngineContext = createContext<EngineContextValue | null>(null);

export function EngineProvider({ engine, children }: { engine: Engine; children: ReactNode }) {
  const value = useMemo(() => ({ engine, client: createClient(engine.transport) }), [engine]);
  return <EngineContext value={value}>{children}</EngineContext>;
}

function useEngineContext(): EngineContextValue {
  const value = use(EngineContext);
  if (value === null) throw new Error("EngineProvider is missing");
  return value;
}

export function useClient(): Client {
  return useEngineContext().client;
}

export function useEngineState(): EngineState {
  const { engine } = useEngineContext();
  return useSyncExternalStore(engine.subscribe, engine.getState);
}
