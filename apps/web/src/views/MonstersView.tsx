import type { LiftCheck } from "@repo-lab/contract";
import { ChevronDown, User, Users, Zap } from "lucide-react";
import { useState } from "react";
import { GlyphTile } from "../icons";
import { NumberField } from "../components/NumberField";
import { Outcome, Panel, Stat, Stats } from "../components/ui";
import { integer, signed } from "../format";
import { useCall } from "../hooks/useCall";
import { liftVerdict, stunVerdict } from "../lift";
import type { Verdict } from "../lift";

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
            ? `Cada jugador empieza con ${catalog.data.base_strength} de fuerza y suma 1 por cada mejora de Fuerza. La fuerza de quienes agarran se suma.`
            : "Cada jugador empieza con una fuerza base y suma 1 por cada mejora de Fuerza."
        }
      >
        <NumberField label="Jugadores" value={upgrades.length} min={1} max={maxPlayers} onChange={resize} />
        <div className="players">
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
        </div>
      </Panel>

      <div className="stack">
        <Outcome result={result}>
          {(data) => {
            const can = data.rows.filter((row) => row.liftable && row.can_lift);
            const liftableCount = data.rows.filter((row) => row.liftable).length;
            const shown = onlyLiftable ? data.rows.filter((row) => row.can_lift) : data.rows;
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
                <div className="legend" aria-hidden="true">
                  <span>
                    <User size={14} /> Solo
                  </span>
                  <span>
                    <Users size={14} /> Con varios jugadores
                  </span>
                  <span>
                    <Zap size={14} /> Aturdido
                  </span>
                </div>
                {shown.length === 0 ? (
                  <p className="muted">Con este equipo no levantas ninguno todavía.</p>
                ) : (
                  <ul className="cards">
                    {shown.map((row) => (
                      <li key={row.monster_id}>
                        <MonsterCard row={row} players={upgrades.length} />
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            );
          }}
        </Outcome>
      </div>
    </div>
  );
}

function VerdictLine({ label, verdict, stun }: { label: string; verdict: Verdict; stun?: boolean }) {
  const Who = verdict.players !== null && verdict.players > 1 ? Users : User;
  return (
    <div className="verdict" data-tone={verdict.tone}>
      <span className="verdict__label">
        {stun ? <Zap size={14} aria-hidden="true" /> : null}
        {label}
      </span>
      <span className="verdict__value">
        {verdict.players !== null ? <Who size={16} aria-hidden="true" /> : null}
        {verdict.text}
      </span>
    </div>
  );
}

function MonsterCard({ row, players }: { row: LiftCheck; players: number }) {
  const lift = liftVerdict(row);
  const stun = stunVerdict(row);
  const total = row.upgrades_from_zero?.[players - 1];
  return (
    <details className="mcard" data-tone={lift.tone}>
      <summary>
        <GlyphTile kind="monster" id={row.monster_id} size={56} />
        <span className="mcard__name">{row.name}</span>
        <ChevronDown className="mcard__chevron" size={16} aria-hidden="true" />
        <VerdictLine label="Levantar" verdict={lift} />
        <VerdictLine label="Aturdido" verdict={stun} stun />
      </summary>
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
    </details>
  );
}
