import type { ShopOutlook, StashPlan, Upgrade, UseResult } from "@repo-lab/contract";
import { Star } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { NumberField } from "../components/NumberField";
import { InfoButton, Meter, Notice, Outcome, Panel, Stat, Stats } from "../components/ui";
import { decimal, integer, percent } from "../format";
import { useGameField } from "../game/GameProvider";
import type { CallResult } from "../hooks/useCall";
import { useCall } from "../hooks/useCall";
import { GlyphTile, UpgradeArt, iconUrl } from "../icons";

type Counts = Record<string, number>;
type Row = ShopOutlook["rows"][number];

/** The engine reads a missing id as zero, so zeros are left out and the request stays small. */
function compact(counts: Counts): Counts {
  return Object.fromEntries(Object.entries(counts).filter(([, count]) => count > 0));
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function units(count: number): string {
  return `${integer(count)} ${count === 1 ? "unidad" : "unidades"}`;
}

export function UpgradesView() {
  const catalog = useCall("upgrades.catalog", undefined);
  const [held, setHeld] = useGameField("held");
  const [consumed, setConsumed] = useGameField("consumed");
  const [wanted, setWanted] = useGameField("wanted");
  const [used, setUsed] = useGameField("used");
  const [rerolls, setRerolls] = useGameField("rerolls");

  const upgrades = useMemo(() => catalog.data?.upgrades ?? [], [catalog.data]);
  const names = useMemo(() => new Map(upgrades.map((u) => [u.id, u.name])), [upgrades]);
  const heldRequest = compact(held);

  // A unit cannot be used if it is no longer held, so a lowered stock trims what was set to use.
  const usable = Object.fromEntries(
    Object.entries(used).map(([id, count]) => [id, Math.min(count, held[id] ?? 0)]),
  );
  const anyUsed = Object.values(usable).some((count) => count > 0);

  const shop = useCall("upgrades.shop", { held: heldRequest, consumed });
  const stash = useCall("upgrades.stash", wanted.length === 0 ? null : { wanted, held: heldRequest, consumed });
  const use = useCall("upgrades.use", anyUsed ? { used: compact(usable), held: heldRequest, consumed } : null);
  const reroll = useCall("upgrades.reroll", { rerolls });

  // With a plan the cards show the shop as it will be after keeping the units, otherwise as it is now.
  const plan = wanted.length > 0 ? stash.data : undefined;
  const outlook = plan ? plan.after : shop.data;
  const rows = useMemo(() => new Map((outlook?.rows ?? []).map((row) => [row.upgrade_id, row])), [outlook]);

  return (
    <div className="upgrades">
      {catalog.error ? (
        <Notice tone="error" title="No se pudo leer el catálogo">
          {catalog.error.message}
        </Notice>
      ) : null}

      <PlanSummary wanted={wanted} stash={stash} outlook={outlook} names={names} slots={catalog.data?.shop.shop_slots} />

      <Panel
        title="Tus mejoras"
        hint="La estrella marca las que quieres ver en la tienda. El contador es cuántas unidades compradas tienes sin usar."
      >
        <ul className="ugrid">
          {upgrades.map((upgrade) => (
            <li key={upgrade.id}>
              <UpgradeCard
                upgrade={upgrade}
                held={held[upgrade.id] ?? 0}
                buy={plan?.stash[upgrade.id] ?? 0}
                row={rows.get(upgrade.id)}
                wanted={wanted.includes(upgrade.id)}
                plan={plan}
                consumed={consumed.includes(upgrade.id)}
                onHeld={(next) => {
                  setHeld({ ...held, [upgrade.id]: next });
                }}
                onWanted={() => {
                  setWanted(toggle(wanted, upgrade.id));
                }}
                onConsumed={() => {
                  setConsumed(toggle(consumed, upgrade.id));
                }}
              />
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title="Gastar mejoras"
        hint="Una mejora que gastas vuelve al fondo común y puede reaparecer en la tienda, salvo las permanentes. Aquí ves cómo cambia la tienda si gastas algunas."
      >
        {upgrades.some((upgrade) => (held[upgrade.id] ?? 0) > 0) ? (
          <ul className="spend" aria-label="Mejoras que puedes gastar">
            {upgrades
              .filter((upgrade) => (held[upgrade.id] ?? 0) > 0)
              .map((upgrade) => (
                <li key={upgrade.id} className="spend__row">
                  <GlyphTile kind="upgrade" id={upgrade.id} size={32} />
                  <span className="spend__name">{upgrade.name}</span>
                  <span className="muted num">{`de ${integer(held[upgrade.id] ?? 0)}`}</span>
                  <NumberField
                    hideLabel
                    variant="compact"
                    label={`Usar ${upgrade.name}`}
                    value={Math.min(used[upgrade.id] ?? 0, held[upgrade.id] ?? 0)}
                    min={0}
                    max={held[upgrade.id] ?? 0}
                    onChange={(next) => {
                      setUsed({ ...used, [upgrade.id]: next });
                    }}
                  />
                </li>
              ))}
          </ul>
        ) : (
          <p className="muted">Anota arriba cuántas unidades tienes y aquí pruebas qué pasa al gastarlas.</p>
        )}
        {anyUsed ? (
          <Outcome result={use}>{(result) => <SpendResult result={result} before={shop.data} wanted={wanted} />}</Outcome>
        ) : null}
      </Panel>

      <details className="tools">
        <summary>Más herramientas: recargar la tienda</summary>
        <Panel title="Recargar la tienda" hint="El primer reroll cuesta una cantidad fija y cada siguiente suma otra igual.">
          <NumberField label="Rerolls" value={rerolls} min={0} max={1000} onChange={setRerolls} />
          <Outcome result={reroll}>
            {(data) => (
              <Stats>
                <Stat label="Costo total" value={`${integer(data.total_cost)}`} />
              </Stats>
            )}
          </Outcome>
        </Panel>
      </details>
    </div>
  );
}

/** What spending units does: where they go and which upgrades become more or less likely in the shop. */
function SpendResult({
  result,
  before,
  wanted,
}: {
  result: UseResult;
  before: ShopOutlook | undefined;
  wanted: string[];
}) {
  const was = new Map((before?.rows ?? []).map((row) => [row.upgrade_id, row.p_appears]));
  const changes = result.after.rows
    .map((row) => ({ id: row.upgrade_id, name: row.name, from: was.get(row.upgrade_id) ?? 0, to: row.p_appears }))
    .filter((change) => Math.abs(change.to - change.from) >= 0.0005)
    .sort((a, b) => {
      const mine = Number(wanted.includes(b.id)) - Number(wanted.includes(a.id));
      return mine !== 0 ? mine : Math.abs(b.to - b.from) - Math.abs(a.to - a.from);
    })
    .slice(0, 8);
  return (
    <div className="spend__result">
      <p className="plan__lead">
        <strong>{`Gastas ${units(result.units_used)} y vuelven al fondo común, que pasa a ${integer(result.after.pool_total)}.`}</strong>
      </p>
      {result.released_from_void > 0 ? (
        <p className="muted">{`Del void entran ${units(result.released_from_void)} al camión y quedan ${integer(result.void_after)} allí.`}</p>
      ) : result.void_after > 0 ? (
        <p className="muted">{`El void sigue con ${units(result.void_after)}.`}</p>
      ) : null}
      {changes.length > 0 ? (
        <ul className="changes" aria-label="Cómo cambia la tienda">
          {changes.map((change) => (
            <li key={change.id}>
              <GlyphTile kind="upgrade" id={change.id} size={28} />
              <span>{change.name}</span>
              <b className="num" data-up={change.to > change.from}>{`${percent(change.from)} → ${percent(change.to)}`}</b>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">La tienda queda igual.</p>
      )}
    </div>
  );
}

/** The answer first: how many units to buy and keep, as a shopping list, with the numbers behind (i). */
function PlanSummary({
  wanted,
  stash,
  outlook,
  names,
  slots,
}: {
  wanted: string[];
  stash: CallResult<StashPlan>;
  outlook: ShopOutlook | undefined;
  names: Map<string, string>;
  slots: number | undefined;
}) {
  const [open, setOpen] = useState(false);
  const infoId = useId();
  const state = wanted.length === 0 || !stash.data ? "idle" : stash.data.all_wanted_guaranteed ? "ok" : "bad";

  return (
    <section className="panel plan" data-state={state}>
      <header className="plan__header">
        <h2>Qué comprar</h2>
        <InfoButton
          open={open}
          controls={infoId}
          label="Cómo se calcula el plan"
          onToggle={() => {
            setOpen(!open);
          }}
        />
      </header>
      {wanted.length === 0 ? (
        <p className="plan__lead muted">
          Marca con la estrella las mejoras que quieres ver en la tienda y te digo cuántas comprar de cada una.
        </p>
      ) : (
        <Outcome result={stash}>{(plan) => <PlanAnswer plan={plan} wanted={wanted.length} names={names} />}</Outcome>
      )}
      {open ? (
        <div id={infoId} className="plan__info">
          <p className="muted">
            {slots === undefined ? "La tienda" : `La tienda muestra ${units(slots)}`} sacadas al azar del fondo común: todas las
            mejoras en circulación menos las que tú tienes. Si el fondo común queda del tamaño de la tienda, salen todas
            seguro. Por eso se compran y se guardan unidades de relleno, y lo que no cabe en el camión se queda en el void.
          </p>
          {outlook ? (
            <Stats>
              <Stat label="Fondo común" value={integer(outlook.pool_total)} />
              <Stat label="Unidades tuyas" value={integer(outlook.held_total)} />
              <Stat label="Camión" value={`${integer(outlook.truck_units)} de ${integer(outlook.truck_capacity)}`} />
              <Stat label="Void" value={integer(outlook.void_units)} tone={outlook.void_units > 0 ? "bad" : undefined} />
            </Stats>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function PlanAnswer({ plan, wanted, names }: { plan: StashPlan; wanted: number; names: Map<string, string> }) {
  const entries = Object.entries(plan.stash).filter(([, count]) => count > 0);
  const total = plan.units_to_stash;
  const ones = wanted === 1;
  let lead: string;
  if (plan.all_wanted_guaranteed) {
    const sale = ones ? "te sale la que quieres" : `te salen las ${integer(wanted)} que quieres`;
    lead = total > 0 ? `Compra y guarda ${units(total)} y ${sale}.` : `Ya ${sale}, no hace falta guardar nada.`;
  } else {
    lead = total > 0 ? `Compra y guarda ${units(total)}, aun así no salen todas.` : "Con lo que tienes no se pueden asegurar todas.";
  }
  return (
    <>
      <p className="plan__lead">
        <strong>{lead}</strong>
      </p>
      {entries.length > 0 ? (
        <ul className="shopping" aria-label="Lista de compra">
          {entries.map(([id, count]) => (
            <li key={id} className="shopitem">
              <GlyphTile kind="upgrade" id={id} size={32} />
              <span>{names.get(id) ?? id}</span>
              <b className="num">{`×${count}`}</b>
            </li>
          ))}
        </ul>
      ) : null}
      {!plan.all_wanted_guaranteed ? (
        <Notice title="La tienda no queda asegurada">
          Las mejoras que quieres son más que los espacios de la tienda, así que algunas pueden no aparecer. El porcentaje de
          cada tarjeta es su probabilidad real.
        </Notice>
      ) : null}
    </>
  );
}

type Tone = "buy" | "good" | "bad" | "muted";

function statusOf(
  buy: number,
  wanted: boolean,
  plan: StashPlan | undefined,
  row: Row | undefined,
): { tone: Tone; text: string } | null {
  if (buy > 0) return { tone: "buy", text: `Comprar y guardar ${integer(buy)}` };
  if (row && row.pool === 0) return { tone: wanted ? "bad" : "muted", text: "No sale en la tienda" };
  if (wanted && plan) {
    return plan.all_wanted_guaranteed
      ? { tone: "good", text: "Te saldrá" }
      : { tone: "bad", text: `Aparece ${percent(row?.p_appears ?? 0)}` };
  }
  if (!row) return null;
  return { tone: "muted", text: row.certain ? "Aparece seguro" : `Aparece ${percent(row.p_appears)}` };
}

/** One box per unit the player can hold: owned ones lit, units to buy dashed, free slots dim. */
function Pips({ id, cap, held, buy }: { id: string; cap: number; held: number; buy: number }) {
  return (
    <span className="pips" aria-hidden="true">
      {Array.from({ length: cap }, (_, index) => (
        <span key={index} className="pip" data-state={index < held ? "held" : index < held + buy ? "buy" : "free"}>
          <img src={iconUrl("upgrade", id)} alt="" width={20} height={28} loading="lazy" decoding="async" draggable={false} />
        </span>
      ))}
    </span>
  );
}

interface CardProps {
  upgrade: Upgrade;
  held: number;
  buy: number;
  row: Row | undefined;
  wanted: boolean;
  plan: StashPlan | undefined;
  consumed: boolean;
  onHeld(next: number): void;
  onWanted(): void;
  onConsumed(): void;
}

function UpgradeCard({ upgrade, held, buy, row, wanted, plan, consumed, onHeld, onWanted, onConsumed }: CardProps) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const status = statusOf(buy, wanted, plan, row);

  return (
    <article className="ucard" data-wanted={wanted} data-buy={buy > 0}>
      <div className="ucard__art">
        <UpgradeArt id={upgrade.id} />
      </div>
      <div className="ucard__body">
        <div className="ucard__top">
          <h3 className="ucard__name">{upgrade.name}</h3>
          <button
            type="button"
            className="want"
            aria-pressed={wanted}
            aria-label={`Quiero ${upgrade.name}`}
            onClick={onWanted}
          >
            <Star aria-hidden size={20} />
          </button>
          <InfoButton
            open={open}
            controls={detailId}
            label={`Más información sobre ${upgrade.name}`}
            onToggle={() => {
              setOpen(!open);
            }}
          />
        </div>
        <NumberField label={`Tengo ${upgrade.name}`} hideLabel value={held} min={0} max={upgrade.cap} onChange={onHeld} />
        <div className="ucard__foot">
          <Pips id={upgrade.id} cap={upgrade.cap} held={held} buy={buy} />
          {status ? (
            <span className="status" data-tone={status.tone}>
              {status.text}
            </span>
          ) : (
            <span className="status status--none" aria-hidden="true">
              {"\u00a0"}
            </span>
          )}
        </div>
      </div>
      {open ? (
        <div id={detailId} className="ucard__more">
          <dl className="detail">
            <div>
              <dt>Tope en circulación</dt>
              <dd className="num">{integer(upgrade.cap)}</dd>
            </div>
            {row ? (
              <>
                <div>
                  <dt>En el fondo común</dt>
                  <dd className="num">{integer(row.pool)}</dd>
                </div>
                <div>
                  <dt>Aparece</dt>
                  <dd>
                    <Meter value={row.p_appears} text={row.certain ? "Seguro" : percent(row.p_appears)} />
                  </dd>
                </div>
                <div>
                  <dt>Unidades esperadas</dt>
                  <dd className="num">{decimal(row.expected_units, 2)}</dd>
                </div>
              </>
            ) : null}
          </dl>
          {upgrade.permanent ? (
            <>
              <button type="button" className="chip" aria-pressed={consumed} onClick={onConsumed}>
                Ya la usé
              </button>
              <p className="hint">Una mejora permanente no vuelve al fondo común una vez usada.</p>
            </>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
