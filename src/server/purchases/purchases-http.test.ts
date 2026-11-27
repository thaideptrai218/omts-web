import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { planRead, planWrite, purchaseReads, purchaseWrites } from "./purchases-http";

const supplier = "529ec3ce-af8f-42f7-a08f-4bab36ba7e62", receipt = "529ec3ce-af8f-42f7-a08f-4bab36ba7e61";
const read = (query: Record<string, string | string[]>) => purchaseReads.safeParse(query);
const receiptBody = { code: null, supplierId: supplier, receiptDate: "2026-11-17", receivedAt: "2026-11-17T08:00:00+07:00", receivedById: null, notes: null, discount: 0, zoneId: null, complete: false, rowVersion: null, lines: [] };

describe("receipt and return lists by kind", () => {
  it("forwards the kind of a receipt list with its other filters", () => {
    const parsed = read({ action: "receipts", kind: "Seed", statusIds: "1702", sortBy: "code", sortDir: "desc", page: "1", pageSize: "15" });
    expect(parsed.success).toBe(true);
    const plan = planRead(parsed.data!);
    const url = new URL(plan.path, "http://api");
    expect(url.pathname).toBe("/api/purchase-receipts");
    expect(url.searchParams.get("Kind")).toBe("Seed");
    expect(plan).toMatchObject({ method: "GET", permission: "View" });
  });
  it("keeps the group narrowing of a Supply screen next to the kind", () => {
    const parsed = read({ action: "receipts", kind: "Supply", itemGroups: "Other" });
    const url = new URL(planRead(parsed.data!).path, "http://api");
    expect([url.searchParams.get("Kind"), url.searchParams.get("ItemGroups")]).toEqual(["Supply", "Other"]);
  });
  it("forwards the kind of the file of the receipts and of the returns, and of the return list", () => {
    const file = planRead(read({ action: "receipts-export", kind: "Seed" }).data!);
    expect(file).toMatchObject({ permission: "Export", file: "nhap-hang.xlsx" });
    expect(new URL(file.path, "http://api").searchParams.get("Kind")).toBe("Seed");
    const returns = planRead(read({ action: "returns", kind: "Supply", source: "receipt" }).data!);
    expect(new URL(returns.path, "http://api").pathname).toBe("/api/purchase-returns");
    expect(new URL(returns.path, "http://api").searchParams.get("Kind")).toBe("Supply");
    const returnsFile = planRead(read({ action: "returns-export", kind: "Seed" }).data!);
    expect(returnsFile.path.startsWith("/api/purchase-returns/export?")).toBe(true);
  });
  it("lists without a kind as before, and refuses a kind that is not one", () => {
    expect(new URL(planRead(read({ action: "receipts" }).data!).path, "http://api").searchParams.has("Kind")).toBe(false);
    expect(read({ action: "receipts", kind: "Material" }).success).toBe(false);
    expect(read({ action: "returns", kind: "seed" }).success).toBe(false);
    expect(read({ action: "receipts", kind: ["Seed", "Supply"] }).success).toBe(false);
  });
});

describe("saving a receipt with its kind", () => {
  const write = (body: object) => purchaseWrites.safeParse({ action: "save-receipt", body });
  it("sends the explicit kind of a new receipt to the API", () => {
    const parsed = write({ ...receiptBody, kind: "Seed" });
    expect(parsed.success).toBe(true);
    const plan = planWrite(parsed.data!);
    expect(plan).toMatchObject({ method: "POST", path: "/api/purchase-receipts", permission: "Create" });
    expect((plan.body as { kind: string }).kind).toBe("Seed");
  });
  it("still takes a body with no kind (an edit never changes it), and refuses a kind that is not one", () => {
    expect(write(receiptBody).success).toBe(true);
    expect(write({ ...receiptBody, kind: "Other" }).success).toBe(false);
    expect(purchaseWrites.safeParse({ action: "save-receipt", id: receipt, body: { ...receiptBody, kind: "Supply" } }).success).toBe(true);
  });
});

describe("input VAT on receipt lines", () => {
  const line = (extra: object = {}) => ({ lineId: null, itemId: supplier, itemUnitId: null, quantity: 1, unitPrice: 100000, discount: 0, supplierLotCode: null, raftId: null, ...extra });
  const write = (lines: object[]) => purchaseWrites.safeParse({ action: "save-receipt", body: { ...receiptBody, lines } });
  it("passes the rate of a line to the API and still takes a line without one", () => {
    const parsed = write([line({ vatRate: "10" }), line()]);
    expect(parsed.success).toBe(true);
    expect((planWrite(parsed.data!).body as { lines: { vatRate?: string }[] }).lines.map((row) => row.vatRate)).toEqual(["10", undefined]);
  });
  it("passes the rate of the catalogue by id and refuses an id that is not a guid", () => {
    const parsed = write([line({ vatRateId: supplier })]);
    expect(parsed.success).toBe(true);
    expect((planWrite(parsed.data!).body as { lines: { vatRateId?: string }[] }).lines[0].vatRateId).toBe(supplier);
    expect(write([line({ vatRateId: "10" })]).success).toBe(false);
  });
  it("refuses a rate that is not one of KCT, 0, 5, 8 and 10", () => {
    expect(write([line({ vatRate: "12" })]).success).toBe(false);
    expect(write([line({ vatRate: 10 })]).success).toBe(false);
  });
});
