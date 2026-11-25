import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { newSave, readStore, STORE_KEY, type Game, type Save, type SaveStore } from "./saves";

type Storage_ = Pick<Storage, "getItem" | "setItem">;

interface GameApi {
  game: Game;
  saves: readonly Save[];
  activeId: string;
  set<K extends keyof Game>(key: K, value: Game[K]): void;
  select(id: string): void;
  create(): void;
  rename(id: string, name: string): void;
  remove(id: string): void;
}

const GameContext = createContext<GameApi | null>(null);

/** The browser storage, or null where it is blocked (private windows, strict settings). */
function browserStorage(): Storage_ | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * The games of the player and the one in play. Saving is the browser's own storage, because the site is static and
 * has no server: nothing leaves the device, and each browser keeps its own games. Every change to the game in play
 * is written at once, so closing the tab never loses a level or a team.
 */
export function GameProvider({ children, storage = browserStorage() }: { children: ReactNode; storage?: Storage_ | null }) {
  const [store, setStore] = useState<SaveStore>(() => {
    try {
      return readStore(storage?.getItem(STORE_KEY) ?? null);
    } catch {
      return readStore(null);
    }
  });

  useEffect(() => {
    try {
      storage?.setItem(STORE_KEY, JSON.stringify(store));
    } catch {
      // A full or blocked storage only means the game is not kept, the calculators still work.
    }
  }, [store, storage]);

  const set = useCallback(<K extends keyof Game>(key: K, value: Game[K]) => {
    setStore((current) => ({
      ...current,
      saves: current.saves.map((save) =>
        save.id === current.activeId ? { ...save, savedAt: Date.now(), game: { ...save.game, [key]: value } } : save,
      ),
    }));
  }, []);

  const select = useCallback((id: string) => {
    setStore((current) => (current.saves.some((save) => save.id === id) ? { ...current, activeId: id } : current));
  }, []);

  const create = useCallback(() => {
    setStore((current) => {
      const save = newSave(current.saves);
      return { activeId: save.id, saves: [...current.saves, save] };
    });
  }, []);

  const rename = useCallback((id: string, name: string) => {
    const clean = name.trim().slice(0, 40);
    if (clean === "") return;
    setStore((current) => ({
      ...current,
      saves: current.saves.map((save) => (save.id === id ? { ...save, name: clean } : save)),
    }));
  }, []);

  const remove = useCallback((id: string) => {
    setStore((current) => {
      if (current.saves.length <= 1) return current;
      const saves = current.saves.filter((save) => save.id !== id);
      const active = saves.find((save) => save.id === current.activeId) ?? saves[0];
      return active ? { activeId: active.id, saves } : current;
    });
  }, []);

  const value = useMemo<GameApi>(() => {
    const active = store.saves.find((save) => save.id === store.activeId) ?? store.saves[0];
    if (!active) throw new Error("the store always holds a game");
    return { game: active.game, saves: store.saves, activeId: active.id, set, select, create, rename, remove };
  }, [store, set, select, create, rename, remove]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameApi {
  const api = useContext(GameContext);
  if (!api) throw new Error("useGame needs a GameProvider above it");
  return api;
}

/** One field of the game in play, shaped like `useState` so a view reads and writes it the same way. */
export function useGameField<K extends keyof Game>(key: K): [Game[K], (value: Game[K]) => void] {
  const { game, set } = useGame();
  const setter = useCallback(
    (value: Game[K]) => {
      set(key, value);
    },
    [set, key],
  );
  return [game[key], setter];
}
