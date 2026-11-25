import { describe, expect, it } from "vitest";
import type { EmployeeListItemDto } from "@/features/employee-management/api/employee-contract.schemas";
import type { UserAccount, UserPair } from "@/features/account-access/user-account-model";
import { emptyAccountFilters, filtersNeedAccounts, matchesAccountFilters, matchesTerm, readWithAccountFilters } from "./employee-account-filter";

const zoneA = "11111111-1111-4111-8111-111111111111", zoneB = "22222222-2222-4222-8222-222222222222";
const pair = (role: string, zoneId: string | null): UserPair => ({ id: `${role}-${zoneId}`, role, roleName: role, zoneId, zoneName: null, allZones: zoneId === null });
const login = (id: string, pairs: UserPair[]): UserAccount => ({ id, username: id, displayName: id, phoneNumber: null, email: null, status: "Active", employeeId: null, pairs, rowVersion: "v" });
const accounts = new Map([["a1", login("a1", [pair("ZONE_MANAGER", zoneA)])], ["a2", login("a2", [pair("ACCOUNTANT", null)])], ["a3", login("a3", [])], ["a4", login("a4", [pair("ZONE_MANAGER", null)])]]);
const row = (id: string, fullName: string, account?: string) => ({ id, fullName, code: `NV${id}`, phoneNumber: null, account: account ? { id: account, username: account, displayName: account, status: "Active" } : null }) as unknown as EmployeeListItemDto;
const rows = [row("1", "Lan", "a1"), row("2", "Bình", "a2"), row("3", "Chi", "a3"), row("4", "Đào"), row("5", "Em", "a4")];
const ids = (filters: Partial<typeof emptyAccountFilters>) => rows.filter((item) => matchesAccountFilters(item, { ...emptyAccountFilters, ...filters }, accounts)).map((item) => item.id);

describe("employee account filters", () => {
  it("separates employees with and without a login", () => {
    expect(ids({ account: "has" })).toEqual(["1", "2", "3", "5"]);
    expect(ids({ account: "none" })).toEqual(["4"]);
  });
  it("filters by the role of the login, with 'no role yet' as its own choice", () => {
    expect(ids({ role: "ZONE_MANAGER" })).toEqual(["1", "5"]);
    expect(ids({ role: "ACCOUNTANT" })).toEqual(["2"]);
    expect(ids({ role: "NONE" })).toEqual(["3"]);
  });
  it("a zone matches its own pair and any all-zones pair, never an employee without a login", () => {
    expect(ids({ grantZoneId: zoneA })).toEqual(["1", "2", "5"]);
    expect(ids({ grantZoneId: zoneB })).toEqual(["2", "5"]);
  });
  it("only needs the account list when a login filter is on", () => {
    expect(filtersNeedAccounts(emptyAccountFilters)).toBe(false);
    expect(filtersNeedAccounts({ ...emptyAccountFilters, account: "unlinked" })).toBe(false);
    expect(filtersNeedAccounts({ ...emptyAccountFilters, role: "ACCOUNTANT" })).toBe(true);
  });
  it("matches text over name, code and login name without accents", () => {
    expect(matchesTerm(rows[3], "dao")).toBe(true);
    expect(matchesTerm(rows[0], "@a1")).toBe(true);
    expect(matchesTerm(rows[0], "zzz")).toBe(false);
  });
  it("reads every page, filters, then returns the asked page with the true total", async () => {
    const read = async (page: number) => ({ status: "success" as const, data: { items: page === 1 ? rows : [], page, pageSize: 100, total: rows.length } });
    const result = await readWithAccountFilters(read, { ...emptyAccountFilters, account: "has" }, accounts, "", 2, 3);
    expect(result.status === "success" && result.data.items.map((item) => item.id)).toEqual(["5"]);
    expect(result.status === "success" && result.data.total).toBe(4);
  });
  it("hands a failed read back unchanged", async () => {
    const failed = { status: "error" as const, httpStatus: 500, uncertain: false };
    expect(await readWithAccountFilters(async () => failed, emptyAccountFilters, accounts, "", 1, 10)).toEqual(failed);
  });
});
