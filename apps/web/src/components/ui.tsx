import { Info, Loader, TriangleAlert } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { CallResult, Failure } from "../hooks/useCall";

/** A titled block of a view. */
export function Panel({
  title,
  hint,
  className,
  children,
}: {
  title: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={className ? `panel ${className}` : "panel"}>
      <header>
        <h2>{title}</h2>
        {hint ? <p>{hint}</p> : null}
      </header>
      {children}
    </section>
  );
}

export function Stats({ children }: { children: ReactNode }) {
  return <dl className="stats">{children}</dl>;
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "good" | "bad" }) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd className={tone === undefined ? "num" : `num ${tone}`}>{value}</dd>
    </div>
  );
}

type Rarity = "common" | "uncommon" | "rare" | "ultra";

/** A probability bar with its number next to it, so the bar never carries the meaning alone. */
export function Meter({ value, text, rarity }: { value: number; text: string; rarity?: Rarity }) {
  const style = { "--value": Math.min(1, Math.max(0, value)) } as CSSProperties;
  return (
    <div className="meter" data-rarity={rarity} style={style}>
      <span className="meter__track" aria-hidden>
        <span className="meter__fill" />
      </span>
      <span className="num">{text}</span>
    </div>
  );
}

export function Notice({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "error";
  title: string;
  children?: ReactNode;
}) {
  const Icon = tone === "error" ? TriangleAlert : Info;
  return (
    <div className="notice" data-tone={tone} role={tone === "error" ? "alert" : "note"}>
      <Icon aria-hidden size={20} />
      <div>
        <strong>{title}</strong>
        {children ? <p className="muted">{children}</p> : null}
      </div>
    </div>
  );
}

export function FailureNotice({ failure }: { failure: Failure }) {
  const program = failure.code === "engine" || failure.code === "contract";
  return (
    <Notice tone="error" title={program ? "No se pudo calcular" : "Esos valores no son válidos"}>
      {failure.message}
    </Notice>
  );
}

/** Shows the answer when there is one, the failure when there is not, and a quiet loading line before the first answer. */
export function Outcome<T>({
  result,
  children,
}: {
  result: CallResult<T>;
  children: (data: T) => ReactNode;
}) {
  if (result.error) return <FailureNotice failure={result.error} />;
  if (result.data === undefined) {
    return (
      <p className="loading" role="status">
        <Loader aria-hidden size={16} className="spin" /> Calculando
      </p>
    );
  }
  return (
    <div className="outcome" data-pending={result.pending} aria-busy={result.pending}>
      {children(result.data)}
    </div>
  );
}

export function SourceList({ items }: { items: readonly { name: string; url: string; note: string }[] }) {
  return (
    <ul className="sources">
      {items.map((item) => (
        <li key={`${item.name}-${item.url}`}>
          <strong>
            {item.url ? (
              <a href={item.url} target="_blank" rel="noreferrer">
                {item.name}
              </a>
            ) : (
              item.name
            )}
          </strong>
          {item.note ? `. ${item.note}` : ""}
        </li>
      ))}
    </ul>
  );
}
