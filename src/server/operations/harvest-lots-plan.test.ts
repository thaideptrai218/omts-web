import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { cultivationRecordsPlan } from "./cultivation-records-plan";

const lot = "529ec3ce-af8f-42f7-a08f-4bab36ba7e61", zone = "529ec3ce-af8f-42f7-a08f-4bab36ba7e63", raft = "529ec3ce-af8f-42f7-a08f-4bab36ba7e62", product = "529ec3ce-af8f-42f7-a08f-4bab36ba7e66";
const get = (query: Record<string, string>) => cultivationRecordsPlan("harvest", "GET", new URLSearchParams(query));
const post = (action: string, body: unknown, area: "harvest" | "seeding" = "harvest") => cultivationRecordsPlan(area, "POST", new URLSearchParams(), { action, id: lot, zoneId: zone, body });
const lotRow = {
  id: lot, lotCode: "LTH000001", harvestedAt: "2026-11-17T08:00:00+07:00", harvestDate: "2026-11-17", zoneId: zone, zoneCode: "V01", raftId: raft, raftCode: "B1", cycleId: null,
  products: [{ productId: product, code: "SP1", name: "Hàu sữa" }], cageCount: 4, estimatedKg: 200, figures: { invoicedKg: 0, returnedKg: 0, soldKg: 0, remainingKg: 200, lostKg: 0 }, statusId: 2904, status: "AwaitingWeighing",
};
const totals = { cageCount: 4, estimatedKg: 200, weighedKg: 0, soldKg: 0, remainingKg: 200, lostKg: 0 };

describe("lot list and export", () => {
  it("forwards every filter the API knows and nothing else, with the View permission scoped to the zone filter", () => {
    const plan = get({ action: "lots", from: "2026-11-01", to: "2026-11-17", zoneId: zone, raftId: raft, productId: product, statusId: "2904", weighed: "false", closeReason: "Unsold", hasPlan: "true", search: " LTH ", sort: "remainingKg", desc: "false", page: "2", pageSize: "30" });
    expect(plan).toMatchObject({ method: "GET", permission: "View", zoneId: zone });
    const url = new URL(plan!.path, "http://api");
    expect(url.pathname).toBe("/api/harvest-lots");
    expect(Object.fromEntries(url.searchParams)).toEqual({ from: "2026-11-01", to: "2026-11-17", zoneId: zone, raftId: raft, productId: product, statusId: "2904", weighed: "false", closeReason: "Unsold", hasPlan: "true", search: "LTH", sort: "remainingKg", sortDir: "asc", page: "2", pageSize: "30" });
  });
  it("lists without a zone for the whole cooperative", () => {
    const plan = get({ action: "lots" });
    expect(plan).toMatchObject({ path: "/api/harvest-lots", permission: "View" });
    expect(plan?.zoneId).toBeUndefined();
  });
  it.each<Record<string, string>>([
    { statusId: "2900" }, { weighed: "yes" }, { closeReason: "Other" }, { hasPlan: "1" }, { sort: "status" }, { zoneId: "not-a-guid" }, { from: "17/11/2026" }, { page: "0" }, { pageSize: "500" },
    { search: "" }, { search: "x".repeat(101) }, { extra: "1" }, { from: "2026-11-18", to: "2026-11-17" },
  ])("refuses the query %j", (extra) => expect(get({ action: "lots", ...extra })).toBeUndefined());
  it("refuses a repeated name", () => expect(cultivationRecordsPlan("harvest", "GET", new URLSearchParams("action=lots&zoneId=" + zone + "&zoneId=" + zone))).toBeUndefined());
  it("reads the page with its totals and refuses an answer that lacks them", () => {
    const plan = get({ action: "lots" })!;
    expect(plan.schema.safeParse({ items: [lotRow], total: 1, page: 1, pageSize: 15, totals }).success).toBe(true);
    expect(plan.schema.safeParse({ items: [lotRow], total: 1, page: 1, pageSize: 15 }).success).toBe(false);
    expect(plan.schema.safeParse({ items: [{ ...lotRow, statusId: "2904" }], total: 1, page: 1, pageSize: 15, totals }).success).toBe(false);
  });
  it("exports the same filters as a file, without paging", () => {
    const plan = get({ action: "export", zoneId: zone, statusId: "2901", search: "LTH" });
    expect(plan).toMatchObject({ file: "export", permission: "View", zoneId: zone });
    expect(plan!.path.startsWith("/api/harvest-lots/export?")).toBe(true);
    expect(get({ action: "export", page: "1" })).toBeUndefined();
  });
});

