import { Minus, Plus } from "lucide-react";
import { useId, useState } from "react";
import { clamp } from "../format";

interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange(value: number): void;
  hint?: string;
  step?: number;
  disabled?: boolean;
}

function parse(text: string, min: number, max: number): number | null {
  if (text.trim() === "") return null;
  const value = Number(text);
  return Number.isInteger(value) && value >= min && value <= max ? value : null;
}

/**
 * A whole number with minus and plus buttons. Typing is free: a value outside the range is flagged and the
 * last valid number stays in force, so nothing invalid ever reaches the engine.
 * States: default, hover and active (border and fill), focus (ring), invalid (red), disabled (greyed).
 */
export function NumberField({ label, value, min, max, onChange, hint, step = 1, disabled }: NumberFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? String(value);
  const invalid = draft !== null && parse(draft, min, max) === null;

  const move = (delta: number) => {
    setDraft(null);
    onChange(clamp(value + delta, min, max));
  };

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="stepper">
        <button
          type="button"
          className="btn"
          aria-label={`Restar a ${label}`}
          disabled={disabled || value <= min}
          onClick={() => {
            move(-step);
          }}
        >
          <Minus aria-hidden size={16} />
        </button>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={text}
          disabled={disabled}
          aria-invalid={invalid}
          aria-describedby={hint ? hintId : undefined}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            const parsed = parse(next, min, max);
            if (parsed !== null) onChange(parsed);
          }}
          onBlur={() => {
            setDraft(null);
          }}
        />
        <button
          type="button"
          className="btn"
          aria-label={`Sumar a ${label}`}
          disabled={disabled || value >= max}
          onClick={() => {
            move(step);
          }}
        >
          <Plus aria-hidden size={16} />
        </button>
      </div>
      {hint ? (
        <p id={hintId} className="hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
