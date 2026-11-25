import { useState } from "react";
import { GlyphTile, PlayerHead, shuffledHues } from "../icons";
import { NumberField } from "./NumberField";
import { SegmentBar } from "./SegmentBar";

/**
 * The players of the game and the Strength upgrades of each one. The count of players is a stepper, every player
 * is a head with a bar of segments that ends at `cap`, the most upgrades that still change anything.
 */
export function TeamEditor({
  team,
  maxPlayers,
  cap,
  onChange,
  headSize = 40,
}: {
  team: readonly number[];
  maxPlayers: number;
  cap: number;
  onChange(next: number[]): void;
  headSize?: number;
}) {
  const [hues] = useState(shuffledHues);
  const resize = (count: number) => {
    onChange(Array.from({ length: count }, (_, index) => team[index] ?? 0));
  };
  return (
    <>
      <NumberField label="Jugadores" value={team.length} min={1} max={maxPlayers} onChange={resize} />
      <ul className="lobby" aria-label="Tu equipo">
        {team.map((value, index) => (
          // The position is the identity: players have no name and the list only grows or shrinks at the end.
          <li key={index} className="lobby__row">
            <PlayerHead hue={hues[index % hues.length] ?? 0} size={headSize} />
            <GlyphTile kind="upgrade" id="strength" size={Math.round(headSize * 0.8)} />
            <SegmentBar
              className="lobby__bar"
              label={`Mejoras de Fuerza del jugador ${index + 1}`}
              value={Math.min(value, cap)}
              segments={cap}
              onChange={(next) => {
                onChange(team.map((current, at) => (at === index ? next : current)));
              }}
              segmentLabel={(count) => `Jugador ${index + 1}: ${count} ${count === 1 ? "mejora" : "mejoras"} de Fuerza`}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
