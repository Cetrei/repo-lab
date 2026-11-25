import type { LiftCheck } from "@repo-lab/contract";
import { Zap } from "lucide-react";
import { useChannel } from "../channel";
import { integer, signed } from "../format";
import { useCall } from "../hooks/useCall";
import { GlyphTile, Heads } from "../icons";
import { effortVerdict, known, liftVerdict, stunnedFigure, stunVerdict } from "../lift";
import type { Verdict } from "../lift";
import { Modal } from "./Modal";

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

/**
 * Every card has the same size, so the grid reads as a table. The calculation opens in a dialog. With `effort`
 * the card tells a yellow lift (held with effort) from a green one, as the test channel does. `badge` is a count,
 * like the size of a group.
 */
export function MonsterCard({
  row,
  onOpen,
  effort = false,
  badge,
}: {
  row: LiftCheck;
  onOpen(): void;
  effort?: boolean;
  badge?: string;
}) {
  const lift = effort ? effortVerdict(row) : liftVerdict(row);
  const stun = stunVerdict(row);
  return (
    <button type="button" className="mcard" data-tone={lift.tone} aria-haspopup="dialog" onClick={onOpen}>
      <GlyphTile kind="monster" id={row.monster_id} size={56} />
      <span className="mcard__name">
        {row.name}
        {badge ? <b className="mcard__badge num">{badge}</b> : null}
      </span>
      <VerdictLine label="Levantar" verdict={lift} />
      <VerdictLine label="Aturdido" verdict={stun} stun />
    </button>
  );
}

/**
 * The dialog of a card in the current channel. The test channel adds the effort figure and, for a big monster,
 * the valuables that can stun it, so only it asks Python for the valuable rules.
 */
export function ChannelMonsterDialog({
  row,
  players,
  big,
  onClose,
}: {
  row: LiftCheck;
  players: number;
  big: boolean;
  onClose(): void;
}) {
  if (useChannel() === "next") return <TestMonsterDialog row={row} players={players} big={big} onClose={onClose} />;
  return <MonsterDialog row={row} players={players} onClose={onClose} />;
}

function TestMonsterDialog({
  row,
  players,
  big,
  onClose,
}: {
  row: LiftCheck;
  players: number;
  big: boolean;
  onClose(): void;
}) {
  const valuables = useCall("valuables.catalog", undefined);
  return (
    <MonsterDialog
      row={row}
      players={players}
      onClose={onClose}
      effort
      big={big}
      stunDamage={valuables.data?.big_stun_damage}
    />
  );
}

/** The calculation behind a card. `big` says that only the heaviest valuables stun this monster. */
export function MonsterDialog({
  row,
  players,
  onClose,
  effort = false,
  big = false,
  stunDamage,
}: {
  row: LiftCheck;
  players: number;
  onClose(): void;
  effort?: boolean;
  big?: boolean;
  stunDamage?: number;
}) {
  const total = row.upgrades_from_zero?.[players - 1];
  return (
    <Modal title={row.name} onClose={onClose}>
      <dl className="detail">
        <div>
          <dt>Fuerza necesaria</dt>
          <dd className="num">{row.required === null ? "No se levanta" : known(row, row.required)}</dd>
        </div>
        {effort && row.hard_required !== null ? (
          <div>
            <dt>Fuerza para sostenerlo con esfuerzo</dt>
            <dd className="num">{known(row, row.hard_required)}</dd>
          </div>
        ) : null}
        <div>
          <dt>Tu equipo</dt>
          <dd className="num">
            {known(row, row.combined)}
            {row.margin === null ? "" : ` (${signed(row.margin)})`}
          </dd>
        </div>
        <div>
          <dt>Fuerza aturdido</dt>
          <dd className="num">
            {!row.liftable ? "No se puede agarrar" : (stunnedFigure(row) ?? "Sin dato")}
          </dd>
        </div>
        <div>
          <dt>{`Mejoras en total con ${players} ${players === 1 ? "jugador" : "jugadores"}`}</dt>
          <dd className="num">{total === undefined ? "No aplica" : integer(total)}</dd>
        </div>
        <div>
          <dt>{row.health === null && row.drain !== null ? "Drena hasta" : "Vida"}</dt>
          <dd className="num">{row.health === null ? (row.drain === null ? "Sin dato" : integer(row.drain)) : integer(row.health)}</dd>
        </div>
        {big && stunDamage !== undefined ? (
          <div className="detail__note">
            <dt>Enemigo grande</dt>
            <dd>{`Solo lo aturden los valuables con ${integer(stunDamage)} o más de daño en el golpe más fuerte.`}</dd>
          </div>
        ) : null}
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
