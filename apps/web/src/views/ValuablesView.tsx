import type { Valuable } from "@repo-lab/contract";
import { Volume2, Zap } from "lucide-react";
import { useState } from "react";
import { Outcome, Panel, Stat, Stats } from "../components/ui";
import { integer, moneyRange, plain } from "../format";
import { useCall } from "../hooks/useCall";
import { GlyphTile } from "../icons";
import { SIZE_LABEL } from "../labels";

const ANYWHERE = "any";

/** The valuables that can stun a big enemy, when the filter asks for only those. */
export function visible(items: readonly Valuable[], onlyStunning: boolean): Valuable[] {
  return onlyStunning ? items.filter((item) => item.stuns_big) : [...items];
}

function ValuableCard({ item }: { item: Valuable }) {
  return (
    <li className="vcard" data-stun={item.stuns_big}>
      <GlyphTile kind="valuable" id={item.id} size={64} />
      <div className="vcard__body">
        <strong className="vcard__name">{item.name}</strong>
        <span className="vcard__value num">{moneyRange(item.low, item.high)}</span>
        <dl className="vcard__facts">
          <div>
            <dt>Tamaño</dt>
            <dd>{SIZE_LABEL[item.size]}</dd>
          </div>
          <div>
            <dt>Masa</dt>
            <dd className="num">{plain(item.mass)}</dd>
          </div>
          <div>
            <dt>Daño por golpe</dt>
            <dd className="num">{item.damage.slice(1).join(" / ")}</dd>
          </div>
        </dl>
        {item.stuns_big || item.noise !== null || item.note ? (
          <ul className="vcard__tags">
            {item.stuns_big ? (
              <li>
                <Zap aria-hidden size={14} />
                Aturde enemigos grandes
              </li>
            ) : null}
            {item.noise !== null ? (
              <li>
                <Volume2 aria-hidden size={14} />
                {`Hace ruido (${integer(item.noise)})${item.trigger ? `: ${item.trigger}` : ""}`}
              </li>
            ) : null}
            {item.note ? <li>{item.note}</li> : null}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

function ValuableList({ label, items }: { label: string; items: readonly Valuable[] }) {
  if (items.length === 0) return <p className="muted">Ninguno con ese filtro.</p>;
  return (
    <ul className="vcards" aria-label={label}>
      {items.map((item) => (
        <ValuableCard key={item.id} item={item} />
      ))}
    </ul>
  );
}

/** The valuables of one map, from the most to the least valuable, with the ones that turn up on any map. */
export function ValuablesView() {
  const catalog = useCall("valuables.catalog", undefined);
  const [chosen, setChosen] = useState<string | null>(null);
  const [onlyStunning, setOnlyStunning] = useState(false);
  const places = catalog.data?.locations ?? [];
  const current = chosen ?? places.find((place) => place.id !== ANYWHERE)?.id ?? null;
  const view = useCall("valuables.map", current === null ? null : { location: current });
  const stunDamage = catalog.data?.big_stun_damage;

  return (
    <div className="stack stack--page">
      <Panel
        title="Valuables por mapa"
        hint="Elige un mapa para ver lo que vale cada objeto, cuánto pesa y cuánto daño hace al chocar."
      >
        <div className="toolbar">
          <ul className="chips" aria-label="Mapa">
            {places.map((place) => (
              <li key={place.id}>
                <button
                  type="button"
                  className="chip"
                  aria-pressed={place.id === current}
                  onClick={() => {
                    setChosen(place.id);
                  }}
                >
                  {place.id === ANYWHERE ? "En cualquier mapa" : place.name}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="chip"
            aria-pressed={onlyStunning}
            onClick={() => {
              setOnlyStunning(!onlyStunning);
            }}
          >
            <Zap aria-hidden size={16} />
            Aturden enemigos grandes
          </button>
        </div>
        {stunDamage === undefined ? null : (
          <p className="hint">{`Solo los valuables con ${integer(stunDamage)} o más de daño en el golpe más fuerte aturden a un enemigo grande.`}</p>
        )}
      </Panel>

      <Outcome result={view}>
        {(data) => {
          const own = visible(data.own, onlyStunning);
          const anywhere = visible(data.anywhere, onlyStunning);
          const best = data.own[0] ?? data.anywhere[0];
          return (
            <>
              {data.location.id === ANYWHERE ? null : (
                <Panel title={data.location.name}>
                  <Stats>
                    <Stat label="Valuables" value={integer(data.own.length)} />
                    <Stat label="El más valioso" value={best ? best.name : "Ninguno"} />
                  </Stats>
                  <ValuableList label={`Valuables de ${data.location.name}`} items={own} />
                </Panel>
              )}
              <Panel
                title="En cualquier mapa"
                hint="Los que pueden aparecer en todos los mapas, como lo que sueltan algunos enemigos."
              >
                <ValuableList label="Valuables de cualquier mapa" items={anywhere} />
              </Panel>
            </>
          );
        }}
      </Outcome>
    </div>
  );
}
