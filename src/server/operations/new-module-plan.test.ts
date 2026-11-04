import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { planOperation } from "./operation-plan";
import { operationAllowed } from "@/features/operations/permissions";
import { ids } from "@/features/operations/__tests__/fixtures";
import type { FunctionPermission } from "@/features/access/domain/function-permission";
const q = (s = "") => new URLSearchParams(s);
describe("new real modules read contracts", () => {
  it("keeps staffing employee names Owner-only and invitations session-derived", () => {
    expect(planOperation("purchase-requests", "GET", q(`action=staffing&id=${ids.receipt}`))).toMatchObject({ path: `/api/purchase-requests/${ids.receipt}/staffing`, permission: "Respond" });
    expect(planOperation("purchase-requests", "GET", q("action=staffing-employees&day=2026-11-05"))).toMatchObject({ path: "/api/purchase-requests/staffing-employees?day=2026-11-05", permission: "Respond" });
    expect(operationAllowed("purchase-requests", { subjectType: "Staff" }, [], "Respond")).toBe(false);
    expect(operationAllowed("purchase-requests", { subjectType: "Trader" }, [], "Respond")).toBe(false);
    expect(planOperation("my-work", "GET", q("action=purchase-shifts&from=2026-11-01&to=2026-11-30"))).toMatchObject({ path: "/api/me/purchase-shifts?from=2026-11-01&to=2026-11-30", permission: "Mine" });
    expect(planOperation("my-work", "GET", q(`action=purchase-shifts&from=2026-11-01&to=2026-11-30&employeeId=${ids.item}`))).toBeUndefined();
  });
  it("validates staffing writes and rejects duplicate employees and identity injection", () => {
    const body = { cages: 100, workDate: "2026-11-05", pickupDate: "2026-11-06", cagesPerEmployeePerDay: 20, employeeIds: [ids.item], note: null, rowVersion: "v1" };
    expect(planOperation("purchase-requests", "POST", q(), { action: "plan-staffing", id: ids.receipt, body })).toMatchObject({ path: `/api/purchase-requests/${ids.receipt}/staffing`, permission: "Respond", method: "POST" });
    for (const patch of [{ employeeIds: [ids.item, ids.item] }, { cagesPerEmployeePerDay: 0 }, { cages: 1.5 }, { pickupDate: "2026-11-04" }, { employeeIds: [] }]) expect(planOperation("purchase-requests", "POST", q(), { action: "plan-staffing", id: ids.receipt, body: { ...body, ...patch } })).toBeUndefined();
    const response = { approved: false, reason: "Không thể tham gia", rowVersion: "v1" };
    expect(planOperation("my-work", "POST", q(), { action: "respond-shift", id: ids.receipt, body: response })).toMatchObject({ path: `/api/me/purchase-shifts/${ids.receipt}/response`, expectedId: ids.receipt });
    expect(planOperation("my-work", "POST", q(), { action: "respond-shift", id: ids.receipt, body: { ...response, reason: " " } })).toBeUndefined();
    expect(planOperation("my-work", "POST", q(), { action: "respond-shift", id: ids.receipt, body: { ...response, employeeId: ids.item } })).toBeUndefined();
  });
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
  it("rejects incomplete commands instead of treating them as valid writes", () => {
    for (const area of ["purchase-requests", "sales-products", "workforce"]) expect(planOperation(area, "POST", q(), { action: "create", body: {} })).toBeUndefined();
  });
  it("plans approved cage requests with fixed personal and Owner endpoints", () => {
    expect(planOperation("purchase-requests", "POST", q(), { action: "submit", body: { productId: ids.item, requestedCages: 2, pickupDate: "2026-10-31", note: null, clientOperationId: ids.receipt } })).toMatchObject({ method: "POST", path: "/api/me/purchase-requests", permission: "Submit" });
    expect(planOperation("purchase-requests", "POST", q(), { action: "respond", id: ids.receipt, body: { accept: false, acceptedCages: null, pickupDate: null, allowPayLater: false, note: "QA từ chối", rowVersion: "opaque" } })).toMatchObject({ path: `/api/purchase-requests/${ids.receipt}/response`, permission: "Respond", expectedId: ids.receipt });
    expect(operationAllowed("purchase-requests", { subjectType: "Trader" }, [], "Submit")).toBe(true);
    expect(operationAllowed("purchase-requests", { subjectType: "Staff" }, [], "Respond")).toBe(false);
  });
  it.each([0, -1, 1.5, 2147483648])("rejects invalid cage quantity %s", (requestedCages) => {
    expect(planOperation("purchase-requests", "POST", q(), { action: "submit", body: { productId: ids.item, requestedCages, pickupDate: "2026-10-31", note: null, clientOperationId: ids.receipt } })).toBeUndefined();
  });
  it("keeps personal work identity server-derived and bounds its date range", () => {
    expect(planOperation("my-work", "GET", q("from=2026-10-01&to=2026-10-31"))).toMatchObject({ path: "/api/me/workforce?from=2026-10-01&to=2026-10-31", permission: "Mine" });
    expect(planOperation("my-work", "GET", q(`from=2026-10-01&to=2026-10-31&employeeId=${ids.item}`))).toBeUndefined();
    expect(planOperation("my-work", "GET", q("from=2026-01-01&to=2026-12-01"))).toBeUndefined();
    expect(planOperation("my-work", "POST", q(), { action: "leave", body: { from: "2026-10-31", to: "2026-11-01", reason: "QA", clientOperationId: ids.receipt, employeeId: ids.item } })).toBeUndefined();
  });
  it("requires zone and matching workforce action grants; bodyless actions are explicit", () => {
    expect(planOperation("workforce", "POST", q(), { action: "remove", id: ids.receipt, zoneId: ids.zone, body: {} })).toMatchObject({ method: "DELETE", path: `/api/workforce/assignments/${ids.receipt}`, permission: "Delete", noContent: true });
    expect(planOperation("workforce", "POST", q(), { action: "remove", id: ids.receipt, body: {} })).toBeUndefined();
    const p: FunctionPermission = { functionCode: "ATTENDANCE", action: "Create", dataScope: "AssignedZone", scope: { kind: "zones", zoneIds: [ids.zone] } };
    expect(operationAllowed("workforce", { subjectType: "Staff" }, [p], "AttendanceCreate", ids.zone)).toBe(true);
    expect(operationAllowed("workforce", { subjectType: "Staff" }, [p], "AttendanceCreate", ids.otherZone)).toBe(false);
    expect(operationAllowed("workforce", { subjectType: "Staff" }, [p], "Owner")).toBe(false);
  });
  it("serializes browser break times to TimeOnly with paired valid bounds", () => {
    expect(planOperation("workforce", "POST", q(), { action: "settings", body: { effectiveFrom: "2026-10-31", breakFrom: "12:00", breakTo: "13:00", roundingMinutes: 15 } })).toMatchObject({ body: { breakFrom: "12:00:00", breakTo: "13:00:00" }, permission: "Owner" });
    expect(planOperation("workforce", "POST", q(), { action: "settings", body: { effectiveFrom: "2026-10-31", breakFrom: "25:00", breakTo: "26:00", roundingMinutes: 15 } })).toBeUndefined();
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
