import type { Valuable, ValuableSize } from "@repo-lab/contract";
import { Box, Gem, HeartCrack, Volume2, Zap } from "lucide-react";
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

export type Group = "small" | "medium" | "large";

const GROUPS: readonly Group[] = ["large", "medium", "small"];
const GROUP_LABEL: Record<Group, string> = { large: "Grandes", medium: "Medianos", small: "Pequeños" };
const GROUP_ICON: Record<Group, number> = { large: 26, medium: 20, small: 14 };

/** The three sizes the eye tells apart: the tiny ones go with the small ones, wide and tall ones with the big ones. */
const GROUP_OF: Record<ValuableSize, Group> = {
  tiny: "small",
  small: "small",
  medium: "medium",
  big: "large",
  wide: "large",
  tall: "large",
  very_tall: "large",
};

/** The valuables split into big, medium and small, each group from the most to the least valuable. */
export function grouped(items: readonly Valuable[]): { group: Group; items: Valuable[] }[] {
  return GROUPS.map((group) => ({
    group,
    items: items.filter((item) => GROUP_OF[item.size] === group).sort((a, b) => b.high - a.high || b.mass - a.mass),
  })).filter((entry) => entry.items.length > 0);
}

/** The most damage a hit does with the item, the last of the four hit strengths. */
export function topDamage(item: Valuable): number {
  return item.damage[item.damage.length - 1] ?? 0;
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
      <span className="vtile__stats" aria-hidden>
        <span className="vtile__stat">
          <GlyphTile kind="upgrade" id="strength" size={16} />
          <b className="num">{plain(item.mass)}</b>
        </span>
        <span className="vtile__stat vtile__stat--damage">
          <HeartCrack size={14} />
          <b className="num">{integer(topDamage(item))}</b>
        </span>
      </span>
      <span className="vtile__marks" aria-hidden>
        {item.stuns_big ? <Zap size={14} /> : null}
        {item.noise !== null ? <Volume2 size={14} /> : null}
      </span>
      <span className="sr-only">{text}</span>
    </li>
  );
}

/** One map of the selector: its picture and its name, like the map list of a game. */
function MapCard({ id, name, chosen, onChoose }: { id: string; name: string; chosen: boolean; onChoose(): void }) {
  return (
    <button type="button" className="map" aria-pressed={chosen} onClick={onChoose}>
      <img
        className="map__art"
        src={`${import.meta.env.BASE_URL}icons/maps/${id}.webp`}
        alt=""
        loading="lazy"
        onError={(event) => {
          event.currentTarget.hidden = true;
        }}
      />
      <span className="map__name">{name}</span>
    </button>
  );
}

/**
 * The valuables of one map, folded under one line so they do not push the rest down. The map is chosen from its
 * picture, the items come in three visible groups, big, medium and small, and each one shows how much strength it
 * takes to lift and the most damage it does. The lightning filter keeps only the ones that stun a big enemy.
 */
export function ValuablesStrip() {
  const catalog = useCall("valuables.catalog", undefined);
  const [chosen, setChosen] = useState<string | null>(null);
  const [onlyStunning, setOnlyStunning] = useState(false);
  const places = (catalog.data?.locations ?? []).filter((place) => place.id !== ANYWHERE);
  const current = chosen ?? places[0]?.id ?? null;
  const view = useCall("valuables.map", current === null ? null : { location: current });

  return (
    <details className="fold">
      <summary>
        <Gem aria-hidden size={18} />
        Valuables
      </summary>
      <div className="fold__body">
        <div className="toolbar">
          <ul className="maps" aria-label="Mapa">
            {places.map((place) => (
              <li key={place.id}>
                <MapCard
                  id={place.id}
                  name={place.name}
                  chosen={place.id === current}
                  onChoose={() => {
                    setChosen(place.id);
                  }}
                />
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
            const ownIds = new Set(own.map((item) => item.id));
            return (
              <div className="vgroups" role="group" aria-label={`Valuables de ${data.location.name}`}>
                {grouped([...own, ...anywhere]).map(({ group, items }) => (
                  <section key={group} className="vgroup" data-group={group}>
                    <h3 className="vgroup__title">
                      <Box aria-hidden size={GROUP_ICON[group]} />
                      {GROUP_LABEL[group]}
                      <span className="num">{items.length}</span>
                    </h3>
                    <ul className="vtiles">
                      {items.map((item) => (
                        <Tile key={item.id} item={item} elsewhere={!ownIds.has(item.id)} />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            );
          }}
        </Outcome>
      </div>
    </details>
  );
}
