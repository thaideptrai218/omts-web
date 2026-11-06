import { afterEach, describe, expect, it, vi } from "vitest";
import { createCooperativeRepository } from "./repository";
import { cooperativeFixture } from "./fixtures";
import { cooperativeInputSchema, cooperativeValues } from "./contracts";
afterEach(() => vi.restoreAllMocks());
describe("cooperative client contract", () => {
  it.each([401, 502, 200])("treats an unrecognized write HTTP%i as uncertain", async (status) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ status: "invalid-response", accessToken: "never-return" }, { status }));
    expect(await createCooperativeRepository().save(cooperativeValues(cooperativeFixture()))).toMatchObject({ status: "error", uncertain: true });
  });
  it("does not mislabel a failed GET as a possible committed write", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline")); expect(await createCooperativeRepository().read()).toMatchObject({ status: "error", uncertain: false });
  });
  it("refuses an external image URL in a successful BFF response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ status: "success", data: { ...cooperativeFixture(), logoUrl: "https://evil.test/a.png" } })); expect(await createCooperativeRepository().read()).toMatchObject({ status: "error" });
  });
  it("accepts the approved 500-character address and bounds total industry JSON", () => {
    expect(cooperativeInputSchema.safeParse({ ...cooperativeValues(cooperativeFixture()), officeAddress: "a".repeat(500) }).success).toBe(true);
    expect(cooperativeInputSchema.safeParse({ ...cooperativeValues(cooperativeFixture()), businessLines: Array(10).fill("a".repeat(255)) }).success).toBe(false);
  });
});
