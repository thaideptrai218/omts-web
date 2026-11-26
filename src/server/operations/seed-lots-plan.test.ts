import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { planOperation } from "./operation-plan";
import { operationAllowed } from "@/features/operations/permissions";

const line = "529ec3ce-af8f-42f7-a08f-4bab36ba7e61", supplier = "529ec3ce-af8f-42f7-a08f-4bab36ba7e62", item = "529ec3ce-af8f-42f7-a08f-4bab36ba7e63", zone = "529ec3ce-af8f-42f7-a08f-4bab36ba7e64";
const get = (query: Record<string, string>) => planOperation("seed-lots", "GET", new URLSearchParams(query));
const ref = { id: supplier, code: "NCC000001", name: "Trại giống" };
const row = {
  id: line, seedLotCode: "PN000004-1", receiptId: supplier, receiptCode: "PN000004", receivedAt: "2026-11-10T08:00:00+07:00", supplier: ref, item: { id: item, code: "GG000001", name: "Hàu giống" },
  product: { id: zone, code: "SP000001", name: "Hàu sữa" }, unitName: "mảnh", receivedQty: 1000, returnedQty: 100, nursingQty: 300, nurseryLossQty: 50, seededQty: 400, issuedOtherQty: 0, remainingQty: 150, availableQty: 150, state: "Nursing", lastUsedAt: null,
};
const totals = { receivedQty: 1000, returnedQty: 100, nursingQty: 300, nurseryLossQty: 50, seededQty: 400, remainingQty: 150 };

describe("seed lot list and export", () => {
  it("forwards every filter the API knows with the page, sorted as asked, and nothing else", () => {
    const plan = get({ action: "list", from: "2026-11-01", to: "2026-11-17", supplierId: supplier, itemId: item, zoneId: zone, state: "PartlySeeded,Unused", search: " PN0000 ", sort: "remaining", sortDir: "asc", page: "2", pageSize: "30" });
    expect(plan).toMatchObject({ method: "GET", permission: "View", zoneId: zone });
    const url = new URL(plan!.path, "http://api");
    expect(url.pathname).toBe("/api/seed-lots");
    expect(Object.fromEntries(url.searchParams)).toEqual({ from: "2026-11-01", to: "2026-11-17", supplierId: supplier, itemId: item, zoneId: zone, state: "PartlySeeded,Unused", search: "PN0000", sort: "remaining", sortDir: "asc", page: "2", pageSize: "30" });
  });
  it("lists the first page of the whole cooperative when nothing is filtered", () => {
    const plan = get({ action: "list" });
    expect(plan).toMatchObject({ path: "/api/seed-lots?page=1&pageSize=10", permission: "View" });
    expect(plan?.zoneId).toBeUndefined();
  });
  it.each<Record<string, string>>([
    { state: "Finished" }, { state: "Unused,Finished" }, { state: "Unused,Unused" }, { sort: "status" }, { sortDir: "up" }, { supplierId: "not-a-guid" }, { from: "17/11/2026" }, { page: "0" }, { pageSize: "500" },
    { search: "" }, { search: "x".repeat(101) }, { extra: "1" }, { from: "2026-11-18", to: "2026-11-17" }, { id: line },
  ])("refuses the query %j", (extra) => expect(get({ action: "list", ...extra })).toBeUndefined());
  it("refuses a repeated name, a write and a body", () => {
    expect(planOperation("seed-lots", "GET", new URLSearchParams(`action=list&state=Unused&state=Nursing`))).toBeUndefined();
    expect(planOperation("seed-lots", "POST", new URLSearchParams(), { action: "list" })).toBeUndefined();
    expect(planOperation("seed-lots", "GET", new URLSearchParams("action=list"), {})).toBeUndefined();
  });
  it("reads the page with its totals and refuses an answer that is not one", () => {
    const schema = get({ action: "list" })!.schema;
    expect(schema.safeParse({ items: [row], total: 1, page: 1, pageSize: 15, totals }).success).toBe(true);
    expect(schema.safeParse({ items: [row], total: 1, page: 1, pageSize: 15 }).success).toBe(false);
    expect(schema.safeParse({ items: [{ ...row, state: "Done" }], total: 1, page: 1, pageSize: 15, totals }).success).toBe(false);
    expect(schema.safeParse({ items: [{ ...row, remainingQty: "150" }], total: 1, page: 1, pageSize: 15, totals }).success).toBe(false);
    expect(schema.safeParse({ items: [{ ...row, supplier: { id: "x", name: "NCC" } }], total: 1, page: 1, pageSize: 15, totals }).success).toBe(false);
  });
  it("accepts a product-less lot and a totals object that leaves a column out", () => {
    const schema = get({ action: "list" })!.schema;
    expect(schema.safeParse({ items: [{ ...row, product: null }], total: 1, page: 1, pageSize: 15, totals: { receivedQty: 1000 } }).success).toBe(true);
  });
  it("exports the same filters as a file, without paging, under the Export permission", () => {
    const plan = get({ action: "export", zoneId: zone, state: "Unused", search: "PN" });
    expect(plan).toMatchObject({ file: "export", permission: "Export", zoneId: zone });
    expect(plan!.path).toBe(`/api/seed-lots/export?zoneId=${zone}&state=Unused&search=PN`);
    expect(get({ action: "export", page: "1" })).toBeUndefined();
  });
});

