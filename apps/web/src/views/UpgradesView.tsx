import type { ShopOutlook, Upgrade } from "@repo-lab/contract";
import { useMemo, useState } from "react";
import { NumberField } from "../components/NumberField";
import { GlyphTile } from "../icons";
import { Meter, Notice, Outcome, Panel, Stat, Stats } from "../components/ui";
import { decimal, integer, percent } from "../format";
import { useCall } from "../hooks/useCall";

type Counts = Record<string, number>;

/** The engine reads a missing id as zero, so zeros are left out and the request stays small. */
function compact(counts: Counts): Counts {
  return Object.fromEntries(Object.entries(counts).filter(([, count]) => count > 0));
}

function listUnits(counts: Counts, names: Map<string, string>): string {
  return Object.entries(counts)
    .map(([id, count]) => `${names.get(id) ?? id} x${count}`)
    .join(", ");
}

export function UpgradesView() {
  const catalog = useCall("upgrades.catalog", undefined);
  const [held, setHeld] = useState<Counts>({});
  const [consumed, setConsumed] = useState<string[]>([]);
  const [wanted, setWanted] = useState<string[]>([]);
  const [used, setUsed] = useState<Counts>({});
  const [rerolls, setRerolls] = useState(0);

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

  const toggle = (list: string[], id: string): string[] =>
    list.includes(id) ? list.filter((item) => item !== id) : [...list, id];

  return (
    <div className="workspace">
      <Panel
        className="controls"
        title="Lo que tienes"
        hint="Unidades compradas que todavía no usaste. Cuentan como en circulación y la tienda no las vuelve a ofrecer."
      >
        {catalog.error ? <Notice tone="error" title="No se pudo leer el catálogo">{catalog.error.message}</Notice> : null}
        <div className="fields-grid">
          {upgrades.map((upgrade) => (
            <NumberField
              key={upgrade.id}
              icon={<GlyphTile kind="upgrade" id={upgrade.id} size={24} />}
              label={`${upgrade.name} (tope ${upgrade.cap})`}
              value={held[upgrade.id] ?? 0}
              min={0}
              max={upgrade.cap}
              onChange={(next) => {
                setHeld({ ...held, [upgrade.id]: next });
              }}
            />
          ))}
        </div>
        {upgrades.some((u) => u.permanent) ? (
          <div className="field">
            <span className="label">Ya usadas y permanentes</span>
            <div className="chips">
              {upgrades
                .filter((u) => u.permanent)
                .map((upgrade) => (
                  <button
                    key={upgrade.id}
                    type="button"
                    className="chip"
                    aria-pressed={consumed.includes(upgrade.id)}
                    onClick={() => {
                      setConsumed(toggle(consumed, upgrade.id));
                    }}
                  >
                    <GlyphTile kind="upgrade" id={upgrade.id} size={20} />
                    {upgrade.name}
                  </button>
                ))}
            </div>
            <p className="hint">Una mejora permanente no vuelve al fondo común una vez usada.</p>
          </div>
        ) : null}
      </Panel>

      <div className="stack">
        <Panel
          title="La tienda"
          hint={
            catalog.data
              ? `La tienda muestra ${catalog.data.shop.shop_slots} unidades sacadas del fondo común, y se asume que cada unidad disponible tiene la misma probabilidad.`
              : undefined
          }
        >
          <Outcome result={shop}>{(data) => <ShopTable data={data} />}</Outcome>
        </Panel>

        <Panel
          title="Controlar la tienda"
          hint="Elige qué mejoras quieres ver. Se te dice qué unidades comprar y guardar para que el fondo común quede del tamaño de la tienda."
        >
          <div className="chips">
            {upgrades.map((upgrade) => (
              <WantedChip
                key={upgrade.id}
                upgrade={upgrade}
                pressed={wanted.includes(upgrade.id)}
                onToggle={() => {
                  setWanted(toggle(wanted, upgrade.id));
                }}
              />
            ))}
          </div>
          {wanted.length === 0 ? (
            <p className="muted">Marca al menos una mejora para ver el plan.</p>
          ) : (
            <Outcome result={stash}>
              {(plan) => (
                <>
                  <Stats>
                    <Stat label="Unidades a guardar" value={integer(plan.units_to_stash)} />
                    <Stat label="En el camión" value={integer(plan.truck_units)} />
                    <Stat label="En el void" value={integer(plan.void_units)} tone={plan.void_units > 0 ? "bad" : undefined} />
                    <Stat
                      label="Salen todas las que quieres"
                      value={plan.all_wanted_guaranteed ? "Sí" : "No"}
                      tone={plan.all_wanted_guaranteed ? "good" : "bad"}
                    />
                  </Stats>
                  {plan.units_to_stash > 0 ? (
                    <p>
                      <strong>Compra y guarda: </strong>
                      <span className="num">{listUnits(plan.stash, names)}</span>
                    </p>
                  ) : (
                    <p className="muted">Con lo que tienes ya no hace falta guardar nada.</p>
                  )}
                  {!plan.all_wanted_guaranteed ? (
                    <Notice title="La tienda no queda asegurada">
                      Las mejoras que quieres son más que los espacios de la tienda, así que algunas pueden no aparecer.
                      Las probabilidades reales siguen abajo.
                    </Notice>
                  ) : null}
                  <ShopTable data={plan.after} />
                </>
              )}
            </Outcome>
          )}
        </Panel>

        <div className="pair">
          <Panel
            title="Usar mejoras"
            hint="Las unidades usadas vuelven al fondo común, salvo las permanentes, y el void rellena el camión."
          >
            {Object.entries(held).some(([, count]) => count > 0) ? (
              <div className="row">
                {upgrades
                  .filter((u) => (held[u.id] ?? 0) > 0)
                  .map((upgrade) => (
                    <NumberField
                      key={upgrade.id}
                      label={`Usar ${upgrade.name}`}
                      value={Math.min(used[upgrade.id] ?? 0, held[upgrade.id] ?? 0)}
                      min={0}
                      max={held[upgrade.id] ?? 0}
                      onChange={(next) => {
                        setUsed({ ...used, [upgrade.id]: next });
                      }}
                    />
                  ))}
              </div>
            ) : (
              <p className="muted">Anota unidades en Lo que tienes para poder usarlas aquí.</p>
            )}
            {anyUsed ? (
              <Outcome result={use}>
                {(result) => (
                  <>
                    <Stats>
                      <Stat label="Unidades usadas" value={integer(result.units_used)} />
                      <Stat label="Salen del void" value={integer(result.released_from_void)} />
                      <Stat label="Quedan en el void" value={integer(result.void_after)} />
                      <Stat label="Fondo común" value={integer(result.after.pool_total)} />
                    </Stats>
                    <ShopTable data={result.after} />
                  </>
                )}
              </Outcome>
            ) : null}
          </Panel>

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
        </div>
      </div>
    </div>
  );
}

