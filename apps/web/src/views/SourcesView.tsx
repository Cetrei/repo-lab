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
    </div>
  );
}
