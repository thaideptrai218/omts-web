// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ subjectType: "CooperativeOwner", actions: [] as string[] }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({
  useApiWorkspace: () => ({
    identity: { subjectType: state.subjectType },
    permissions: { functionPermissions: state.actions.map((action) => ({ functionCode: "PAYROLL", action, dataScope: "AssignedZone", scope: { kind: "all-zones" } })) },
  }),
}));
import { usePayrollOwner, usePayrollWriter } from "./use-payroll-writer";

const as = (subjectType: string, actions: string[] = []) => { state.subjectType = subjectType; state.actions = actions; };

it("the Owner prepares sheets, pays wages and finalizes", () => {
  as("CooperativeOwner");
  expect(renderHook(() => usePayrollWriter()).result.current).toBe(true);
  expect(renderHook(() => usePayrollOwner()).result.current).toBe(true);
});

it("the Accountant pays wages and prepares sheets but does not finalize, cancel or adjust", () => {
  as("Staff", ["View", "Create", "Edit", "Export"]);
  expect(renderHook(() => usePayrollWriter()).result.current).toBe(true);
  expect(renderHook(() => usePayrollOwner()).result.current).toBe(false);
});

it("a Staff account with only a view of payroll writes nothing", () => {
  as("Staff", ["View", "Export"]);
  expect(renderHook(() => usePayrollWriter()).result.current).toBe(false);
  as("Staff", ["View", "Create"]);
  expect(renderHook(() => usePayrollWriter()).result.current).toBe(false);
  as("Trader", ["View", "Create", "Edit"]);
  expect(renderHook(() => usePayrollWriter()).result.current).toBe(false);
});
