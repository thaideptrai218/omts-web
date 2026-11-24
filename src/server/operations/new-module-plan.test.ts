import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { planOperation } from "./operation-plan";
import { operationAllowed } from "@/features/operations/permissions";
import { ids } from "@/features/operations/__tests__/fixtures";
import type { FunctionPermission } from "@/features/access/domain/function-permission";
const q = (s = "") => new URLSearchParams(s);
describe("workforce job types", () => {
  it("does not post to /api/workforce/job-types (the backend has none); job types go through /api/job-types", () => {
    expect(planOperation("workforce", "POST", q(), { action: "job", body: { name: "Thu hoạch" } })).toBeUndefined();
    const plan = planOperation("job-types", "POST", q(), { action: "create", body: { name: "Thu hoạch", hourlyRate: 30000, effectiveFrom: "2026-11-12" } });
    expect(plan).toMatchObject({ method: "POST", path: "/api/job-types", permission: "Create" });
  });
});
describe("new real modules read contracts", () => {
  it("plans the cage staffing routes for the Owner and still has no purchase-shift routes", () => {
    expect(planOperation("purchase-requests", "GET", q(`action=staffing&id=${ids.receipt}`))).toMatchObject({ method: "GET", path: `/api/purchase-requests/${ids.receipt}/staffing`, permission: "Respond" });
    expect(planOperation("purchase-requests", "GET", q(`action=staffing-employees&id=${ids.receipt}&day=2026-11-05`))).toMatchObject({ method: "GET", path: `/api/purchase-requests/staffing-employees?day=2026-11-05&purchaseRequestId=${ids.receipt}`, permission: "Respond" });
    // The employees need the request and the day; the chosen list takes no day; nothing else is forwarded.
    for (const query of ["action=staffing-employees&day=2026-11-05", `action=staffing-employees&id=${ids.receipt}`, `action=staffing&id=${ids.receipt}&day=2026-11-05`, `action=staffing&id=${ids.receipt}&page=2`, "action=staffing", `action=list&day=2026-11-05`, `action=staffing-employees&id=${ids.receipt}&day=tomorrow`]) expect(planOperation("purchase-requests", "GET", q(query))).toBeUndefined();
    expect(planOperation("my-work", "GET", q("action=purchase-shifts&from=2026-11-01&to=2026-11-30"))).toBeUndefined();
    const staffing = { cages: 100, workDate: "2026-11-05", pickupDate: "2026-11-06", cagesPerEmployeePerDay: 20, employeeIds: [ids.item], note: null, rowVersion: "v1" };
    expect(planOperation("purchase-requests", "POST", q(), { action: "staffing", id: ids.receipt, body: staffing })).toMatchObject({ method: "POST", path: `/api/purchase-requests/${ids.receipt}/staffing`, permission: "Respond", body: staffing });
    for (const body of [{ ...staffing, employeeIds: [] }, { ...staffing, employeeIds: [ids.item, ids.item] }, { ...staffing, cages: 0 }, { ...staffing, pickupDate: "2026-11-04" }, { ...staffing, extra: 1 }, { ...staffing, rowVersion: "" }]) {
      expect(planOperation("purchase-requests", "POST", q(), { action: "staffing", id: ids.receipt, body })).toBeUndefined();
    }
    expect(planOperation("purchase-requests", "POST", q(), { action: "staffing", body: staffing })).toBeUndefined();
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
    expect(planOperation("purchase-requests", "GET", q("action=list&status=3206"))).toMatchObject({ path: "/api/purchase-requests?page=1&pageSize=20&statusId=3206", permission: "Review" });
    expect(planOperation("purchase-requests", "GET", q(`action=detail&id=${ids.receipt}`))).toMatchObject({ path: `/api/purchase-requests/${ids.receipt}`, expectedId: ids.receipt, permission: "Review" });
  });
  it("validates the trader list against the MyPurchases contract", () => {
    const plan = planOperation("purchase-requests", "GET", q("action=mine"))!;
    const request = { id: ids.receipt, productId: ids.item, productName: "Hàu sữa", requestedCages: 500, pickupDate: "2026-11-12", note: null, sentAt: "2026-11-09T08:15:00+07:00", statusId: 3201, status: "Awaiting response",
      fulfilled: false, canCancel: true, response: null, cancelReason: null, cancelledAt: null, rowVersion: "AAAA" };
    expect(plan.schema.safeParse({ requests: [request], page: 1, pageSize: 20, total: 1, message: null, messageCode: null }).success).toBe(true);
    expect(plan.schema.safeParse({ requests: [], page: 1, pageSize: 20, total: 0, message: "Chưa có gì", messageCode: "MSG-GEN-11" }).success).toBe(true);
    expect(plan.schema.safeParse({ items: [], page: 1, pageSize: 20, total: 0 }).success).toBe(false);
    expect(plan.schema.safeParse({ requests: [{ ...request, requestedCages: "500" }], page: 1, pageSize: 20, total: 1, message: null, messageCode: null }).success).toBe(false);
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
  it("plans trader cage requests/cancels with the backend contract and Owner responses with fixed endpoints", () => {
    expect(planOperation("purchase-requests", "POST", q(), { action: "submit", body: { productId: ids.item, requestedCages: 12, pickupDate: "2026-10-31", note: null } })).toMatchObject({ method: "POST", path: "/api/me/purchase-requests", permission: "Submit", body: { requestedCages: 12 } });
    expect(planOperation("purchase-requests", "POST", q(), { action: "cancel", id: ids.receipt, body: { reason: null, rowVersion: "AAAA" } })).toMatchObject({ method: "POST", path: `/api/me/purchase-requests/${ids.receipt}/cancel`, permission: "CancelMine", expectedId: ids.receipt });
    expect(planOperation("purchase-requests", "POST", q(), { action: "cancel", id: ids.receipt, body: { reason: null } })).toBeUndefined();
    const accept = { acceptedCages: 10, pickupDate: "2026-11-13", payLaterAgreed: true, note: null, rowVersion: "AAAA" };
    expect(planOperation("purchase-requests", "POST", q(), { action: "accept", id: ids.receipt, body: accept })).toMatchObject({ method: "POST", path: `/api/purchase-requests/${ids.receipt}/accept`, permission: "Respond", expectedId: ids.receipt, body: accept });
    expect(planOperation("purchase-requests", "POST", q(), { action: "decline", id: ids.receipt, body: { note: "QA từ chối", rowVersion: "opaque" } })).toMatchObject({ path: `/api/purchase-requests/${ids.receipt}/decline`, permission: "Respond", expectedId: ids.receipt });
    expect(operationAllowed("purchase-requests", { subjectType: "Trader" }, [], "Submit")).toBe(true);
    expect(operationAllowed("purchase-requests", { subjectType: "Staff" }, [], "Respond")).toBe(false);
  });
  it("rejects invalid Owner accept/decline bodies and ids", () => {
    const accept = { acceptedCages: 10, pickupDate: "2026-11-13", payLaterAgreed: false, note: null, rowVersion: "AAAA" };
    for (const patch of [{ acceptedCages: 0 }, { acceptedCages: 1.5 }, { acceptedCages: "5" }, { pickupDate: "13/11/2026" }, { payLaterAgreed: null }, { rowVersion: "" }, { note: "x".repeat(1001) }, { acceptedKg: 3 }]) expect(planOperation("purchase-requests", "POST", q(), { action: "accept", id: ids.receipt, body: { ...accept, ...patch } })).toBeUndefined();
    for (const note of [" ", "", "x".repeat(1001), null]) expect(planOperation("purchase-requests", "POST", q(), { action: "decline", id: ids.receipt, body: { note, rowVersion: "AAAA" } })).toBeUndefined();
    expect(planOperation("purchase-requests", "POST", q(), { action: "accept", body: accept })).toBeUndefined();
    expect(planOperation("purchase-requests", "POST", q(), { action: "accept", id: ids.receipt, zoneId: ids.zone, body: accept })).toBeUndefined();
  });
  it("validates the Owner list and detail against the PurchaseRequestView contract", () => {
    const view = { id: ids.receipt, customer: { id: ids.item, name: "An", phoneNumber: null, currentDebt: 0 }, productId: ids.item, productName: "Hàu", requestedCages: 10, pickupDate: "2026-11-12", note: null, sentAt: "2026-11-09T08:00:00+07:00",
      statusId: 3202, status: "Fulfilled", fulfilled: true, response: { acceptedCages: 8, pickupDate: "2026-11-12", payLaterAgreed: false, note: null, respondedAt: "2026-11-09T09:00:00+07:00" }, cancelReason: null, cancelledAt: null, sendings: [], rowVersion: "AAAA" };
    const list = planOperation("purchase-requests", "GET", q("action=list"))!, detail = planOperation("purchase-requests", "GET", q(`action=detail&id=${ids.receipt}`))!;
    expect(list.schema.safeParse({ items: [view], page: 1, pageSize: 20, total: 1 }).success).toBe(true);
    expect(detail.schema.safeParse(view).success).toBe(true);
    expect(list.schema.safeParse({ items: [{ ...view, customer: undefined, customerName: "An" }], page: 1, pageSize: 20, total: 1 }).success).toBe(false);
    expect(list.schema.safeParse({ items: [{ ...view, requestedCages: undefined, requestedKg: 2 }], page: 1, pageSize: 20, total: 1 }).success).toBe(false);
  });
  it.each([0, -1, 0.5, 1.2345, "5", 2_147_483_648])("rejects invalid cage quantity %s", (requestedCages) => {
    expect(planOperation("purchase-requests", "POST", q(), { action: "submit", body: { productId: ids.item, requestedCages, pickupDate: "2026-10-31", note: null } })).toBeUndefined();
  });
  it("rejects the retired kg submit body", () => {
    expect(planOperation("purchase-requests", "POST", q(), { action: "submit", body: { productId: ids.item, requestedKg: 2, pickupDate: "2026-10-31", note: null } })).toBeUndefined();
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
  it("lets ATTENDANCE Edit in the zone correct attendance and review leave, while the setup stays Owner-only", () => {
    const edit: FunctionPermission = { functionCode: "ATTENDANCE", action: "Edit", dataScope: "AssignedZone", scope: { kind: "zones", zoneIds: [ids.zone] } };
    const create: FunctionPermission = { ...edit, action: "Create" };
    const manager = { subjectType: "Staff" };
    expect(operationAllowed("workforce", manager, [edit], "AttendanceEdit")).toBe(true);
    expect(operationAllowed("workforce", manager, [edit], "AttendanceEdit", ids.zone)).toBe(true);
    expect(operationAllowed("workforce", manager, [edit], "AttendanceEdit", ids.otherZone)).toBe(false);
    expect(operationAllowed("workforce", manager, [create], "AttendanceEdit")).toBe(false);
    expect(operationAllowed("workforce", manager, [edit], "Owner")).toBe(false);
    expect(operationAllowed("workforce", { subjectType: "CooperativeOwner" }, [], "AttendanceEdit")).toBe(true);
    const day = "2026-11-19";
    expect(planOperation("workforce", "GET", q("action=leaves"))).toMatchObject({ permission: "AttendanceEdit" });
    expect(planOperation("workforce", "GET", q(`action=attendance&employeeId=${ids.receipt}&day=${day}`))).toMatchObject({ permission: "AttendanceEdit" });
    expect(planOperation("workforce", "GET", q("action=settings"))).toMatchObject({ permission: "Owner" });
  });
  it("uses the real attendance overview and save envelope, with versioned TimeOnly input", () => {
    const version = { effectiveFrom: "2026-10-31", breakStart: "12:00:00", breakEnd: "13:00:00", roundingUnit: "Minutes15" };
    const overview = { current: version, versions: [version], rowVersion: "AAAA" };
    const read = planOperation("workforce", "GET", q("action=settings"))!;
    expect(read).toMatchObject({ method: "GET", path: "/api/attendance-settings", permission: "Owner" });
    expect(read.schema.parse(overview)).toEqual(overview);
    expect(read.schema.safeParse([version]).success).toBe(false);
    const write = planOperation("workforce", "POST", q(), { action: "settings", body: { ...version, breakStart: "12:00", breakEnd: "13:00", rowVersion: "AAAA" } })!;
    expect(write).toMatchObject({ method: "POST", path: "/api/attendance-settings", body: { ...version, rowVersion: "AAAA" }, permission: "Owner" });
    expect(write.schema.parse({ settings: overview, message: "Saved", messageCode: "MSG-GEN-05" })).toEqual({ settings: overview, message: "Saved", messageCode: "MSG-GEN-05" });
    expect(write.schema.safeParse(overview).success).toBe(false);
  });
  it("rejects invalid attendance bounds, rounding and missing concurrency versions", () => {
    const body = { effectiveFrom: "2026-10-31", breakStart: "12:00", breakEnd: "13:00", roundingUnit: "Minutes15", rowVersion: "AAAA" };
    for (const invalid of [{ breakStart: "25:00" }, { breakEnd: null }, { breakEnd: "12:00" }, { breakEnd: "11:00" }, { roundingUnit: 15 }, { rowVersion: "" }, { roundingMinutes: 15 }]) {
      expect(planOperation("workforce", "POST", q(), { action: "settings", body: { ...body, ...invalid } })).toBeUndefined();
    }
    for (const roundingUnit of ["None", "Minutes15", "Minutes30", "Hour1"]) {
      expect(planOperation("workforce", "POST", q(), { action: "settings", body: { ...body, breakStart: null, breakEnd: null, roundingUnit } })).toMatchObject({ body: { breakStart: null, breakEnd: null, roundingUnit } });
    }
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
