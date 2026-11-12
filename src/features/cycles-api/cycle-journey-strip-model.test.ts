import { describe, expect, it } from "vitest";
import type { CycleFigures } from "./close-contracts";
import type { CycleView } from "./cycle-model";
import { buildStripItems } from "./cycle-journey-strip-model";

const raftId = "00000000-0000-4000-8000-0000000000a1", cycleId = "00000000-0000-4000-8000-0000000000c1";
const cycle = (patch: Partial<CycleView> = {}): CycleView => ({ id: cycleId, startDate: "2026-10-02", closeDate: null, statusId: 1, status: "Open", rowVersion: "AAAA", raftId, raftCode: "B1-06", expectedSeedQuantity: 900, targetYieldKg: 500,
  seedingCompletedOn: null, assessment: null, closedEarly: false, daysOfFarming: 12, canEdit: true, canCancel: false, ...patch });
const figures = (patch: Partial<CycleFigures> = {}): CycleFigures => ({ cycleId, raftCode: "B1-06", startDate: "2026-10-02", closeDate: null, asOf: "2026-11-13", seedingSessionCount: 1, seedHung: 400, seedUnit: "mảnh", harvestLotCount: 0, kgHarvested: 0,
  lastHarvestDate: null, daysOfFarming: 12, expectedSeedQuantity: 900, targetYieldKg: 500, closedEarly: false, earlyReason: null, notHarvestedLanes: [], assessment: null, ...patch });
const lanes = (...states: string[]) => states.map((state, index) => ({ laneNumber: index + 1, state }));
const build = (c = cycle(), f = figures(), l = lanes("Growing", "Growing", "NotSeeded", "NotSeeded")) => buildStripItems({ cycle: c, lanes: l, figures: f });

describe("journey bar items", () => {
  it("shows the nursery batch with estimated survivors, or says there was no nursery", () => {
    const withNursery = build(cycle({ nurseryBatchId: "n1", nurseryCode: "NU000003" }), figures({ nursery: { batchId: "n1", batchCode: "NU000003", quantityIn: 1000, survivors: 900 } }));
    expect(withNursery.nursery).toMatchObject({ mark: "done", figure: "NU000003 · 900/1.000 sống sót (ước tính)" });
    expect(build().nursery).toMatchObject({ mark: "neutral", figure: "Không qua ươm" });
  });
  it("shows the cycle day while open and the length once closed", () => {
    expect(build().cycle).toMatchObject({ mark: "active", figure: "Ngày 12 · Đang nuôi" });
    expect(build(cycle({ closeDate: "2026-11-01" })).cycle).toMatchObject({ mark: "done", figure: "Đã kết thúc · 12 ngày" });
  });
  it("shows seeding progress against the plan, completed or not started", () => {
    expect(build().seeding).toMatchObject({ mark: "active", figure: "400/900 mảnh · 44,4%", percent: 44.4, over: false });
    expect(build(cycle({ seedingCompletedOn: "2026-11-10" }), figures({ seedHung: 900 })).seeding).toMatchObject({ mark: "done", figure: "Hoàn tất · 900/900 mảnh · 100%" });
    expect(build(cycle(), figures({ seedHung: 0, seedingSessionCount: 0 })).seeding).toMatchObject({ mark: "todo", figure: "Chưa thả giống" });
    expect(build(cycle(), figures({ seedHung: 1000 })).seeding).toMatchObject({ over: true });
  });
  it("shows harvested kg (estimate) against the target and finished lanes", () => {
    expect(build().harvest).toMatchObject({ mark: "todo", figure: "Chưa thu hoạch" });
    const partly = build(cycle(), figures({ harvestLotCount: 2, kgHarvested: 120 }), lanes("Harvested", "BeingHarvested", "Growing", "NotSeeded"));
    expect(partly.harvest).toMatchObject({ mark: "active", figure: "120/500 kg (ước tính) · 1/3 làn", percent: 24 });
    const noTarget = build(cycle(), figures({ harvestLotCount: 1, kgHarvested: 80, targetYieldKg: null }), lanes("Harvested", "Harvested"));
    expect(noTarget.harvest).toMatchObject({ mark: "done", figure: "80 kg (ước tính) · 2/2 làn" });
    expect(noTarget.harvest?.percent).toBeUndefined();
  });
  it("leaves water without a figure and marks materials as optional", () => {
    const items = build();
    expect(items.water).toBeUndefined();
    expect(items.material).toMatchObject({ mark: "neutral" });
  });
});
