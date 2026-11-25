import type { LiftCheck } from "@repo-lab/contract";
import { useState } from "react";
import { NumberField } from "../components/NumberField";
import { Outcome, Panel, Stat, Stats } from "../components/ui";
import { integer, signed } from "../format";
import { useCall } from "../hooks/useCall";

const FALLBACK_MAX_PLAYERS = 6;

export function MonstersView() {
  const catalog = useCall("monsters.catalog", undefined);
  const maxPlayers = catalog.data?.max_players ?? FALLBACK_MAX_PLAYERS;
  const [upgrades, setUpgrades] = useState<number[]>([0, 0]);
  const [onlyLiftable, setOnlyLiftable] = useState(false);
  const result = useCall("monsters.lift", { upgrades });

  const resize = (count: number) => {
    setUpgrades(Array.from({ length: count }, (_, index) => upgrades[index] ?? 0));
  };

  return (
    <div className="workspace">
      <Panel
        className="controls"
        title="Tu equipo"
        hint={
          catalog.data
            ? `Cada jugador empieza con ${catalog.data.base_strength} de fuerza y suma 1 por cada mejora de Fuerza que compró. La fuerza de quienes agarran se suma.`
            : "Cada jugador empieza con una fuerza base y suma 1 por cada mejora de Fuerza."
        }
      >
        <NumberField label="Jugadores" value={upgrades.length} min={1} max={maxPlayers} onChange={resize} />
        {upgrades.map((value, index) => (
          <NumberField
            // The position is the identity: players have no name and the list only grows or shrinks at the end.
            key={index}
            label={`Mejoras de Fuerza del jugador ${index + 1}`}
            value={value}
            min={0}
            max={99}
            onChange={(next) => {
              setUpgrades(upgrades.map((current, at) => (at === index ? next : current)));
            }}
          />
        ))}
      </Panel>

      <div className="stack">
        <Outcome result={result}>
          {(data) => {
            const liftable = data.rows.filter((row) => row.liftable);
            const can = liftable.filter((row) => row.can_lift);
            const shown = onlyLiftable ? data.rows.filter((row) => row.can_lift) : data.rows;
            return (
              <Panel title="Qué monstruos puedes levantar" hint="Ordenados de menor a mayor fuerza necesaria.">
                <Stats>
                  <Stat label="Fuerza del equipo" value={integer(data.rows[0]?.combined ?? 0)} />
                  <Stat label="Monstruos que levantan" value={`${can.length} de ${liftable.length}`} tone="good" />
                </Stats>
                <div className="chips">
                  <button
                    type="button"
                    className="chip"
                    aria-pressed={onlyLiftable}
                    onClick={() => {
                      setOnlyLiftable(!onlyLiftable);
                    }}
                  >
                    Solo los que puedo levantar
                  </button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Monstruo</th>
                        <th scope="col" className="right">
                          Fuerza necesaria
                        </th>
                        <th scope="col">Con tu equipo</th>
                        <th scope="col">Aturdido</th>
                        <th scope="col" className="right">
                          {`Mejoras en total con ${upgrades.length} ${upgrades.length === 1 ? "jugador" : "jugadores"}`}
                        </th>
                        <th scope="col" className="right">
                          Vida
                        </th>
                        <th scope="col">Nota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((row) => (
                        <MonsterRow key={row.monster_id} row={row} players={upgrades.length} />
                      ))}
                    </tbody>
                  </table>
                </div>
                {shown.length === 0 ? <p className="muted">Con este equipo no levantas ninguno todavía.</p> : null}
              </Panel>
            );
          }}
        </Outcome>
      </div>
    </div>
  );
}

function MonsterRow({ row, players }: { row: LiftCheck; players: number }) {
  const total = row.upgrades_from_zero?.[players - 1];
  return (
    <tr>
      <th scope="row">{row.name}</th>
      <td className="right num">{row.required === null ? "No se levanta" : integer(row.required)}</td>
      <td>
        {!row.liftable ? (
          <span className="muted">No se puede levantar</span>
        ) : row.can_lift ? (
          <span className="good">{`Lo levantan (${signed(row.margin ?? 0)})`}</span>
        ) : (
          <span className="bad">{`Faltan ${integer(row.missing)}`}</span>
        )}
      </td>
      <td>
        {row.stunned_required === null ? (
          <span className="muted">Sin dato</span>
        ) : (
          <span className={row.can_lift_stunned ? "good" : "bad"}>
            {`${integer(row.stunned_required)}, ${row.can_lift_stunned ? "lo levantan" : "no alcanza"}`}
          </span>
        )}
      </td>
      <td className="right num">{total === undefined ? "" : integer(total)}</td>
      <td className="right num">{row.health === null ? <span className="muted">Sin dato</span> : integer(row.health)}</td>
      <td className="wrap muted">{row.note}</td>
    </tr>
  );
}
