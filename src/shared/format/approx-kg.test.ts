import { describe, expect, it } from "vitest";
import { approxKgText, isCageUnitName, kgPerCageOfUnit } from "./approx-kg";

describe("approxKgText", () => {
  it("converts cages to approximate kg", () => expect(approxKgText(9, 50)).toBe("≈ 450 kg"));
  it("is empty without a usable factor or count", () => {
    expect(approxKgText(9, null)).toBeUndefined();
    expect(approxKgText(0, 50)).toBeUndefined();
    expect(approxKgText(Number.NaN, 50)).toBeUndefined();
  });
  it("recognises the cage unit", () => {
    expect(isCageUnitName("Lồng")).toBe(true);
    expect(isCageUnitName("kg")).toBe(false);
    expect(kgPerCageOfUnit({ name: "Lồng", factor: 50 })).toBe(50);
    expect(kgPerCageOfUnit({ name: "Lồng", factor: 1 })).toBeUndefined();
  });
});
