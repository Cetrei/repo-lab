import { RARITIES, type LevelOutlook, type RunOutlook } from "@repo-lab/contract";
import { useState } from "react";
import { NumberField } from "../components/NumberField";
import { Meter, Outcome, Panel, Stat, Stats } from "../components/ui";
import { decimal, integer, percent } from "../format";
import { useCall } from "../hooks/useCall";
import { RARITY_LABEL, TARGETS, TARGET_LABEL } from "../labels";

export function CosmeticsView() {
  const [level, setLevel] = useState(1);
  const [badLuck, setBadLuck] = useState(0);
  const [rulesetId, setRulesetId] = useState("");
  const [startLevel, setStartLevel] = useState(1);
  const [levels, setLevels] = useState(10);

  const rulesets = useCall("cosmetics.rulesets", undefined);
  const chosen = rulesetId === "" ? {} : { ruleset: rulesetId };
  const levelResult = useCall("cosmetics.level", { level, bad_luck: badLuck, ...chosen });
  const runResult = useCall("cosmetics.run", {
    start_level: startLevel,
    levels,
    bad_luck: badLuck,
    ...chosen,
  });
  const active = rulesets.data?.rulesets.find((r) => r.id === (rulesetId || rulesets.data?.default));

  return (
    <div className="workspace">
      <Panel
        className="controls"
        title="Tu partida"
        hint="La mala suerte cuenta los niveles seguidos que terminaste sin ninguna caja. Cualquier caja la reinicia."
      >
        <div className="fields-grid">
          <NumberField label="Nivel" value={level} min={1} max={10000} onChange={setLevel} />
          <NumberField label="Mala suerte" value={badLuck} min={0} max={500} onChange={setBadLuck} />
        </div>
        {rulesets.data ? (
          <div className="field">
            <label htmlFor="ruleset">Reglas del juego</label>
            <select
              id="ruleset"
              className="select"
              value={rulesetId === "" ? rulesets.data.default : rulesetId}
              onChange={(event) => {
                setRulesetId(event.target.value);
              }}
            >
              {rulesets.data.rulesets.map((ruleset) => (
                <option key={ruleset.id} value={ruleset.id}>
                  {ruleset.label}
                </option>
              ))}
            </select>
            {active?.note ? <p className="hint">{active.note}</p> : null}
          </div>
        ) : null}
      </Panel>

      <div className="stack">
        <Panel title={`Nivel ${integer(level)}`} hint="Qué puede salir en este nivel y con qué probabilidad.">
          <Outcome result={levelResult}>{(data) => <LevelResult data={data} />}</Outcome>
        </Panel>

        <Panel
          title="Varios niveles seguidos"
          hint="Las probabilidades se encadenan: una caja que sale en un nivel reinicia la mala suerte del siguiente."
        >
          <div className="row">
            <NumberField label="Nivel inicial" value={startLevel} min={1} max={10000} onChange={setStartLevel} />
            <NumberField label="Cuántos niveles" value={levels} min={1} max={100} onChange={setLevels} />
          </div>
          <Outcome result={runResult}>{(data) => <RunResult data={data} />}</Outcome>
        </Panel>
      </div>
    </div>
  );
}

