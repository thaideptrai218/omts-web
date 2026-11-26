import { describe, expect, it } from "vitest";
import type { EmployeeListItemDto } from "@/features/employee-management/api/employee-contract.schemas";
import { filterNeedsAccounts, matchesAccountFilter, matchesTerm, readWithAccountFilter } from "./employee-account-filter";

const row = (id: string, fullName: string, account?: string) => ({ id, fullName, code: `NV${id}`, phoneNumber: null, account: account ? { id: account, username: account, displayName: account, status: "Active" } : null }) as unknown as EmployeeListItemDto;
const rows = [row("1", "Lan", "a1"), row("2", "Bình", "a2"), row("3", "Chi", "a3"), row("4", "Đào"), row("5", "Em", "a4")];
const ids = (filter: "" | "has" | "none") => rows.filter((item) => matchesAccountFilter(item, filter)).map((item) => item.id);

describe("employee account filter", () => {
  it("separates employees with and without an account", () => {
    expect(ids("has")).toEqual(["1", "2", "3", "5"]);
    expect(ids("none")).toEqual(["4"]);
    expect(ids("")).toHaveLength(5);
  });
  it("only reads every page when an account filter is on", () => {
    expect(filterNeedsAccounts("")).toBe(false);
    expect(filterNeedsAccounts("none")).toBe(true);
  });
  it("matches text over name, code and login name without accents", () => {
    expect(matchesTerm(rows[3], "dao")).toBe(true);
    expect(matchesTerm(rows[0], "@a1")).toBe(true);
    expect(matchesTerm(rows[0], "zzz")).toBe(false);
  });
  it("reads every page, filters, then returns the asked page with the true total", async () => {
    const read = async (page: number) => ({ status: "success" as const, data: { items: page === 1 ? rows : [], page, pageSize: 100, total: rows.length } });
    const result = await readWithAccountFilter(read, "has", "", 2, 3);
    expect(result.status === "success" && result.data.items.map((item) => item.id)).toEqual(["5"]);
    expect(result.status === "success" && result.data.total).toBe(4);
  });
  it("hands a failed read back unchanged", async () => {
    const failed = { status: "error" as const, httpStatus: 500, uncertain: false };
    expect(await readWithAccountFilter(async () => failed, "has", "", 1, 10)).toEqual(failed);
  });
});
