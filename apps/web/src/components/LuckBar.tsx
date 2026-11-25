import type { ReactNode } from "react";
import { NumberField } from "./NumberField";

/** Levels shown on the bar. Each dry level adds the same bonus, so a full bar means the box is all but sure. */
const SEGMENTS = 5;

interface LuckBarProps {
  label: string;
  value: number;
  max: number;
  onChange(value: number): void;
  /** What the count is doing to the odds right now, shown under the bar. */
  children?: ReactNode;
}

/**
 * The count of levels in a row that ended without a box. The bar is the quick way to set it (press a segment,
 * press the last lit one again to lower it) and the stepper above takes any exact number.
 */
export function LuckBar({ label, value, max, onChange, children }: LuckBarProps) {
  return (
    <div className="luck" data-full={value >= SEGMENTS}>
      <NumberField label={label} variant="compact" value={value} min={0} max={max} onChange={onChange} />
      <div className="luck__bar" role="group" aria-label="Niveles seguidos sin caja">
        {Array.from({ length: SEGMENTS }, (_, index) => {
          const lit = index < value;
          return (
            <button
              key={index}
              type="button"
              className="luck__seg"
              data-lit={lit}
              aria-pressed={lit}
              aria-label={`${index + 1} ${index === 0 ? "nivel" : "niveles"} sin caja`}
              onClick={() => {
                onChange(value === index + 1 ? index : index + 1);
              }}
            />
          );
        })}
      </div>
      {children ? <p className="luck__note">{children}</p> : null}
    </div>
  );
}
