interface SegmentBarProps {
  /** Accessible name of the whole bar. */
  label: string;
  value: number;
  segments: number;
  onChange(value: number): void;
  /** The accessible name of the segment that sets the count to `count`. */
  segmentLabel(count: number): string;
  className?: string;
}

/**
 * A count drawn as a row of segments. Press a segment to set the count to its position, press the last lit one
 * again to lower the count by one. It is the quick way to set a small number that has a ceiling past which
 * nothing changes: bad luck in the boxes, strength upgrades in the team.
 */
export function SegmentBar({ label, value, segments, onChange, segmentLabel, className }: SegmentBarProps) {
  return (
    <div
      className={className ? `segbar ${className}` : "segbar"}
      data-full={value >= segments}
      role="group"
      aria-label={label}
      style={{ gridTemplateColumns: `repeat(${segments}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: segments }, (_, index) => {
        const lit = index < value;
        return (
          <button
            key={index}
            type="button"
            className="segbar__seg"
            data-lit={lit}
            aria-pressed={lit}
            aria-label={segmentLabel(index + 1)}
            onClick={() => {
              onChange(value === index + 1 ? index : index + 1);
            }}
          />
        );
      })}
    </div>
  );
}
