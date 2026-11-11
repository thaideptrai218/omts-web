import { describe, expect, it } from "vitest";
import { employeeListItemSchema, employeeViewSchema } from "./employee-contract.schemas";
import { projectEmployeeProblemMetadata } from "./employee-problem-metadata";
import { parseEmployeeExportSearchParams, parseEmployeeListSearchParams } from "./employee-read-request";
import { employeeUpdateRequestSchema } from "./employee-update.schema";
import { employeeDetailFixture, employeeListItemFixture, employeeId } from "./employee-wire.fixtures";

const update = () => ({ fullName: "An", workingZoneIds: [], rowVersion: "AAAAAAAA+/8=" });
const zone = "122bb318-a72e-49aa-a8d7-a6169f889007";

describe("employee code and profile fields: wire contract", () => {
  it("requires the code on list items and accepts the new detail fields as null", () => {
    expect(employeeListItemSchema.safeParse(employeeListItemFixture()).success).toBe(true);
    const { code: _code, ...withoutCode } = employeeListItemFixture(); void _code;
    expect(employeeListItemSchema.safeParse(withoutCode).success).toBe(false);
    expect(employeeViewSchema.parse({ ...employeeDetailFixture(), gender: null, idNumber: null, startDate: null })).toMatchObject({ gender: null, idNumber: null, startDate: null });
    expect(employeeViewSchema.parse({ ...employeeDetailFixture(), email: "legacy@example.test" })).not.toHaveProperty("email");
  });
  it.each([["gender", "Robot"], ["startDate", "2026-13-40"]])("rejects an invalid %s from the backend", (key, value) => {
    expect(employeeViewSchema.safeParse({ ...employeeDetailFixture(), [key]: value }).success).toBe(false);
  });
  it("accepts and rejects the update fields the way the backend does", () => {
    for (const ok of [{ code: "NV-01" }, { code: "" }, { code: null }, { gender: "Other" }, { gender: null }, { idNumber: "123456789" }, { idNumber: "123456789012" }, { idNumber: "" }, { idNumber: null }, { startDate: "2025-03-01" }]) {
      expect(employeeUpdateRequestSchema.safeParse({ ...update(), ...ok }).success, JSON.stringify(ok)).toBe(true);
    }
    for (const bad of [{ code: "NV 01" }, { code: "NV_01" }, { code: "A".repeat(21) }, { gender: "male" }, { idNumber: "12345678" }, { idNumber: "1234567890123" }, { idNumber: "12345678901a" }, { startDate: "01/03/2025" }, { email: "a@example.test" }]) {
      expect(employeeUpdateRequestSchema.safeParse({ ...update(), ...bad }).success, JSON.stringify(bad)).toBe(false);
    }
  });
});

describe("employee list query: type, job type and sort", () => {
  it("parses the new filters and sort", () => {
    const parsed = parseEmployeeListSearchParams(new URLSearchParams(`employeeType=Staff&jobTypeId=${zone}&sortBy=lastWorkingDay&sortDir=desc`));
    expect(parsed).toMatchObject({ status: "parsed", query: { employeeType: "Staff", jobTypeId: zone, sortBy: "lastWorkingDay", sortDir: "desc" } });
  });
  it.each(["employeeType=staff", "jobTypeId=x", "sortBy=salary", "sortDir=ASC", "sortBy=name&sortBy=code"])("rejects %s", query => {
    expect(parseEmployeeListSearchParams(new URLSearchParams(query)).status).toBe("invalid-input");
  });
  it.each(["name", "code", "phone", "type", "status", "lastWorkingDay"])("accepts sortBy=%s", sortBy => {
    expect(parseEmployeeListSearchParams(new URLSearchParams(`sortBy=${sortBy}`)).status).toBe("parsed");
  });
});

describe("employee export query", () => {
  it("parses filters and sort without paging", () => {
    expect(parseEmployeeExportSearchParams(new URLSearchParams(`search=an&statusId=401&zoneId=${zone}&employeeType=SeasonalWorker&jobTypeId=${employeeId}&sortBy=name&sortDir=asc`))).toMatchObject({ status: "parsed", query: { statusId: 401, sortBy: "name" } });
    expect(parseEmployeeExportSearchParams(new URLSearchParams("")).status).toBe("parsed");
  });
  it("takes ids on their own with an optional order", () => {
    expect(parseEmployeeExportSearchParams(new URLSearchParams(`ids=${zone}&ids=${employeeId}&sortBy=code`))).toMatchObject({ status: "parsed", query: { ids: [zone, employeeId], sortBy: "code" } });
    for (const bad of [`ids=${zone}&search=an`, `ids=${zone}&statusId=401`, `ids=${zone}&ids=${zone}`, "ids=1", "page=1", "pageSize=20"]) expect(parseEmployeeExportSearchParams(new URLSearchParams(bad)).status, bad).toBe("invalid-input");
  });
  it("allows 200 ids and refuses 201", () => {
    const ids = (count: number) => new URLSearchParams(Array.from({ length: count }, () => `ids=${crypto.randomUUID()}`).join("&"));
    expect(parseEmployeeExportSearchParams(ids(200)).status).toBe("parsed");
    expect(parseEmployeeExportSearchParams(ids(201)).status).toBe("invalid-input");
  });
});

describe("employee problem metadata for the new fields", () => {
  it.each(["Code", "Gender", "ID number", "Start date"])("projects the backend field label %s", field => {
    expect(projectEmployeeProblemMetadata("employeeUpdate", 400, "MSG-GEN-01", { field })).toEqual({ kind: "invalid-fields", fields: [field] });
  });
  it("normalizes the JSON property names of the new fields", () => {
    expect(projectEmployeeProblemMetadata("employeeCreate", 400, "MSG01", { field: "idNumber", fields: ["idNumber", "startDate"] })).toEqual({ kind: "invalid-fields", fields: ["ID number", "Start date"] });
  });
  it("gives a duplicate code (existingId, not an employee id) no duplicate-employee metadata", () => {
    expect(projectEmployeeProblemMetadata("employeeUpdate", 409, "MSG-GEN-02", { field: "Code", existingId: employeeId })).toBeUndefined();
  });
});
