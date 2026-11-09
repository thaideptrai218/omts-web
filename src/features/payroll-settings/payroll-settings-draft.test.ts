import { describe, expect, it } from "vitest";
import { confirmQuestion, draftOf, draftProblem, isDirty, periodDays, periodLabel, periodName, startDayOf } from "./payroll-settings-draft";

const base = { payPeriodStartDay: 26, automaticPayroll: false };
const p1 = { start: "2026-09-26", end: "2026-10-25" }, p2 = { start: "2026-10-26", end: "2026-11-25" };

describe("bản nháp thiết lập kỳ lương", () => {
  it("chỉ chấp nhận ngày bắt đầu nguyên từ 1 đến 28", () => {
    expect(startDayOf({ startDay: "1", automatic: false })).toBe(1);
    expect(startDayOf({ startDay: "28", automatic: false })).toBe(28);
    for (const bad of ["", "0", "29", "1.5", "abc"]) expect(startDayOf({ startDay: bad, automatic: false })).toBeUndefined();
    expect(draftProblem({ startDay: "29", automatic: true })).toMatch(/1 đến 28/);
    expect(draftProblem({ startDay: "10", automatic: true })).toBeUndefined();
  });
  it("nhận biết thay đổi so với bản đã lưu", () => {
    expect(isDirty(draftOf(base), base)).toBe(false);
    expect(isDirty({ startDay: "25", automatic: false }, base)).toBe(true);
    expect(isDirty({ startDay: "26", automatic: true }, base)).toBe(true);
    expect(isDirty({ startDay: "", automatic: false }, base)).toBe(true);
  });
  it("định dạng kỳ lương theo tháng kết thúc và ngày Việt Nam", () => {
    expect(periodName(p1)).toBe("10/2026");
    expect(periodLabel(p1)).toBe("10/2026 (26/09/2026 – 25/10/2026)");
    expect(periodDays(p1)).toBe(30);
    expect(periodDays({ start: "2026-11-01", end: "2026-11-25" })).toBe(25);
  });
  it("câu hỏi xác nhận nêu hai kỳ và ghi chú tự động tạo bảng lương", () => {
    const off = confirmQuestion([p1, p2], false), on = confirmQuestion([p1, p2], true);
    expect(off).toContain("10/2026 (26/09/2026 – 25/10/2026) và 11/2026 (26/10/2026 – 25/11/2026)");
    expect(off).not.toContain("tự tạo");
    expect(on).toContain("tự tạo bảng lương");
  });
});
