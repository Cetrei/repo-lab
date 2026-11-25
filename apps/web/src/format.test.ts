import { describe, expect, it } from "vitest";
import { clamp, decimal, duration, durationRange, integer, percent, signed } from "./format";

describe("percent", () => {
  it("writes a probability with a decimal comma", () => {
    expect(percent(0.125)).toBe("12,5 %");
    expect(percent(0, 1)).toBe("0,0 %");
    expect(percent(1, 0)).toBe("100 %");
  });

  it("never shows a possible event as zero", () => {
    expect(percent(0.00001)).toBe("<0,1 %");
    expect(percent(0.00001, 2)).toBe("<0,01 %");
  });

  it("never shows an uncertain event as certain", () => {
    expect(percent(0.9999)).toBe(">99,9 %");
    expect(percent(0.9999, 0)).toBe(">99 %");
  });
});

describe("numbers and time", () => {
  it("formats integers and decimals in Spanish", () => {
    expect(integer(7)).toBe("7");
    expect(decimal(1.5, 2)).toBe("1,50");
  });

  it("marks a positive margin and leaves a negative one alone", () => {
    expect(signed(3)).toBe("+3");
    expect(signed(0)).toBe("0");
    expect(signed(-2)).toBe("-2");
  });

  it("writes seconds as minutes when it helps", () => {
    expect(duration(45)).toBe("45 s");
    expect(duration(120)).toBe("2 min");
    expect(duration(90)).toBe("1 min 30 s");
  });

  it("collapses a range whose ends are equal", () => {
    expect(durationRange(60, 60)).toBe("1 min");
    expect(durationRange(30, 90)).toBe("30 s a 1 min 30 s");
  });

  it("keeps a value inside its bounds", () => {
    expect(clamp(5, 1, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
});
