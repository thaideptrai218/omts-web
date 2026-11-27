import { describe, expect, it } from "vitest";
import { farmingReferenceHref } from "./farming-reference-href";

describe("farming references", () => {
  it("keeps the exact harvest record and its raft scope together", () => {
    const url = new URL(farmingReferenceHref("harvest", { zoneId: "zone", raftId: "raft", recordId: "lot", search: "Lô & 1" }), "https://omts.test");
    expect(url.pathname).toBe("/operations/harvest");
    expect(Object.fromEntries(url.searchParams)).toEqual({ zoneId: "zone", raftId: "raft", recordId: "lot", search: "Lô & 1" });
  });
  it("uses the existing exact-code document entry points", () => {
    expect(farmingReferenceHref("purchaseReceipt", { code: "PN000001" })).toBe("/operations/purchase-receipts?code=PN000001");
    expect(farmingReferenceHref("inputItem", { code: "VT000001" })).toBe("/inputs/items?code=VT000001");
    expect(farmingReferenceHref("salesInvoice", { code: "HD000001" })).toBe("/operations/sales-invoice-list?code=HD000001");
  });
  it("opens a cycle reference on the Chu kỳ nuôi tab of its raft, the care log for tab=logs, and never carries the cycle id", () => {
    expect(farmingReferenceHref("cycle", { zoneId: "zone", raftId: "raft", cycleId: "cycle", tab: "journey" })).toBe("/farming/rafts?zoneId=zone&recordId=raft&tab=cycles");
    expect(farmingReferenceHref("cycle", { zoneId: "zone", raftId: "raft", search: "B1-01", tab: "logs" })).toBe("/farming/rafts?zoneId=zone&recordId=raft&search=B1-01&tab=logs");
    expect(farmingReferenceHref("cycle", { search: "B1-01" })).toBe("/farming/rafts?search=B1-01&tab=cycles");
  });
  it("omits missing references rather than inventing record identities", () => {
    expect(farmingReferenceHref("cycle", { zoneId: " ", raftId: null })).toBe("/farming/rafts?tab=cycles");
    expect(farmingReferenceHref("zone", { recordId: "zone", search: "VN01" })).toBe("/farming/zones?recordId=zone&search=VN01");
  });
});
