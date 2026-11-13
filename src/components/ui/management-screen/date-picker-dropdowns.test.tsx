// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DatePickerField } from "./date-picker-field";

afterEach(cleanup);
const open = (label: string) => fireEvent.click(screen.getByRole("button", { name: new RegExp(`${label}:`) }));
const years = () => [...(screen.getByRole("combobox", { name: /Năm|Year/i }) as HTMLSelectElement).options].map(option => Number(option.value));

describe("date picker year and month dropdowns", () => {
  it("lets a birth date jump to any year since 1940 and opens near 30 years ago", () => {
    const change = vi.fn();
    render(<DatePickerField label="Ngày sinh" name="birthday" value="" max="2026-11-12" onChange={change} />);
    open("Ngày sinh");
    const list = years();
    expect(list[0]).toBe(1940); expect(list.at(-1)).toBe(2026);
    expect((screen.getByRole("combobox", { name: /Năm|Year/i }) as HTMLSelectElement).value).toBe(String(new Date().getFullYear() - 30));
    fireEvent.change(screen.getByRole("combobox", { name: /Năm|Year/i }), { target: { value: "1985" } });
    expect(document.querySelector('[data-day="1985-01-01"]')).toBeTruthy();
    fireEvent.click(document.querySelector('[data-day="1985-01-15"] button')!);
    expect(change).toHaveBeenCalledWith("1985-01-15");
  });
  it("keeps year navigation inside the limits in a floating panel", () => {
    render(<DatePickerField label="Ngày hiệu lực" value="2026-03-10" min="2024-01-01" max="2027-12-31" onChange={vi.fn()} />);
    open("Ngày hiệu lực");
    expect(years()).toEqual([2024, 2025, 2026, 2027]);
    expect(screen.getByRole("dialog", { name: "Ngày hiệu lực" })).toBeTruthy();
  });
  it("keeps month and year selectors available for a short date range", () => {
    render(<DatePickerField label="Ngày ghi" value="2026-11-11" min="2026-06-01" max="2026-12-31" onChange={vi.fn()} />);
    open("Ngày ghi");
    expect(screen.getByRole("combobox", { name: /Năm|Year/i })).toBeTruthy();
  });
});
