import type { LiftCheck, SpawnRules } from "@repo-lab/contract";
import { useState } from "react";
import { ChannelMonsterDialog, MonsterCard } from "../components/MonsterCard";
import { Outcome, Panel, Stat, Stats } from "../components/ui";
import { integer, percent } from "../format";
import { useGameField } from "../game/GameProvider";
import { useCall } from "../hooks/useCall";
import { TIER_LABEL } from "../labels";
import { teamStrength } from "../lift";
import { EffortLegend } from "./MonstersView";

const TIERS = ["tier1", "tier2", "tier3"] as const;

function plural(count: number): string {
  return `${integer(count)} ${count === 1 ? "enemigo" : "enemigos"}`;
}

/** The lift rows of some monsters, in the order of the lift table: the easiest first. */
function rowsOf(rows: readonly LiftCheck[], ids: ReadonlySet<string>): LiftCheck[] {
  return rows.filter((row) => ids.has(row.monster_id));
}

/** How many of the monsters of a partida the team lifts at once, with effort, or not yet. */
export function effortCounts(rows: readonly LiftCheck[]): { easy: number; hard: number; none: number } {
  const counts = { easy: 0, hard: 0, none: 0 };
  for (const row of rows) {
    if (row.effort === "easy") counts.easy += 1;
    else if (row.effort === "hard") counts.hard += 1;
    else counts.none += 1;
  }
  return counts;
}

/** The monsters that can show up in a level: the members of every tier that spawns, and the groups of tier 3. */
export function possibleIds(rules: SpawnRules, counts: Record<(typeof TIERS)[number], number>): Set<string> {
  const ids = new Set<string>();
  for (const tier of TIERS) {
    if (counts[tier] === 0) continue;
    for (const member of rules.members[tier]) ids.add(member.id);
  }
  if (counts.tier3 > 0) for (const group of rules.groups) ids.add(group.monster_id);
  return ids;
}

/**
 * One screen for the level in play: which enemies can spawn, how many of each tier, and for each of them whether
 * the team lifts it, with green for a clean lift and yellow for one held with effort.
 */
export function PartidaView() {
  const [level] = useGameField("level");
  const [team] = useGameField("team");
  const [open, setOpen] = useState<string | null>(null);
  const outlook = useCall("spawning.outlook", { level });
  const rules = useCall("spawning.rules", undefined);
  const lift = useCall("monsters.lift", { upgrades: team });
  const catalog = useCall("monsters.catalog", undefined);

  return (
    <div className="stack stack--page">
      <Outcome result={outlook}>
        {(spawn) => (
          <Outcome result={rules}>
            {(spawnRules) => (
              <Outcome result={lift}>
                {(table) => {
                  const possible = rowsOf(table.rows, possibleIds(spawnRules, spawn.counts));
                  const tally = effortCounts(possible);
                  const selected = table.rows.find((row) => row.monster_id === open);
                  const big = catalog.data?.monsters.find((monster) => monster.id === open)?.big ?? false;
                  return (
                    <>
                      <Panel
                        title={`Partida en el nivel ${integer(level)}`}
                        hint={`Con ${integer(team.length)} ${team.length === 1 ? "jugador" : "jugadores"}. Los enemigos que pueden salir y si tu equipo los levanta. La fuerza cuenta como en el juego: 0 sin mejoras, y cada jugador extra suma ${integer(table.rows[0]?.base_strength ?? 5)}.`}
                      >
                        <Stats>
                          <Stat label="Fuerza del equipo" value={teamStrength(table.rows)} />
                          <Stat label="Los levantas sin problema" value={integer(tally.easy)} tone="good" />
                          <Stat label="Los sostienes con esfuerzo" value={integer(tally.hard)} />
                          <Stat label="Todavía no" value={integer(tally.none)} />
                        </Stats>
                        <EffortLegend />
                      </Panel>

                      {TIERS.map((tier) => {
                        const count = spawn.counts[tier];
                        const members = rowsOf(table.rows, new Set(spawnRules.members[tier].map((member) => member.id)));
                        return (
                          <Panel
                            key={tier}
                            title={`${TIER_LABEL[tier]}: ${count === 0 ? "ninguno" : plural(count)}`}
                            hint={count === 0 ? "En este nivel no sale ninguno de este tier." : undefined}
                          >
                            {count === 0 ? null : (
                              <ul className="cards" aria-label={`Monstruos de ${TIER_LABEL[tier]}`}>
                                {members.map((row) => (
                                  <li key={row.monster_id}>
                                    <MonsterCard
                                      row={row}
                                      effort
                                      onOpen={() => {
                                        setOpen(row.monster_id);
                                      }}
                                    />
                                  </li>
                                ))}
                              </ul>
                            )}
                            {tier === "tier3" && count > 0 ? (
                              <section className="modal__section">
                                <h3>Grupos</h3>
                                <p className="muted">
                                  {`Un ${percent(spawn.group_chance)} de las veces, un tier 3 es uno de estos grupos de tier 1 o 2.`}
                                </p>
                                <ul className="cards" aria-label="Grupos que reemplazan a un tier 3">
                                  {spawnRules.groups.map((group) => {
                                    const row = table.rows.find((item) => item.monster_id === group.monster_id);
                                    if (!row) return null;
                                    return (
                                      <li key={group.monster_id}>
                                        <MonsterCard
                                          row={row}
                                          effort
                                          badge={`×${group.count}`}
                                          onOpen={() => {
                                            setOpen(row.monster_id);
                                          }}
                                        />
                                      </li>
                                    );
                                  })}
                                </ul>
                              </section>
                            ) : null}
                          </Panel>
                        );
                      })}

                      {selected ? (
                        <ChannelMonsterDialog
                          row={selected}
                          players={team.length}
                          big={big}
                          onClose={() => {
                            setOpen(null);
                          }}
                        />
                      ) : null}
                    </>
                  );
                }}
              </Outcome>
            )}
          </Outcome>
        )}
      </Outcome>
    </div>
  );
}
