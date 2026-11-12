import { describe, expect, it } from "vitest";
import type { EligibleLane, PlanLane, PlanLine } from "./contracts";
import { blankFormLine, buildPlanBody, coverage, coverageText, formLineOf, harvestPlanFor, laneChip, laneSelectable, lineCanHarvest, planFormProblem, planTotals, plannedCages, plannedLaneNumbers, shortageText, type OrderNeedLine, type PlanForm } from "./plan-logic";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const lane = (laneNumber: number, state: PlanLane["state"], extra: Partial<PlanLane> = {}): PlanLane => ({ laneId: id(laneNumber), laneNumber, state, ...extra });
const done = { id: id(9), lotCode: "B1-LOT1", cageCount: 5, estimatedKg: 250, harvestedAt: "2026-11-14T08:00:00+07:00" };
const line = (n: number, lanes: PlanLane[], extra: Partial<PlanLine> = {}): PlanLine => ({ id: id(n), lineNumber: n, raftId: id(n + 4), raftCode: `B${n}`, zone: { id: id(1), code: "Z1", name: "Vùng 1" }, state: "Open", canHarvest: true, locked: false, lanes, ...extra });

describe("lane chips", () => {
  it("names the state of each lane, the lot of a harvested one and the reason of a skipped one", () => {
    expect(laneChip(lane(1, "Planned"))).toEqual({ number: 1, text: "Luống 1: Kế hoạch", state: "Planned" });
    expect(laneChip(lane(2, "Harvested", { lotCode: "B1-LOT1" }))).toMatchObject({ text: "Luống 2: Đã thu", lotCode: "B1-LOT1", title: "Đã thu trong lô B1-LOT1" });
    expect(laneChip(lane(3, "Skipped", { skipReason: "Hàu chưa đủ cỡ" }))).toMatchObject({ text: "Luống 3: Không thu", title: "Hàu chưa đủ cỡ" });
    expect(laneChip(lane(4, "Skipped")).title).toBe("Không thu");
  });
});

describe("lanes that can be planned or harvested", () => {
  const eligible = (laneNumber: number, state: EligibleLane["state"], planCode?: string): EligibleLane => ({ laneId: id(laneNumber), laneNumber, state, planCode });

  it("lets a plan take free lanes and its own, never lanes of another open plan or already harvested, unless already chosen", () => {
    expect(laneSelectable(eligible(1, "Free"), undefined, [])).toBe(true);
    expect(laneSelectable(eligible(2, "InAnotherPlan", "KHT000002"), "KHT000001", [])).toBe(false);
    expect(laneSelectable(eligible(2, "InAnotherPlan", "KHT000001"), "KHT000001", [])).toBe(true);
    expect(laneSelectable(eligible(2, "InAnotherPlan", "KHT000001"), undefined, [])).toBe(false);
    expect(laneSelectable(eligible(3, "Harvested"), "KHT000001", [])).toBe(false);
    expect(laneSelectable(eligible(3, "Harvested"), "KHT000001", [3])).toBe(true);
  });

  it("takes the lanes to harvest from a line: planned ones only, and none once the line has a lot", () => {
    const open = line(1, [lane(3, "Planned"), lane(1, "Planned"), lane(2, "Skipped"), lane(4, "Harvested")]);
    expect(plannedLaneNumbers(open)).toEqual([1, 3]);
    expect(lineCanHarvest(open)).toBe(true);
    expect(lineCanHarvest({ ...open, lot: done })).toBe(false);
    expect(lineCanHarvest(line(2, [lane(1, "Skipped")]))).toBe(false);
    expect(lineCanHarvest({ ...open, canHarvest: false })).toBe(false);
    expect(harvestPlanFor({ code: "KHT000001" }, { ...open, expectedProduct: { id: id(8), code: "SP8", name: "Hàu" }, expectedCageCount: 12 })).toEqual({
      lineId: open.id, planCode: "KHT000001", raftId: open.raftId, raftCode: "B1", laneNumbers: [1, 3], expectedProductId: id(8), expectedCageCount: 12,
    });
  });
});

describe("plan totals", () => {
  it("counts rafts, lanes, expected cages, recorded lots and lanes by state", () => {
    const lines = [line(1, [lane(1, "Harvested"), lane(2, "Planned")], { expectedCageCount: 10, lot: done }), line(2, [lane(1, "Skipped")], { expectedCageCount: 5 })];
    expect(planTotals(lines)).toEqual({ rafts: 2, lanes: 3, cages: 15, lots: 1, lines: 2, harvested: 1, skipped: 1 });
    expect(planTotals([line(1, [lane(1, "Planned")])]).cages).toBeNull();
    expect(planTotals([]).rafts).toBe(0);
  });
});

