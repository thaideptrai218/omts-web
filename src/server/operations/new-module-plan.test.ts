import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { planOperation } from "./operation-plan";
import { operationAllowed } from "@/features/operations/permissions";
import { ids } from "@/features/operations/__tests__/fixtures";
import type { FunctionPermission } from "@/features/access/domain/function-permission";
const q = (s = "") => new URLSearchParams(s);
describe("new real modules read contracts", () => {
  it("no longer exposes cage staffing or purchase-shift routes (no backend in develop)", () => {
    for (const query of [`action=staffing&id=${ids.receipt}`, "action=staffing-employees&day=2026-11-05"]) expect(planOperation("purchase-requests", "GET", q(query))).toBeUndefined();
    expect(planOperation("my-work", "GET", q("action=purchase-shifts&from=2026-11-01&to=2026-11-30"))).toBeUndefined();
    const staffing = { cages: 100, workDate: "2026-11-05", pickupDate: "2026-11-06", cagesPerEmployeePerDay: 20, employeeIds: [ids.item], note: null, rowVersion: "v1" };
    expect(planOperation("purchase-requests", "POST", q(), { action: "plan-staffing", id: ids.receipt, body: staffing })).toBeUndefined();
    expect(planOperation("my-work", "POST", q(), { action: "respond-shift", id: ids.receipt, body: { approved: true, reason: null, rowVersion: "v1" } })).toBeUndefined();
    expect(planOperation("purchase-requests", "POST", q(), { action: "respond", id: ids.receipt, body: { accept: false, note: "QA", rowVersion: "v1" } })).toBeUndefined();
    expect(operationAllowed("purchase-requests", { subjectType: "Staff" }, [], "Respond")).toBe(false);
    expect(operationAllowed("purchase-requests", { subjectType: "Trader" }, [], "Respond")).toBe(false);
  });
  it("uses separate personal and cooperative request paths", () => {
    // Trader: GET /api/me/purchases (không có GET /api/me/purchase-requests); backend không lọc trạng thái nên status bị từ chối.
    expect(planOperation("purchase-requests", "GET", q("action=mine&page=2"))).toMatchObject({ method: "GET", path: "/api/me/purchases?page=2&pageSize=20", permission: "Mine" });
    expect(planOperation("purchase-requests", "GET", q(`action=mine-detail&id=${ids.receipt}`))).toMatchObject({ path: `/api/me/purchase-requests/${ids.receipt}`, expectedId: ids.receipt, permission: "Mine" });
    // Owner/Staff giữ nguyên /api/purchase-requests.
    expect(planOperation("purchase-requests", "GET", q("action=list&status=3202&page=2"))).toMatchObject({ path: "/api/purchase-requests?page=2&pageSize=20&statusId=3202", permission: "Review" });
    expect(planOperation("purchase-requests", "GET", q(`action=detail&id=${ids.receipt}`))).toMatchObject({ path: `/api/purchase-requests/${ids.receipt}`, expectedId: ids.receipt, permission: "Review" });
  });
  it("validates the trader list against the MyPurchases contract", () => {
    const plan = planOperation("purchase-requests", "GET", q("action=mine"))!;
    const request = { id: ids.receipt, productId: ids.item, productName: "Hàu sữa", requestedKg: 500.5, pickupDate: "2026-11-12", note: null, sentAt: "2026-11-09T08:15:00+07:00", statusId: 3201, status: "Awaiting response",
      fulfilled: false, canCancel: true, response: null, cancelReason: null, cancelledAt: null, rowVersion: "AAAA" };
    expect(plan.schema.safeParse({ requests: [request], page: 1, pageSize: 20, total: 1, message: null, messageCode: null }).success).toBe(true);
    expect(plan.schema.safeParse({ requests: [], page: 1, pageSize: 20, total: 0, message: "Chưa có gì", messageCode: "MSG-GEN-11" }).success).toBe(true);
    expect(plan.schema.safeParse({ items: [], page: 1, pageSize: 20, total: 0 }).success).toBe(false);
    expect(plan.schema.safeParse({ requests: [{ ...request, requestedKg: "500" }], page: 1, pageSize: 20, total: 1, message: null, messageCode: null }).success).toBe(false);
  });
  it.each(["accountId=x", "action=mine&customerId=x", "action=mine&status=Draft", "action=mine&status=3202", `action=mine-detail&id=${ids.receipt}&page=2`, "action=mine-detail", "action=list&id=not-guid", "action=list&status=ACCEPTED", "action=list&status=3205", "action=list&status=3202&status=3203", "action=list&customerId=x", "action=mine&page=0", "action=mine&page=1&page=2", `action=detail&id=${ids.receipt}&page=2`, "action=detail"])("rejects unsupported request query %s", (query) => {
    expect(planOperation("purchase-requests", "GET", q(query))).toBeUndefined();
  });
  it("keeps product availability and workforce date explicit", () => {
    expect(planOperation("sales-products", "GET", q("action=all"))).toMatchObject({ permission: "CatalogueAll", path: "/api/products" });
    expect(planOperation("workforce", "GET", q("day=2026-10-31"))).toMatchObject({ path: "/api/workforce/assignments?day=2026-10-31" });
    expect(planOperation("workforce", "GET", q("day=2026-02-30"))).toBeUndefined();
    expect(planOperation("workforce", "GET", q("day=2026-10-31&employeeId=x"))).toBeUndefined();
  });
  it("rejects incomplete commands instead of treating them as valid writes", () => {
    for (const area of ["purchase-requests", "sales-products", "workforce"]) expect(planOperation(area, "POST", q(), { action: "create", body: {} })).toBeUndefined();
  });
  it("plans trader kg requests/cancels with the backend contract and Owner responses with fixed endpoints", () => {
    expect(planOperation("purchase-requests", "POST", q(), { action: "submit", body: { productId: ids.item, requestedKg: 12.5, pickupDate: "2026-10-31", note: null } })).toMatchObject({ method: "POST", path: "/api/me/purchase-requests", permission: "Submit", body: { requestedKg: 12.5 } });
    expect(planOperation("purchase-requests", "POST", q(), { action: "cancel", id: ids.receipt, body: { reason: null, rowVersion: "AAAA" } })).toMatchObject({ method: "POST", path: `/api/me/purchase-requests/${ids.receipt}/cancel`, permission: "CancelMine", expectedId: ids.receipt });
    expect(planOperation("purchase-requests", "POST", q(), { action: "cancel", id: ids.receipt, body: { reason: null } })).toBeUndefined();
    const accept = { acceptedKg: 100.5, pickupDate: "2026-11-13", payLaterAgreed: true, note: null, rowVersion: "AAAA" };
    expect(planOperation("purchase-requests", "POST", q(), { action: "accept", id: ids.receipt, body: accept })).toMatchObject({ method: "POST", path: `/api/purchase-requests/${ids.receipt}/accept`, permission: "Respond", expectedId: ids.receipt, body: accept });
    expect(planOperation("purchase-requests", "POST", q(), { action: "decline", id: ids.receipt, body: { note: "QA từ chối", rowVersion: "opaque" } })).toMatchObject({ path: `/api/purchase-requests/${ids.receipt}/decline`, permission: "Respond", expectedId: ids.receipt });
    expect(operationAllowed("purchase-requests", { subjectType: "Trader" }, [], "Submit")).toBe(true);
    expect(operationAllowed("purchase-requests", { subjectType: "Staff" }, [], "Respond")).toBe(false);
  });
  it("rejects invalid Owner accept/decline bodies and ids", () => {
    const accept = { acceptedKg: 10, pickupDate: "2026-11-13", payLaterAgreed: false, note: null, rowVersion: "AAAA" };
    for (const patch of [{ acceptedKg: 0 }, { acceptedKg: 1.2345 }, { acceptedKg: "5" }, { pickupDate: "13/11/2026" }, { payLaterAgreed: null }, { rowVersion: "" }, { note: "x".repeat(1001) }, { acceptedCages: 3 }]) expect(planOperation("purchase-requests", "POST", q(), { action: "accept", id: ids.receipt, body: { ...accept, ...patch } })).toBeUndefined();
    for (const note of [" ", "", "x".repeat(1001), null]) expect(planOperation("purchase-requests", "POST", q(), { action: "decline", id: ids.receipt, body: { note, rowVersion: "AAAA" } })).toBeUndefined();
    expect(planOperation("purchase-requests", "POST", q(), { action: "accept", body: accept })).toBeUndefined();
    expect(planOperation("purchase-requests", "POST", q(), { action: "accept", id: ids.receipt, zoneId: ids.zone, body: accept })).toBeUndefined();
  });
  it("validates the Owner list and detail against the PurchaseRequestView contract", () => {
    const view = { id: ids.receipt, customer: { id: ids.item, name: "An", phoneNumber: null, currentDebt: 0 }, productId: ids.item, productName: "Hàu", requestedKg: 10, pickupDate: "2026-11-12", note: null, sentAt: "2026-11-09T08:00:00+07:00",
      statusId: 3202, status: "Fulfilled", fulfilled: true, response: { acceptedKg: 8, pickupDate: "2026-11-12", payLaterAgreed: false, note: null, respondedAt: "2026-11-09T09:00:00+07:00" }, cancelReason: null, cancelledAt: null, sendings: [], rowVersion: "AAAA" };
    const list = planOperation("purchase-requests", "GET", q("action=list"))!, detail = planOperation("purchase-requests", "GET", q(`action=detail&id=${ids.receipt}`))!;
    expect(list.schema.safeParse({ items: [view], page: 1, pageSize: 20, total: 1 }).success).toBe(true);
    expect(detail.schema.safeParse(view).success).toBe(true);
    expect(list.schema.safeParse({ items: [{ ...view, customer: undefined, customerName: "An", requestedCages: 2 }], page: 1, pageSize: 20, total: 1 }).success).toBe(false);
  });
  it.each([0, -1, 0.0004, 1.2345, "5"])("rejects invalid kg quantity %s", (requestedKg) => {
    expect(planOperation("purchase-requests", "POST", q(), { action: "submit", body: { productId: ids.item, requestedKg, pickupDate: "2026-10-31", note: null } })).toBeUndefined();
  });
  it("rejects the retired cage submit body", () => {
    expect(planOperation("purchase-requests", "POST", q(), { action: "submit", body: { productId: ids.item, requestedCages: 2, pickupDate: "2026-10-31", note: null, clientOperationId: ids.receipt } })).toBeUndefined();
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
