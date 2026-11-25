import { Droplet } from "lucide-react";
import type { CSSProperties } from "react";
import { integer } from "../format";

/** One bar segment is worth this much health, so a 250 monster is two full segments and a half one. */
export const HEALTH_PER_SEGMENT = 100;

/**
 * The health of a monster as bars of 100 each, with the number next to them. A monster that cannot be grabbed and
 * takes health from a player (the Tick) has no health of its own: `drain` draws the most it can take, with a drop
 * so it is not read as its health. With neither figure the row stays empty but keeps its height, so every tile of
 * a board is the same size.
 */
export function HealthBar({ health, drain = null }: { health: number | null; drain?: number | null }) {
  const amount = health ?? drain;
  if (amount === null) return <span className="hp hp--empty" aria-hidden />;
  const segments = Math.max(1, Math.ceil(amount / HEALTH_PER_SEGMENT));
  const draining = health === null;
  return (
    <span
      className="hp"
      data-drain={draining}
      role="img"
      aria-label={draining ? `Drena hasta ${integer(amount)} de vida` : `Vida ${integer(amount)}`}
    >
      <span className="hp__bar" aria-hidden style={{ gridTemplateColumns: `repeat(${segments}, minmax(0, 1fr))` }}>
        {Array.from({ length: segments }, (_, index) => {
          const fill = Math.min(HEALTH_PER_SEGMENT, amount - index * HEALTH_PER_SEGMENT) / HEALTH_PER_SEGMENT;
          return <span key={index} className="hp__seg" style={{ "--fill": fill } as CSSProperties} />;
        })}
      </span>
      <span className="hp__num num" aria-hidden>
        {draining ? <Droplet size={12} /> : null}
        {integer(amount)}
      </span>
    </span>
  );
}
