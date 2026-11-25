import { useState } from "react";
import { NumberField } from "../components/NumberField";
import { Notice, Outcome, Panel, Stat, Stats } from "../components/ui";
import { decimal, duration, durationRange, integer, percent } from "../format";
import { useCall } from "../hooks/useCall";
import { TIER_LABEL } from "../labels";

export function SpawningView() {
  const [level, setLevel] = useState(1);
  const [minutes, setMinutes] = useState(5);
  const [killed, setKilled] = useState(false);
  const [noise, setNoise] = useState(0);
  const [finalExtraction, setFinalExtraction] = useState(false);

  const rules = useCall("spawning.rules", undefined);
  const outlook = useCall("spawning.outlook", { level });
  const despawn = useCall("spawning.despawn", undefined);
  const respawn = useCall("spawning.respawn", {
    minutes_on_level: minutes,
    killed,
    noise_seconds: noise,
    final_extraction_done: finalExtraction,
  });

  return (
    <div className="workspace">
      <Panel className="controls" title="Tu partida" hint="Cuántos enemigos aparecen depende solo del nivel.">
        <NumberField label="Nivel" value={level} min={1} max={10000} onChange={setLevel} />
      </Panel>

      <div className="stack">
        <Panel title={`Enemigos en el nivel ${integer(level)}`} hint="Cuántos de cada tier aparecen al empezar el nivel.">
          <Outcome result={outlook}>
            {(data) => (
              <>
                <Stats>
                  {(Object.keys(TIER_LABEL) as (keyof typeof TIER_LABEL)[]).map((tier) => (
                    <Stat key={tier} label={TIER_LABEL[tier]} value={integer(data.counts[tier])} />
                  ))}
                </Stats>
                <Stats>
                  <Stat label="Un tier 3 es un grupo" value={percent(data.group_chance)} />
                  <Stat label="Grupos esperados" value={decimal(data.expected_groups, 2)} />
                  <Stat label="Al menos un grupo" value={percent(data.p_any_group)} />
                </Stats>
              </>
            )}
          </Outcome>
        </Panel>

        <div className="pair">
          <Panel
            title="Cuándo desaparecen"
            hint="Un enemigo que ningún jugador llega a ver se va solo pasado este tiempo."
          >
            <Outcome result={despawn}>
              {(data) => (
                <Stats>
                  <Stat label="Desaparece entre" value={durationRange(data.low, data.high)} />
                </Stats>
              )}
            </Outcome>
          </Panel>

          <Panel title="Cuándo vuelven" hint="Lo que tarda un enemigo en reaparecer, según cuánto llevas en el nivel.">
            <div className="row">
              <NumberField label="Minutos en el nivel" value={minutes} min={0} max={10000} onChange={setMinutes} />
              <NumberField
                label="Segundos de ruido"
                value={noise}
                min={0}
                max={100000}
                onChange={setNoise}
                hint="El ruido acorta la espera."
              />
            </div>
            <div className="chips">
              <button
                type="button"
                className="chip"
                aria-pressed={killed}
                onClick={() => {
                  setKilled(!killed);
                }}
              >
                Lo mataron
              </button>
              <button
                type="button"
                className="chip"
                aria-pressed={finalExtraction}
                onClick={() => {
                  setFinalExtraction(!finalExtraction);
                }}
              >
                Extracción final hecha
              </button>
            </div>
            <Outcome result={respawn}>
              {(data) =>
                data.known && data.low !== null && data.high !== null ? (
                  <Stats>
                    <Stat label="Vuelve en" value={durationRange(data.low, data.high)} />
                  </Stats>
                ) : (
                  <Notice title="Sin dato para esos minutos">
                    {rules.data
                      ? `La fuente da el temporizador hasta los ${integer(rules.data.early_level_minutes)} minutos y pasados los ${integer(rules.data.late_level_minutes)}. En medio no dice nada y no se inventa un número.`
                      : "La fuente no da un temporizador para esos minutos y no se inventa un número."}
                  </Notice>
                )
              }
            </Outcome>
          </Panel>
        </div>

        <Panel title="Enemigos por nivel" hint="La tabla completa de la que sale el cálculo.">
          <details>
            <summary>Ver la tabla completa</summary>
            <Outcome result={rules}>
              {(data) => (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Niveles</th>
                        {(Object.keys(TIER_LABEL) as (keyof typeof TIER_LABEL)[]).map((tier) => (
                          <th key={tier} scope="col" className="right">
                            {TIER_LABEL[tier]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.bands.map(([first, last, counts]) => {
                        const current = level >= first && (last === null || level <= last);
                        return (
                          <tr key={first} aria-current={current ? "true" : undefined} data-current={current}>
                            <th scope="row" className="num">
                              {last === null ? `${integer(first)} en adelante` : `${integer(first)} a ${integer(last)}`}
                            </th>
                            <td className="right num">{integer(counts.tier1)}</td>
                            <td className="right num">{integer(counts.tier2)}</td>
                            <td className="right num">{integer(counts.tier3)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Outcome>
          </details>
          {despawn.data ? (
            <p className="hint">{`Sin jugadores cerca, el despawn tarda entre ${duration(despawn.data.low)} y ${duration(despawn.data.high)}.`}</p>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
