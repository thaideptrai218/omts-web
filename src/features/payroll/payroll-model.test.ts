import { expect, it } from "vitest";
import { createSheet, sheetDetail } from "./contracts";
import { defaultStatuses, expenseMonthOptions, monthLabel, monthOptions, rangeLabel, statusLabel } from "./payroll-model";

it("offers the current month and the previous 12 as whole calendar months, newest first", () => {
  const months = monthOptions("2026-03-15");
  expect(months).toHaveLength(13);
  expect(months[0]).toMatchObject({ value: "2026-03", from: "2026-03-01", to: "2026-03-31", label: "01/03/2026 - 31/03/2026" });
  expect(months[1]).toMatchObject({ value: "2026-02", to: "2026-02-28" });
  expect(months[3]).toMatchObject({ value: "2025-12", from: "2025-12-01", to: "2025-12-31" });
  expect(months[12].value).toBe("2025-03");
  expect(monthOptions("2024-03-01")[1].to).toBe("2024-02-29");
});

it("uses the KiotViet status words and hides cancelled sheets by default", () => {
  expect(statusLabel).toEqual({ Creating: "Đang tạo", Provisional: "Tạm tính", Finalized: "Đã chốt lương", Cancelled: "Đã hủy" });
  expect(defaultStatuses).toEqual(["Creating", "Provisional", "Finalized"]);
  expect(rangeLabel("2026-05-01", "2026-05-31")).toBe("01/05/2026 - 31/05/2026");
  expect(monthLabel("2026-05")).toBe("Tháng 05/2026");
  expect(monthLabel(null)).toBe("—");
});

it("centres the expense month list on the period end month", () => {
  const options = expenseMonthOptions("2026-01-31", 2);
  expect(options.map((option) => option.value)).toEqual(["2026-03", "2026-02", "2026-01", "2025-12", "2025-11"]);
});

it("validates create bodies strictly", () => {
  const id = "4b0a1c6e-5a1e-4f4b-9c5e-0a7f6a1c9d03";
  expect(createSheet.safeParse({ periodType: "Monthly", from: "2026-05-01", to: "2026-05-31", scope: "All" }).success).toBe(true);
  expect(createSheet.safeParse({ periodType: "Monthly", from: "2026-05-01", to: "2026-05-31", scope: "Selected", employeeIds: [id] }).success).toBe(true);
  expect(createSheet.safeParse({ periodType: "Monthly", from: "2026-05-01", to: "2026-05-31", scope: "Selected" }).success).toBe(false);
  expect(createSheet.safeParse({ periodType: "Monthly", from: "2026-06-01", to: "2026-05-31", scope: "All" }).success).toBe(false);
});

it("rejects a sheet detail whose money is not whole VND", () => {
  const base = { id: "4b0a1c6e-5a1e-4f4b-9c5e-0a7f6a1c9d01", code: "BL000001", name: "Bảng lương tháng 5/2026", periodType: "Monthly", from: "2026-05-01", to: "2026-05-31", scope: "All", status: "Provisional",
    expenseMonth: null, note: null, createdBy: "Chủ", createdAt: "2026-06-01T00:00:00Z", total: 100, paid: 0, outstanding: 100, slips: [] };
  expect(sheetDetail.safeParse(base).success).toBe(true);
  expect(sheetDetail.safeParse({ ...base, total: 10.5 }).success).toBe(false);
  expect(sheetDetail.safeParse({ ...base, status: "Draft" }).success).toBe(false);
});
