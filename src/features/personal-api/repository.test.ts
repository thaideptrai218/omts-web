import { afterEach, describe, expect, it, vi } from "vitest";
import { createPersonalRepository } from "./repository";
import { notificationCatalogSchema, notificationPatch, notificationSelections } from "./contracts";
import { notificationFixture } from "./fixtures";
afterEach(() => vi.restoreAllMocks());
describe("personal API repository and catalog projection", () => {
  it.each([401, 502, 200])("blocks an unrecognized notification save HTTP%i as uncertain", async (status) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ status: "invalid-response" }, { status })); expect(await createPersonalRepository().saveNotifications([{ category: "WORK", channel: "Email", enabled: true }])).toMatchObject({ status: "error", uncertain: true });
  });
  it("does not mark a failed GET as a possible write", async () => { vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline")); expect(await createPersonalRepository().notifications()).toMatchObject({ status: "error", uncertain: false }); });
  it("never creates a patch for Push, mandatory InApp or ineligible channels", () => {
    const fixture = notificationFixture(), values = notificationSelections(fixture); values["ORDERS:InApp"] = false; values["WORK:Push"] = true; values["WORK:Zalo"] = true; expect(notificationPatch(fixture, values)).toEqual([]);
  });
  it("rejects inconsistent eligibility and unlocked mandatory channels", () => {
    const fixture = notificationFixture(); fixture[0].channels[0].enabled = false; expect(notificationCatalogSchema.safeParse(fixture).success).toBe(false); fixture[0].channels[0].enabled = true; fixture[0].channels[2].ineligibleReason = "EMAIL_NOT_VERIFIED"; expect(notificationCatalogSchema.safeParse(fixture).success).toBe(false);
  });
});
