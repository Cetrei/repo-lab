import type { CSSProperties } from "react";
import { integer } from "../format";

/** One bar segment is worth this much health, so a 250 monster is two full segments and a half one. */
export const HEALTH_PER_SEGMENT = 100;

/** The health of a monster as bars of 100 each, with the number next to them. */
export function HealthBar({ health }: { health: number | null }) {
  if (health === null) return null;
  const segments = Math.max(1, Math.ceil(health / HEALTH_PER_SEGMENT));
  return (
    <span className="hp" role="img" aria-label={`Vida ${integer(health)}`}>
      <span className="hp__bar" aria-hidden style={{ gridTemplateColumns: `repeat(${segments}, minmax(0, 1fr))` }}>
        {Array.from({ length: segments }, (_, index) => {
          const fill = Math.min(HEALTH_PER_SEGMENT, health - index * HEALTH_PER_SEGMENT) / HEALTH_PER_SEGMENT;
          return <span key={index} className="hp__seg" style={{ "--fill": fill } as CSSProperties} />;
        })}
      </span>
      <span className="hp__num num" aria-hidden>
        {integer(health)}
      </span>
    </span>
  );
}
