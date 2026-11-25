import { sileo } from "sileo";
import { Loader, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { useEngineState } from "../engine/EngineProvider";

/** The header line while Python loads or when it breaks. Once it is ready there is nothing to say. */
export function EngineStatus() {
  const { phase, detail } = useEngineState();
  if (phase === "ready") return null;
  const Icon = phase === "failed" ? TriangleAlert : Loader;
  return (
    <p className="engine" data-state={phase} role="status">
      <Icon aria-hidden size={18} className={phase === "loading" ? "spin" : undefined} />
      <span>{detail}</span>
    </p>
  );
}

/** One dark toast when Python fails to start. Nothing is shown when it works. */
export function useEngineToasts(): void {
  const { phase, detail } = useEngineState();
  useEffect(() => {
    if (phase === "failed") {
      sileo.error({
        title: "No se pudo iniciar Python",
        description: detail,
        fill: "#151a17",
        styles: { title: "toast-title", description: "toast-description" },
      });
    }
  }, [phase, detail]);
}