function LevelResult({ data }: { data: LevelOutlook }) {
  return (
    <>
      <Stats>
        <Stat label="Cajas esperadas" value={decimal(data.expected_boxes, 2)} />
        <Stat label="Al menos una caja" value={percent(data.p_any)} tone="good" />
        <Stat label="Ninguna caja" value={percent(data.p_dry)} tone={data.p_dry > 0.5 ? "bad" : undefined} />
        <Stat label="Bonus de mala suerte" value={percent(data.modifier)} />
      </Stats>

      <div className="table-wrap">
        <table>
          <caption>Por rareza</caption>
          <thead>
            <tr>
              <th scope="col">Rareza</th>
              <th scope="col" className="right">
                Cajas esperadas
              </th>
              <th scope="col">Al menos una</th>
            </tr>
          </thead>
          <tbody>
            {RARITIES.map((rarity) => (
              <tr key={rarity}>
                <th scope="row" className={`rarity-${rarity}`}>
                  {RARITY_LABEL[rarity]}
                </th>
                <td className="right num">{decimal(data.expected_by_rarity[rarity], 3)}</td>
                <td>
                  <Meter
                    value={data.p_at_least_one[rarity]}
                    text={percent(data.p_at_least_one[rarity])}
                    rarity={rarity}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <table>
          <caption>Cuántas cajas aparecen</caption>
          <thead>
            <tr>
              <th scope="col">Cajas</th>
              <th scope="col">Probabilidad</th>
            </tr>
          </thead>
          <tbody>
            {data.count_distribution.map((p, count) => (
              <tr key={count}>
                <th scope="row" className="num">
                  {count}
                </th>
                <td>
                  <Meter value={p} text={percent(p)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details>
        <summary>Cada espacio de caja</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Espacio</th>
                <th scope="col" className="right">
                  Paso
                </th>
                <th scope="col" className="right">
                  Base
                </th>
                <th scope="col" className="right">
                  Con mala suerte
                </th>
                {RARITIES.map((rarity) => (
                  <th key={rarity} scope="col" className={`right rarity-${rarity}`}>
                    {RARITY_LABEL[rarity]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slots.map((slot) => (
                <tr key={slot.slot}>
                  <th scope="row" className="num">
                    {slot.slot}
                  </th>
                  <td className="right num">{slot.step}</td>
                  <td className="right num">{percent(slot.base_spawn)}</td>
                  <td className="right num">{percent(slot.spawn)}</td>
                  {RARITIES.map((rarity) => (
                    <td key={rarity} className="right num">
                      {percent(slot.rarity[rarity])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}

function RunResult({ data }: { data: RunOutlook }) {
  return (
    <>
      <div className="table-wrap">
        <table>
          <caption>Cuántos niveles hacen falta para ver la primera caja</caption>
          <thead>
            <tr>
              <th scope="col">Objetivo</th>
              <th scope="col" className="right">
                Mitad de las veces
              </th>
              <th scope="col" className="right">
                9 de cada 10
              </th>
              <th scope="col" className="right">
                Promedio
              </th>
              <th scope="col" className="right">{`En ${integer(data.horizon)} niveles`}</th>
            </tr>
          </thead>
          <tbody>
            {TARGETS.map((target) => {
              const milestone = data.milestones[target];
              const levelsText = (value: number | null) =>
                value === null ? "Fuera de rango" : `${integer(value)} niveles`;
              return (
                <tr key={target}>
                  <th scope="row" className={target === "any" ? undefined : `rarity-${target}`}>
                    {TARGET_LABEL[target]}
                  </th>
                  <td className="right num">{levelsText(milestone.median)}</td>
                  <td className="right num">{levelsText(milestone.p90)}</td>
                  <td className="right num">{decimal(milestone.expected, 1)}</td>
                  <td className="right num">{percent(milestone.p_within_horizon)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="table-wrap table-wrap--tall">
        <table>
          <caption>Nivel por nivel, con la probabilidad acumulada desde el inicio</caption>
          <thead>
            <tr>
              <th scope="col">Nivel</th>
              <th scope="col" className="right">
                Alguna caja
              </th>
              <th scope="col" className="right">
                Cajas esperadas
              </th>
              <th scope="col" className="right">
                Acumulado, cualquiera
              </th>
              {RARITIES.map((rarity) => (
                <th key={rarity} scope="col" className={`right rarity-${rarity}`}>
                  {`Acumulado, ${RARITY_LABEL[rarity].toLowerCase()}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.level}>
                <th scope="row" className="num">
                  {integer(row.level)}
                </th>
                <td className="right num">{percent(row.p_any)}</td>
                <td className="right num">{decimal(row.expected_boxes, 2)}</td>
                <td className="right num">{percent(row.cumulative.any)}</td>
                {RARITIES.map((rarity) => (
                  <td key={rarity} className="right num">
                    {percent(row.cumulative[rarity])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
