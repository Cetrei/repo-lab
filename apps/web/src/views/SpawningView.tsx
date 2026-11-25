import type { SpawnRules } from "@repo-lab/contract";
import { Info } from "lucide-react";
import { useState } from "react";
import { Modal } from "../components/Modal";
import { Outcome, Panel, Stat, Stats } from "../components/ui";
import { decimal, duration, integer, percent } from "../format";
import { useGameField } from "../game/GameProvider";
import { useCall } from "../hooks/useCall";
import { GlyphTile } from "../icons";
import { TIER_LABEL } from "../labels";

const TIERS = ["tier1", "tier2", "tier3"] as const;
type Tier = (typeof TIERS)[number];

function TierInfo({ label, onOpen }: { label: string; onOpen(): void }) {
  return (
    <button type="button" className="info info--small" aria-haspopup="dialog" aria-label={label} onClick={onOpen}>
      <Info aria-hidden size={16} />
    </button>
  );
}

/** Who spawns in a tier, with the art of each monster, and for tier 3 the groups that can take its place. */
function TierDialog({ tier, rules, onClose }: { tier: Tier; rules: SpawnRules; onClose(): void }) {
  const members = rules.members[tier];
  return (
    <Modal title={`Monstruos de ${TIER_LABEL[tier]}`} onClose={onClose}>
      <ul className="tiles" aria-label={`Monstruos de ${TIER_LABEL[tier]}`}>
        {members.map((member) => (
          <li key={member.id}>
            <GlyphTile kind="monster" id={member.id} size={56} eager />
            <span>{member.name}</span>
          </li>
        ))}
      </ul>
      {tier === "tier3" ? (
        <section className="modal__section">
          <h3>Grupos</h3>
          <p className="muted">
            {`Un ${percent(rules.group_chance)} de las veces, un tier 3 se reemplaza por uno de estos grupos de tier 1 o 2.`}
          </p>
          <ul className="tiles" aria-label="Grupos que reemplazan a un tier 3">
            {rules.groups.map((group) => (
              <li key={group.monster_id}>
                <span className="tiles__badge">
                  <GlyphTile kind="monster" id={group.monster_id} size={56} eager />
                  <b className="num">{`×${group.count}`}</b>
                </span>
                <span>{group.name}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Modal>
  );
}

export function SpawningView() {
  const [level] = useGameField("level");
  const [open, setOpen] = useState<Tier | null>(null);

  const rules = useCall("spawning.rules", undefined);
  const outlook = useCall("spawning.outlook", { level });
  const despawn = useCall("spawning.despawn", undefined);

  return (
    <div className="stack stack--page">
      <>
        <Panel title={`Enemigos en el nivel ${integer(level)}`} hint="Cuántos de cada tier aparecen al empezar el nivel.">
          <Outcome result={outlook}>
            {(data) => (
              <>
                <Stats>
                  {TIERS.map((tier) => (
                    <Stat
                      key={tier}
                      label={
                        <span className="stat__label">
                          {TIER_LABEL[tier]}
                          <TierInfo
                            label={`Qué monstruos son de ${TIER_LABEL[tier]}`}
                            onOpen={() => {
                              setOpen(tier);
                            }}
                          />
                        </span>
                      }
                      value={integer(data.counts[tier])}
                    />
                  ))}
                </Stats>
                <Stats>
                  <Stat
                    label={
                      <span className="stat__label">
                        Un tier 3 es un grupo
                        <TierInfo
                          label="Qué grupos pueden salir"
                          onOpen={() => {
                            setOpen("tier3");
                          }}
                        />
                      </span>
                    }
                    value={percent(data.group_chance)}
                  />
                  <Stat label="Grupos esperados" value={decimal(data.expected_groups, 2)} />
                  <Stat label="Al menos un grupo" value={percent(data.p_any_group)} />
                </Stats>
              </>
            )}
          </Outcome>
        </Panel>

        <Panel title="Enemigos por nivel" hint="La tabla completa de la que sale el cálculo.">
          <details>
            <summary>Ver la tabla completa</summary>
            <Outcome result={rules}>
              {(data) => (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Niveles</th>
                        {(Object.keys(TIER_LABEL) as (keyof typeof TIER_LABEL)[]).map((tier) => (
                          <th key={tier} scope="col" className="right">
                            {TIER_LABEL[tier]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.bands.map(([first, last, counts]) => {
                        const current = level >= first && (last === null || level <= last);
                        return (
                          <tr key={first} aria-current={current ? "true" : undefined} data-current={current}>
                            <th scope="row" className="num">
                              {last === null ? `${integer(first)} en adelante` : `${integer(first)} a ${integer(last)}`}
                            </th>
                            <td className="right num">{integer(counts.tier1)}</td>
                            <td className="right num">{integer(counts.tier2)}</td>
                            <td className="right num">{integer(counts.tier3)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Outcome>
          </details>
          {despawn.data ? (
            <p className="hint">{`Un enemigo que ningún jugador ve desaparece solo entre ${duration(despawn.data.low)} y ${duration(despawn.data.high)}.`}</p>
          ) : null}
        </Panel>
      </>
      {open !== null && rules.data ? (
        <TierDialog
          tier={open}
          rules={rules.data}
          onClose={() => {
            setOpen(null);
          }}
        />
      ) : null}
    </div>
  );
}
