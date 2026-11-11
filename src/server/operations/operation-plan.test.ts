import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { planOperation } from "./operation-plan";
import { ids } from "@/features/operations/__tests__/fixtures";
const query = (value = "") => new URLSearchParams(value);
describe("fixed operation plans", () => {
  it("uses the receipt's action rather than treating every write as Edit", () => {
    expect(planOperation("purchase-receipts", "POST", query(), { action: "cancel", id: ids.receipt, body: { reason: "Sai phiếu", rowVersion: "AQID", cancelPayments: false } }))
      .toMatchObject({ permission: "Delete", path: `/api/purchase-receipts/${ids.receipt}/cancel`, body: { cancelPayments: false } });
    expect(planOperation("purchase-receipts", "POST", query(), { action: "copy", id: ids.receipt, body: {} })).toMatchObject({ permission: "Create" });
    expect(planOperation("water", "POST", query(), { action: "correct", id: ids.water, body: { raftId: ids.raft, ph: 7, salinity: 25, temperature: 26, measuredAt: "2026-10-01T08:00:00+07:00", reason: "Nhập sai" } }))
      .toMatchObject({ permission: "Edit", path: `/api/water-measurements/${ids.water}/corrections` });
    // The v2 backend has no confirm step, OCR re-read or editing presence on a measurement.
    for (const action of ["confirm", "recognize-again", "editing", "stop-editing"]) expect(planOperation("water", "POST", query(), { action, id: ids.water, body: {} })).toBeUndefined();
  });
  it("never accepts arbitrary URLs, IDs, query keys or duplicate filters", () => {
    expect(planOperation("water", "GET", query(`action=detail&id=${encodeURIComponent("../auth/login")}`))).toBeUndefined();
    expect(planOperation("purchase-receipts", "GET", query("url=https://evil.test"))).toBeUndefined();
    expect(planOperation("purchase-receipts", "GET", query("page=1&page=2"))).toBeUndefined();
    expect(planOperation("purchase-receipts", "GET", query("from=2026-11-01&to=2026-10-01"))).toBeUndefined();
    expect(planOperation("supplier-payments", "POST", query(), { action: "record", body: { url: "https://evil.test" } })).toBeUndefined();
  });
  it("projects only endpoint-supported search filters and the correct export action", () => {
    expect(planOperation("water", "GET", query(`action=chart&zoneId=${ids.zone}&status=Draft&groupBy=day`))).toMatchObject({ path: `/api/zones/${ids.zone}/water-measurements/chart`, permission: "View" });
    expect(planOperation("purchase-receipts", "GET", query("action=export&statusId=1702"))).toMatchObject({ permission: "Export", file: "export", path: "/api/purchase-receipts/export?statusId=1702" });
  });
});
