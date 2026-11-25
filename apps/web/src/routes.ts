import { BookOpen, Gamepad2, Package, Radar, ShoppingCart, Skull, type LucideIcon } from "lucide-react";
import type { ComponentType } from "react";
import { useSyncExternalStore } from "react";
import { CHANNEL, useChannel, type Channel } from "./channel";
import { CosmeticsView } from "./views/CosmeticsView";
import { MonstersView } from "./views/MonstersView";
import { PartidaView } from "./views/PartidaView";
import { SourcesView } from "./views/SourcesView";
import { SpawningView } from "./views/SpawningView";
import { UpgradesView } from "./views/UpgradesView";

export interface Route {
  id: string;
  label: string;
  icon: LucideIcon;
  view: ComponentType;
}

type Routes = readonly [Route, ...Route[]];

const CAJAS: Route = { id: "cajas", label: "Cajas", icon: Package, view: CosmeticsView };
const MONSTRUOS: Route = { id: "monstruos", label: "Monstruos", icon: Skull, view: MonstersView };
const MEJORAS: Route = { id: "mejoras", label: "Mejoras", icon: ShoppingCart, view: UpgradesView };
const APARICIONES: Route = { id: "apariciones", label: "Apariciones", icon: Radar, view: SpawningView };
const FUENTES: Route = { id: "fuentes", label: "Fuentes", icon: BookOpen, view: SourcesView };

/** The one view of the test channel, which holds what the stable tabs of boxes, monsters and spawning show apart. */
const PARTIDA: Route = { id: "partida", label: "Partida", icon: Gamepad2, view: PartidaView };

/** The tabs of a channel. The test channel swaps the boxes, monsters and spawning tabs for the single Partida view. */
export function routesFor(channel: Channel): Routes {
  if (channel === "next") return [PARTIDA, MEJORAS, FUENTES];
  return [CAJAS, MONSTRUOS, MEJORAS, APARICIONES, FUENTES];
}

export const ROUTES: Routes = routesFor(CHANNEL);

/** The route a location hash points to, `#/mejoras` for example. Anything else is the first route. */
export function routeFromHash(hash: string, routes: Routes = ROUTES): Route {
  const id = hash.replace(/^#\/?/, "");
  return routes.find((route) => route.id === id) ?? routes[0];
}

function subscribe(listener: () => void): () => void {
  window.addEventListener("hashchange", listener);
  return () => {
    window.removeEventListener("hashchange", listener);
  };
}

export function useRoute(): Route {
  const routes = routesFor(useChannel());
  const id = useSyncExternalStore(subscribe, () => routeFromHash(window.location.hash, routes).id);
  return routes.find((route) => route.id === id) ?? routes[0];
}
