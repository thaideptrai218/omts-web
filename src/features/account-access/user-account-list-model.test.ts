import { describe, expect, it } from "vitest";
import { accountState, emptyUserFilters, filterUserAccounts, hasUserFilters, sortUserAccounts } from "./user-account-list-model";
import type { UserAccount, UserPair } from "./user-account-model";

const zoneA = "11111111-1111-4111-8111-111111111111", zoneB = "22222222-2222-4222-8222-222222222222";
const pair = (role: string, zoneId: string | null): UserPair => ({ id: `${role}-${zoneId}`, role, roleName: role, zoneId, zoneName: null, allZones: zoneId === null });
const account = (id: string, displayName: string, pairs: UserPair[] = [], extra: Partial<UserAccount> = {}): UserAccount =>
  ({ id, displayName, username: id, phoneNumber: null, email: null, status: "Active", employeeId: null, pairs, rowVersion: "v", note: null, mustChangePassword: false, deleted: false, ...extra });
const accounts = [
  account("a", "An", [pair("ZONE_MANAGER", zoneA), pair("ZONE_MANAGER", zoneB)], { employeeId: "e1" }),
  account("b", "Bình", [pair("ACCOUNTANT", null)], { phoneNumber: "0900000002" }),
  account("c", "Chi", [], { status: "Locked" }),
  account("d", "Dũng", [], { mustChangePassword: true, email: "dung@example.com" }),
  account("e", "Em", [], { status: "Deleted", deleted: true }),
];
const ids = (filters: Partial<typeof emptyUserFilters>, names?: ReadonlyMap<string, string>) => filterUserAccounts(accounts, { ...emptyUserFilters, ...filters }, names).map((row) => row.id);

describe("account state", () => {
  it("tells active, pending password, locked and deleted apart", () => {
    expect(accounts.map(accountState)).toEqual(["active", "active", "locked", "pending", "deleted"]);
  });
  it("a locked account is locked even while its password is still temporary", () => {
    expect(accountState(account("x", "X", [], { status: "Locked", mustChangePassword: true }))).toBe("locked");
  });
});

describe("account list filters", () => {
  it("filters by role, with 'no role yet' as its own choice", () => {
    expect(ids({ role: "ZONE_MANAGER" })).toEqual(["a"]);
    expect(ids({ role: "ACCOUNTANT" })).toEqual(["b"]);
    expect(ids({ role: "NONE" })).toEqual(["c", "d", "e"]);
  });
  it("a zone matches its own pair and any all-zones pair", () => {
    expect(ids({ zoneId: zoneB })).toEqual(["a", "b"]);
    expect(ids({ zoneId: "33333333-3333-4333-8333-333333333333" })).toEqual(["b"]);
  });
  it("filters by state and by whether an employee is linked", () => {
    expect(ids({ state: "locked" })).toEqual(["c"]);
    expect(ids({ state: "pending" })).toEqual(["d"]);
    expect(ids({ state: "deleted" })).toEqual(["e"]);
    expect(ids({ employee: "yes" })).toEqual(["a"]);
    expect(ids({ employee: "no" })).toEqual(["b", "c", "d", "e"]);
  });
  it("searches login name, name, phone, email and the linked employee's name, ignoring accents and a leading @", () => {
    expect(ids({ search: "binh" })).toEqual(["b"]);
    expect(ids({ search: "@b" })).toEqual(["b"]);
    expect(ids({ search: "0900000002" })).toEqual(["b"]);
    expect(ids({ search: "dung@example" })).toEqual(["d"]);
    expect(ids({ search: "nguyễn văn an" }, new Map([["e1", "Nguyễn Văn An"]]))).toEqual(["a"]);
    expect(ids({ search: "zzz" })).toEqual([]);
  });
  it("knows when any filter is on", () => {
    expect(hasUserFilters(emptyUserFilters)).toBe(false);
    expect(hasUserFilters({ ...emptyUserFilters, employee: "no" })).toBe(true);
  });
});

describe("account list sort", () => {
  it("sorts by name in Vietnamese order both ways, leaves the input alone, and keeps empty values last", () => {
    expect(sortUserAccounts(accounts, { key: "name", direction: "desc" }).map((row) => row.id)).toEqual(["e", "d", "c", "b", "a"]);
    expect(sortUserAccounts(accounts, { key: "phone", direction: "asc" }).map((row) => row.id)[0]).toBe("b");
    expect(sortUserAccounts(accounts, { key: "", direction: "asc" }).map((row) => row.id)).toEqual(["a", "b", "c", "d", "e"]);
    expect(accounts.map((row) => row.id)).toEqual(["a", "b", "c", "d", "e"]);
  });
});
