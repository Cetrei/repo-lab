import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { NumberField } from "./NumberField";

function Harness({ emitted }: { emitted: number[] }) {
  const [value, setValue] = useState(5);
  return (
    <NumberField
      label="Nivel"
      value={value}
      min={1}
      max={10}
      onChange={(next) => {
        emitted.push(next);
        setValue(next);
      }}
    />
  );
}

function field(): HTMLInputElement {
  return screen.getByLabelText("Nivel");
}

describe("NumberField", () => {
  it("steps with its buttons", () => {
    const emitted: number[] = [];
    render(<Harness emitted={emitted} />);
    fireEvent.click(screen.getByRole("button", { name: "Sumar a Nivel" }));
    fireEvent.click(screen.getByRole("button", { name: "Restar a Nivel" }));
    fireEvent.click(screen.getByRole("button", { name: "Restar a Nivel" }));
    expect(emitted).toEqual([6, 5, 4]);
    expect(field().value).toBe("4");
  });

  it("disables the button that would leave the range", () => {
    render(<Harness emitted={[]} />);
    fireEvent.change(field(), { target: { value: "1" } });
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Restar a Nivel" }).disabled).toBe(true);
    fireEvent.change(field(), { target: { value: "10" } });
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Sumar a Nivel" }).disabled).toBe(true);
  });

  it("passes on a valid number as it is typed", () => {
    const emitted: number[] = [];
    render(<Harness emitted={emitted} />);
    fireEvent.change(field(), { target: { value: "7" } });
    expect(emitted).toEqual([7]);
    expect(field().getAttribute("aria-invalid")).toBe("false");
  });

  it.each(["", "99", "0", "2.5", "abc"])("flags %j and never passes it on", (typed) => {
    const emitted: number[] = [];
    render(<Harness emitted={emitted} />);
    fireEvent.change(field(), { target: { value: typed } });
    expect(emitted).toEqual([]);
    expect(field().getAttribute("aria-invalid")).toBe("true");
  });

  it("goes back to the last valid number when the field is left invalid", () => {
    render(<Harness emitted={[]} />);
    fireEvent.change(field(), { target: { value: "99" } });
    fireEvent.blur(field());
    expect(field().value).toBe("5");
    expect(field().getAttribute("aria-invalid")).toBe("false");
  });

  it("can be disabled as a whole", () => {
    render(<NumberField label="Nivel" value={3} min={1} max={5} onChange={() => undefined} disabled />);
    expect(field().disabled).toBe(true);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Sumar a Nivel" }).disabled).toBe(true);
  });
});
