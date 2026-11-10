import { describe, expect, it } from "vitest";
import {
  approxCagesLabel,
  cagesFromKg,
  formatCageAndKg,
  formatCageAndKgLine,
  formatCages,
} from "./cage-quantity";

describe("cagesFromKg", () => {
  it("divides kg by the ratio", () => expect(cagesFromKg(180, 50)).toBeCloseTo(3.6));
  it.each([
    [100, 0],
    [100, undefined],
    [100, null],
    [100, Number.NaN],
    [-1, 50],
    [undefined, 50],
    [Number.POSITIVE_INFINITY, 50],
  ])("returns undefined for kg=%s ratio=%s", (kg, ratio) => expect(cagesFromKg(kg, ratio)).toBeUndefined());
});

describe("formatCages", () => {
  it("shows exact counts without approximation", () => expect(formatCages(12)).toBe("12 lồng"));
  it("groups thousands in vi-VN", () => expect(formatCages(1234)).toBe("1.234 lồng"));
  it("marks derived numbers and keeps one decimal", () => {
    expect(formatCages(3.6, { approx: true })).toBe("≈ 3,6 lồng");
    expect(formatCages(3.666, { approx: true })).toBe("≈ 3,7 lồng");
  });
});

describe("formatCageAndKg", () => {
  it("preserves three decimal places of kg like the sales quantity formatter", () =>
    expect(formatCageAndKg({ kg: 180.125 })).toEqual({ primary: "180,125 kg" }));
  it("leads with exact cages and shows kg as approximate", () =>
    expect(formatCageAndKg({ cages: 12, kg: 600 })).toEqual({ primary: "12 lồng", secondary: "≈ 600 kg" }));
  it("derives kg from the ratio when only cages are known", () =>
    expect(formatCageAndKg({ cages: 4, kgPerCage: 50 })).toEqual({ primary: "4 lồng", secondary: "≈ 200 kg" }));
  it("converts kg to approximate cages and keeps exact kg", () =>
    expect(formatCageAndKg({ kg: 180, kgPerCage: 50 })).toEqual({ primary: "≈ 3,6 lồng", secondary: "180 kg" }));
  it("falls back to kg alone without a ratio", () =>
    expect(formatCageAndKg({ kg: 180 })).toEqual({ primary: "180 kg" }));
  it("shows a dash with no data", () => expect(formatCageAndKg({})).toEqual({ primary: "—" }));
  it("renders one line", () => {
    expect(formatCageAndKgLine({ kg: 180, kgPerCage: 50 })).toBe("≈ 3,6 lồng · 180 kg");
    expect(formatCageAndKgLine({ kg: 180 })).toBe("180 kg");
  });
});

it("approxCagesLabel is undefined without ratio", () => {
  expect(approxCagesLabel(100, undefined)).toBeUndefined();
  expect(approxCagesLabel(100, 50)).toBe("≈ 2 lồng");
});
