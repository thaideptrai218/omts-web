import { describe, expect, it } from "vitest";
import { heldGrants, heldToDesired, planGrantChanges, summarizePlan, type GrantRow } from "./user-grant-diff";

const ngoc = "11111111-1111-4111-8111-111111111111", thai = "22222222-2222-4222-8222-222222222222", minh = "33333333-3333-4333-8333-333333333333";
const names: Record<string, string> = { [ngoc]: "Ngọc Vừng", [thai]: "Thái Đẹp Trai Pro Max", [minh]: "Minh Châu" };
const nameOf = (id: string) => names[id];
const row = (id: string, role: string, zoneId: string | null, state: GrantRow["state"] = "Effective"): GrantRow => ({
  id, roleId: "44444444-4444-4444-8444-444444444444", roleName: role === "ACCOUNTANT" ? "Accountant" : "Zone Manager", role, zoneId, zoneName: zoneId ? names[zoneId] : null, allZones: zoneId === null,
  grantedAt: "2026-11-18T21:05:00+07:00", grantedByAccountId: "55555555-5555-4555-8555-555555555555", state, revokedAt: null, revokeReason: null,
});
const held = heldGrants([row("g1", "ZONE_MANAGER", ngoc), row("g0", "ZONE_MANAGER", minh, "Revoked")]);

describe("grant plan", () => {
  it("counts only Effective rows as held and starts the editor from them", () => {
    expect(held.map((grant) => grant.id)).toEqual(["g1"]);
    expect(heldToDesired(held)).toEqual({ allZones: false, zoneIds: [ngoc], accountant: false });
  });
  it("adds only the new zone and never re-sends a pair that is already held", () => {
    const plan = planGrantChanges(held, { allZones: false, zoneIds: [ngoc, thai], accountant: false }, nameOf);
    expect(plan).toEqual([{ kind: "add", role: "ZONE_MANAGER", zoneId: thai, label: "Thái Đẹp Trai Pro Max" }]);
    expect(summarizePlan(plan)).toBe("Thêm: Thái Đẹp Trai Pro Max");
  });
  it("is empty when nothing changed", () => expect(planGrantChanges(held, heldToDesired(held), nameOf)).toEqual([]));
  it("adds and removes in one plan, additions first", () => {
    const plan = planGrantChanges(held, { allZones: false, zoneIds: [thai], accountant: false }, nameOf);
    expect(plan.map((item) => `${item.kind}:${item.label}`)).toEqual(["add:Thái Đẹp Trai Pro Max", "remove:Ngọc Vừng"]);
    expect(plan[1].grantId).toBe("g1");
    expect(summarizePlan(plan)).toBe("Thêm: Thái Đẹp Trai Pro Max · Bỏ: Ngọc Vừng");
  });
  it("replaces the single zones when Tất cả vùng is picked: add all-zones, revoke each zone grant", () => {
    const plan = planGrantChanges(held, { allZones: true, zoneIds: [ngoc, thai], accountant: false }, nameOf);
    expect(plan).toEqual([
      { kind: "add", role: "ZONE_MANAGER", zoneId: null, label: "Tất cả vùng" },
      { kind: "remove", role: "ZONE_MANAGER", zoneId: ngoc, label: "Ngọc Vừng", grantId: "g1", detail: "đã nằm trong Tất cả vùng" },
    ]);
    expect(summarizePlan(plan)).toBe("Thêm: Tất cả vùng · Bỏ: Ngọc Vừng (đã nằm trong Tất cả vùng)");
    // Switching back to the original selection leaves nothing to do.
    expect(planGrantChanges(held, heldToDesired(held), nameOf)).toEqual([]);
  });
  it("does nothing when all zones are already held and still chosen", () => {
    const all = heldGrants([row("ga", "ZONE_MANAGER", null)]);
    expect(planGrantChanges(all, heldToDesired(all), nameOf)).toEqual([]);
  });
  it("unticking Tất cả vùng revokes it and adds the ticked zones", () => {
    const all = heldGrants([row("ga", "ZONE_MANAGER", null)]);
    expect(planGrantChanges(all, { allZones: false, zoneIds: [thai], accountant: false }, nameOf).map((item) => `${item.kind}:${item.label}`)).toEqual(["add:Thái Đẹp Trai Pro Max", "remove:Tất cả vùng"]);
  });
  it("adds or removes the single whole-cooperative Accountant grant", () => {
    expect(planGrantChanges(held, { allZones: false, zoneIds: [ngoc], accountant: true }, nameOf)).toEqual([{ kind: "add", role: "ACCOUNTANT", zoneId: null, label: "Kế toán" }]);
    const both = heldGrants([row("g1", "ZONE_MANAGER", ngoc), row("gk", "ACCOUNTANT", null)]);
    expect(planGrantChanges(both, { allZones: false, zoneIds: [ngoc], accountant: false }, nameOf)).toEqual([{ kind: "remove", role: "ACCOUNTANT", zoneId: null, label: "Kế toán", grantId: "gk" }]);
  });
});
