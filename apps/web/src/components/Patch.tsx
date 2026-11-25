import { Wrench } from "lucide-react";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
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

/** A compact patch picker for the corner of the header. With a single patch it only says which one the numbers follow. */
export function PatchSelector() {
  const { id, choose } = usePatch();
  const rulesets = useCall("cosmetics.rulesets", undefined);
  const data = rulesets.data;
  if (!data) return null;
  const current = id === "" ? data.default : id;
  const note = data.rulesets.find((ruleset) => ruleset.id === current)?.note;
  return (
    <div className="patch">
      <label htmlFor="patch">
        <Wrench aria-hidden size={16} />
        Parche
      </label>
      <select
        id="patch"
        className="select"
        value={current}
        disabled={data.rulesets.length < 2}
        title={note || undefined}
        onChange={(event) => {
          choose(event.target.value);
        }}
      >
        {data.rulesets.map((ruleset) => (
          <option key={ruleset.id} value={ruleset.id}>
            {ruleset.label}
          </option>
        ))}
      </select>
    </div>
  );
}
