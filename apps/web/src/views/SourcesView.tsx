import { Outcome, Panel, SourceList } from "../components/ui";
import { useCall } from "../hooks/useCall";

const GROUPS = [
  ["cosmetics", "Cajas cosméticas"],
  ["monsters", "Fuerza por monstruo"],
  ["upgrades", "Mejoras de la tienda"],
  ["spawning", "Aparición de enemigos"],
] as const;

export function SourcesView() {
  const sources = useCall("meta.sources", undefined);
  return (
    <div className="stack">
      <Panel
        title="De dónde salen los números"
        hint="Cada cifra vive en un archivo YAML de la carpeta data del repositorio, con su fuente. Los datos no se actualizan solos: si el juego cambia una regla, hay que editar el archivo."
      >
        <Outcome result={sources}>
          {(data) => (
            <div className="stack">
              {GROUPS.map(([key, title]) => (
                <section key={key}>
                  <h3>{title}</h3>
                  <SourceList items={data[key]} />
                </section>
              ))}
            </div>
          )}
        </Outcome>
      </Panel>
      <Panel
        title="Arte del juego"
        hint="Las imágenes de monstruos y mejoras son arte de R.E.P.O., tomado de la wiki de la comunidad. Pertenece a sus autores y aquí solo sirve para reconocer cada entrada."
      >
        <p>
          <a href="https://repo-2025horror.fandom.com" target="_blank" rel="noreferrer">
            R.E.P.O. Wiki en Fandom
          </a>
          . Cada archivo apunta a su página de origen en icons/manifest.json, y scripts/fetch_icons.py vuelve a descargarlos.
        </p>
      </Panel>
    </div>
  );
}
