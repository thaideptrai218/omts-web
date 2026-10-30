import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { planOperation } from "./operation-plan";
import { operationAllowed } from "@/features/operations/permissions";
import { ids } from "@/features/operations/__tests__/fixtures";
import type { FunctionPermission } from "@/features/access/domain/function-permission";
const q = (s = "") => new URLSearchParams(s);
describe("new real modules read contracts", () => {
  it("uses separate personal and cooperative request paths", () => {
    expect(planOperation("purchase-requests", "GET", q("action=mine&status=ACCEPTED&page=2"))).toMatchObject({ path: "/api/me/purchase-requests?page=2&pageSize=20&status=ACCEPTED", permission: "Mine" });
    expect(planOperation("purchase-requests", "GET", q(`action=detail&id=${ids.receipt}`))).toMatchObject({ path: `/api/purchase-requests/${ids.receipt}`, expectedId: ids.receipt, permission: "Review" });
  });
  it.each(["accountId=x", "action=mine&customerId=x", "action=mine&status=Draft", "action=list&id=not-guid", "action=mine&page=0", "action=mine&page=1&page=2", `action=detail&id=${ids.receipt}&page=2`, "action=detail"])("rejects unsupported request query %s", (query) => {
    expect(planOperation("purchase-requests", "GET", q(query))).toBeUndefined();
  });
  it("keeps product availability and workforce date explicit", () => {
    expect(planOperation("sales-products", "GET", q("action=all"))).toMatchObject({ permission: "CatalogueAll", path: "/api/sales-products?includeUnavailable=true" });
    expect(planOperation("workforce", "GET", q("day=2026-10-31"))).toMatchObject({ path: "/api/workforce/assignments?day=2026-10-31" });
    expect(planOperation("workforce", "GET", q("day=2026-02-30"))).toBeUndefined();
    expect(planOperation("workforce", "GET", q("day=2026-10-31&employeeId=x"))).toBeUndefined();
  });
  it("does not enable unapproved writes through a read module", () => {
    for (const area of ["purchase-requests", "sales-products", "workforce"]) expect(planOperation(area, "POST", q(), { action: "create", body: {} })).toBeUndefined();
  });
  it("never infers personal or Owner access from a staff role label", () => {
    expect(operationAllowed("purchase-requests", { subjectType: "Trader" }, [], "Mine")).toBe(true);
    expect(operationAllowed("purchase-requests", { subjectType: "Trader" }, [], "Review")).toBe(false);
    expect(operationAllowed("sales-products", { subjectType: "Trader" }, [], "CatalogueAll")).toBe(false);
    const p: FunctionPermission = { functionCode: "PURCHASE_REQUESTS", action: "View", dataScope: "OwnRecords", scope: { kind: "zones", zoneIds: [ids.zone] } };
    expect(operationAllowed("purchase-requests", { subjectType: "Staff" }, [p], "Review")).toBe(false);
    expect(operationAllowed("purchase-requests", { subjectType: "Staff" }, [{ ...p, dataScope: "AssignedZone" }], "Review")).toBe(true);
  });
  it("unions the granted work and attendance view zones without broadening own-record grants", () => {
    const p: FunctionPermission = { functionCode: "ATTENDANCE", action: "View", dataScope: "AssignedZone", scope: { kind: "zones", zoneIds: [ids.zone] } };
    expect(operationAllowed("workforce", { subjectType: "Staff" }, [p], "View", ids.zone)).toBe(true);
    expect(operationAllowed("workforce", { subjectType: "Staff" }, [p], "View", ids.otherZone)).toBe(false);
    expect(operationAllowed("workforce", { subjectType: "Staff" }, [{ ...p, dataScope: "OwnRecords" }])).toBe(false);
    expect(operationAllowed("workforce", { subjectType: "Trader" }, [p])).toBe(false);
  });
});
