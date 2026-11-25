import { RARITIES, type RunOutlook } from "@repo-lab/contract";
import { Package } from "lucide-react";
import { useId, useState } from "react";
import { decimal, integer, percent } from "../format";
import { useGameField } from "../game/GameProvider";
import { useCall } from "../hooks/useCall";
import { RarityArt } from "../icons";
import { RARITY_LABEL } from "../labels";
import { LuckBar } from "./LuckBar";
import { patchRequest, usePatch } from "./Patch";
import { InfoButton, Meter, Outcome } from "./ui";

/** How many levels the wait is calculated over. */
const RUN_LEVELS = 40;

/** A cumulative chance this close to one is a guarantee: the rules leave no way to miss. */
const SURE = 0.9999;

type Target = (typeof RARITIES)[number];

export type Guarantee = { kind: "sure" | "likely"; levels: number } | { kind: "none" };

/**
 * When the first box of a rarity is there. `sure` is the first level count at which missing it is no longer
 * possible. Where the rules never guarantee it inside the run, the level count that covers 9 of 10 runs is the
 * honest answer, and it is marked `likely` so it never reads as a guarantee.
 */
export function guarantee(run: RunOutlook, target: Target): Guarantee {
  const index = run.rows.findIndex((row) => row.cumulative[target] >= SURE);
  if (index >= 0) return { kind: "sure", levels: index + 1 };
  const p90 = run.milestones[target].p90;
  return p90 === null ? { kind: "none" } : { kind: "likely", levels: p90 };
}

function levelsWord(count: number): string {
  return `${integer(count)} ${count === 1 ? "nivel" : "niveles"}`;
}

export function guaranteeText(found: Guarantee): string {
  if (found.kind === "sure") return `Seguro en ${levelsWord(found.levels)}`;
  if (found.kind === "likely") return `90 % en ${levelsWord(found.levels)}`;
  return "Muy lejos";
}

/**
 * The four boxes of the level in one row: the chance of getting each, how many to expect and a short line of when
 * it is certain. The bad luck of the game sits on top because it is the only thing that changes them, and the
 * explanation of it stays behind the (i).
 */
export function BoxStrip() {
  const { id: patch } = usePatch();
  const [level] = useGameField("level");
  const [badLuck, setBadLuck] = useGameField("badLuck");
  const [open, setOpen] = useState(false);
  const infoId = useId();
  const chosen = patchRequest(patch);
  const levelResult = useCall("cosmetics.level", { level, bad_luck: badLuck, ...chosen });
  const runResult = useCall("cosmetics.run", { start_level: level, levels: RUN_LEVELS, bad_luck: badLuck, ...chosen });
  const run = runResult.data;

  return (
    <section className="panel boxes">
      <header className="boxes__head">
        <Package aria-hidden size={20} />
        <h2>Cajas</h2>
        <InfoButton
          open={open}
          controls={infoId}
          label="Qué es la mala suerte"
          onToggle={() => {
            setOpen(!open);
          }}
        />
      </header>
      {open ? (
        <p id={infoId} className="hint">
          La mala suerte cuenta los niveles seguidos que terminaste sin ninguna caja. Cualquier caja la reinicia.
        </p>
      ) : null}
      <LuckBar label="Mala suerte" value={badLuck} max={500} onChange={setBadLuck}>
        {levelResult.data ? <b className="num">{`+${percent(levelResult.data.modifier)}`}</b> : null}
      </LuckBar>
      <Outcome result={levelResult}>
        {(data) => (
          <ul className="boxes__list" aria-label="Cajas por rareza">
            {RARITIES.map((rarity) => (
              <li key={rarity} className="box" data-rarity={rarity}>
                <RarityArt rarity={rarity} size={44} height={54} />
                <span className="box__body">
                  <span className={`box__name rarity-${rarity}`}>{RARITY_LABEL[rarity]}</span>
                  <Meter value={data.p_at_least_one[rarity]} text={percent(data.p_at_least_one[rarity])} rarity={rarity} />
                  <span className="box__count num">{`×${decimal(data.expected_by_rarity[rarity], 2)}`}</span>
                  <span className="box__when">{run ? guaranteeText(guarantee(run, rarity)) : "Calculando"}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Outcome>
    </section>
  );
}
