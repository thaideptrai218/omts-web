import { describe, expect, it } from "vitest";
import { actionOptionLabel, auditAction, importantChanges, longestAuditFrom } from "./presentation";
describe("owner-facing audit summary", () => {
  it("explains a supplier refund without exposing internal IDs, nulls or enum codes", () => {
    const changes = importantChanges(null, { Kind: "PaidBack", SupplierId: "internal-supplier-id", Amount: 1000, PaymentDate: "2026-11-06", Method: "Cash", BankReference: null, Note: "Hoàn tiền trả hàng" });
    expect(changes).toEqual([
      { label: "Loại giao dịch", before: "Chưa có", after: "Nhà cung cấp hoàn tiền" },
      { label: "Số tiền", before: "Chưa có", after: "1.000 đồng" },
      { label: "Ngày giao dịch", before: "Chưa có", after: "06/11/2026" },
      { label: "Phương thức", before: "Chưa có", after: "Tiền mặt" },
      { label: "Ghi chú", before: "Chưa có", after: "Hoàn tiền trả hàng" },
    ]);
    expect(JSON.stringify(changes)).not.toContain("internal-supplier-id");
  });
  it("shows only actual changed business values, including zero and removals", () => {
    expect(importantChanges({ Amount: 1000, Note: "Cũ", RowVersion: "v1" }, { Amount: 0, Note: null, RowVersion: "v2" })).toEqual([
      { label: "Số tiền", before: "1.000 đồng", after: "0 đồng" },
      { label: "Ghi chú", before: "Cũ", after: "Chưa có" },
    ]);
    expect(importantChanges({ Amount: 5 }, { amount: 5 })).toEqual([]);
    expect(auditAction("SupplierPayment.Recorded")).toBe("Ghi nhận");
  });
});
describe("audit filter presentation", () => {
  it("names a filter action by its record type and verb, and falls back for unknown values", () => {
    expect(actionOptionLabel("SupplierPayment.Recorded")).toBe("Giao dịch nhà cung cấp · Ghi nhận");
    expect(actionOptionLabel("Deleted")).toBe("Xóa");
    expect(actionOptionLabel("Mystery.Thing")).toBe("Mystery · Ghi nhận thao tác");
  });
  it("asks for the longest period the backend accepts when all time is chosen", () => {
    expect(longestAuditFrom(new Date(2026, 10, 18))).toBe("2021-11-20");
  });
});
