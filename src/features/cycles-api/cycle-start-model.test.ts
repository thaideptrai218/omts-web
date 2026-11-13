import { describe, expect, it } from "vitest";
import { cycleStartFailure, cycleStartForm, emptyCycleStart, validateCycleStart } from "./cycle-start-model";
import { availableNurseryBatches, cycleNurseryText, nurseryBatchLabel, withCurrentBatch } from "./nursery-batch-options";
import { cycleStartInput } from "./contracts";

const batch = "00000000-0000-4000-8000-0000000000b1";
const product = "00000000-0000-4000-8000-0000000000d1";
const filled = { nurseryBatchId: batch, productId: product, targetYieldKg: "2000", startDate: "2026-11-12", note: "" };

describe("start form validation", () => {
  it("passes with a batch, a yield above 0, a date not after today and one photo", () => expect(validateCycleStart(filled, 1, "2026-11-13")).toEqual({}));
  it("asks for every missing required input", () => {
    const errors = validateCycleStart({ ...emptyCycleStart("2026-11-13"), startDate: "" }, 0, "2026-11-13");
    expect(Object.keys(errors).sort()).toEqual(["nurseryBatchId", "photos", "productId", "startDate", "targetYieldKg"]);
  });
  it("refuses a zero yield, a future date and more than 3 photos", () => {
    expect(validateCycleStart({ ...filled, targetYieldKg: "0" }, 1, "2026-11-13").targetYieldKg).toBeTruthy();
    expect(validateCycleStart({ ...filled, targetYieldKg: "1,5" }, 1, "2026-11-13")).toEqual({});
    expect(validateCycleStart({ ...filled, startDate: "2026-11-14" }, 1, "2026-11-13").startDate).toBeTruthy();
    expect(validateCycleStart(filled, 4, "2026-11-13").photos).toBeTruthy();
  });
});

describe("start request", () => {
  it("builds the multipart fields of the backend contract: batch, yield, date, optional note, photos", () => {
    const photos = [new File(["a"], "a.jpg", { type: "image/jpeg" }), new File(["b"], "b.jpg", { type: "image/jpeg" })];
    const form = cycleStartForm({ ...filled, targetYieldKg: "2000,5", note: " Lứa mới " }, photos);
    expect([...form.keys()].filter(key => key !== "photos").sort()).toEqual(["note", "nurseryBatchId", "productId", "startDate", "targetYieldKg"]);
    expect(form.get("nurseryBatchId")).toBe(batch); expect(form.get("productId")).toBe(product); expect(form.get("targetYieldKg")).toBe("2000.5"); expect(form.get("note")).toBe("Lứa mới");
    expect(form.getAll("photos")).toHaveLength(2);
    expect(cycleStartForm(filled, photos).has("note")).toBe(false);
  });
  it("matches the server schema (no seed lot, no planned seed quantity, no harvest date)", () => {
    expect(cycleStartInput.safeParse({ nurseryBatchId: batch, startDate: "2026-11-12", targetYieldKg: 2000 }).success).toBe(true);
    expect(cycleStartInput.safeParse({ nurseryBatchId: batch, productId: product, startDate: "2026-11-12", targetYieldKg: 2000 }).success).toBe(true);
    expect(cycleStartInput.safeParse({ nurseryBatchId: batch, startDate: "2026-11-12", targetYieldKg: 2000, expectedSeedQuantity: 100 }).success).toBe(false);
    expect(cycleStartInput.safeParse({ startDate: "2026-11-12", targetYieldKg: 2000 }).success).toBe(false);
  });
});

describe("start refusals", () => {
  it("puts a named field at its input", () => {
    expect(cycleStartFailure({ code: "MSG-GEN-01", problem: { field: "Target yield", hint: "Sản lượng phải lớn hơn 0." } }, "x").errors.targetYieldKg).toBe("Sản lượng phải lớn hơn 0.");
    expect(cycleStartFailure({ problem: { field: "Photos" } }, undefined).errors.photos).toBeTruthy();
    expect(cycleStartFailure({ problem: { field: "Nursery batch" } }, undefined).errors.nurseryBatchId).toBeTruthy();
    expect(cycleStartFailure({ code: "MSG-GEN-01", problem: { field: "ProductId", hint: "Chọn loại hàu mà chu kỳ này nuôi và bán." } }, "x").errors.productId).toBe("Chọn loại hàu mà chu kỳ này nuôi và bán.");
  });
  it("blames the batch for the batch refusals of the contract", () => {
    for (const reasonCode of ["NURSERY_NOT_COMPLETED", "NURSERY_RAFT_OTHER_ZONE", "NURSERY_POOL_EMPTY"]) expect(cycleStartFailure({ code: "MSG-GEN-09", problem: { reasonCode } }, "x").errors.nurseryBatchId).toBeTruthy();
  });
  it("explains a raft that already has an open cycle as a general message", () => {
    const result = cycleStartFailure({ code: "MSG-GEN-06" }, "x");
    expect(result.errors).toEqual({}); expect(result.general).toContain("đã có chu kỳ đang mở");
  });
  it("keeps the generic text for anything else", () => expect(cycleStartFailure({ code: "MSG-GEN-03" }, "Lỗi tải ảnh")).toEqual({ errors: {}, general: "Lỗi tải ảnh" }));
});

describe("available nursed batches", () => {
  const rows = [{ id: "n1", code: "NU000002", itemName: "Hàu giống", survivors: 9500, seeded: 3000, remaining: 6500 }, { id: "n2", code: "NU000003", seedLot: { itemName: "Hàu B" }, survivors: 6000, seeded: 0 }, { id: "n3", code: "NU000004", itemName: "Hết", remaining: 0 }];
  it("reads the wrapped list, names the seed, falls back to survivors - seeded and drops empty pools", () => {
    expect(availableNurseryBatches.parse({ batches: rows })).toEqual([{ id: "n1", code: "NU000002", name: "Hàu giống", remaining: 6500 }, { id: "n2", code: "NU000003", name: "Hàu B", remaining: 6000 }]);
    expect(availableNurseryBatches.parse(rows)).toHaveLength(2);
    expect(availableNurseryBatches.parse({ items: [] })).toEqual([]);
  });
  it("labels a batch with its estimated pool", () => expect(nurseryBatchLabel({ code: "NU000007", name: "Hàu giống", remaining: 9500 })).toBe("NU000007 · Hàu giống · còn 9.500 mảnh (ước tính)"));
  it("keeps the batch the cycle already uses selectable and words it as in the journey", () => {
    const cycle = { nurseryBatchId: "n9", nurseryCode: "NU000009", seedLot: { itemName: "Hàu giống" }, nurseryRemaining: 0 };
    expect(withCurrentBatch([], cycle).map(item => item.id)).toEqual(["n9"]);
    expect(withCurrentBatch([{ id: "n9", code: "NU000009", name: null, remaining: 5 }], cycle)).toHaveLength(1);
    expect(cycleNurseryText({ ...cycle, nurseryRemaining: 6500 })).toBe("NU000009 · Hàu giống · kho ươm còn 6.500 mảnh");
  });
});
