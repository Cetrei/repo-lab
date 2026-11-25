import type { ReactNode } from "react";
import { NumberField } from "./NumberField";
import { SegmentBar } from "./SegmentBar";

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
    <div className="luck">
      <NumberField label={label} variant="compact" value={value} min={0} max={max} onChange={onChange} />
      <SegmentBar
        label="Niveles seguidos sin caja"
        value={value}
        segments={SEGMENTS}
        onChange={onChange}
        segmentLabel={(count) => `${count} ${count === 1 ? "nivel" : "niveles"} sin caja`}
      />
      {children ? <p className="luck__note">{children}</p> : null}
    </div>
  );
}
