import { describe, expect, it } from "vitest";
import {
  employeeListItemSchema, employeePageSchema, employeeSavedSchema,
  employeeViewSchema,
} from "./employee-contract.schemas";
import { employeeDetailFixture, employeeListItemFixture } from "./employee-wire.fixtures";

describe("employee response contract at backend db158b44", () => {
  it("distinguishes a paged summary from the complete editable record", () => {
    const summary = employeeListItemFixture();
    const page = { items: [summary], page: 1, pageSize: 20, total: 1 };
    expect(employeePageSchema.parse(page)).toEqual(page);
    expect(employeeViewSchema.safeParse(summary).success).toBe(false);
    expect(employeeListItemSchema.parse(employeeDetailFixture())).toEqual(summary);
  });

  it("accepts empty lists without inventing rows or pages", () => {
    const page = { items: [], page: 2, pageSize: 20, total: 0 };
    expect(employeePageSchema.parse(page)).toEqual(page);
  });

  it("preserves Unicode, date-only text, bank leading zeros and the exact version", () => {
    const detail = employeeDetailFixture();
    expect(employeeViewSchema.parse(detail)).toEqual(detail);
    expect(employeeSavedSchema.parse({ employee: detail, message: "Saved", messageCode: "MSG-GEN-05" }))
      .toEqual({ employee: detail, message: "Saved", messageCode: "MSG-GEN-05" });
  });

  it("keeps nullable values separate from empty strings and missing fields", () => {
    const detail = {
      ...employeeDetailFixture(), birthday: null, phoneNumber: null, address: "",
      area: null, ward: null, otherInformation: null, notes: null,
      workingZones: [], account: null, bankAccount: null,
    };
    expect(employeeViewSchema.parse(detail)).toEqual(detail);
    expect(employeeViewSchema.safeParse({ ...detail, birthday: "" }).success).toBe(false);
    expect(employeeViewSchema.safeParse({ ...detail, bankAccount: undefined }).success).toBe(true);
  });

  it.each(Object.keys(employeeListItemFixture()).concat(["typeHistory", "hasStaffAccount"]))("rejects a missing detail field: %s", (field) => {
    const incomplete: Record<string, unknown> = employeeDetailFixture();
    delete incomplete[field];
    expect(employeeViewSchema.safeParse(incomplete).success).toBe(false);
  });

  it.each([
    { id: "local-mock-id" }, { fullName: " " }, { phoneNumber: 900000000 },
    { birthday: "2025-02-29" }, { birthday: "2026-04-31" }, { birthday: "0000-01-01" },
    { birthday: "1996-02-29T00:00:00Z" }, { lastWorkingDay: "2026-13-01" },
    { status: "Working" }, { status: 401 },
    { account: { ...employeeListItemFixture().account, status: "Disabled" } },
    { account: { id: employeeDetailFixture().id } },
    { workingZones: null }, { workingZones: [{ id: "local-zone", code: "V1", name: "Đông" }] },
    { bankAccount: { bankName: "Chưa đủ thông tin" } },
    { bankAccount: { ...employeeDetailFixture().bankAccount, accountNumber: 123456 } },
    { rowVersion: "" }, { rowVersion: "opaque:not-base64" }, { rowVersion: 1 },
  ])("rejects incompatible response data: %j", (change) => {
    expect(employeeViewSchema.safeParse({ ...employeeDetailFixture(), ...change }).success).toBe(false);
  });

  it.each([
    { page: 0 }, { page: "1" }, { pageSize: 101 }, { pageSize: 0 },
    { total: -1 }, { total: 1.5 }, { items: null },
  ])("rejects incompatible pagination without coercing it: %j", (change) => {
    expect(employeePageSchema.safeParse({ items: [], page: 1, pageSize: 20, total: 0, ...change }).success)
      .toBe(false);
  });

  it("reads the actual save envelope, not a bare record or 204", () => {
    expect(employeeSavedSchema.safeParse(employeeDetailFixture()).success).toBe(false);
    expect(employeeSavedSchema.safeParse(undefined).success).toBe(false);
  });

  it("drops additive fields at every level and keeps credentials outside this projection", () => {
    const detail = employeeDetailFixture();
    const extra = { privateField: "not-for-the-UI" };
    const input = {
      employee: {
        ...detail, ...extra, account: { ...detail.account, ...extra },
        bankAccount: { ...detail.bankAccount, ...extra },
        workingZones: detail.workingZones.map((zone) => ({ ...zone, ...extra })),
      },
      message: "Saved", messageCode: "MSG-GEN-05", temporaryPassword: crypto.randomUUID(), ...extra,
    };
    expect(employeeSavedSchema.parse(input)).toEqual({ employee: detail, message: "Saved", messageCode: "MSG-GEN-05" });
    expect(input.employee).toHaveProperty("privateField");
  });

  it("accepts redacted personal fields when maintenance is unavailable", () => {
    const redacted = { ...employeeListItemFixture(), canMaintain: false, typeHistory: [], hasStaffAccount: false };
    expect(employeeViewSchema.parse(redacted)).toEqual(redacted);
    expect(employeeListItemSchema.parse({ ...employeeListItemFixture(), employeeType: null }).employeeType).toBeNull();
  });
});
