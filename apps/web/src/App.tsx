import { useEffect } from "react";
import { EngineStatus, useEngineToasts } from "./components/EngineStatus";
import { LevelDock } from "./components/LevelDock";
import { PatchProvider, PatchSelector } from "./components/Patch";
import { SaveMenu } from "./components/SaveMenu";
import { Splash } from "./components/Splash";
import { useEngineState } from "./engine/EngineProvider";
import { GameProvider } from "./game/GameProvider";
import { GlyphTile } from "./icons";
import { ROUTES, useRoute } from "./routes";

export function App() {
  const route = useRoute();
  const View = route.view;
  useEngineToasts();
  const { phase } = useEngineState();

  useEffect(() => {
    document.title = route.id === ROUTES[0].id ? "REPO Lab" : `${route.label} | REPO Lab`;
  }, [route]);

  // The calculators wait for Python, so they never show a half loaded page.
  if (phase === "loading") return <Splash />;

  return (
    <GameProvider>
      <PatchProvider>
      <div className="hazard" aria-hidden />
      <div className="shell">
        <header className="header">
          <div className="brand">
            <h1>REPO Lab</h1>
            <p>Calculadoras para R.E.P.O.: cajas, monstruos, mejoras y apariciones.</p>
          </div>
          <div className="squad" aria-hidden>
            {["gnome", "reaper", "apex-predator"].map((id) => (
              <GlyphTile key={id} kind="monster" id={id} size={56} />
            ))}
          </div>
          <div className="corner">
            <div className="corner__tools">
              <SaveMenu />
              <PatchSelector />
            </div>
            <EngineStatus />
          </div>
        </header>
        <nav className="tabs" aria-label="Calculadoras">
          {ROUTES.map((item) => (
            <a
              key={item.id}
              className="tab"
              href={`#/${item.id}`}
              aria-current={item.id === route.id ? "page" : undefined}
            >
              <item.icon aria-hidden size={18} />
              {item.label}
            </a>
          ))}
        </nav>
        <main>
          <View />
        </main>
        <footer className="footer">
          Proyecto de la comunidad, sin relación con los creadores de R.E.P.O. Los cálculos corren en tu navegador.
        </footer>
      </div>
      <LevelDock />
      </PatchProvider>
    </GameProvider>
  );
}
