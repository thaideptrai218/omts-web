import { describe, expect, it, vi } from "vitest";
import { accountantWarningFor, applyGrantSelection, grantLabel, grantOutcomeNotice } from "./employee-account-grants";
import { emptyGrantSelection, type GrantSelection } from "@/features/user-management/user-grant-selection";

const zoneA = "11111111-1111-4111-8111-111111111111", zoneB = "22222222-2222-4222-8222-222222222222";
const names = new Map([[zoneA, "Vùng A"], [zoneB, "Vùng B"]]);
const managerOfBoth: GrantSelection = { ...emptyGrantSelection, zoneManager: true, zoneIds: [zoneA, zoneB], accountant: true };
const ok = { status: "success" as const, data: {} };
const fail = { status: "error" as const, httpStatus: 409, uncertain: false };

describe("employee account grants", () => {
  it("names a pair in the Owner's words", () => {
    expect(grantLabel({ role: "ZONE_MANAGER", zoneId: zoneA }, names)).toBe("Quản lý vùng · Vùng A");
    expect(grantLabel({ role: "ACCOUNTANT", zoneId: null }, names)).toBe("Kế toán · Tất cả vùng");
  });
  it("sends every pair and reports the failed ones by name without stopping", async () => {
    const create = vi.fn().mockResolvedValueOnce(ok).mockResolvedValueOnce(fail).mockRejectedValueOnce(new Error("down"));
    const outcome = await applyGrantSelection("acc-1", managerOfBoth, names, create);
    expect(create.mock.calls).toEqual([["acc-1", zoneA, "ZONE_MANAGER"], ["acc-1", zoneB, "ZONE_MANAGER"], ["acc-1", null, "ACCOUNTANT"]]);
    expect(outcome).toEqual({ granted: 1, failed: ["Quản lý vùng · Vùng B", "Kế toán · Tất cả vùng"] });
    expect(grantOutcomeNotice(outcome)).toContain("chưa gán được: Quản lý vùng · Vùng B; Kế toán · Tất cả vùng");
  });
  it("sends nothing and says nothing when no role was chosen", async () => {
    const create = vi.fn();
    expect(await applyGrantSelection("acc-1", emptyGrantSelection, names, create)).toEqual({ granted: 0, failed: [] });
    expect(create).not.toHaveBeenCalled();
    expect(grantOutcomeNotice({ granted: 0, failed: [] })).toBeUndefined();
    expect(grantOutcomeNotice({ granted: 2, failed: [] })).toMatch(/đăng nhập lại/);
  });
  it("warns about a second Accountant but never blocks when accounts cannot be read", async () => {
    const accountant = { id: "a1", username: "ketoan", displayName: "Kế toán A", pairs: [{ role: "ACCOUNTANT" }] };
    expect(await accountantWarningFor(emptyGrantSelection, vi.fn())).toBeUndefined();
    const selection = { ...emptyGrantSelection, accountant: true };
    expect(await accountantWarningFor(selection, async () => ({ status: "success", data: [accountant] }))).toMatch(/Kế toán A/);
    expect(await accountantWarningFor(selection, async () => ({ status: "success", data: [] }))).toBeUndefined();
    expect(await accountantWarningFor(selection, async () => fail)).toBeUndefined();
    expect(await accountantWarningFor(selection, async () => { throw new Error("down"); })).toBeUndefined();
  });
});
