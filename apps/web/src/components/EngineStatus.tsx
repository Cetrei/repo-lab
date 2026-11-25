import { sileo } from "sileo";
import { CircleCheck, Loader, TriangleAlert } from "lucide-react";
import { useEffect, useRef } from "react";
import { useEngineState } from "../engine/EngineProvider";
import type { EnginePhase } from "../engine/protocol";

/** The header line that says whether Python is loading, ready or broken. */
export function EngineStatus() {
  const { phase, detail } = useEngineState();
  const Icon = phase === "ready" ? CircleCheck : phase === "failed" ? TriangleAlert : Loader;
  return (
    <p className="engine" data-state={phase} role="status">
      <Icon aria-hidden size={18} className={phase === "loading" ? "spin" : undefined} />
      <span>{detail}</span>
    </p>
  );
}

/** One toast when Python becomes ready after a wait, and one when it fails. */
export function useEngineToasts(): void {
  const { phase, detail } = useEngineState();
  const previous = useRef<EnginePhase | null>(null);
  useEffect(() => {
    if (phase === "failed") {
      sileo.error({ title: "No se pudo iniciar Python", description: detail });
    } else if (phase === "ready" && previous.current === "loading") {
      sileo.success({ title: "Python listo", description: "Los cálculos corren en tu navegador." });
    }
    previous.current = phase;
  }, [phase, detail]);
}
