import { useState } from "react";
import { useChannel } from "../channel";
import { ChannelMonsterDialog, MonsterCard } from "../components/MonsterCard";
import { TeamEditor } from "../components/TeamEditor";
import { Outcome, Panel, Stat, Stats } from "../components/ui";
import { integer } from "../format";
import { useGameField } from "../game/GameProvider";
import { useCall } from "../hooks/useCall";
import { teamStrength } from "../lift";

const FALLBACK_MAX_PLAYERS = 6;
const FALLBACK_STRENGTH_CAP = 13;

/** The most Strength upgrades that change anything: the heaviest monster a single player can lift alone. */
export function strengthCap(monsters: readonly { solo_upgrades: number | null }[] | undefined): number {
  const listed = (monsters ?? []).map((monster) => monster.solo_upgrades ?? 0);
  return Math.max(1, ...listed, monsters ? 0 : FALLBACK_STRENGTH_CAP);
}

export function MonstersView() {
  const effort = useChannel() === "next";
  const catalog = useCall("monsters.catalog", undefined);
  const maxPlayers = catalog.data?.max_players ?? FALLBACK_MAX_PLAYERS;
  const cap = strengthCap(catalog.data?.monsters);
  const [upgrades, setUpgrades] = useGameField("team");
  const [onlyLiftable, setOnlyLiftable] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const result = useCall("monsters.lift", { upgrades });

  return (
    <div className="workspace">
      <Panel
        className="controls"
        title="Tu equipo"
        hint={
          catalog.data
            ? `Cada jugador tiene 0 de fuerza sin mejoras y suma 1 por cada mejora de Fuerza. Al agarrar entre varios la fuerza se suma, y cada jugador extra aporta ${catalog.data.base_strength} más. La barra llega a ${cap}: con más mejoras no se levanta nada nuevo.`
            : "Cada jugador tiene 0 de fuerza sin mejoras y suma 1 por cada mejora de Fuerza."
        }
      >
        <TeamEditor team={upgrades} maxPlayers={maxPlayers} cap={cap} onChange={setUpgrades} />
      </Panel>

      <div className="stack">
        <Outcome result={result}>
          {(data) => {
            const can = data.rows.filter((row) => row.liftable && row.can_lift);
            const withEffort = data.rows.filter((row) => row.effort === "hard");
            const liftableCount = data.rows.filter((row) => row.liftable).length;
            const reachable = (row: (typeof data.rows)[number]) =>
              effort ? row.effort === "easy" || row.effort === "hard" : row.can_lift;
            const shown = onlyLiftable ? data.rows.filter(reachable) : data.rows;
            const selected = data.rows.find((row) => row.monster_id === open);
            const big = catalog.data?.monsters.find((monster) => monster.id === open)?.big ?? false;
            return (
              <Panel
                title="Qué monstruos puedes levantar"
                hint="De menor a mayor fuerza necesaria. Toca un monstruo para ver el cálculo."
              >
                <div className="toolbar">
                  <Stats>
                    <Stat label="Fuerza del equipo" value={teamStrength(data.rows)} />
                    <Stat label="Los levantan" value={`${can.length} de ${liftableCount}`} tone="good" />
                    {effort ? <Stat label="Con esfuerzo" value={integer(withEffort.length)} /> : null}
                  </Stats>
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
                {effort ? <EffortLegend /> : null}
                {shown.length === 0 ? (
                  <p className="muted">Con este equipo no levantas ninguno todavía.</p>
                ) : (
                  <ul className="cards">
                    {shown.map((row) => (
                      <li key={row.monster_id}>
                        <MonsterCard
                          row={row}
                          effort={effort}
                          onOpen={() => {
                            setOpen(row.monster_id);
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                )}
                {selected ? (
                  <ChannelMonsterDialog
                    row={selected}
                    players={upgrades.length}
                    big={big}
                    onClose={() => {
                      setOpen(null);
                    }}
                  />
                ) : null}
              </Panel>
            );
          }}
        </Outcome>
      </div>
    </div>
  );
}

/** What the three colors of the test channel mean, so a player never has to guess. */
export function EffortLegend() {
  return (
    <ul className="legend" aria-label="Qué significa cada color">
      <li data-tone="good">Verde: tu equipo llega a la fuerza que pide</li>
      <li data-tone="warn">Amarillo: lo sostiene, pero con esfuerzo</li>
      <li data-tone="bad">Rojo: todavía no lo levanta</li>
    </ul>
  );
}
