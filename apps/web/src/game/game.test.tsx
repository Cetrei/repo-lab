import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SaveMenu } from "../components/SaveMenu";
import { GameProvider, useGame } from "./GameProvider";
import { newGame, readGame, readStore, STORE_KEY } from "./saves";

function Probe() {
  const { game, set } = useGame();
  return (
    <button
      type="button"
      onClick={() => {
        set("level", game.level + 1);
      }}
    >{`nivel ${game.level}`}</button>
  );
}

describe("readGame", () => {
  it("keeps valid fields and replaces the rest with defaults", () => {
    const game = readGame({ level: 7, badLuck: -3, team: [3, "x", 500], held: { range: 2, bad: 0 }, wanted: ["strength", 4] });
    expect(game.level).toBe(7);
    expect(game.badLuck).toBe(0);
    expect(game.team).toEqual([3, 0, 0]);
    expect(game.held).toEqual({ range: 2 });
    expect(game.wanted).toEqual(["strength"]);
  });

  it("gives a new game for anything that is not an object", () => {
    expect(readGame(null)).toEqual(newGame());
    expect(readGame("x")).toEqual(newGame());
  });
});

describe("readStore", () => {
  it("starts again from a broken file", () => {
    expect(readStore("{not json").saves).toHaveLength(1);
    expect(readStore(JSON.stringify({ saves: [] })).saves).toHaveLength(1);
  });

  it("falls back to the first game when the active one is gone", () => {
    const store = readStore(JSON.stringify({ activeId: "zz", saves: [{ id: "a", name: "Uno", game: { level: 4 } }] }));
    expect(store.activeId).toBe("a");
    expect(store.saves[0]?.game.level).toBe(4);
  });
});

describe("GameProvider", () => {
  it("writes the game as it changes and reads it back on the next visit", () => {
    const first = render(
      <GameProvider>
        <Probe />
      </GameProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "nivel 1" }));
    expect(JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "{}").saves[0].game.level).toBe(2);
    first.unmount();
    render(
      <GameProvider>
        <Probe />
      </GameProvider>,
    );
    expect(screen.getByRole("button", { name: "nivel 2" })).toBeTruthy();
  });
});

describe("SaveMenu", () => {
  it("keeps several games apart, renames and deletes them", () => {
    render(
      <GameProvider>
        <SaveMenu />
        <Probe />
      </GameProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "nivel 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Partidas guardadas" }));
    fireEvent.click(screen.getByRole("button", { name: "Nueva partida" }));
    // the new game is empty and became the one in play
    expect(screen.getByRole("button", { name: "nivel 1" })).toBeTruthy();
    const menu = screen.getByRole("group", { name: "Partidas" });
    expect(within(menu).getAllByRole("listitem")).toHaveLength(2);
    fireEvent.click(within(menu).getByRole("button", { name: /^Partida 1/ }));
    expect(screen.getByRole("button", { name: "nivel 2" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Partidas guardadas" }));
    fireEvent.click(screen.getByRole("button", { name: "Borrar Partida 2" }));
    expect(within(screen.getByRole("group", { name: "Partidas" })).getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Borrar Partida 1" }).disabled).toBe(true);
  });
});
