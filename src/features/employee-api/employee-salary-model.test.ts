import { describe, expect, it } from "vitest";
import { parseSalaryForm, salaryAmountText, salaryFormOf, salaryNotSet, salaryTypeLabel } from "./employee-salary-model";

const setup = { type: "FixedMonthly" as const, monthlyAmount: 9_000_000, effectiveFrom: "2026-11-01", enteredAt: "2026-11-01T01:00:00+00:00" };

describe("employee salary model", () => {
  it("is empty only when there is no setup and no default type", () => {
    expect(salaryNotSet({ current: null, currentType: null })).toBe(true);
    expect(salaryNotSet({ current: null, currentType: "Hourly" })).toBe(false);
    expect(salaryNotSet({ current: setup, currentType: "FixedMonthly" })).toBe(false);
  });
  it("names the types and shows the rule instead of an amount for an hourly salary", () => {
    expect(salaryTypeLabel("FixedMonthly")).toBe("Cố định tháng"); expect(salaryTypeLabel("Hourly")).toBe("Theo giờ"); expect(salaryTypeLabel(null)).toBe("Chưa thiết lập");
    expect(salaryAmountText(setup, "FixedMonthly")).toBe("9.000.000 ₫");
    expect(salaryAmountText(null, "Hourly")).toBe("Theo đơn giá giờ của loại công việc");
  });
  it("opens the form on what applies now, dated today", () => {
    expect(salaryFormOf({ current: setup, currentType: "FixedMonthly" }, "2026-11-27")).toEqual({ type: "FixedMonthly", amount: 9_000_000, effectiveFrom: "2026-11-27" });
    expect(salaryFormOf({ current: null, currentType: "Hourly" }, "2026-11-27")).toEqual({ type: "Hourly", amount: null, effectiveFrom: "2026-11-27" });
  });
  it("sends the amount only for a fixed monthly salary and always the row version", () => {
    expect(parseSalaryForm({ type: "FixedMonthly", amount: 8_000_000, effectiveFrom: "2026-11-27" }, "AQID")).toEqual({ ok: true, body: { type: "FixedMonthly", monthlyAmount: 8_000_000, effectiveFrom: "2026-11-27", rowVersion: "AQID" } });
    expect(parseSalaryForm({ type: "Hourly", amount: 8_000_000, effectiveFrom: "2026-11-27" }, "AQID")).toEqual({ ok: true, body: { type: "Hourly", effectiveFrom: "2026-11-27", rowVersion: "AQID" } });
  });
  it("asks for an amount and a date", () => {
    expect(parseSalaryForm({ type: "FixedMonthly", amount: null, effectiveFrom: "" }, "AQID")).toMatchObject({ ok: false, issues: { amount: expect.any(String), effectiveFrom: expect.any(String) } });
    expect(parseSalaryForm({ type: "FixedMonthly", amount: 1_000_000_000, effectiveFrom: "2026-11-27" }, "AQID")).toMatchObject({ ok: false, issues: { amount: expect.any(String) } });
  });
});
