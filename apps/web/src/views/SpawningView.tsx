import { useState } from "react";
import { NumberField } from "../components/NumberField";
import { Outcome, Panel, Stat, Stats } from "../components/ui";
import { decimal, duration, integer, percent } from "../format";
import { useCall } from "../hooks/useCall";
import { TIER_LABEL } from "../labels";

export function SpawningView() {
  const [level, setLevel] = useState(1);

  const rules = useCall("spawning.rules", undefined);
  const outlook = useCall("spawning.outlook", { level });
  const despawn = useCall("spawning.despawn", undefined);

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
            <p className="hint">{`Un enemigo que ningún jugador ve desaparece solo entre ${duration(despawn.data.low)} y ${duration(despawn.data.high)}.`}</p>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
