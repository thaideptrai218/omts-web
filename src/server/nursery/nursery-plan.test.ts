import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { completeValues, planNursery } from "./nursery-plan";
import { nurseryDetail } from "./nursery-response-schemas";

const id = "529ec3ce-af8f-42f7-a08f-4bab36ba7e64", zoneId = "529ec3ce-af8f-42f7-a08f-4bab36ba7e63";
const plan = (method: string, query: Record<string, string>) => planNursery(method, new URLSearchParams(query));

describe("nursery BFF plan v2", () => {
  it("routes close to the backend close endpoint with Edit permission and an optional reason", () => {
    const close = plan("POST", { action: "close", id, zoneId });
    expect(close).toMatchObject({ method: "POST", permission: "Edit", path: `/api/nursery-batches/${id}/close` });
    expect(close?.validator?.safeParse({ rowVersion: "v" }).success).toBe(true);
    expect(close?.validator?.safeParse({ reason: "Hết nhu cầu", rowVersion: "v" }).success).toBe(true);
    expect(close?.validator?.safeParse({ reason: "x".repeat(1001), rowVersion: "v" }).success).toBe(false);
  });
  it("no longer exposes allocation transfer and accepts the closed status filter", () => {
    expect(plan("POST", { action: "allocations", id, zoneId })).toBeUndefined();
    expect(plan("GET", { action: "list", status: "closed" })?.path).toContain("status=closed");
  });
  it("completion carries only survivors, date and version", () => {
    expect(completeValues.safeParse({ survivors: 9500, completedOn: "2026-11-13", rowVersion: "v" }).success).toBe(true);
    expect(completeValues.safeParse({ survivors: 9500, rowVersion: "v", allocations: [] }).success).toBe(false);
  });
  it("tolerates absent v2 inventory fields in a detail response and keeps usage", () => {
    const base = { id, code: "NU1", zoneId, zoneCode: "Z", zoneName: "Vùng", quantityIn: 10, startDate: "2026-11-01", daysNursing: 1, status: "Completed", rowVersion: "v",
      seedLot: { id: "l", code: "L", itemName: "Hàu giống", unit: "mảnh" }, seedLotOnHand: 0 };
    expect(nurseryDetail.safeParse(base).success).toBe(true);
    const full = nurseryDetail.parse({ ...base, seeded: 3, remaining: 6, closedOn: null, usage: [{ cycleId: "c", raftId: "r", raftCode: "B1", seeded: 3, lastSeedingOn: "2026-11-13", extra: 1 }] });
    expect(full.usage?.[0].raftCode).toBe("B1");
    expect(full.remaining).toBe(6);
  });
});

describe("nursery list over several zones", () => {
  const zones = [0x71, 0x72].map(n => `529ec3ce-af8f-42f7-a08f-4bab36ba7e${n.toString(16)}`);
  it("expands the comma list of the browser into repeated zoneIds and checks no single zone, because the backend intersects them with the permitted ones", () => {
    const list = plan("GET", { action: "list", zoneIds: zones.join(","), status: "nursing" });
    expect(list?.zoneId).toBeUndefined();
    const url = new URL(list!.path, "http://api");
    expect(url.pathname).toBe("/api/nursery-batches");
    expect(url.searchParams.getAll("zoneIds")).toEqual(zones);
    expect(url.searchParams.get("status")).toBe("nursing");
    expect(url.searchParams.has("zoneId")).toBe(false);
  });
  it("keeps a single zoneId working for deep links, and refuses both together, a bad id, a repeat of the key, and zoneIds on any other action", () => {
    expect(plan("GET", { action: "list", zoneId })).toMatchObject({ zoneId });
    expect(plan("GET", { action: "list", zoneId, zoneIds: zones.join(",") })).toBeUndefined();
    expect(plan("GET", { action: "list", zoneIds: `${zones[0]},nope` })).toBeUndefined();
    expect(planNursery("GET", new URLSearchParams(`action=list&zoneIds=${zones[0]}&zoneIds=${zones[1]}`))).toBeUndefined();
    expect(plan("GET", { action: "seed-lots", zoneId, zoneIds: zones[0] })).toBeUndefined();
    expect(plan("GET", { action: "detail", id, zoneId, zoneIds: zones[0] })).toBeUndefined();
  });
  it("accepts up to 50 zones and refuses more", () => {
    const many = (count: number) => Array.from({ length: count }, (_, index) => `529ec3ce-af8f-42f7-a08f-4bab36ba${String(index).padStart(4, "0")}`).join(",");
    expect(new URL(plan("GET", { action: "list", zoneIds: many(50) })!.path, "http://api").searchParams.getAll("zoneIds")).toHaveLength(50);
    expect(plan("GET", { action: "list", zoneIds: many(51) })).toBeUndefined();
  });
});