describe("lot movements", () => {
  it("reads the sales history of one lot in its zone", () => {
    const plan = get({ action: "movements", id: lot, zoneId: zone });
    expect(plan).toMatchObject({ method: "GET", permission: "View", zoneId: zone, path: `/api/harvest-lots/${lot}/movements` });
    const movement = { id: lot, occurredAt: "2026-11-17T09:00:00+07:00", kind: "LotClose", documentId: null, documentCode: null, productId: product, productCode: "SP1", productName: "Hàu sữa", quantityKg: -20 };
    expect(plan?.schema.safeParse([movement]).success).toBe(true);
    expect(plan?.schema.safeParse({ items: [movement] }).success).toBe(true);
    expect(plan?.schema.safeParse([{ ...movement, quantityKg: "20" }]).success).toBe(false);
  });
  it("needs the lot and its zone", () => {
    expect(get({ action: "movements", id: lot })).toBeUndefined();
    expect(get({ action: "movements", zoneId: zone })).toBeUndefined();
    expect(get({ action: "movements", id: "../x", zoneId: zone })).toBeUndefined();
  });
});

describe("weigh", () => {
  const weigh = (body: unknown) => post("weigh", body);
  it("posts the kg of every line and the time to the weigh route", () => {
    const body = { rowVersion: "v1", weighedAt: "2026-11-17T10:30:00+07:00", lines: [{ lineNumber: 1, weighedKg: 120.125 }, { lineNumber: 2, weighedKg: 80 }] };
    expect(weigh(body)).toMatchObject({ method: "POST", path: `/api/harvest-lots/${lot}/weigh`, permission: "Edit", zoneId: zone, body });
  });
  it("posts one kg for a lot without lines", () => expect(weigh({ rowVersion: "v1", lines: [], weighedKg: 55.5 })?.body).toEqual({ rowVersion: "v1", lines: [], weighedKg: 55.5 }));
  it.each([
    ["no kg at all", { rowVersion: "v1", lines: [] }],
    ["lines and a lot kg together", { rowVersion: "v1", lines: [{ lineNumber: 1, weighedKg: 5 }], weighedKg: 5 }],
    ["a zero kg", { rowVersion: "v1", lines: [{ lineNumber: 1, weighedKg: 0 }] }],
    ["a negative kg", { rowVersion: "v1", lines: [], weighedKg: -1 }],
    ["4 decimals", { rowVersion: "v1", lines: [{ lineNumber: 1, weighedKg: 1.2345 }] }],
    ["a repeated line", { rowVersion: "v1", lines: [{ lineNumber: 1, weighedKg: 1 }, { lineNumber: 1, weighedKg: 2 }] }],
    ["line 0", { rowVersion: "v1", lines: [{ lineNumber: 0, weighedKg: 1 }] }],
    ["a time without offset", { rowVersion: "v1", weighedAt: "2026-11-17T10:30:00", lines: [], weighedKg: 1 }],
    ["no version", { lines: [], weighedKg: 1 }],
    ["an unknown field", { rowVersion: "v1", lines: [], weighedKg: 1, extra: true }],
  ])("refuses %s", (_name, body) => expect(weigh(body)).toBeUndefined());
  it("is not offered for seeding", () => expect(post("weigh", { rowVersion: "v1", lines: [], weighedKg: 1 }, "seeding")).toBeUndefined());
});

describe("reopen and close", () => {
  it("reopens with a reason", () => expect(post("reopen", { rowVersion: "v1", reason: "  Khách nhận thêm  " })).toMatchObject({ method: "POST", path: `/api/harvest-lots/${lot}/reopen`, permission: "Edit", body: { rowVersion: "v1", reason: "Khách nhận thêm" } }));
  it.each([{ rowVersion: "v1" }, { rowVersion: "v1", reason: "   " }, { reason: "x" }, { rowVersion: "v1", reason: "x", extra: 1 }])("refuses a reopen with %j", (body) => expect(post("reopen", body)).toBeUndefined());
  it("closes with the kg left and why", () => {
    expect(post("close", { rowVersion: "v1", leftoverKg: 12.5, reason: "Spoiled" })).toMatchObject({ path: `/api/harvest-lots/${lot}/close`, permission: "Edit" });
    expect(post("close", { rowVersion: "v1", leftoverKg: 0 })?.body).toEqual({ rowVersion: "v1", leftoverKg: 0 });
    expect(post("close", { rowVersion: "v1", leftoverKg: 3, reason: "Unsold", ownerApproved: true, approvalReason: "Đã đối chiếu" })?.body).toMatchObject({ ownerApproved: true });
  });
  it.each([
    ["kg left without a reason", { rowVersion: "v1", leftoverKg: 3 }], ["a reason the API does not take", { rowVersion: "v1", leftoverKg: 3, reason: "TimeLimitReached" }],
    ["a negative kg", { rowVersion: "v1", leftoverKg: -1 }], ["3 decimals", { rowVersion: "v1", leftoverKg: 1.005, reason: "Unsold" }],
  ])("refuses a close with %s", (_name, body) => expect(post("close", body)).toBeUndefined());
  it("answers the lot with its message", () => {
    const answer = post("reopen", { rowVersion: "v1", reason: "x" })!.schema;
    expect(answer.safeParse({ lot: { id: lot, lotCode: "L", cycleId: raft, raftId: raft, raftCode: "B1", zoneId: zone, zoneCode: "V01", harvestedAt: "2026-11-17T08:00:00+07:00", harvestDate: "2026-11-17", laneNumbers: [1], finishedLaneNumbers: [], cageCount: 1, kgPerCage: 50, estimatedKg: 50,
      figures: { invoicedKg: 0, returnedKg: 0, soldKg: 0, remainingKg: 50, lostKg: 0, differenceKg: 0, notFinal: true }, closeDate: null, leftoverKg: null, lanePercents: [], photos: [], recordedByName: null, rowVersion: "v2", statusId: 2902, canWeigh: false, canReopen: false }, message: "ok", messageCode: "MSG-GEN-05" }).success).toBe(true);
    expect(answer.safeParse({ message: "ok" }).success).toBe(false);
  });
});

