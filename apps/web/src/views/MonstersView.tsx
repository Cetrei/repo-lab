import type { LiftCheck } from "@repo-lab/contract";
import { Zap } from "lucide-react";
import { useState } from "react";
import { GlyphTile, Heads, PlayerHead, shuffledHues } from "../icons";
import { Modal } from "../components/Modal";
import { NumberField } from "../components/NumberField";
import { SegmentBar } from "../components/SegmentBar";
import { Outcome, Panel, Stat, Stats } from "../components/ui";
import { integer, signed } from "../format";
import { useGameField } from "../game/GameProvider";
import { useCall } from "../hooks/useCall";
import { liftVerdict, stunVerdict } from "../lift";
import type { Verdict } from "../lift";

const FALLBACK_MAX_PLAYERS = 6;
const FALLBACK_STRENGTH_CAP = 13;

/** The most Strength upgrades that change anything: the heaviest monster a single player can lift alone. */
export function strengthCap(monsters: readonly { solo_upgrades: number | null }[] | undefined): number {
  const listed = (monsters ?? []).map((monster) => monster.solo_upgrades ?? 0);
  return Math.max(1, ...listed, monsters ? 0 : FALLBACK_STRENGTH_CAP);
}

export function MonstersView() {
  const catalog = useCall("monsters.catalog", undefined);
  const maxPlayers = catalog.data?.max_players ?? FALLBACK_MAX_PLAYERS;
  const cap = strengthCap(catalog.data?.monsters);
  const [upgrades, setUpgrades] = useGameField("team");
  const [hues] = useState(shuffledHues);
  const [onlyLiftable, setOnlyLiftable] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
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
            ? `Cada jugador empieza con ${catalog.data.base_strength} de fuerza y suma 1 por cada mejora de Fuerza. La fuerza de quienes agarran se suma. La barra llega a ${cap}: con más mejoras no se levanta nada nuevo.`
            : "Cada jugador empieza con una fuerza base y suma 1 por cada mejora de Fuerza."
        }
      >
        <NumberField label="Jugadores" value={upgrades.length} min={1} max={maxPlayers} onChange={resize} />
        <ul className="lobby" aria-label="Tu equipo">
          {upgrades.map((value, index) => (
            // The position is the identity: players have no name and the list only grows or shrinks at the end.
            <li key={index} className="lobby__row">
              <PlayerHead hue={hues[index % hues.length] ?? 0} size={40} />
              <GlyphTile kind="upgrade" id="strength" size={32} />
              <SegmentBar
                className="lobby__bar"
                label={`Mejoras de Fuerza del jugador ${index + 1}`}
                value={Math.min(value, cap)}
                segments={cap}
                onChange={(next) => {
                  setUpgrades(upgrades.map((current, at) => (at === index ? next : current)));
                }}
                segmentLabel={(count) => `Jugador ${index + 1}: ${count} ${count === 1 ? "mejora" : "mejoras"} de Fuerza`}
              />
            </li>
          ))}
        </ul>
      </Panel>

      <div className="stack">
        <Outcome result={result}>
          {(data) => {
            const can = data.rows.filter((row) => row.liftable && row.can_lift);
            const liftableCount = data.rows.filter((row) => row.liftable).length;
            const shown = onlyLiftable ? data.rows.filter((row) => row.can_lift) : data.rows;
            const selected = data.rows.find((row) => row.monster_id === open);
            return (
              <Panel
                title="Qué monstruos puedes levantar"
                hint="De menor a mayor fuerza necesaria. Toca un monstruo para ver el cálculo."
              >
                <div className="toolbar">
                  <Stats>
                    <Stat label="Fuerza del equipo" value={integer(data.rows[0]?.combined ?? 0)} />
                    <Stat label="Los levantan" value={`${can.length} de ${liftableCount}`} tone="good" />
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
                {shown.length === 0 ? (
                  <p className="muted">Con este equipo no levantas ninguno todavía.</p>
                ) : (
                  <ul className="cards">
                    {shown.map((row) => (
                      <li key={row.monster_id}>
                        <MonsterCard
                          row={row}
                          onOpen={() => {
                            setOpen(row.monster_id);
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                )}
                {selected ? (
                  <MonsterDialog
                    row={selected}
                    players={upgrades.length}
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

function VerdictLine({ label, verdict, stun }: { label: string; verdict: Verdict; stun?: boolean }) {
  return (
    <div className="verdict" data-tone={verdict.tone}>
      <span className="verdict__label">
        {stun ? <Zap size={14} aria-hidden="true" /> : null}
        {label}
      </span>
      <span className="verdict__value">
        {verdict.players !== null ? <Heads count={verdict.players} /> : null}
        {verdict.text}
      </span>
    </div>
  );
}

/** Every card has the same size, so the grid reads as a table. The calculation opens in a dialog. */
function MonsterCard({ row, onOpen }: { row: LiftCheck; onOpen(): void }) {
  const lift = liftVerdict(row);
  const stun = stunVerdict(row);
  return (
    <button type="button" className="mcard" data-tone={lift.tone} aria-haspopup="dialog" onClick={onOpen}>
      <GlyphTile kind="monster" id={row.monster_id} size={56} />
      <span className="mcard__name">{row.name}</span>
      <VerdictLine label="Levantar" verdict={lift} />
      <VerdictLine label="Aturdido" verdict={stun} stun />
    </button>
  );
}

function MonsterDialog({ row, players, onClose }: { row: LiftCheck; players: number; onClose(): void }) {
  const total = row.upgrades_from_zero?.[players - 1];
  return (
    <Modal title={row.name} onClose={onClose}>
      <dl className="detail">
        <div>
          <dt>Fuerza necesaria</dt>
          <dd className="num">{row.required === null ? "No se levanta" : integer(row.required)}</dd>
        </div>
        <div>
          <dt>Tu equipo</dt>
          <dd className="num">
            {integer(row.combined)}
            {row.margin === null ? "" : ` (${signed(row.margin)})`}
          </dd>
        </div>
        <div>
          <dt>Fuerza aturdido</dt>
          <dd className="num">{row.stunned_required === null ? "Sin dato" : integer(row.stunned_required)}</dd>
        </div>
        <div>
          <dt>{`Mejoras en total con ${players} ${players === 1 ? "jugador" : "jugadores"}`}</dt>
          <dd className="num">{total === undefined ? "No aplica" : integer(total)}</dd>
        </div>
        <div>
          <dt>Vida</dt>
          <dd className="num">{row.health === null ? "Sin dato" : integer(row.health)}</dd>
        </div>
        {row.note ? (
          <div className="detail__note">
            <dt>Nota</dt>
            <dd>{row.note}</dd>
          </div>
        ) : null}
      </dl>
    </Modal>
  );
}
