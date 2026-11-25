import type { Valuable } from "@repo-lab/contract";
import { Gem, Volume2, Zap } from "lucide-react";
import { useState } from "react";
import { integer, moneyRange, plain } from "../format";
import { useCall } from "../hooks/useCall";
import { GlyphTile } from "../icons";
import { SIZE_LABEL } from "../labels";
import { Outcome } from "./ui";

const ANYWHERE = "any";

/** The valuables that can stun a big enemy, when the filter asks for only those. */
export function visible(items: readonly Valuable[], onlyStunning: boolean): Valuable[] {
  return onlyStunning ? items.filter((item) => item.stuns_big) : [...items];
}

/** The sentence of a valuable, for the tooltip: what the tile does not spell out. */
function sentence(item: Valuable): string {
  const parts = [
    `${item.name}, ${moneyRange(item.low, item.high)}.`,
    `${SIZE_LABEL[item.size]}, masa ${plain(item.mass)}.`,
    `Daño por golpe ${item.damage.slice(1).join(" / ")}.`,
  ];
  if (item.stuns_big) parts.push("Aturde enemigos grandes.");
  if (item.noise !== null) parts.push(`Hace ruido (${integer(item.noise)}).`);
  if (item.note) parts.push(item.note);
  return parts.join(" ");
}

function Tile({ item, elsewhere }: { item: Valuable; elsewhere: boolean }) {
  const text = sentence(item);
  return (
    <li className="vtile" data-stun={item.stuns_big} data-elsewhere={elsewhere} title={text}>
      <GlyphTile kind="valuable" id={item.id} size={40} />
      <span className="vtile__name">{item.name}</span>
      <span className="vtile__value num">{moneyRange(item.low, item.high)}</span>
      <span className="vtile__marks" aria-hidden>
        {item.stuns_big ? <Zap size={14} /> : null}
        {item.noise !== null ? <Volume2 size={14} /> : null}
      </span>
      <span className="sr-only">{text}</span>
    </li>
  );
}

/**
 * The valuables of one map, from the most to the least valuable, folded under one line so they do not push the rest
 * down. The lightning filter keeps only the ones that stun a big enemy.
 */
export function ValuablesStrip() {
  const catalog = useCall("valuables.catalog", undefined);
  const [chosen, setChosen] = useState<string | null>(null);
  const [onlyStunning, setOnlyStunning] = useState(false);
  const places = catalog.data?.locations ?? [];
  const current = chosen ?? places.find((place) => place.id !== ANYWHERE)?.id ?? null;
  const view = useCall("valuables.map", current === null ? null : { location: current });

  return (
    <details className="fold">
      <summary>
        <Gem aria-hidden size={18} />
        Valuables
      </summary>
      <div className="fold__body">
        <div className="toolbar">
          <ul className="chips" aria-label="Mapa">
            {places
              .filter((place) => place.id !== ANYWHERE)
              .map((place) => (
                <li key={place.id}>
                  <button
                    type="button"
                    className="chip"
                    aria-pressed={place.id === current}
                    onClick={() => {
                      setChosen(place.id);
                    }}
                  >
                    {place.name}
                  </button>
                </li>
              ))}
          </ul>
          <button
            type="button"
            className="chip"
            aria-pressed={onlyStunning}
            aria-label="Solo los que aturden enemigos grandes"
            title="Solo los que aturden enemigos grandes"
            onClick={() => {
              setOnlyStunning(!onlyStunning);
            }}
          >
            <Zap aria-hidden size={16} />
          </button>
        </div>
        <Outcome result={view}>
          {(data) => {
            const own = visible(data.own, onlyStunning);
            const anywhere = visible(data.anywhere, onlyStunning);
            return (
              <ul className="vtiles" aria-label={`Valuables de ${data.location.name}`}>
                {own.map((item) => (
                  <Tile key={item.id} item={item} elsewhere={false} />
                ))}
                {anywhere.map((item) => (
                  <Tile key={item.id} item={item} elsewhere />
                ))}
              </ul>
            );
          }}
        </Outcome>
      </div>
    </details>
  );
}
