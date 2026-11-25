import { BookOpen, Package, Radar, ShoppingCart, Skull, type LucideIcon } from "lucide-react";
import type { ComponentType } from "react";
import { useSyncExternalStore } from "react";
import { CosmeticsView } from "./views/CosmeticsView";
import { MonstersView } from "./views/MonstersView";
import { SourcesView } from "./views/SourcesView";
import { SpawningView } from "./views/SpawningView";
import { UpgradesView } from "./views/UpgradesView";

export interface Route {
  id: string;
  label: string;
  icon: LucideIcon;
  view: ComponentType;
}

export const ROUTES: readonly [Route, ...Route[]] = [
  { id: "cajas", label: "Cajas", icon: Package, view: CosmeticsView },
  { id: "monstruos", label: "Monstruos", icon: Skull, view: MonstersView },
  { id: "mejoras", label: "Mejoras", icon: ShoppingCart, view: UpgradesView },
  { id: "apariciones", label: "Apariciones", icon: Radar, view: SpawningView },
  { id: "fuentes", label: "Fuentes", icon: BookOpen, view: SourcesView },
];

/** The route a location hash points to, `#/mejoras` for example. Anything else is the first route. */
export function routeFromHash(hash: string): Route {
  const id = hash.replace(/^#\/?/, "");
  return ROUTES.find((route) => route.id === id) ?? ROUTES[0];
}

function subscribe(listener: () => void): () => void {
  window.addEventListener("hashchange", listener);
  return () => {
    window.removeEventListener("hashchange", listener);
  };
}

export function useRoute(): Route {
  const id = useSyncExternalStore(subscribe, () => routeFromHash(window.location.hash).id);
  return ROUTES.find((route) => route.id === id) ?? ROUTES[0];
}