describe("seed lot detail", () => {
  const detail = {
    ...row, nurseryBatches: [{ id: item, code: "NU000002", statusId: 4001, status: "Nursing", quantityIn: 300, survivors: null, startDate: "2026-11-11" }],
    seedings: [{ id: zone, cycleId: line, raftCode: "B1", zoneCode: "V01", quantity: 400, seededAt: "2026-11-14T07:00:00+07:00" }],
    returns: [{ id: supplier, code: "TH000001", quantity: 100, returnedAt: "2026-11-12T09:00:00+07:00", statusId: 1901 }],
    issues: [{ id: line, code: "XD000001", kind: "Use", quantity: 0, issuedAt: "2026-11-13T09:00:00+07:00" }],
    cycles: [{ id: line, raftCode: "B1", zoneCode: "V01", statusId: 2001, productCode: "SP000001" }],
    harvestLots: [{ id: item, lotCode: "LTH000007", statusId: 2901, weighedKg: 195.5, estimatedKg: 200 }],
  };
  it("reads one lot by the id of its receipt line and checks the answer is that lot", () => {
    const plan = get({ action: "detail", id: line });
    expect(plan).toMatchObject({ method: "GET", permission: "View", path: `/api/seed-lots/${line}`, expectedId: line });
    expect(plan?.schema.safeParse(detail).success).toBe(true);
    expect(plan?.schema.safeParse({ ...detail, nurseryBatches: [{ ...detail.nurseryBatches[0], quantityIn: "300" }] }).success).toBe(false);
  });
  it("fills the lists a lot has none of", () => {
    const parsed = get({ action: "detail", id: line })?.schema.parse(row) as { nurseryBatches: unknown[]; harvestLots: unknown[] };
    expect(parsed.nurseryBatches).toEqual([]);
    expect(parsed.harvestLots).toEqual([]);
  });
  it("needs a well-formed id and no filter", () => {
    expect(get({ action: "detail" })).toBeUndefined();
    expect(get({ action: "detail", id: "../x" })).toBeUndefined();
    expect(get({ action: "detail", id: line, state: "Unused" })).toBeUndefined();
  });
});

describe("who may read the seed lots", () => {
  const staff = { subjectType: "Staff" };
  const grant = (functionCode: string, action: string, zones: string[] | "all" = "all") => ({ functionCode, action, dataScope: "AssignedZone", scope: zones === "all" ? { kind: "all-zones" } : { kind: "zones", zoneIds: zones } }) as never;
  it("lets the Owner read and export", () => {
    expect(operationAllowed("seed-lots", { subjectType: "CooperativeOwner" }, [], "View")).toBe(true);
    expect(operationAllowed("seed-lots", { subjectType: "CooperativeOwner" }, [], "Export")).toBe(true);
  });
  it("follows the receipts: View reads, Export takes the file, and the zone of the grant does not matter", () => {
    expect(operationAllowed("seed-lots", staff, [grant("PURCHASE_RECEIPTS", "View")], "View")).toBe(true);
    expect(operationAllowed("seed-lots", staff, [grant("PURCHASE_RECEIPTS", "View", [zone])], "View", supplier)).toBe(true);
    expect(operationAllowed("seed-lots", staff, [grant("PURCHASE_RECEIPTS", "View")], "Export")).toBe(false);
    expect(operationAllowed("seed-lots", staff, [grant("PURCHASE_RECEIPTS", "Export")], "Export")).toBe(true);
  });
  it("refuses a staff account that only works on the cycles or the issues, and any other subject or action", () => {
    expect(operationAllowed("seed-lots", staff, [grant("CULTIVATION_CYCLES", "View", [zone])], "View")).toBe(false);
    expect(operationAllowed("seed-lots", staff, [grant("INPUT_ISSUES", "View")], "View")).toBe(false);
    expect(operationAllowed("seed-lots", staff, [grant("PURCHASE_RECEIPTS", "View")], "Delete")).toBe(false);
    expect(operationAllowed("seed-lots", { subjectType: "Trader" }, [grant("PURCHASE_RECEIPTS", "View")], "View")).toBe(false);
  });
});
