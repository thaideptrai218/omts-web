import { describe, expect, it } from "vitest";
import { mapEmployeeReadSuccess } from "./map-employee-read-success";
import { employeeReadRequestSchema } from "./employee-read-request";
import { employeeDetailFixture, employeeId, employeeListItemFixture } from "./employee-wire.fixtures";

const list = employeeReadRequestSchema.parse({ endpoint: "employeeList", query: { page: 2 } });
const detail = employeeReadRequestSchema.parse({ endpoint: "employeeRead", employeeId });
const picker = employeeReadRequestSchema.parse({ endpoint: "employeeLinkableAccounts" });
const page = () => ({ items: [employeeListItemFixture()], page: 2, pageSize: 20, total: 21 });

describe("employee GET success projection", () => {
  it("keeps list paging and summaries separate from editable personal records", () => {
    const result = mapEmployeeReadSuccess(list, 200, page());
    expect(result).toMatchObject({ status: "loaded", page: {
      page: 2, pageSize: 20, total: 21, items: [{ id: employeeId, status: "employed" }],
    } });
    if (result.status !== "loaded" || !("page" in result)) throw new Error("Expected loaded list");
    expect(result.page.items[0]).not.toHaveProperty("recordVersion");
    expect(result.page.items[0]).not.toHaveProperty("bankAccount");
    expect(mapEmployeeReadSuccess(list, 200, { items: [], page: 2, pageSize: 20, total: 0 }))
      .toEqual({ status: "loaded", page: { items: [], page: 2, pageSize: 20, total: 0 } });
  });

  it.each([{ page: 1 }, { pageSize: 100 }, { items: [{ id: employeeId }] }])(
    "rejects incompatible paging or incomplete rows: %j", (change) => {
      expect(mapEmployeeReadSuccess(list, 200, { ...page(), ...change })).toEqual({ status: "invalid-response" });
    },
  );

  it("maps the complete detail, including bank/zones and opaque version", () => {
    expect(mapEmployeeReadSuccess(detail, 200, employeeDetailFixture())).toMatchObject({
      status: "loaded", employee: { id: employeeId, recordVersion: "AAAAAAAA+/8=",
        bankAccount: employeeDetailFixture().bankAccount, workingZones: employeeDetailFixture().workingZones },
    });
    expect(mapEmployeeReadSuccess(detail, 200, employeeListItemFixture())).toEqual({ status: "invalid-response" });
    expect(mapEmployeeReadSuccess(detail, 200, { ...employeeDetailFixture(), id: "122bb318-a72e-49aa-a8d7-a6169f889007" }))
      .toEqual({ status: "employee-mismatch" });
  });

  it("keeps the picker phone nullable and drops unrelated response fields", () => {
    const account = employeeListItemFixture().account;
    expect(mapEmployeeReadSuccess(picker, 200, [{ ...account, phoneNumber: null, accessToken: crypto.randomUUID() }]))
      .toEqual({ status: "loaded", accounts: [{ ...account, status: "active", phone: null }] });
    expect(mapEmployeeReadSuccess(picker, 200, [])).toEqual({ status: "loaded", accounts: [] });
    expect(mapEmployeeReadSuccess(picker, 200, [account])).toEqual({ status: "invalid-response" });
    expect(mapEmployeeReadSuccess(picker, 200, { items: [] })).toEqual({ status: "invalid-response" });
  });

  it.each([201, 202, 204, 206, 304, 401, 403, 404, 500])("never accepts HTTP%s as a loaded read", (status) => {
    expect(mapEmployeeReadSuccess(detail, status, employeeDetailFixture())).toEqual({ status: "unexpected-status" });
    expect(mapEmployeeReadSuccess(list, status, page())).toEqual({ status: "unexpected-status" });
    expect(mapEmployeeReadSuccess(picker, status, [])).toEqual({ status: "unexpected-status" });
  });
});
