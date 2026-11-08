import { describe, expect, it } from "vitest";
import { pushCatalogSchema, pushPatch, pushSavedSchema } from "./push-contract";
const fixture = () => ({ types: [{ type: "WATER_ALERT", name: "Water", mandatory: true, push: true }, { type: "WATER_MEASUREMENT_OVERDUE", name: "Overdue", mandatory: false, push: true }], pushAllowedOnDevice: false });
describe("type-specific Push catalogue", () => {
  it("allows an optional selection without a registered device and never emits a mandatory edit", () => {
    const catalog = pushCatalogSchema.parse(fixture());
    expect(pushPatch(catalog, { WATER_ALERT: false, WATER_MEASUREMENT_OVERDUE: false })).toEqual([{ type: "WATER_MEASUREMENT_OVERDUE", push: false }]);
  });
  it("rejects duplicate types and disabled mandatory entries", () => {
    const row = fixture(); expect(pushCatalogSchema.safeParse({ ...row, types: [row.types[0], row.types[0]] }).success).toBe(false);
    expect(pushCatalogSchema.safeParse({ ...row, types: [{ ...row.types[0], push: false }] }).success).toBe(false);
  });
  it("requires matching notice metadata on a saved selection", () => {
    const saved = { ...fixture(), messageCode: "MSG-GEN-05", notice: "Saved, no device", noticeCode: "MSG-ACCOUNT-21" };
    expect(pushSavedSchema.safeParse(saved).success).toBe(true); expect(pushSavedSchema.safeParse({ ...saved, noticeCode: null }).success).toBe(false);
  });
});
