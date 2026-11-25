import type { LiftCheck } from "@repo-lab/contract";
import { integer } from "./format";

export type Verdict = {
  /** `good` lifts it, `bad` cannot yet, `muted` there is no figure for it. */
  tone: "good" | "bad" | "muted";
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

export function stunVerdict(row: LiftCheck): Verdict {
  return verdict(row.stunned_required, row.players_needed_stunned, null);
}
