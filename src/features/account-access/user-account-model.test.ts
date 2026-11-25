import { describe, expect, it } from "vitest";
import { accountantUniquenessWarning } from "./accountant-uniqueness-warning";
import { countRoleHolders, copyUserGrants, filterUserAccounts, missingWorkingZones, toUserAccount, type UserAccount, type UserPair } from "./user-account-model";
import { grantsToSelection, selectionError, selectionToGrants } from "./user-grant-selection";

const zoneA = "11111111-1111-4111-8111-111111111111", zoneB = "22222222-2222-4222-8222-222222222222";
const pair = (role: string, zoneId: string | null, id = `${role}-${zoneId}`): UserPair => ({ id, role, roleName: role, zoneId, zoneName: zoneId === zoneA ? "Vùng A" : zoneId === zoneB ? "Vùng B" : null, allZones: zoneId === null });
const account = (id: string, displayName: string, pairs: UserPair[], extra: Partial<UserAccount> = {}): UserAccount =>
  ({ id, displayName, username: id, phoneNumber: null, email: null, status: "Active", employeeId: null, pairs, rowVersion: "v", ...extra });

describe("accountant uniqueness warning (decision D9)", () => {
  const existing = account("ketoan1", "Kế toán Lan", [pair("ACCOUNTANT", null)]);
  it("warns, never blocks, when a second Accountant is about to be granted", () => {
    const warning = accountantUniquenessWarning([existing, account("new", "Mới", [])], ["ACCOUNTANT"]);
    expect(warning).toContain("Kế toán Lan");
    expect(warning).toContain("thêm người thứ hai");
  });
  it("is silent for other roles, for the first Accountant, and for the account that already is the Accountant", () => {
    expect(accountantUniquenessWarning([existing], ["ZONE_MANAGER"])).toBeUndefined();
    expect(accountantUniquenessWarning([account("a", "A", [pair("ZONE_MANAGER", zoneA)])], ["ACCOUNTANT"])).toBeUndefined();
    expect(accountantUniquenessWarning([existing], ["ACCOUNTANT"], "ketoan1")).toBeUndefined();
  });
});

describe("copy user grants", () => {
  it("copies the Effective pairs, collapsing duplicates and forcing the Accountant to all zones", () => {
    const template = account("t", "Mẫu", [pair("ZONE_MANAGER", zoneA, "1"), pair("ZONE_MANAGER", zoneA, "2"), pair("ZONE_MANAGER", zoneB), pair("ACCOUNTANT", zoneA, "3"), pair("OTHER", null)]);
    expect(copyUserGrants(template)).toEqual([{ zoneId: zoneA, role: "ZONE_MANAGER" }, { zoneId: zoneB, role: "ZONE_MANAGER" }, { zoneId: null, role: "ACCOUNTANT" }]);
  });
  it("copies nothing for an account without a pair", () => expect(copyUserGrants(account("t", "Mẫu", []))).toEqual([]));
  it("round-trips through the form selection", () => {
    const grants = copyUserGrants(account("t", "Mẫu", [pair("ZONE_MANAGER", zoneA), pair("ZONE_MANAGER", zoneB), pair("ACCOUNTANT", null)]));
    expect(selectionToGrants(grantsToSelection(grants))).toEqual(grants);
  });
});

describe("grant selection", () => {
  it("sends one all-zones pair instead of zone pairs when 'Tất cả vùng' is on, and the Accountant always without a zone", () => {
    expect(selectionToGrants({ zoneManager: true, allZones: true, zoneIds: [zoneA], accountant: true })).toEqual([{ zoneId: null, role: "ZONE_MANAGER" }, { zoneId: null, role: "ACCOUNTANT" }]);
  });
  it("asks for a zone when a Zone Manager has none", () => {
    expect(selectionError({ zoneManager: true, allZones: false, zoneIds: [], accountant: false })).toBeTruthy();
    expect(selectionError({ zoneManager: true, allZones: false, zoneIds: [zoneA], accountant: false })).toBeUndefined();
  });
});

describe("role holder count and list helpers", () => {
  const accounts = [account("a", "An", [pair("ZONE_MANAGER", zoneA), pair("ZONE_MANAGER", zoneB)]), account("b", "Bình", [pair("ACCOUNTANT", null)]), account("c", "Chi", [], { status: "Locked" })];
  it("counts an account once per role even with several zones", () => expect(countRoleHolders(accounts)).toEqual({ ZONE_MANAGER: 1, ACCOUNTANT: 1 }));
  it("filters by role, zone (all-zone pairs match any zone), status and search over name and linked employee", () => {
    expect(filterUserAccounts(accounts, { search: "", role: "ZONE_MANAGER", zoneId: "", status: "" }).map((a) => a.id)).toEqual(["a"]);
    expect(filterUserAccounts(accounts, { search: "", role: "", zoneId: zoneB, status: "" }).map((a) => a.id)).toEqual(["a", "b"]);
    expect(filterUserAccounts(accounts, { search: "", role: "NONE", zoneId: "", status: "Locked" }).map((a) => a.id)).toEqual(["c"]);
    expect(filterUserAccounts([...accounts, account("d", "Dũng", [], { employeeId: "e1" })], { search: "nv0001", role: "", zoneId: "", status: "" }, new Map([["e1", "NV0001 · Dũng"]])).map((a) => a.id)).toEqual(["d"]);
  });
});

describe("worker zone hint (decision D8)", () => {
  it("lists Zone Manager zones the employee does not work in; all-zone and Accountant pairs never count", () => {
    const pairs = [pair("ZONE_MANAGER", zoneA), pair("ZONE_MANAGER", zoneB), pair("ZONE_MANAGER", null), pair("ACCOUNTANT", null)];
    expect(missingWorkingZones(pairs, [zoneA]).map((p) => p.zoneId)).toEqual([zoneB]);
  });
});

describe("toUserAccount", () => {
  it("treats a record without pairs as no role yet", () => {
    expect(toUserAccount({ id: "x", username: "u", displayName: "U", status: "Active", rowVersion: "v" }).pairs).toEqual([]);
  });
});
