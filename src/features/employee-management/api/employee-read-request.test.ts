import { describe, expect, it } from "vitest";
import { employeeListQuerySchema, parseEmployeeListSearchParams, prepareEmployeeReadRequest } from "./employee-read-request";
import { employeeId, workingZoneId } from "./employee-wire.fixtures";

describe("employee GET requests and wire query", () => {
  it("uses backend paging defaults without choosing the UI's initial status filter", () => {
    expect(employeeListQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    const result = prepareEmployeeReadRequest({ endpoint: "employeeList", query: {} });
    if (result.status !== "prepared") throw new Error("Expected GET");
    const url = new URL(result.request.path, "https://backend.example.test");
    expect(url.pathname).toBe("/api/employees");
    expect(Object.fromEntries(url.searchParams)).toEqual({ page: "1", pageSize: "20" });
    expect(result.request.method).toBe("GET");
    expect(result.request).not.toHaveProperty("body");
  });

  it("preserves Unicode, phone prefix and metacharacters through one URL round-trip", () => {
    const query = { search: "  Nguyễn +84900000000 & statusId=402 / %20  ", statusId: 401, zoneId: workingZoneId, page: 2, pageSize: 100 };
    const result = prepareEmployeeReadRequest({ endpoint: "employeeList", query });
    if (result.status !== "prepared") throw new Error("Expected GET");
    const url = new URL(result.request.path, "https://backend.example.test");
    expect(url.searchParams.getAll("search")).toEqual([query.search]);
    expect(url.searchParams.getAll("statusId")).toEqual(["401"]);
    expect(parseEmployeeListSearchParams(url.searchParams)).toEqual({ status: "parsed", query });
  });

  it("keeps omitted status/all separate from employed/left and preserves empty search", () => {
    expect(parseEmployeeListSearchParams(new URLSearchParams("statusId=401")))
      .toMatchObject({ status: "parsed", query: { statusId: 401 } });
    expect(parseEmployeeListSearchParams(new URLSearchParams("statusId=402")))
      .toMatchObject({ status: "parsed", query: { statusId: 402 } });
    expect(parseEmployeeListSearchParams(new URLSearchParams("search=")))
      .toEqual({ status: "parsed", query: { search: "", page: 1, pageSize: 20 } });
  });

  it.each([
    "page=0", "page=-1", "page=1.5", "page=1junk", "page=", "page=2147483648", "page=1e2",
    "pageSize=101", "pageSize=0", "statusId=301", "statusId=Employed", "statusId=",
    "zoneId=mock-zone", "zoneId=", "url=https://other.example.test", "__proto__=x",
    "page=1&page=2", "search=An&search=Binh", "zoneId=x&zoneId=y",
  ])("rejects incompatible or ambiguous query: %s", (query) => {
    expect(parseEmployeeListSearchParams(new URLSearchParams(query))).toEqual({ status: "invalid-input" });
  });

  it.each([
    {}, { endpoint: "employeeList", query: { page: "1" } },
    { endpoint: "employeeList", query: { statusId: null } },
    { endpoint: "employeeList", query: { search: { toString: () => "not-a-string" } } },
    { endpoint: "employeeRead", employeeId: "../accounts" },
    { endpoint: "employeeRead", employeeId, query: {} },
    { endpoint: "employeeLinkableAccounts", employeeId },
    { endpoint: "employeeLinkableAccounts", query: { zoneId: workingZoneId } },
    { endpoint: "employeeRead", employeeId, headers: { Cookie: "browser-only" } },
    { endpoint: "https://other.example.test/api/employees" },
  ])("rejects arbitrary read targets/parameters case %#", (input) => {
    expect(prepareEmployeeReadRequest(input)).toEqual({ status: "invalid-input" });
  });

  it("uses a GUID detail route and a distinct linkable-account picker route", () => {
    expect(prepareEmployeeReadRequest({ endpoint: "employeeRead", employeeId })).toEqual({ status: "prepared", request: {
      method: "GET", path: `/api/employees/${employeeId}`, headers: { Accept: "application/json" },
    } });
    expect(prepareEmployeeReadRequest({ endpoint: "employeeLinkableAccounts" })).toEqual({ status: "prepared", request: {
      method: "GET", path: "/api/employees/linkable-accounts", headers: { Accept: "application/json" },
    } });
  });

  it("refuses an Int32 overflow in backend Skip without clamping a requested page", () => {
    expect(employeeListQuerySchema.safeParse({ page: 107_374_183, pageSize: 20 }).success).toBe(true);
    expect(employeeListQuerySchema.safeParse({ page: 107_374_184, pageSize: 20 }).success).toBe(false);
    expect(parseEmployeeListSearchParams(new URLSearchParams("page=107374184&pageSize=20")))
      .toEqual({ status: "invalid-input" });
  });
});
