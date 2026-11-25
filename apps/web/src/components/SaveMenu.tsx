import { Check, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useGame } from "../game/GameProvider";

/**
 * The saved games, as small as the patch picker: one icon in the header corner. The list opens on a press and
 * closes on a choice of game, Escape or a click elsewhere. Each row switches to that game, renames it or deletes it.
 */
export function SaveMenu() {
  const { saves, activeId, select, create, rename, remove } = useGame();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setEditing(null);
      }
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div className="patch saves" ref={root}>
      <button
        type="button"
        className="info"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Partidas guardadas"
        title="Partidas guardadas"
        onClick={() => {
          setOpen(!open);
        }}
      >
        <Save aria-hidden size={18} />
      </button>
      {open ? (
        <div className="patch__menu saves__menu" role="group" aria-label="Partidas">
          <ul className="saves__list">
            {saves.map((save) => (
              <li key={save.id} className="saves__row" data-active={save.id === activeId}>
                {editing === save.id ? (
                  <form
                    className="saves__edit"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const input = event.currentTarget.elements.namedItem("name");
                      if (input instanceof HTMLInputElement) rename(save.id, input.value);
                      setEditing(null);
                    }}
                  >
                    <input
                      name="name"
                      defaultValue={save.name}
                      maxLength={40}
                      autoFocus
                      aria-label="Nombre de la partida"
                      onBlur={(event) => {
                        rename(save.id, event.currentTarget.value);
                        setEditing(null);
                      }}
                    />
                  </form>
                ) : (
                  <>
                    <button
                      type="button"
                      className="saves__pick"
                      aria-pressed={save.id === activeId}
                      onClick={() => {
                        select(save.id);
                        setOpen(false);
                      }}
                    >
                      {save.id === activeId ? <Check aria-hidden size={16} /> : <span className="saves__gap" aria-hidden />}
                      <span className="saves__name">{save.name}</span>
                      <b className="num saves__level" title="Nivel">{save.game.level}</b>
                    </button>
                    <button
                      type="button"
                      className="saves__tool"
                      aria-label={`Renombrar ${save.name}`}
                      title="Renombrar"
                      onClick={() => {
                        setEditing(save.id);
                      }}
                    >
                      <Pencil aria-hidden size={14} />
                    </button>
                    <button
                      type="button"
                      className="saves__tool"
                      aria-label={`Borrar ${save.name}`}
                      title="Borrar"
                      disabled={saves.length <= 1}
                      onClick={() => {
                        remove(save.id);
                      }}
                    >
                      <Trash2 aria-hidden size={14} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          <button type="button" className="saves__new" onClick={create}>
            <Plus aria-hidden size={16} />
            Nueva partida
          </button>
        </div>
      ) : null}
    </div>
  );
}
