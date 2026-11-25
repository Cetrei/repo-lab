import type { LiftCheck } from "@repo-lab/contract";
import { Ban, Dumbbell, X, Zap } from "lucide-react";
import { GlyphTile, Heads } from "../icons";
import { effortVerdict, stunVerdict } from "../lift";
import type { Verdict } from "../lift";
import { HealthBar } from "./HealthBar";

/** The icon of a verdict that no player count explains: held with effort, not yet, or not liftable at all. */
function Mark({ verdict }: { verdict: Verdict }) {
  if (verdict.tone === "warn") return <Dumbbell aria-hidden size={16} />;
  if (verdict.tone === "bad") return <X aria-hidden size={16} />;
  return <Ban aria-hidden size={16} />;
}

function Who({ verdict }: { verdict: Verdict }) {
  if (verdict.players === null) return <Mark verdict={verdict} />;
  return (
    <>
      <Heads count={verdict.players} size={16} />
      <b className="num">{verdict.players}</b>
    </>
  );
}

/**
 * A small tile of a monster: the art with its tier as a number, the name, the health in bars of 100 and who lifts it,
 * normal and stunned. The ring is green when the team lifts it, yellow when it holds it with effort and red when it
 * cannot yet. There is no text to read: the whole sentence is the tooltip and the accessible name.
 */
export function MonsterTile({
  row,
  tier,
  group,
  onOpen,
}: {
  row: LiftCheck;
  tier: number;
  /** How many of it come in a group, when it can spawn as one. */
  group?: number;
  onOpen(): void;
}) {
  const lift = effortVerdict(row);
  const stun = stunVerdict(row);
  const sentence = `${row.name}, tier ${tier}. Levantar: ${lift.text}. Aturdido: ${stun.text}.${group ? ` Sale en grupos de ${group}.` : ""}${row.health === null && row.drain !== null ? ` Drena hasta ${row.drain} de vida.` : ""}`;
  return (
    <button type="button" className="mtile" data-tone={lift.tone} aria-haspopup="dialog" aria-label={sentence} title={sentence} onClick={onOpen}>
      <span className="mtile__tier num" aria-hidden>
        {tier}
      </span>
      {group ? (
        <b className="mtile__group num" aria-hidden>{`×${group}`}</b>
      ) : null}
      <GlyphTile kind="monster" id={row.monster_id} size={48} />
      <span className="mtile__name">{row.name}</span>
      <HealthBar health={row.health} drain={row.drain} />
      <span className="mtile__who" aria-hidden>
        <span className="mtile__lift" data-tone={lift.tone}>
          <Who verdict={lift} />
        </span>
        <span className="mtile__stun" data-tone={stun.tone}>
          <Zap size={14} />
          <Who verdict={stun} />
        </span>
      </span>
    </button>
  );
}