function WantedChip({
  upgrade,
  pressed,
  onToggle,
}: {
  upgrade: Upgrade;
  pressed: boolean;
  onToggle(): void;
}) {
  return (
    <button type="button" className="chip" aria-pressed={pressed} onClick={onToggle}>
      <GlyphTile kind="upgrade" id={upgrade.id} size={20} />
      {upgrade.name}
    </button>
  );
}

function ShopTable({ data }: { data: ShopOutlook }) {
  return (
    <>
      <Stats>
        <Stat label="Fondo común" value={integer(data.pool_total)} />
        <Stat label="Unidades tuyas" value={integer(data.held_total)} />
        <Stat label="Camión" value={`${integer(data.truck_units)} de ${integer(data.truck_capacity)}`} />
        <Stat label="Void" value={integer(data.void_units)} tone={data.void_units > 0 ? "bad" : undefined} />
      </Stats>
      {data.guaranteed ? (
        <Notice title="La tienda sale completa">
          {`El fondo común tiene ${integer(data.pool_total)} unidades, no más que los ${integer(data.slots)} espacios, así que aparecen todas.`}
        </Notice>
      ) : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Mejora</th>
              <th scope="col" className="right">
                Tienes
              </th>
              <th scope="col" className="right">
                En el fondo
              </th>
              <th scope="col">Aparece</th>
              <th scope="col" className="right">
                Unidades esperadas
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.upgrade_id}>
                <th scope="row">
                  <span className="named">
                    <GlyphTile kind="upgrade" id={row.upgrade_id} size={28} />
                    {row.name}
                  </span>
                </th>
                <td className="right num">{`${integer(row.held)} de ${integer(row.cap)}`}</td>
                <td className="right num">{integer(row.pool)}</td>
                <td>
                  <Meter value={row.p_appears} text={row.certain ? "Seguro" : percent(row.p_appears)} />
                </td>
                <td className="right num">{decimal(row.expected_units, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
