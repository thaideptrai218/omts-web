// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PeriodRangeMenu } from "./period-range-menu";
import { lastDaysRange, monthRange, quarterRange, recentWeeks, weekRange, yearRange, type PeriodRange } from "./period-range-model";

afterEach(cleanup);
const today = "2026-11-27";

describe("period ranges", () => {
  it("counts back from today", () => {
    expect(lastDaysRange(7, today)).toEqual({ from: "2026-11-21", to: today, label: "Trong 7 ngày qua" });
    expect(lastDaysRange(30, today)).toEqual({ from: "2026-10-29", to: today, label: "Trong 30 ngày qua" });
  });
  it("names whole weeks, months, quarters and years and never reaches past today", () => {
    expect(monthRange(2026, 2, today)).toEqual({ from: "2026-02-01", to: "2026-02-28", label: "Tháng 2/2026" });
    expect(monthRange(2026, 11, today)).toEqual({ from: "2026-11-01", to: today, label: "Tháng 11/2026" });
    expect(quarterRange(2026, 3, today)).toEqual({ from: "2026-07-01", to: "2026-09-30", label: "Quý 3/2026" });
    expect(yearRange(2025, today)).toEqual({ from: "2025-01-01", to: "2025-12-31", label: "Năm 2025" });
    expect(weekRange("2026-11-23", today)).toEqual({ from: "2026-11-23", to: today, label: "Tuần 23/11 - 29/11/2026" });
  });
  it("offers nothing that starts after today, and lists the newest weeks first", () => {
    expect(monthRange(2026, 12, today)).toBeUndefined();
    expect(quarterRange(2027, 1, today)).toBeUndefined();
    expect(weekRange("2026-11-30", today)).toBeUndefined();
    const weeks = recentWeeks(today, 3);
    expect(weeks.map(week => week.from)).toEqual(["2026-11-23", "2026-11-16", "2026-11-09"]);
  });
});

describe("period picker", () => {
  const open = (onChange: (value: PeriodRange) => void = vi.fn()) => {
    render(<PeriodRangeMenu label="Khoảng thời gian" value={lastDaysRange(30, today)} today={today} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Khoảng thời gian: Trong 30 ngày qua" }));
  };
  it("offers the two quick presets, the four Theo ... pickers and Tùy chỉnh", () => {
    open();
    expect(screen.getAllByRole("button").map(button => button.textContent).filter(Boolean)).toEqual(
      expect.arrayContaining(["Trong 7 ngày qua", "Trong 30 ngày qua", "Theo tuần", "Theo tháng", "Theo quý", "Theo năm", "Tùy chỉnh"]));
  });
  it("applies a quick preset", () => {
    const onChange = vi.fn();
    open(onChange);
    fireEvent.click(screen.getByRole("button", { name: "Trong 7 ngày qua" }));
    expect(onChange).toHaveBeenCalledWith({ from: "2026-11-21", to: today, label: "Trong 7 ngày qua" });
  });
  it("opens a month grid with year navigation and disables months still to come", () => {
    const onChange = vi.fn();
    open(onChange);
    fireEvent.click(screen.getByRole("button", { name: "Theo tháng" }));
    expect((screen.getByRole("button", { name: "Tháng 12" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Năm trước" }));
    fireEvent.click(screen.getByRole("button", { name: "Tháng 12" }));
    expect(onChange).toHaveBeenCalledWith({ from: "2025-12-01", to: "2025-12-31", label: "Tháng 12/2025" });
  });
  it("picks a quarter and a year", () => {
    const onChange = vi.fn();
    open(onChange);
    fireEvent.click(screen.getByRole("button", { name: "Theo quý" }));
    fireEvent.click(screen.getByRole("button", { name: "Quý 2" }));
    expect(onChange).toHaveBeenLastCalledWith({ from: "2026-04-01", to: "2026-06-30", label: "Quý 2/2026" });
    fireEvent.click(screen.getByRole("button", { name: "Khoảng thời gian: Trong 30 ngày qua" }));
    fireEvent.click(screen.getByRole("button", { name: "Theo năm" }));
    fireEvent.click(screen.getByRole("button", { name: "2025" }));
    expect(onChange).toHaveBeenLastCalledWith({ from: "2025-01-01", to: "2025-12-31", label: "Năm 2025" });
  });
});