describe("lot detail and movements with the references the lot detail links to", () => {
  const detailPlan = () => get({ action: "detail", id: lot, zoneId: zone })!;
  const base = {
    id: lot, lotCode: "LTH000001", cycleId: raft, raftId: raft, raftCode: "B1", zoneId: zone, zoneCode: "V01", harvestedAt: "2026-11-17T08:00:00+07:00", harvestDate: "2026-11-17", laneNumbers: [1], finishedLaneNumbers: [], cageCount: 1, kgPerCage: 50, estimatedKg: 50,
    figures: { invoicedKg: 0, returnedKg: 0, soldKg: 0, remainingKg: 50, lostKg: 0, differenceKg: 0, notFinal: true }, closeDate: null, leftoverKg: null, lanePercents: [], photos: [], recordedByName: null, rowVersion: "v1",
  };
  const receipt = "529ec3ce-af8f-42f7-a08f-4bab36ba7e70", order = "529ec3ce-af8f-42f7-a08f-4bab36ba7e71", invoice = "529ec3ce-af8f-42f7-a08f-4bab36ba7e72", batch = "529ec3ce-af8f-42f7-a08f-4bab36ba7e73";

  it("reads the seed lots, the nursery batch, the orders and the closing invoice of the lot, and the stock of each product", () => {
    const parsed = detailPlan().schema.parse({
      ...base, references: { seedLots: [{ receiptId: receipt, receiptCode: "PN000001", lineNumber: 2, seedLotCode: "G-01", itemCode: "GG1", itemName: "Giống hàu" }], nurseryBatch: { id: batch, code: "NU000001" },
        salesOrders: [{ id: order, code: "DH000001" }, { id: batch, code: "DH000002", statusId: 4402 }], closedByInvoice: { id: invoice, code: "HD000001" } },
      productStocks: [{ productId: product, productCode: "SP1", productName: "Hàu sữa", harvestedKg: 50, soldKg: 20, remainingKg: 30 }],
    }) as { references: { seedLots: { receiptCode: string }[]; salesOrders: { code: string }[]; closedByInvoice: { code: string } }; productStocks: { remainingKg: number }[] };
    expect(parsed.references.seedLots[0].receiptCode).toBe("PN000001");
    expect(parsed.references.salesOrders.map((item) => item.code)).toEqual(["DH000001", "DH000002"]);
    expect(parsed.references.closedByInvoice.code).toBe("HD000001");
    expect(parsed.productStocks[0].remainingKg).toBe(30);
  });
  it("still reads an answer without them, as empty lists", () => {
    const parsed = detailPlan().schema.parse(base) as { references: unknown; productStocks: unknown[] };
    expect(parsed.references).toEqual({ seedLots: [], salesOrders: [] });
    expect(parsed.productStocks).toEqual([]);
  });
  it.each([
    ["a stock without its kg", { productStocks: [{ productId: product, productCode: "SP1", productName: "Hàu sữa", harvestedKg: 50 }] }],
    ["an order without its code", { references: { seedLots: [], salesOrders: [{ id: order }] } }],
    ["a seed lot without its receipt", { references: { seedLots: [{ seedLotCode: "G-01" }], salesOrders: [] } }],
    ["a reference with an id that is not a guid", { references: { seedLots: [], salesOrders: [], closedByInvoice: { id: "x", code: "HD1" } } }],
  ])("refuses %s", (_name, extra) => expect(detailPlan().schema.safeParse({ ...base, ...extra }).success).toBe(false));
  it("reads the order of a sale movement and nothing else changes for the other kinds", () => {
    const schema = get({ action: "movements", id: lot, zoneId: zone })!.schema;
    const sale = { id: lot, occurredAt: "2026-11-17T09:00:00+07:00", kind: "Sale", documentId: invoice, documentCode: "HD000001", productId: product, productCode: "SP1", productName: "Hàu sữa", quantityKg: -20, transactionPrice: 85000, partyName: "Trần Lái", partyCode: "KH000001", salesOrderCode: "DH000001" };
    expect((schema.parse([sale]) as { salesOrderCode: string }[])[0].salesOrderCode).toBe("DH000001");
    expect(schema.safeParse([{ ...sale, kind: "Return", documentCode: "TL000001", salesOrderCode: undefined }]).success).toBe(true);
    expect(schema.safeParse([{ ...sale, salesOrderCode: 5 }]).success).toBe(false);
  });
});
