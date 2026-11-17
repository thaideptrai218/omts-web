import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { planOperation } from "./operation-plan";
import { salesReturnsPlan } from "./sales-returns-plan";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const get = (query: string) => salesReturnsPlan("GET", new URLSearchParams(query));
const post = (action: string, body: unknown, target = id(1)) => salesReturnsPlan("POST", new URLSearchParams(), { action, id: target, body });
const url = (plan: { path: string } | undefined) => new URL(plan!.path, "http://api");
const person = { id: id(9), name: "Chủ HTX" };
const view = {
  id: id(1), code: "TL000001", invoiceId: id(2), invoiceCode: "HD000001", returnDate: "2026-11-17", reason: "Hàu chết", value: 1_000_000, statusId: 4101, status: "Recorded", recordedBy: person,
  lines: [{ invoiceLineId: id(3), lineNumber: 1, productName: "Hàu sữa", harvestLotId: id(4), lotCode: "LTH000001", returnedKg: 20, outcome: "BackForSale", discardedKg: 0 }], rowVersion: "AAA",
};

describe("sales return reads", () => {
  it("lists with every filter the API knows, paging defaults and the View permission scoped to the zone filter", () => {
    const plan = get(`action=list&from=2026-11-01&to=2026-11-17&customerId=${id(5)}&zoneId=${id(6)}&statusId=4102&search=%20TL0%20&sort=value&sortDir=asc`);
    expect(plan).toMatchObject({ area: "sales-returns", method: "GET", permission: "View", zoneId: id(6) });
    expect(url(plan).pathname).toBe("/api/sales-returns");
    expect(Object.fromEntries(url(plan).searchParams)).toEqual({ from: "2026-11-01", to: "2026-11-17", customerId: id(5), zoneId: id(6), statusId: "4102", search: "TL0", sort: "value", sortDir: "asc", page: "1", pageSize: "15" });
  });
  it("lists the whole cooperative without a zone", () => {
    const plan = get("action=list&page=3&pageSize=50");
    expect(url(plan).search).toBe("?page=3&pageSize=50");
    expect(plan?.zoneId).toBeUndefined();
  });
  it("reads the page with its totals and refuses an answer without them", () => {
    const plan = get("action=list")!;
    const row = { id: id(1), code: "TL000001", returnDate: "2026-11-17", invoiceId: id(2), invoiceCode: "HD000001", salesOrder: { id: id(7), code: "DH000001" }, customer: { id: id(5), code: "KH000001", name: "Trần Lái" },
      zoneCode: "V01", value: 1_000_000, statusId: 4101, status: "Recorded", recordedByName: "Chủ HTX", lineCount: 2, backForSaleKg: 20, discardedKg: 5 };
    const page = { items: [row], total: 1, page: 1, pageSize: 15, totals: { value: 1_000_000, backForSaleKg: 20, discardedKg: 5 } };
    expect(plan.schema.safeParse(page).success).toBe(true);
    expect(plan.schema.safeParse({ ...page, totals: undefined }).success).toBe(false);
    expect(plan.schema.safeParse({ ...page, items: [{ ...row, statusId: "4101" }] }).success).toBe(false);
    expect(plan.schema.safeParse({ ...page, items: [{ ...row, salesOrder: undefined, customer: null, zoneCode: undefined }] }).success).toBe(true);
  });
  it("exports the same filters as a file without paging", () => {
    const plan = get(`action=export&zoneId=${id(6)}&statusId=4101&sort=code&sortDir=desc`);
    expect(plan).toMatchObject({ file: "export", permission: "View", zoneId: id(6) });
    expect(url(plan).pathname).toBe("/api/sales-returns/export");
    expect(url(plan).searchParams.has("page")).toBe(false);
    expect(get("action=export&page=1")).toBeUndefined();
  });
  it.each(["statusId=4100", "sort=customer", "sortDir=up", "zoneId=abc", "from=17/11/2026", "from=2026-11-18&to=2026-11-17", "page=0", "pageSize=500", "search=", "extra=1", `id=${id(1)}`])("refuses the list query %s", (extra) => {
    expect(get(`action=list&${extra}`)).toBeUndefined();
  });
  it("refuses a repeated name, an unknown action and a body on a read", () => {
    expect(get("action=list&page=1&page=2")).toBeUndefined();
    expect(get("action=delete")).toBeUndefined();
    expect(salesReturnsPlan("GET", new URLSearchParams("action=list"), {})).toBeUndefined();
  });
  it("reads one return by id and checks the id that comes back", () => {
    const plan = get(`action=detail&id=${id(1)}`);
    expect(plan).toMatchObject({ permission: "View", path: `/api/sales-returns/${id(1)}`, expectedId: id(1) });
    expect(plan!.schema.safeParse(view).success).toBe(true);
    expect(plan!.schema.safeParse({ ...view, canCancel: true, salesOrder: { id: id(7), code: "DH000001" }, customer: { id: id(5), code: "KH000001", name: "Trần Lái" }, zoneCode: "V01", backForSaleKg: 20, discardedKg: 0 }).success).toBe(true);
    expect(plan!.schema.safeParse({ ...view, lines: [{ ...view.lines[0], outcome: "Sold" }] }).success).toBe(false);
    expect(get("action=detail")).toBeUndefined();
    expect(get(`action=detail&id=${id(1)}&page=2`)).toBeUndefined();
  });
  it("previews the return of an invoice, with the walk-in customer only when it is chosen", () => {
    expect(get(`action=preview&id=${id(2)}`)).toMatchObject({ permission: "Create", path: `/api/sales-invoices/${id(2)}/sales-return/preview` });
    expect(get(`action=preview&id=${id(2)}&customerId=${id(5)}`)).toMatchObject({ path: `/api/sales-invoices/${id(2)}/sales-return/preview?customerId=${id(5)}` });
    expect(get("action=preview")).toBeUndefined();
    expect(get(`action=preview&id=${id(2)}&zoneId=${id(6)}`)).toBeUndefined();
    const preview = { invoiceId: id(2), invoiceCode: "HD000001", rowVersion: "AAA", requiresCustomer: false, customer: { id: id(5), name: "Trần Lái", phoneNumber: null }, value: 1_000_000, ownerMustAgree: true,
      lines: [{ invoiceLineId: id(3), lineNumber: 1, productName: "Hàu sữa", harvestLotId: id(4), lotCode: "LTH000001", lotStatusId: 2901, lotStatus: "Open", kg: 20, unitPrice: 50_000, amount: 1_000_000 }],
      qualityClaims: [{ id: id(8), code: "KN000001", sentAt: "2026-11-16T08:00:00+07:00", statusId: 3703, status: "Accepted", offer: "ReturnAllGoods" }], customerDebt: 0, debtAfter: -1_000_000, owedBackAfter: 1_000_000 };
    const schema = get(`action=preview&id=${id(2)}`)!.schema;
    expect(schema.safeParse(preview).success).toBe(true);
    expect(schema.safeParse({ ...preview, ownerMustAgree: undefined }).success).toBe(false);
  });
});

