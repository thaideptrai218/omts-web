import { describe, expect, it } from "vitest";
import { createDemoAccountingRepository } from "./repository";

describe("local accounting request demo", () => {
  it("runs Manager submit to Accountant payment and Owner notices without approval", () => {
    let index = 0;
    const times = [new Date("2026-11-03T02:00:00.000Z"), new Date("2026-11-03T03:00:00.000Z")];
    const repository = createDemoAccountingRepository(() => times[index++]!);
    const submitted = repository.submit({
      accountId: "account-nguyen-an",
      amount: 150000,
      invoiceReference: "HD-001",
      note: "Thức ăn",
      supplierName: "Nhà cung cấp A",
      zoneId: "zone-east",
    });
    expect(submitted).toMatchObject({ status: "saved", data: { status: "pending-payment", zoneId: "zone-east" } });
    if (submitted.status !== "saved") return;
    expect(repository.load("account-tran-binh").receipts).toHaveLength(1);
    expect(repository.load("account-owner-demo").notices[0]?.text).toContain("đã gửi");
    expect(repository.pay("account-owner-demo", submitted.data.id)).toEqual({ status: "forbidden" });
    expect(repository.pay("account-tran-binh", submitted.data.id)).toMatchObject({ status: "saved", data: { status: "paid" } });
    expect(repository.load("account-owner-demo").notices[0]?.text).toContain("đã thanh toán");
  });

  it("blocks a Manager from submitting for another zone", () => {
    const repository = createDemoAccountingRepository();
    expect(repository.submit({
      accountId: "account-nguyen-an",
      amount: 1000,
      invoiceReference: "HD-002",
      note: "",
      supplierName: "Nhà cung cấp B",
      zoneId: "zone-south",
    })).toEqual({ status: "forbidden" });
  });
});
