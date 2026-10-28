import { describe, expect, it } from "vitest";
import { bindEmployeeEditorProblem } from "./employee-editor-problem";
import type { BindableEmployeeProblem } from "../domain/employee-problem";

describe("employee issue binding plan", () => {
  it("orders field errors by the rendered form, retains every target in its summary", () => {
    const problem: BindableEmployeeProblem = { status: "invalid-fields", code: "MSG01",
      fields: ["notes", "phone", "wardCommune", "birthday", "phone", "bankAccount", "recordVersion"] };
    const before = structuredClone(problem);
    const result = bindEmployeeEditorProblem(problem);
    expect(result.fieldErrors.map((error) => error.field)).toEqual(["phone", "birthday", "bankAccount", "wardCommune", "notes"]);
    expect(result.summary).toContain("Thông tin ngân hàng");
    expect(result.summary).toContain("Phiên bản hồ sơ");
    expect(result.summary).toContain("Phường/Xã");
    expect(problem).toEqual(before);
  });

  it("binds existing groups while keeping the version at form level", () => {
    const result = bindEmployeeEditorProblem({ status: "invalid-fields", code: "MSG01", fields: ["bankAccount", "workingZoneIds", "recordVersion"] });
    expect(result.fieldErrors.map((error) => error.field)).toEqual(["workingZoneIds", "bankAccount"]);
    expect(result.summary).toContain("Thông tin ngân hàng");
    expect(result.summary).toContain("Vùng làm việc");
    expect(result.summary).toContain("Phiên bản hồ sơ");
    expect(result).not.toHaveProperty("existingEmployeeId");
  });

  it("makes a duplicate ID available for an explicit user action only", () => {
    const id = "b669dc43-c9dc-4df8-930b-ab9de6d978e3";
    const result = bindEmployeeEditorProblem({ status: "duplicate", code: "MSG03", existingEmployeeId: id });
    expect(result.existingEmployeeId).toBe(id);
    expect(result.fieldErrors.map((error) => error.field)).toEqual(["fullName"]);
    expect(result.summary).toContain("Hồ sơ nhân viên đã tồn tại");
    expect(result).not.toHaveProperty("url");
  });
});
