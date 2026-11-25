import type { LiftCheck } from "@repo-lab/contract";
import { integer } from "./format";

export type Verdict = {
  /** `good` lifts it, `warn` holds it with effort, `bad` cannot yet, `muted` there is no figure for it. */
  tone: "good" | "warn" | "bad" | "muted";
  /** How many players take part, for the icon. Null when nobody can. */
  players: number | null;
  text: string;
};

/** Who has to grab the monster, in the words a player reads at a glance. */
export function verdict(figure: number | null, playersNeeded: number | null, missing: number | null): Verdict {
  if (figure === null) return { tone: "muted", players: null, text: "Sin dato" };
  if (playersNeeded === null) {
    return { tone: "bad", players: null, text: missing === null ? "No alcanza" : `Faltan ${integer(missing)}` };
  }
  if (playersNeeded === 1) return { tone: "good", players: 1, text: "Solo" };
  return { tone: "good", players: playersNeeded, text: `${playersNeeded} jugadores` };
}

export function liftVerdict(row: LiftCheck): Verdict {
  if (!row.liftable) return { tone: "muted", players: null, text: "No se levanta" };
  return verdict(row.required, row.players_needed, row.missing);
}

/**
 * The verdict of the test channel: green when the team reaches the listed figure, yellow when it only holds the
 * monster with effort, red when it cannot yet.
 */
export function effortVerdict(row: LiftCheck): Verdict {
  if (row.effort === "never") return { tone: "muted", players: null, text: "No se levanta" };
  if (row.effort === "hard") return { tone: "warn", players: null, text: "Con esfuerzo" };
  return liftVerdict(row);
}

/**
 * Who has to grab the monster while it is stunned. A monster whose sources disagree has a range of figures: the
 * team is sure to hold it from the highest one, and without a sure answer between them.
 */
export function stunVerdict(row: LiftCheck): Verdict {
  if (!row.liftable) return { tone: "muted", players: null, text: "No se puede agarrar" };
  const high = row.stunned_required;
  const low = row.stunned_required_min;
  if (high === null || low === null) return verdict(null, null, null);
  const sure = row.players_needed_stunned;
  const best = row.players_needed_stunned_min;
  if (low === high || best === sure) return verdict(high, sure, null);
  if (sure !== null && best !== null) {
    return { tone: "good", players: sure, text: `${integer(best)} a ${integer(sure)} jugadores` };
  }
  if (best !== null) return { tone: "muted", players: null, text: "Sin certeza" };
  return verdict(high, null, null);
}

/** The stunned figure for a card: one number when the sources agree, a range when they do not. */
export function stunnedFigure(row: LiftCheck): string | null {
  const high = row.stunned_required;
  const low = row.stunned_required_min;
  if (high === null || low === null) return null;
  return low === high ? known(row, high) : `${known(row, low)} a ${known(row, high)}`;
}

/**
 * A strength as the player knows it: the one the game shows, 0 without upgrades. The engine compares the internal
 * strength, which starts at the base of every player, so the base is taken off to show it.
 */
export function known(row: LiftCheck, internal: number): string {
  return integer(internal - row.base_strength);
}

/** The strength of the team as the player knows it, from any row of the table (they share the team). */
export function teamStrength(rows: readonly LiftCheck[]): string {
  const first = rows[0];
  return first ? known(first, first.combined) : integer(0);
}
