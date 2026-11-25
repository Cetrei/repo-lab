import { useEffect } from "react";
import { EngineStatus, useEngineToasts } from "./components/EngineStatus";
import { GlyphTile } from "./icons";
import { ROUTES, useRoute } from "./routes";

export function App() {
  const route = useRoute();
  const View = route.view;
  useEngineToasts();

  useEffect(() => {
    document.title = route.id === ROUTES[0].id ? "REPO Lab" : `${route.label} | REPO Lab`;
  }, [route]);

  return (
    <>
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
          <EngineStatus />
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
    </>
  );
}
