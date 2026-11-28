import { describe, expect, it } from "vitest";
import { parseSalaryForm, salaryAmountText, salaryFormOf, salaryNotSet, salaryTypeLabel } from "./employee-salary-model";

const setup = { type: "FixedMonthly" as const, monthlyAmount: 9_000_000, payFieldShifts: true, effectiveFrom: "2026-11-01", enteredAt: "2026-11-01T01:00:00+00:00" };

describe("employee salary model", () => {
  it("is empty only when there is no setup and no default type", () => {
    expect(salaryNotSet({ current: null, currentType: null })).toBe(true);
    expect(salaryNotSet({ current: null, currentType: "PerShift" })).toBe(false);
    expect(salaryNotSet({ current: setup, currentType: "FixedMonthly" })).toBe(false);
  });
  it("names the types and shows the rule instead of an amount for a per-shift or hourly salary", () => {
    expect(salaryTypeLabel("FixedMonthly")).toBe("Cố định tháng"); expect(salaryTypeLabel("PerShift")).toBe("Theo ca"); expect(salaryTypeLabel("Hourly")).toBe("Theo giờ"); expect(salaryTypeLabel(null)).toBe("Chưa thiết lập");
    expect(salaryAmountText(setup, "FixedMonthly")).toBe("9.000.000 ₫");
    expect(salaryAmountText(null, "Hourly")).toBe("Theo đơn giá giờ của loại công việc");
    expect(salaryAmountText(null, "PerShift")).toBe("Theo đơn giá ca của loại công việc");
  });
  it("opens the form on what applies now, dated today, paying field shifts unless set otherwise", () => {
    expect(salaryFormOf({ current: setup, currentType: "FixedMonthly" }, "2026-11-27")).toEqual({ type: "FixedMonthly", amount: 9_000_000, payFieldShifts: true, effectiveFrom: "2026-11-27" });
    expect(salaryFormOf({ current: { ...setup, payFieldShifts: false }, currentType: "FixedMonthly" }, "2026-11-27").payFieldShifts).toBe(false);
    expect(salaryFormOf({ current: null, currentType: "PerShift" }, "2026-11-27")).toEqual({ type: "PerShift", amount: null, payFieldShifts: true, effectiveFrom: "2026-11-27" });
    expect(salaryFormOf({ current: null, currentType: null }, "2026-11-27").type).toBe("FixedMonthly");
  });
  it("sends the amount and the field-shift choice only for a fixed monthly salary, and always the row version", () => {
    expect(parseSalaryForm({ type: "FixedMonthly", amount: 8_000_000, payFieldShifts: false, effectiveFrom: "2026-11-27" }, "AQID")).toEqual({ ok: true, body: { type: "FixedMonthly", monthlyAmount: 8_000_000, payFieldShifts: false, effectiveFrom: "2026-11-27", rowVersion: "AQID" } });
    for (const type of ["PerShift", "Hourly"] as const) expect(parseSalaryForm({ type, amount: 8_000_000, payFieldShifts: true, effectiveFrom: "2026-11-27" }, "AQID")).toEqual({ ok: true, body: { type, effectiveFrom: "2026-11-27", rowVersion: "AQID" } });
  });
  it("asks for an amount and a date", () => {
    expect(parseSalaryForm({ type: "FixedMonthly", amount: null, payFieldShifts: true, effectiveFrom: "" }, "AQID")).toMatchObject({ ok: false, issues: { amount: expect.any(String), effectiveFrom: expect.any(String) } });
    expect(parseSalaryForm({ type: "FixedMonthly", amount: 1_000_000_000, payFieldShifts: true, effectiveFrom: "2026-11-27" }, "AQID")).toMatchObject({ ok: false, issues: { amount: expect.any(String) } });
  });
});
