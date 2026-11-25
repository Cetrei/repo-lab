import type { LiftCheck, Monster, SpawnOutlook, SpawnRules } from "@repo-lab/contract";
import { Search, Skull, Users } from "lucide-react";
import { useState } from "react";
import { BoxStrip } from "../components/BoxStrip";
import { ChannelMonsterDialog } from "../components/MonsterCard";
import { MonsterTile } from "../components/MonsterTile";
import { TeamEditor } from "../components/TeamEditor";
import { FailureNotice } from "../components/ui";
import { ValuablesStrip } from "../components/ValuablesStrip";
import { useGameField } from "../game/GameProvider";
import { useCall } from "../hooks/useCall";
import { strengthCap } from "./MonstersView";

const TIERS = ["tier1", "tier2", "tier3"] as const;
const FALLBACK_MAX_PLAYERS = 6;

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

/** A name without accents or capitals, so a search finds Cleanup Crew by "crew" and any name by its first letters. */
export function plainName(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/** The tiles of the monsters of a level that match the search, by tier and then from the easiest to lift. */
export function tilesOf(
  rows: readonly LiftCheck[],
  monsters: readonly Monster[],
  possible: ReadonlySet<string>,
  query: string,
): { row: LiftCheck; tier: number }[] {
  const tiers = new Map(monsters.map((monster) => [monster.id, monster.tier]));
  const needle = plainName(query.trim());
  return rows
    .map((row, order) => ({ row, order, tier: tiers.get(row.monster_id) ?? 0 }))
    .filter(({ row }) => possible.has(row.monster_id) && plainName(row.name).includes(needle))
    .sort((a, b) => a.tier - b.tier || a.order - b.order);
}

function MonsterBoard({
  rows,
  monsters,
  rules,
  spawn,
  query,
  players,
}: {
  rows: readonly LiftCheck[];
  monsters: readonly Monster[];
  rules: SpawnRules;
  spawn: SpawnOutlook;
  query: string;
  players: number;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const groups = new Map(rules.groups.map((group) => [group.monster_id, group.count]));
  const tiles = tilesOf(rows, monsters, possibleIds(rules, spawn.counts), query);
  const selected = rows.find((row) => row.monster_id === open);
  return (
    <>
      <ul className="mtiles" aria-label="Monstruos que pueden salir en este nivel">
        {tiles.map(({ row, tier }) => (
          <li key={row.monster_id}>
            <MonsterTile
              row={row}
              tier={tier}
              group={groups.get(row.monster_id)}
              onOpen={() => {
                setOpen(row.monster_id);
              }}
            />
          </li>
        ))}
      </ul>
      {selected ? (
        <ChannelMonsterDialog
          row={selected}
          players={players}
          big={monsters.find((monster) => monster.id === selected.monster_id)?.big ?? false}
          onClose={() => {
            setOpen(null);
          }}
        />
      ) : null}
    </>
  );
}

/**
 * The whole game in one screen. The level is the floating dock, then the team with its strength, the boxes of the
 * level, and the monsters that can spawn in it, each with its tier, its health and whether the team lifts it. The
 * valuables are folded under them.
 */
export function PartidaView() {
  const [level] = useGameField("level");
  const [team, setTeam] = useGameField("team");
  const [query, setQuery] = useState("");
  const outlook = useCall("spawning.outlook", { level });
  const rules = useCall("spawning.rules", undefined);
  const lift = useCall("monsters.lift", { upgrades: team });
  const catalog = useCall("monsters.catalog", undefined);
  const failure = outlook.error ?? rules.error ?? lift.error ?? catalog.error;

  return (
    <div className="partida">
      <section className="panel partida__team">
        <header className="boxes__head">
          <Users aria-hidden size={20} />
          <h2>Equipo</h2>
        </header>
        <TeamEditor
          team={team}
          maxPlayers={catalog.data?.max_players ?? FALLBACK_MAX_PLAYERS}
          cap={strengthCap(catalog.data?.monsters)}
          onChange={setTeam}
          headSize={32}
          slots={4}
        />
      </section>

      <BoxStrip />

      <section className="panel partida__monsters">
        <header className="boxes__head">
          <Skull aria-hidden size={20} />
          <h2>Monstruos</h2>
          <label className="search">
            <Search aria-hidden size={16} />
            <input
              type="search"
              value={query}
              placeholder="Buscar"
              aria-label="Buscar un monstruo por nombre"
              onChange={(event) => {
                setQuery(event.target.value);
              }}
            />
          </label>
        </header>
        {failure ? <FailureNotice failure={failure} /> : null}
        {outlook.data && rules.data && lift.data && catalog.data ? (
          <MonsterBoard
            rows={lift.data.rows}
            monsters={catalog.data.monsters}
            rules={rules.data}
            spawn={outlook.data}
            query={query}
            players={team.length}
          />
        ) : failure ? null : (
          <p className="loading" role="status">
            Calculando
          </p>
        )}
      </section>

      <ValuablesStrip />
    </div>
  );
}
