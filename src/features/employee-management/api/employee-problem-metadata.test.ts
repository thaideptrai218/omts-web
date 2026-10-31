import { describe, expect, it } from "vitest";
import { employeeBackendFieldSchema, projectEmployeeProblemMetadata } from "./employee-problem-metadata";
import { employeeId, linkedAccountId } from "./employee-wire.fixtures";

describe("bounded employee problem metadata", () => {
  it.each(employeeBackendFieldSchema.options)("projects only the known field label %s", (field) => {
    expect(projectEmployeeProblemMetadata("employeeUpdate", 400, "MSG01", { code: "MSG01", field }))
      .toEqual({ kind: "invalid-fields", fields: [field] });
  });

  it("retains multiple fields in order and deduplicates without mutating input", () => {
    const input = { field: "Full name", fields: ["Full name", "Phone number", "Full name"] };
    const before = structuredClone(input);
    expect(projectEmployeeProblemMetadata("employeeUpdate", 400, "MSG01", input))
      .toEqual({ kind: "invalid-fields", fields: ["Full name", "Phone number"] });
    expect(input).toEqual(before);
  });

  it("accepts a flat JSON field name emitted by InvalidModelStateResponse", () => {
    expect(projectEmployeeProblemMetadata("employeeUpdate", 400, "MSG01", { field: "birthday" }))
      .toEqual({ kind: "invalid-fields", fields: ["Birthday"] });
  });

  it.each([
    {}, { field: "request.FullName" }, { field: "Full name", fields: [] },
    { field: "Full name", fields: ["Phone number"] },
    { field: "Full name", fields: ["Full name", "unrecognized-secret"] },
    { field: "Full name", fields: Array(13).fill("Full name") },
    { field: { value: "Full name" } }, { field: "../accountId" },
  ])("refuses malformed/ambiguous field metadata case %#", (input) => {
    expect(projectEmployeeProblemMetadata("employeeUpdate", 400, "MSG01", input)).toBeUndefined();
  });

  it("accepts only RowVersion on the unlink endpoint", () => {
    expect(projectEmployeeProblemMetadata("employeeUnlink", 400, "MSG01", { field: "RowVersion" }))
      .toEqual({ kind: "invalid-fields", fields: ["RowVersion"] });
    expect(projectEmployeeProblemMetadata("employeeUnlink", 400, "MSG01", { field: "Account" })).toBeUndefined();
    expect(projectEmployeeProblemMetadata("employeeUnlink", 400, "MSG01", { field: "rowVersion" }))
      .toEqual({ kind: "invalid-fields", fields: ["RowVersion"] });
    expect(projectEmployeeProblemMetadata("employeeUnlink", 400, "MSG01", { field: "RowVersion", fields: ["RowVersion", "Full name"] })).toBeUndefined();
  });

  it.each([
    ["fullName", "Full name"], ["phoneNumber", "Phone number"], ["address", "Address"],
    ["area", "Area"], ["ward", "Ward"], ["otherInformation", "Other information"], ["notes", "Notes"],
    ["workingZoneIds", "Working zones"], ["bankAccount", "Bank account"], ["accountId", "Account"], ["rowVersion", "RowVersion"],
  ])("normalizes declared DTO field %s without parsing messages", (field, expected) => {
    expect(projectEmployeeProblemMetadata("employeeUpdate", 400, "MSG01", { field }))
      .toEqual({ kind: "invalid-fields", fields: [expected] });
  });

  it.each(["bankAccount.accountNumber", "workingZoneIds[0]", "Request", "request.FullName", "__proto__"])(
    "does not guess unresolved model-binding path %s", (field) => {
      expect(projectEmployeeProblemMetadata("employeeUpdate", 400, "MSG01", { field })).toBeUndefined();
    },
  );

  it.each(["MSG03", "MSG24"] as const)("projects the exact employee ID for %s", (code) => {
    expect(projectEmployeeProblemMetadata("employeeUpdate", 409, code, { existingEmployeeId: employeeId }))
      .toEqual({ kind: code === "MSG03" ? "duplicate-employee" : "account-already-linked", existingEmployeeId: employeeId });
  });

  it.each([
    {}, { existingId: linkedAccountId }, { existingEmployeeId: "../employees" },
    { existingEmployeeId: null }, { existingEmployeeId: 123 },
    { existingEmployeeId: employeeId, existingId: linkedAccountId },
  ])("never treats a generic/account ID as an employee ID case %#", (input) => {
    expect(projectEmployeeProblemMetadata("employeeUpdate", 409, "MSG03", input)).toBeUndefined();
    expect(projectEmployeeProblemMetadata("employeeUpdate", 409, "MSG24", input)).toBeUndefined();
  });

  it.each(["login", "profileUpdate", "employeeList", "employeeRead", "employeeLinkableAccounts", "unknown"])(
    "does not expand error projection to endpoint %s", (endpoint) => {
      expect(projectEmployeeProblemMetadata(endpoint, 400, "MSG01", { field: "Full name" })).toBeUndefined();
      expect(projectEmployeeProblemMetadata(endpoint, 409, "MSG03", { existingEmployeeId: employeeId })).toBeUndefined();
    },
  );

  it("does not use fields/IDs for the wrong status, code or operation", () => {
    for (const status of [401, 403, 409, 500]) {
      expect(projectEmployeeProblemMetadata("employeeUpdate", status, "MSG01", { field: "Full name" })).toBeUndefined();
    }
    expect(projectEmployeeProblemMetadata("employeeUpdate", 400, "MSG03", { existingEmployeeId: employeeId })).toBeUndefined();
    expect(projectEmployeeProblemMetadata("employeeUnlink", 409, "MSG24", { existingEmployeeId: employeeId })).toBeUndefined();
    expect(projectEmployeeProblemMetadata("employeeUpdate", 409, "MSG06", {
      field: "Full name", existingEmployeeId: employeeId, currentRowVersion: "AAAAAAAA+/8=", params: { user_name: "No inference" },
    })).toBeUndefined();
  });

  it("drops every unrelated error string/header/version while keeping only validated values", () => {
    const canary = crypto.randomUUID();
    const result = projectEmployeeProblemMetadata("employeeUpdate", 409, "MSG03", {
      existingEmployeeId: employeeId, detail: canary, title: canary, hint: canary, stack: canary,
      field: canary, params: { employee_name: canary }, accessToken: canary, currentRowVersion: canary,
    });
    expect(result).toEqual({ kind: "duplicate-employee", existingEmployeeId: employeeId });
    expect(JSON.stringify(result)).not.toContain(canary);
  });
});