describe("coverage of the linked orders", () => {
  const need = (extra: Partial<OrderNeedLine> = {}): OrderNeedLine => ({ productId: id(1), productName: "Hàu béo", unitId: id(7), unitName: "Lồng", factor: 25, quantity: 80, deliveredQuantity: 0, ...extra });
  const planned = (cages: number, productId = id(1)) => new Map([[productId, cages]]);
  const only = (rows: ReturnType<typeof coverage>) => rows[0];

  it("is Đủ when the cages of the rafts match what is left to deliver, summing two rafts", () => {
    const lines = [{ ...blankFormLine(id(1)), key: "a", raftId: id(5), cages: "40" }, { ...blankFormLine(id(1)), key: "b", raftId: id(6), cages: "40" }, { ...blankFormLine(id(1)), key: "c", raftId: id(8), cages: "30" }];
    const byProduct = plannedCages(lines, (raftId) => raftId === id(8) ? id(2) : id(1));
    expect(byProduct.get(id(1))).toBe(80);
    expect(plannedCages(lines, () => id(1), "b").get(id(1))).toBe(70);
    const row = only(coverage([need()], byProduct));
    expect(row).toMatchObject({ productName: "Hàu béo", unit: "Lồng", need: 80, planned: 80, gap: 0, state: "enough", cagesShort: 0 });
    expect(coverageText(row)).toBe("Đủ");
  });

  it("is Thiếu with the missing cages when the rafts expect less, counting only what is not delivered yet", () => {
    const short = only(coverage([need()], planned(40)));
    expect(short).toMatchObject({ state: "short", gap: -40, cagesShort: 40 });
    expect(coverageText(short)).toBe("Thiếu 40 Lồng");
    expect(shortageText([short])).toBe("40 Lồng Hàu béo");
    expect(only(coverage([need({ deliveredQuantity: 30 })], planned(40)))).toMatchObject({ need: 50, state: "short", gap: -10, cagesShort: 10 });
    expect(only(coverage([need()], new Map()))).toMatchObject({ planned: 0, state: "short", cagesShort: 80 });
  });

  it("is Dư when the rafts expect more, and ignores lines already delivered in full", () => {
    const over = only(coverage([need()], planned(95)));
    expect(over).toMatchObject({ state: "over", gap: 15, cagesShort: 0 });
    expect(coverageText(over)).toBe("Dư 15 Lồng");
    expect(shortageText([over])).toBeUndefined();
    expect(coverage([need({ deliveredQuantity: 80 })], planned(5))).toEqual([]);
  });

  it("converts cages to the kg unit of the order through kg per cage and rounds sensibly", () => {
    const kg = need({ unitName: "kg", unitId: id(8), factor: 1, quantity: 1000 });
    const row = only(coverage([kg], planned(15), 50));
    expect(row).toMatchObject({ unit: "kg", need: 1000, planned: 750, gap: -250, state: "short", cagesShort: 5 });
    expect(coverageText(row)).toBe("Thiếu 250 kg");
    const box = need({ unitName: "Thùng", unitId: id(9), factor: 10, quantity: 33 });
    expect(only(coverage([box], planned(7), 50))).toMatchObject({ unit: "Thùng", planned: 35, gap: 2, state: "over" });
    expect(only(coverage([box], planned(2), 25))).toMatchObject({ planned: 5, gap: -28, cagesShort: 12 });
    expect(only(coverage([kg], planned(20), 50))).toMatchObject({ state: "enough" });
    expect(coverageText(only(coverage([need({ quantity: 10.25, unitName: "kg", unitId: id(8), factor: 1 })], planned(1), 3.3333)))).toBe("Thiếu 7 kg");
  });

  it("falls back to kg when orders mix units of one product, and cannot compare without kg per cage", () => {
    const mixed = [need({ quantity: 10 }), need({ unitName: "kg", unitId: id(8), factor: 1, quantity: 200 })];
    const row = only(coverage(mixed, planned(12), 50));
    expect(row).toMatchObject({ unit: "kg", need: 450, planned: 600, gap: 150, state: "over" });
    expect(coverageText(row)).toBe("Dư 150 kg");
    const unknown = only(coverage(mixed, planned(12)));
    expect(unknown).toMatchObject({ unit: "kg", planned: null, gap: null, state: "unknown", cagesShort: 0 });
    expect(coverageText(unknown)).toBe("Chưa quy đổi được");
    expect(shortageText([unknown])).toBeUndefined();
    // Cages need no ratio when every order asks in cages.
    expect(only(coverage([need()], planned(80)))).toMatchObject({ state: "enough" });
  });

  it("keeps one row per product, sorted by name", () => {
    const rows = coverage([need({ productId: id(2), productName: "Cá bớp", quantity: 5 }), need(), need({ quantity: 20 })], new Map([[id(1), 100]]));
    expect(rows.map((row) => [row.productName, row.need, row.state])).toEqual([["Cá bớp", 5, "short"], ["Hàu béo", 100, "enough"]]);
    expect(shortageText(rows)).toBe("5 Lồng Cá bớp");
  });
});

