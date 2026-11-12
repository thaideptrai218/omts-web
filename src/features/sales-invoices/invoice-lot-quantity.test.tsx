import { describe, expect, it } from "vitest";
import { lotForSale, type LotForSale } from "./contracts";
import { lotRemainingText } from "./invoice-lot-quantity";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const base = { id: id(1), lotCode: "B03-1", raftId: id(2), raftCode: "B03", zoneId: id(3), zoneCode: "VP01", zoneName: "Vùng Phú", harvestDate: "2026-10-26", remainingKg: 180, statusId: 1, status: "Open", originState: "NotPublished" as const, withdrawnAt: null };

describe("lotRemainingText", () => {
  it("uses the cooperative average when the lot has no ratio", () => expect(lotRemainingText(base as LotForSale, 50)).toBe("còn ≈ 3,6 lồng · 180 kg"));
  it("prefers the lot's own ratio and appends its exact cage count", () =>
    expect(lotRemainingText({ ...base, kgPerCage: 60, cageCount: 8 } as LotForSale, 50)).toBe("còn ≈ 3 lồng · 180 kg (lô 8 lồng)"));
  it("falls back to kg alone", () => expect(lotRemainingText(base as LotForSale)).toBe("còn 180 kg"));
});

describe("lotForSale contract", () => {
  it("accepts current responses and the future optional cage fields", () => {
    expect(lotForSale.safeParse(base).success).toBe(true);
    expect(lotForSale.safeParse({ ...base, cageCount: null, kgPerCage: null }).success).toBe(true);
    expect(lotForSale.safeParse({ ...base, cageCount: 8, kgPerCage: 22.5 }).success).toBe(true);
    expect(lotForSale.safeParse({ ...base, kgPerCage: 0 }).success).toBe(false);
  });
});
