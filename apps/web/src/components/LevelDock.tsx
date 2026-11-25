import { LIMITS } from "../game/saves";
import { useGameField } from "../game/GameProvider";
import { NumberField } from "./NumberField";

/**
 * The level of the game in play, always in reach. It floats in the corner so every page reads the same level and
 * changing it anywhere changes it everywhere. It keeps the level plate of the game.
 */
export function LevelDock() {
  const [level, setLevel] = useGameField("level");
  return (
    <aside className="dock" aria-label="Nivel de la partida">
      <NumberField label="Nivel" variant="sign" value={level} min={LIMITS.level.min} max={LIMITS.level.max} onChange={setLevel} />
    </aside>
  );
}
