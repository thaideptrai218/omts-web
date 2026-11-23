import { describe, expect, it } from "vitest";
import { cagesWithEstimate, kgToWholeCages, resolveQuantityInput } from "./cage-request-quantity";

describe("kgToWholeCages", () => {
  it("rounds to the nearest whole cage with a minimum of one", () => {
    expect(kgToWholeCages(600, 50)).toBe(12);
    expect(kgToWholeCages(620, 50)).toBe(12); // 12,4
    expect(kgToWholeCages(630, 50)).toBe(13); // 12,6
    expect(kgToWholeCages(5, 50)).toBe(1); // 0,1 -> 1
  });
  it("is undefined without a usable ratio or kg", () => {
    for (const ratio of [undefined, null, 0, -1, Number.NaN]) expect(kgToWholeCages(100, ratio)).toBeUndefined();
    expect(kgToWholeCages(0, 50)).toBeUndefined();
    expect(kgToWholeCages(1e15, 0.001)).toBeUndefined();
  });
});

describe("cagesWithEstimate", () => {
  it("adds an estimated kg only when the ratio is known", () => {
    expect(cagesWithEstimate(12, 50)).toBe("12 lồng · ≈ 600 kg (ước tính)");
    expect(cagesWithEstimate(12, 47.5)).toBe("12 lồng · ≈ 570 kg (ước tính)");
    expect(cagesWithEstimate(12, undefined)).toBe("12 lồng");
  });
});

describe("resolveQuantityInput", () => {
  it("reads cages as whole numbers and previews the estimated kg", () => {
    expect(resolveQuantityInput("cages", "12", 50)).toEqual({ cages: 12, preview: "≈ 600 kg (ước tính)" });
    expect(resolveQuantityInput("cages", "12", undefined)).toEqual({ cages: 12, preview: undefined });
    for (const bad of ["0", "1,5", "-2", "abc", "99999999999"]) expect(resolveQuantityInput("cages", bad, 50).error).toBeTruthy();
  });
  it("converts typed kg to cages both ways with a live preview", () => {
    expect(resolveQuantityInput("kg", "600", 50)).toEqual({ cages: 12, preview: "= 12 lồng (≈ 600 kg, ước tính)" });
    expect(resolveQuantityInput("kg", "1234,5", 50).cages).toBe(25); // 1234,5 / 50 = 24,69
    expect(resolveQuantityInput("kg", "10", 50).cages).toBe(1);
    expect(resolveQuantityInput("kg", "12,5", 50).cages).toBe(1);
  });
  it("refuses kg without a ratio and malformed kg, and stays quiet when empty", () => {
    expect(resolveQuantityInput("kg", "100", undefined).error).toMatch(/Chưa biết/);
    expect(resolveQuantityInput("kg", "1,2345", 50).error).toBeTruthy();
    expect(resolveQuantityInput("kg", "0", 50).error).toBeTruthy();
    expect(resolveQuantityInput("cages", "  ", 50)).toEqual({});
  });
});
