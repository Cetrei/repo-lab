import { Check, Wrench } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useCall } from "../hooks/useCall";

interface PatchState {
  /** The ruleset the player picked, or "" while the default one stands. */
  id: string;
  choose(id: string): void;
}

const PatchContext = createContext<PatchState>({ id: "", choose: () => undefined });

/**
 * The game patch the numbers follow. It lives above every view so one choice in the corner of the page
 * applies wherever the rules depend on the patch, today the cosmetic boxes.
 */
export function PatchProvider({ children }: { children: ReactNode }) {
  const [id, choose] = useState("");
  const value = useMemo(() => ({ id, choose }), [id]);
  return <PatchContext.Provider value={value}>{children}</PatchContext.Provider>;
}

export function usePatch(): PatchState {
  return useContext(PatchContext);
}

/** The request fragment that selects the patch, empty while the default one stands. */
export function patchRequest(id: string): { ruleset?: string } {
  return id === "" ? {} : { ruleset: id };
}

/**
 * The patch picker, as small as it can be: one wrench in the header corner. The patch in force and the other
 * options only show when the wrench is pressed, and the list closes on a choice, Escape or a click elsewhere.
 */
export function PatchSelector() {
  const { id, choose } = usePatch();
  const rulesets = useCall("cosmetics.rulesets", undefined);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const data = rulesets.data;
  if (!data) return null;
  const current = id === "" ? data.default : id;

  return (
    <div className="patch" ref={root}>
      <button
        type="button"
        className="info"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Parche del juego"
        title="Parche del juego"
        onClick={() => {
          setOpen(!open);
        }}
      >
        <Wrench aria-hidden size={18} />
      </button>
      {open ? (
        <ul className="patch__menu" role="listbox" aria-label="Parche">
          {data.rulesets.map((ruleset) => (
            <li key={ruleset.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={ruleset.id === current}
                title={ruleset.note || undefined}
                onClick={() => {
                  choose(ruleset.id);
                  setOpen(false);
                }}
              >
                <span>{ruleset.label}</span>
                {ruleset.id === current ? <Check aria-hidden size={16} /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
