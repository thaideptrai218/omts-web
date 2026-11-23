import { describe, expect, it } from "vitest";
import type { FunctionPermission } from "@/features/access/domain/function-permission";
import { workspaceRoleLabel } from "./actor-label";

const held = (...codes: string[]): FunctionPermission[] => codes.map((functionCode) => ({
  functionCode, action: "View", scope: { kind: "all-zones" }, dataScope: "AssignedZone",
}) as FunctionPermission);

describe("workspaceRoleLabel", () => {
  it("labels an Accountant who also views purchase receipts as Kế toán only", () => {
    expect(workspaceRoleLabel("Staff", held("PURCHASE_RECEIPTS", "SUPPLIER_PAYMENTS", "PAYROLL"))).toBe("Kế toán");
  });
  it("recognises the PAYROLL code on its own", () => {
    expect(workspaceRoleLabel("Staff", held("PAYROLL"))).toBe("Kế toán");
  });
  it("labels a Zone Manager from farming codes", () => {
    expect(workspaceRoleLabel("Staff", held("CULTIVATION_CYCLES", "PURCHASE_RECEIPTS"))).toBe("Quản lý vùng");
  });
  it("shows both labels for a Staff account holding both roles", () => {
    expect(workspaceRoleLabel("Staff", held("WORK_ASSIGNMENTS", "CUSTOMER_DEBTS"))).toBe("Quản lý vùng · Kế toán");
  });
});
