import { useEngineState } from "../engine/EngineProvider";

/** What the worker reports while it loads, in order, so the bar can say how far along Python is. */
const STEPS = ["Descargando Pyodide", "Cargando PyYAML", "Descargando las reglas", "Iniciando las reglas"];

/**
 * The first screen while Python loads. The calculators wait behind it, so when it goes away every number
 * is ready and nothing on the page jumps or shows "cargando".
 */
export function Splash() {
  const { detail } = useEngineState();
  const step = Math.max(0, STEPS.indexOf(detail));
  return (
    <div className="splash" role="status" aria-live="polite">
      <div className="hazard" aria-hidden />
      <div className="splash__body">
        <h1>REPO Lab</h1>
        <div
          className="splash__bar"
          role="progressbar"
          aria-label="Cargando el motor de cálculo"
          aria-valuemin={0}
          aria-valuemax={STEPS.length}
          aria-valuenow={step}
        >
          <span style={{ width: `${((step + 1) / (STEPS.length + 1)) * 100}%` }} />
        </div>
        <p>{detail}</p>
      </div>
    </div>
  );
}
