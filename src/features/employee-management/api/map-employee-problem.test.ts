import { describe, expect, it } from "vitest";
import { mapEmployeeProblem } from "./map-employee-problem";
import { employeeId, linkedAccountId } from "./employee-wire.fixtures";

describe("employee problem to UI-neutral issue DTO", () => {
  it("maps exact backend labels to stable field targets, preserving groups/version", () => {
    expect(mapEmployeeProblem("employeeUpdate", 400, "MSG01", {
      kind: "invalid-fields", fields: ["Full name", "Phone number", "Ward", "Working zones", "Bank account", "Account", "RowVersion"],
    })).toEqual({ status: "invalid-fields", code: "MSG01",
      fields: ["fullName", "phone", "wardCommune", "workingZoneIds", "bankAccount", "accountId", "recordVersion"] });
  });

  it("keeps one bank-group issue rather than inventing errors on three child fields", () => {
    expect(mapEmployeeProblem("employeeUpdate", 400, "MSG01", { kind: "invalid-fields", fields: ["Bank account", "Bank account"] }))
      .toEqual({ status: "invalid-fields", code: "MSG01", fields: ["bankAccount"] });
    expect(mapEmployeeProblem("employeeUnlink", 400, "MSG01", { kind: "invalid-fields", fields: ["RowVersion"] }))
      .toEqual({ status: "invalid-fields", code: "MSG01", fields: ["recordVersion"] });
  });

  it("keeps duplicate and account-link conflict IDs without automatic navigation/messages", () => {
    expect(mapEmployeeProblem("employeeUpdate", 409, "MSG03", { kind: "duplicate-employee", existingEmployeeId: employeeId }))
      .toEqual({ status: "duplicate", code: "MSG03", existingEmployeeId: employeeId });
    const link = mapEmployeeProblem("employeeUpdate", 409, "MSG24", { kind: "account-already-linked", existingEmployeeId: employeeId });
    expect(link).toEqual({ status: "account-already-linked", code: "MSG24", existingEmployeeId: employeeId });
    expect(link).not.toHaveProperty("message"); expect(link).not.toHaveProperty("employee_name");
    expect(link).not.toHaveProperty("url");
  });

  it.each([
    undefined, {}, { kind: "invalid-fields", fields: [] },
    { kind: "invalid-fields", fields: ["__proto__"] },
    { kind: "invalid-fields", fields: ["Full name"], accessToken: crypto.randomUUID() },
    { kind: "duplicate-employee", existingEmployeeId: employeeId },
  ])("blocks unusable validation metadata without fabricating a field case %#", (metadata) => {
    expect(mapEmployeeProblem("employeeUpdate", 400, "MSG01", metadata))
      .toEqual({ status: "contract-blocked", reason: "employee-error-metadata", code: "MSG01" });
  });

  it.each([
    undefined, { kind: "duplicate-employee", existingId: linkedAccountId },
    { kind: "duplicate-employee", existingEmployeeId: "not-a-guid" },
    { kind: "account-already-linked", existingEmployeeId: employeeId },
  ])("blocks missing/wrong duplicate identity metadata case %#", (metadata) => {
    expect(mapEmployeeProblem("employeeUpdate", 409, "MSG03", metadata))
      .toEqual({ status: "contract-blocked", reason: "employee-error-metadata", code: "MSG03" });
  });

  it("rejects an unlink field outside the RowVersion contract", () => {
    expect(mapEmployeeProblem("employeeUnlink", 400, "MSG01", { kind: "invalid-fields", fields: ["Account"] }))
      .toEqual({ status: "contract-blocked", reason: "employee-error-metadata", code: "MSG01" });
  });

  it.each(["MSG06", "MSG19", "MSG999", null, 1])("does not handle code %s or infer metadata from its text", (code) => {
    expect(mapEmployeeProblem("employeeUpdate", 409, code, { kind: "duplicate-employee", existingEmployeeId: employeeId })).toBeUndefined();
  });

  it("requires the expected endpoint/status as well as code", () => {
    const metadata = { kind: "duplicate-employee", existingEmployeeId: employeeId };
    expect(mapEmployeeProblem("employeeRead", 409, "MSG03", metadata)).toBeUndefined();
    expect(mapEmployeeProblem("employeeUnlink", 409, "MSG03", metadata)).toBeUndefined();
    expect(mapEmployeeProblem("employeeUpdate", 500, "MSG03", metadata)).toBeUndefined();
    expect(mapEmployeeProblem("employeeUpdate", 409, "MSG01", metadata)).toBeUndefined();
  });
});