describe("plan form", () => {
  const filled = (): PlanForm => ({ code: "", plannedAt: "2026-11-14T06:00", note: "", orderIds: [id(7)], lines: [{ ...blankFormLine(id(1)), raftId: id(5), laneNumbers: [2, 1], cages: "12", note: " ghi chú " }] });

  it("names the first problem in the user's words", () => {
    expect(planFormProblem(filled())).toBeUndefined();
    expect(planFormProblem({ ...filled(), plannedAt: "" })).toBe("Chọn thời gian dự kiến.");
    expect(planFormProblem({ ...filled(), lines: [] })).toBe("Thêm ít nhất một dòng bè.");
    expect(planFormProblem({ ...filled(), lines: [{ ...filled().lines[0], zoneId: "" }] })).toBe("Dòng 1: chọn vùng.");
    expect(planFormProblem({ ...filled(), lines: [{ ...filled().lines[0], raftId: "" }] })).toBe("Dòng 1: chọn bè.");
    expect(planFormProblem({ ...filled(), lines: [{ ...filled().lines[0], laneNumbers: [] }] })).toBe("Dòng 1: chọn ít nhất một luống.");
    expect(planFormProblem({ ...filled(), lines: [{ ...filled().lines[0], cages: "2,5" }] })).toBe("Dòng 1: lồng dự kiến phải là số nguyên lớn hơn 0.");
    expect(planFormProblem({ ...filled(), lines: [{ ...filled().lines[0], cages: "" }] })).toBeUndefined();
    const twice = filled().lines[0];
    expect(planFormProblem({ ...filled(), lines: [twice, { ...twice, key: "other" }] })).toBe("Dòng 2: bè đã có ở dòng khác của kế hoạch.");
  });

  it("builds the body: instant at +07:00, sorted lanes, empty values as null and the ids of existing lines", () => {
    expect(buildPlanBody(filled())).toEqual({
      code: null, plannedAt: "2026-11-14T06:00:00+07:00", note: null, salesOrderIds: [id(7)],
      lines: [{ raftId: id(5), laneNumbers: [1, 2], expectedCageCount: 12, note: "ghi chú" }],
    });
    const existing = { ...filled(), code: " KHT9 ", rowVersion: "v3", lines: [{ ...filled().lines[0], id: id(2), cages: "" }] };
    expect(buildPlanBody(existing)).toMatchObject({ code: "KHT9", rowVersion: "v3", lines: [{ id: id(2), expectedCageCount: null }] });
    expect(buildPlanBody(existing)).not.toHaveProperty("zoneId");
    expect(buildPlanBody(existing).lines[0]).not.toHaveProperty("expectedProductId");
  });

  it("locks a line of a plan already given out once it has a lot or a skipped lane", () => {
    const open = line(1, [lane(1, "Planned")]), skipped = line(2, [lane(1, "Skipped"), lane(2, "Planned")], { locked: true }), lot = line(3, [lane(1, "Harvested")], { lot: done, locked: true });
    expect([open, skipped, lot].map((row) => formLineOf(row, true).locked)).toEqual([false, true, true]);
    expect([open, skipped, lot].map((row) => formLineOf(row, false).locked)).toEqual([false, false, false]);
    expect(formLineOf(skipped, true).laneNumbers).toEqual([1, 2]);
    expect(formLineOf(skipped, true).zoneId).toBe(id(1));
  });
});
