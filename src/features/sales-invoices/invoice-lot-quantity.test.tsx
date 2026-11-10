// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
const hook = vi.hoisted(() => ({ kgPerCage: undefined as number | undefined }));
vi.mock("@/features/harvest-settings-lookup/use-kg-per-cage", () => ({ useKgPerCage: () => ({ kgPerCage: hook.kgPerCage, loading: false }) }));
import { lotForSale, type LotForSale } from "./contracts";
import { InvoiceLinesPanel } from "./invoice-lines-panel";
import { lotRemainingText } from "./invoice-lot-quantity";

afterEach(() => { cleanup(); hook.kgPerCage = undefined; });
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

describe("InvoiceLinesPanel lot list", () => {
  const render_ = () => render(<InvoiceLinesPanel lots={{ data: { lots: [base as LotForSale], message: null }, loading: false, reload: () => {} }} draft={{ lines: [] } as never} active={[]} listPrice={() => undefined} disabled={false} onAdd={() => {}} onChange={() => {}} />);
  it("shows approximate cages next to kg when the ratio is readable", () => { hook.kgPerCage = 50; render_(); expect(screen.getByText(/còn ≈ 3,6 lồng · 180 kg/)).toBeTruthy(); });
  it("shows kg alone otherwise", () => { render_(); expect(screen.getByText(/còn 180 kg/)).toBeTruthy(); expect(screen.queryByText(/≈ 3,6/)).toBeNull(); });
});
