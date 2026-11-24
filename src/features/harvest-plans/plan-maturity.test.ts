import { describe, expect, it } from "vitest";
import type { EligibleRaft } from "./contracts";
import { cageWeightText, coverage, coverageQuantityWithEquivalent, planFormProblem, type OrderNeedLine, type PlanForm } from "./plan-logic";
import { availabilityText, earlyHarvestQuestion, earlyHarvestWarning, productAvailability, readiness, readinessText } from "./plan-maturity";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const raft = (patch: Partial<EligibleRaft> = {}) => ({ raftId: id(1), raftCode: "B1", zone: { id: id(2), code: "Z1", name: "Vùng 1" }, product: { id: id(3), code: "SP1", name: "Hàu A" }, expectedHarvestDate: "2026-10-27", ...patch }) as EligibleRaft;
const TODAY = "2026-10-01";

describe("maturity of a raft", () => {
  it("is ready on and after the expected date, waiting before it, unknown without one", () => {
    expect(readiness("2026-10-01", TODAY)).toEqual({ state: "ready" });
    expect(readiness("2026-09-01", TODAY)).toEqual({ state: "ready" });
    expect(readiness("2026-10-27", TODAY)).toEqual({ state: "waiting", daysLeft: 26 });
    expect(readiness(null, TODAY)).toEqual({ state: "unknown" });
  });
  it("words the date and the days left in Vietnamese", () => {
    expect(readinessText(raft(), TODAY)).toBe("Dự kiến thu hoạch từ 27/10/2026 · chưa đủ ngày (còn 26 ngày)");
    expect(readinessText(raft({ expectedHarvestDate: "2026-09-20" }), TODAY)).toBe("Dự kiến thu hoạch từ 20/09/2026 · đã sẵn sàng");
    expect(readinessText(raft({ expectedHarvestDate: null }), TODAY)).toBe("Chưa có thời gian trưởng thành của giống");
  });
  it("warns, never blocks, when the plan harvests before the expected date", () => {
    expect(earlyHarvestWarning(raft(), "2026-10-20")).toContain("sớm 7 ngày");
    expect(earlyHarvestWarning(raft(), "2026-10-27")).toBeUndefined();
    expect(earlyHarvestWarning(raft({ expectedHarvestDate: null }), "2026-10-20")).toBeUndefined();
  });
  it("asks in a pop-up before an early harvest and stays silent when ready or without maturity days", () => {
    expect(earlyHarvestQuestion("2026-10-27", TODAY)).toBe("Hàu chưa đủ ngày trưởng thành (dự kiến từ 27/10/2026, còn 26 ngày). Bạn vẫn muốn thu hoạch?");
    expect(earlyHarvestQuestion("2026-10-01", TODAY)).toBeUndefined();
    expect(earlyHarvestQuestion(null, TODAY)).toBeUndefined();
  });
});

describe("availability of a product", () => {
  it("is Có sẵn when a raft farming it is ready, otherwise Sắp có with the earliest date", () => {
    const rafts = [raft(), raft({ raftId: id(4), expectedHarvestDate: "2026-11-15" }), raft({ raftId: id(5), product: { id: id(6), code: "SP2", name: "Hàu B" }, expectedHarvestDate: "2026-09-01" })];
    expect(availabilityText(productAvailability(rafts, id(3), TODAY))).toBe("Sắp có – dự kiến 27/10/2026");
    expect(availabilityText(productAvailability(rafts, id(6), TODAY))).toBe("Có sẵn");
    expect(availabilityText(productAvailability(rafts, id(9), TODAY))).toBeUndefined();
  });
});

describe("cages with their weight", () => {
  const order = (patch: Partial<OrderNeedLine>): OrderNeedLine => ({ productId: id(3), productName: "Hàu A", unitId: id(7), unitName: "Tấn", factor: 1000, quantity: 3, deliveredQuantity: 0, ...patch });
  it("shows the weight next to the cages", () => {
    expect(cageWeightText(5, 50)).toBe("≈ 250 kg");
    expect(cageWeightText(50, 50)).toBe("≈ 2,5 tấn");
    expect(cageWeightText(0, 50)).toBe("");
  });
  it("reads an order in tons as cages and an order in cages as kg", () => {
    const [tons] = coverage([order({})], new Map(), 50);
    expect(coverageQuantityWithEquivalent(tons, tons.need)).toBe("3 Tấn (≈ 60 lồng)");
    expect(coverageQuantityWithEquivalent(tons, tons.planned ?? 0)).toBe("0 Tấn (≈ 0 lồng)");
    const [cages] = coverage([order({ unitName: "Lồng", factor: 50, quantity: 72 })], new Map(), 50);
    expect(coverageQuantityWithEquivalent(cages, cages.need)).toBe("72 Lồng (≈ 3,6 tấn)");
  });
});

describe("a plan needs an order", () => {
  const form = (orderIds: string[]): PlanForm => ({ code: "", plannedAt: "2026-10-02T07:00", note: "", orderIds, lines: [] });
  it("refuses a form with no order before anything else about its lines", () => {
    expect(planFormProblem(form([]))).toBe("Chọn ít nhất một đơn đặt hàng cho kế hoạch thu hoạch.");
    expect(planFormProblem(form([id(1)]))).toBe("Thêm ít nhất một dòng bè.");
  });
});
