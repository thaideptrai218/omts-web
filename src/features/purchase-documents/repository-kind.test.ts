import { afterEach, describe, expect, it, vi } from "vitest";

const bff = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/features/auth/api/bff-fetch", () => ({ bffFetch: bff.fetch }));
import { listReceipts, listReturns, saveReceipt } from "./repository";

afterEach(() => vi.clearAllMocks());
const page = { page: { items: [], page: 1, pageSize: 15, total: 0 }, totals: { count: 0, completedCount: 0, receiptsTotal: 0, returnsTotal: 0, netTotal: 0 } };
const ok = (data: unknown) => Response.json({ status: "success", data });
const query = { search: "", statusId: "", group: "", supplierId: "", from: "", to: "", sortBy: "code", sortDir: "desc" as const, page: 1, pageSize: 15 };

describe("receipt lists and saves carry the kind", () => {
  it("asks the receipt list for its kind and the group narrowing of a Supply screen", async () => {
    bff.fetch.mockResolvedValue(ok(page));
    await listReceipts({ ...query, kind: "Supply", group: "Other" });
    const url = new URL(String(bff.fetch.mock.calls[0][0]), "http://web");
    expect(url.searchParams.get("kind")).toBe("Supply");
    expect(url.searchParams.get("itemGroups")).toBe("Other");
    expect(url.searchParams.get("action")).toBe("receipts");
  });
  it("asks the return list for its kind", async () => {
    bff.fetch.mockResolvedValue(ok({ page: { items: [], page: 1, pageSize: 15, total: 0 }, totalValue: 0 }));
    await listReturns({ ...query, source: "", kind: "Seed" });
    expect(new URL(String(bff.fetch.mock.calls[0][0]), "http://web").searchParams.get("kind")).toBe("Seed");
  });
  it("leaves the kind out when no screen fixes one", async () => {
    bff.fetch.mockResolvedValue(ok(page));
    await listReceipts(query);
    expect(new URL(String(bff.fetch.mock.calls[0][0]), "http://web").searchParams.has("kind")).toBe(false);
  });
  it("sends the kind of a new receipt, and none when an existing receipt is edited", async () => {
    bff.fetch.mockResolvedValue(Response.json({ status: "error" }, { status: 400 }));
    const draft = { code: "", receivedAt: "2026-11-17T08:00", receivedById: "", supplierId: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b08", discount: 0, notes: "", lines: [] };
    await saveReceipt({ ...draft, kind: "Seed" }, false);
    expect(JSON.parse(String(bff.fetch.mock.calls[0][1].body)).body.kind).toBe("Seed");
    await saveReceipt({ ...draft, kind: "Seed", id: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b01", rowVersion: "v" }, false);
    expect(JSON.parse(String(bff.fetch.mock.calls[1][1].body)).body.kind).toBeUndefined();
  });
});
