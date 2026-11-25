import { RARITIES, type LevelOutlook, type RunOutlook } from "@repo-lab/contract";
import { useId, useState } from "react";
import { LuckBar } from "../components/LuckBar";
import { NumberField } from "../components/NumberField";
import { patchRequest, usePatch } from "../components/Patch";
import { InfoButton, Meter, Outcome, Panel, Stat, Stats } from "../components/ui";
import { decimal, integer, percent } from "../format";
import type { CallResult } from "../hooks/useCall";
import { useCall } from "../hooks/useCall";
import { RarityArt } from "../icons";
import { RARITY_LABEL, TARGETS, TARGET_LABEL } from "../labels";

function levelsText(value: number | null): string {
  if (value === null) return "Fuera de rango";
  return `${integer(value)} ${value === 1 ? "nivel" : "niveles"}`;
}

export function CosmeticsView() {
  const { id: patch } = usePatch();
  const [level, setLevel] = useState(1);
  const [badLuck, setBadLuck] = useState(0);
  const [levels, setLevels] = useState(10);

  const chosen = patchRequest(patch);
  const levelResult = useCall("cosmetics.level", { level, bad_luck: badLuck, ...chosen });
  const runResult = useCall("cosmetics.run", { start_level: level, levels, bad_luck: badLuck, ...chosen });
  const outlook = levelResult.data;

  return (
    <div className="cajas">
      <Panel
        title="Tu partida"
        hint="La mala suerte cuenta los niveles seguidos que terminaste sin ninguna caja. Cualquier caja la reinicia."
        className="cajas__setup"
      >
        <NumberField label="Nivel" variant="sign" value={level} min={1} max={10000} onChange={setLevel} />
        <LuckBar label="Mala suerte" value={badLuck} max={500} onChange={setBadLuck}>
          {outlook ? (
            <>
              <b className="num">{`+${percent(outlook.modifier)}`}</b>
              {" a cada tirada. "}
              {outlook.p_dry < 0.0005 ? "La caja es segura." : `Sin ninguna caja: ${percent(outlook.p_dry)}.`}
            </>
          ) : null}
        </LuckBar>
      </Panel>

      <BoxesPanel level={level} levels={levels} onLevels={setLevels} levelResult={levelResult} runResult={runResult} />
    </div>
  );
}

/**
 * One card per rarity with both answers a player needs: what the level gives and how many levels pass until the
 * first one shows up. They sit together because the second only makes sense next to the first.
 */
function BoxesPanel({
  level,
  levels,
  onLevels,
  levelResult,
  runResult,
}: {
  level: number;
  levels: number;
  onLevels(next: number): void;
  levelResult: CallResult<LevelOutlook>;
  runResult: CallResult<RunOutlook>;
}) {
  const [open, setOpen] = useState(false);
  const infoId = useId();
  const run = runResult.data;
  return (
    <section className="panel plan">
      <header className="plan__header">
        <h2>{`Nivel ${integer(level)}`}</h2>
        <InfoButton
          open={open}
          controls={infoId}
          label="Más información sobre las cajas del nivel"
          onToggle={() => {
            setOpen(!open);
          }}
        />
      </header>
      <Outcome result={levelResult}>
        {(data) => (
          <>
            <p className="plan__lead">
              <strong>{`Te sale al menos una caja el ${percent(data.p_any)} de las veces.`}</strong>{" "}
              <span className="muted">{`Esperas ${decimal(data.expected_boxes, 2)} cajas en total.`}</span>
            </p>
            {run ? (
              <p className="plan__lead muted">
                {`${TARGET_LABEL.any}: la primera llega en ${levelsText(run.milestones.any.median)} la mitad de las veces y en ${levelsText(run.milestones.any.p90)} o menos 9 de cada 10.`}
              </p>
            ) : null}
            <ul className="rgrid" aria-label="Cajas por rareza">
              {RARITIES.map((rarity) => {
                const wait = run?.milestones[rarity];
                return (
                  <li key={rarity}>
                    <article className="rcard" data-rarity={rarity}>
                      <RarityArt rarity={rarity} size={120} height={144} />
                      <div className="rcard__body">
                        <h3 className={`rarity-${rarity}`}>{RARITY_LABEL[rarity]}</h3>
                        <p className="rcard__big num">
                          {decimal(data.expected_by_rarity[rarity], 3)}
                          <span>cajas esperadas</span>
                        </p>
                        <p className="rcard__label">Al menos una en este nivel</p>
                        <Meter value={data.p_at_least_one[rarity]} text={percent(data.p_at_least_one[rarity])} rarity={rarity} />
                      </div>
                      <div className="rcard__wait">
                        <p className="rcard__label">Hasta la primera</p>
                        <p className="rcard__big num">
                          {wait ? levelsText(wait.median) : "Calculando"}
                          <span>la mitad de las veces</span>
                        </p>
                        {wait ? (
                          <p className="rcard__label">
                            {"9 de cada 10: "}
                            <b className="num">{levelsText(wait.p90)}</b>
                          </p>
                        ) : null}
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
            {open ? (
              <div id={infoId} className="plan__info">
                <LevelDetails data={data} />
                {run ? <RunDetails data={run} levels={levels} onLevels={onLevels} /> : null}
              </div>
            ) : null}
          </>
        )}
      </Outcome>
    </section>
  );
}

function LevelDetails({ data }: { data: LevelOutlook }) {
  return (
    <>
      <Stats>
        <Stat label="Ninguna caja" value={percent(data.p_dry)} tone={data.p_dry > 0.5 ? "bad" : undefined} />
        <Stat label="Bonus de mala suerte" value={percent(data.modifier)} />
      </Stats>

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

function RunDetails({
  data,
  levels,
  onLevels,
}: {
  data: RunOutlook;
  levels: number;
  onLevels(next: number): void;
}) {
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

      <details>
        <summary>Nivel por nivel</summary>
        <div className="row">
          <NumberField label="Cuántos niveles" value={levels} min={1} max={100} onChange={onLevels} />
        </div>
        <div className="table-wrap table-wrap--tall">
          <table>
            <caption>Probabilidad nivel por nivel, con el acumulado desde el inicio</caption>
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
      </details>
    </>
  );
}