describe("sales return writes", () => {
  const lines = [{ invoiceLineId: id(3), outcome: "BackForSale" }, { invoiceLineId: id(10), outcome: "ThrownAway" }];
  const body = { reason: "Hàu chết", rowVersion: "AAA", lines };

  it("saves the return of an invoice: Create, every line once, the answers given so far", () => {
    const plan = post("create", { ...body, ownerAgreed: true, thrownAwayLots: [{ harvestLotId: id(4), stillForSale: false, leftoverKg: 12.5, closeReason: "Spoiled" }, { harvestLotId: id(11), stillForSale: true }] }, id(2));
    expect(plan).toMatchObject({ method: "POST", permission: "Create", path: `/api/sales-invoices/${id(2)}/sales-return` });
    expect(plan!.schema.safeParse({ return: view, debtAfter: -1_000_000, owedBack: 1_000_000, message: "ok", messageCode: "MSG-CLAIM-05" }).success).toBe(true);
  });
  it("saves a walk-in invoice with the chosen customer", () => {
    expect((post("create", { ...body, customerId: id(5) })?.body as { customerId: string }).customerId).toBe(id(5));
  });
  it.each<[string, unknown]>([
    ["no reason", { ...body, reason: " " }], ["no row version", { ...body, rowVersion: undefined }], ["no lines", { ...body, lines: [] }], ["a line twice", { ...body, lines: [lines[0], lines[0]] }],
    ["an unknown outcome", { ...body, lines: [{ invoiceLineId: id(3), outcome: "Sold" }] }], ["a stray field", { ...body, extra: 1 }], ["a reason over 1000 characters", { ...body, reason: "x".repeat(1001) }],
    ["a close with leftover but no reason", { ...body, thrownAwayLots: [{ harvestLotId: id(4), stillForSale: false, leftoverKg: 5 }] }],
    ["a negative leftover", { ...body, thrownAwayLots: [{ harvestLotId: id(4), stillForSale: false, leftoverKg: -1, closeReason: "Unsold" }] }],
  ])("refuses a save with %s", (_name, bad) => expect(post("create", bad)).toBeUndefined());
  it("cancels a return: Delete, a reason and the row version, the answer to the negative-stock question", () => {
    expect(post("cancel", { reason: "Nhập nhầm", rowVersion: "AAA" })).toMatchObject({ method: "POST", permission: "Delete", path: `/api/sales-returns/${id(1)}/cancel` });
    expect((post("cancel", { reason: "Nhập nhầm", rowVersion: "AAA", confirmNegativeRemaining: true })?.body as { confirmNegativeRemaining: boolean }).confirmNegativeRemaining).toBe(true);
    expect(post("cancel", { rowVersion: "AAA" })).toBeUndefined();
    expect(post("cancel", { reason: "x", rowVersion: "AAA", extra: 1 })).toBeUndefined();
  });
  it("refuses a bad id, an unknown action, a query on a write and a verb other than POST", () => {
    expect(post("create", body, "abc")).toBeUndefined();
    expect(post("delete", {})).toBeUndefined();
    expect(salesReturnsPlan("POST", new URLSearchParams("a=1"), { action: "cancel", id: id(1), body: { reason: "x", rowVersion: "A" } })).toBeUndefined();
    expect(salesReturnsPlan("PUT", new URLSearchParams(), { action: "cancel", id: id(1), body: {} })).toBeUndefined();
  });
  it("is the plan the operation door uses for the sales-returns area", () => {
    expect(planOperation("sales-returns", "GET", new URLSearchParams("action=list"))).toMatchObject({ area: "sales-returns", path: "/api/sales-returns?page=1&pageSize=15" });
  });
});
